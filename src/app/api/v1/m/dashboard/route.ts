import { prisma } from "@/lib/prisma";
import { jsonResponse } from "@/lib/api-response";
import { withAdmin } from "@/lib/auth-helpers";

// Order statuses that should NOT count toward "sold" rollups. Cancelled,
// returned, and trashed orders represent revenue/units that were undone or
// never realised. Keep this in sync with the analytics route.
const EXCLUDED_FROM_SALES = ["cancelled", "returned", "trashed"];

/**
 * GET /api/v1/m/dashboard
 *
 * Mobile-shaped admin dashboard payload. Camel-case keys throughout to
 * match the Dart `DashboardData.fromJson` contract — the previous
 * snake_case shape silently produced zeros in the app even when data was
 * present, because the Dart decoder reads `stats.todayOrders` / `topProducts`
 * / `recentOrders`.
 *
 * Optional query params:
 *   from, to — ISO datetimes scoping the date-range stats and top-products
 *              aggregation. When omitted, defaults to "today" + "this month"
 *              window for the time-bucketed stats and "all time" for top-N.
 *              Sent by the dashboard date pill.
 */
export const GET = withAdmin(async (request) => {
  const { searchParams } = request.nextUrl;
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const rangeFrom = fromParam ? new Date(fromParam) : null;
  const rangeTo = toParam ? new Date(toParam) : null;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Top-products date filter: when the caller provides from/to, scope to
  // that range; otherwise use "all time" so a freshly-installed dashboard
  // still shows lifetime best-sellers instead of an empty list.
  const topProductsOrderWhere: {
    status: { notIn: string[] };
    createdAt?: { gte?: Date; lte?: Date };
  } = { status: { notIn: EXCLUDED_FROM_SALES } };
  if (rangeFrom || rangeTo) {
    topProductsOrderWhere.createdAt = {};
    if (rangeFrom) topProductsOrderWhere.createdAt.gte = rangeFrom;
    if (rangeTo) topProductsOrderWhere.createdAt.lte = rangeTo;
  }

  const [
    totalOrders,
    pendingOrders,
    todayOrders,
    monthOrders,
    flaggedOrdersCount,
    totalProducts,
    lowStockItems,
    totalCustomers,
    revenueAgg,
    todayRevenueAgg,
    monthRevenueAgg,
    recentOrders,
    topItems,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { status: "pending" } }),
    prisma.order.count({ where: { createdAt: { gte: startOfToday } } }),
    prisma.order.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.order.count({ where: { riskScore: { gte: 70 } } }),
    prisma.product.count(),
    prisma.product.count({ where: { stock: { lte: 5 } } }),
    prisma.user.count({ where: { isSuperAdmin: false } }),
    prisma.order.aggregate({ _sum: { total: true }, where: { paymentStatus: "paid" } }),
    prisma.order.aggregate({ _sum: { total: true }, where: { paymentStatus: "paid", createdAt: { gte: startOfToday } } }),
    prisma.order.aggregate({ _sum: { total: true }, where: { paymentStatus: "paid", createdAt: { gte: startOfMonth } } }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        customerName: true,
        customerPhone: true,
        total: true,
        status: true,
        paymentMethod: true,
        paymentStatus: true,
        riskScore: true,
        courierSent: true,
        createdAt: true,
        _count: { select: { items: true } },
      },
    }),
    // Top sold products. Group order_items by productId and sum quantity,
    // filtered to "real" orders (excludes cancelled/returned/trashed) inside
    // the optional date range. Sorted desc by units sold, top 5.
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: {
        productId: { not: null },
        order: topProductsOrderWhere,
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
  ]);

  // Resolve product details for the topItems group. One round trip with a
  // small `IN` clause — cheaper than joining inside the groupBy (Prisma's
  // groupBy doesn't support related-field projection).
  const topProductIds = topItems
    .map((t) => t.productId)
    .filter((id): id is number => id !== null);
  const topProductsMap = topProductIds.length > 0
    ? new Map(
        (
          await prisma.product.findMany({
            where: { id: { in: topProductIds } },
            select: { id: true, name: true, slug: true, image: true, price: true },
          })
        ).map((p) => [p.id, p]),
      )
    : new Map<number, { id: number; name: string; slug: string; image: string; price: number }>();

  const topProducts = topItems
    .map((t) => {
      if (t.productId === null) return null;
      const p = topProductsMap.get(t.productId);
      if (!p) return null; // product was deleted but order_items still reference it
      return {
        id: String(p.id),
        name: p.name,
        slug: p.slug,
        image: p.image,
        soldCount: t._sum.quantity ?? 0,
        price: p.price,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return jsonResponse({
    data: {
      stats: {
        totalOrders,
        pendingOrders,
        todayOrders,
        monthOrders,
        totalProducts,
        lowStockItems,
        totalCustomers,
        totalRevenue: revenueAgg._sum.total ?? 0,
        todayRevenue: todayRevenueAgg._sum.total ?? 0,
        monthRevenue: monthRevenueAgg._sum.total ?? 0,
      },
      flaggedOrdersCount,
      recentOrders: recentOrders.map((o) => ({
        id: String(o.id),
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        total: o.total,
        status: o.status,
        paymentMethod: o.paymentMethod,
        paymentStatus: o.paymentStatus,
        riskScore: o.riskScore,
        courierSent: o.courierSent,
        itemCount: o._count.items,
        flagged: (o.riskScore ?? 0) >= 70,
        createdAt: o.createdAt?.toISOString() ?? null,
      })),
      topProducts,
    },
  });
});
