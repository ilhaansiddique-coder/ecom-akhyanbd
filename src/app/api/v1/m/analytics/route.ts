import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse } from "@/lib/api-response";
import { withAdmin } from "@/lib/auth-helpers";

function startOf(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function dateKey(d: Date) {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function resolveRange(period: string, fromParam: string | null, toParam: string | null): { from: Date; to: Date } {
  const now = new Date();
  if (period === "custom" && fromParam && toParam) {
    return { from: new Date(fromParam), to: new Date(toParam) };
  }
  if (period === "today") {
    return { from: startOf(now), to: now };
  }
  const days = period === "30d" ? 30 : 7;
  const from = startOf(new Date(now.getTime() - (days - 1) * 86400000));
  return { from, to: now };
}

// Analytics endpoint shape (matches AnalyticsData.fromJson):
//   data: { period, range:{from,to}, stats, revenueChart, topProducts, statusBreakdown, trafficSources }
export const GET = withAdmin(async (request) => {
  const { searchParams } = request.nextUrl;
  const period = searchParams.get("period") ?? "7d";
  const { from, to } = resolveRange(period, searchParams.get("from"), searchParams.get("to"));

  const baseWhere = { createdAt: { gte: from, lte: to } };
  const paidWhere = { ...baseWhere, paymentStatus: "paid" };

  const [orders, revenueAgg, returnsCount, topItems, statusGroups, dailyOrders] = await Promise.all([
    prisma.order.count({ where: baseWhere }),
    prisma.order.aggregate({ _sum: { total: true }, _count: { _all: true }, where: paidWhere }),
    prisma.order.count({ where: { ...baseWhere, status: "returned" } }),
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: { order: paidWhere, productId: { not: null } },
      _sum: { quantity: true, price: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
    prisma.order.groupBy({
      by: ["status"],
      where: baseWhere,
      _count: { _all: true },
    }),
    prisma.order.findMany({
      where: paidWhere,
      select: { total: true, createdAt: true },
    }),
  ]);

  const revenue = revenueAgg._sum.total ?? 0;
  const paidOrderCount = revenueAgg._count._all ?? 0;
  const avgOrderValue = paidOrderCount > 0 ? revenue / paidOrderCount : 0;
  const returnRate = orders > 0 ? returnsCount / orders : 0;

  // Build daily revenue chart
  const chartMap = new Map<string, { date: string; revenue: number; orders: number }>();
  for (const o of dailyOrders) {
    if (!o.createdAt) continue;
    const k = dateKey(o.createdAt);
    const cur = chartMap.get(k) ?? { date: k, revenue: 0, orders: 0 };
    cur.revenue += o.total ?? 0;
    cur.orders += 1;
    chartMap.set(k, cur);
  }
  const revenueChart = Array.from(chartMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  // Top products — fetch product details for the top productIds
  const productIds = topItems.map((t) => t.productId).filter((id): id is number => id !== null);
  const products = productIds.length > 0
    ? await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true, slug: true, image: true },
      })
    : [];
  const productMap = new Map(products.map((p) => [p.id, p]));
  const topProducts = topItems.map((t) => {
    const p = t.productId !== null ? productMap.get(t.productId) : null;
    return {
      productId: t.productId,
      name: p?.name ?? "Unknown",
      image: p?.image ?? null,
      slug: p?.slug ?? null,
      unitsSold: t._sum.quantity ?? 0,
      revenue: t._sum.price ?? 0,
    };
  });

  const statusBreakdown: Record<string, number> = {};
  for (const g of statusGroups) statusBreakdown[g.status] = g._count._all;

  return jsonResponse({
    data: {
      period,
      range: { from: from.toISOString(), to: to.toISOString() },
      stats: {
        orders,
        revenue,
        avgOrderValue,
        returnRate,
      },
      revenueChart,
      topProducts,
      statusBreakdown,
      trafficSources: [],
    },
  });
});
