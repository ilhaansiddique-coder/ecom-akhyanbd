import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse } from "@/lib/api-response";
import { withAdmin } from "@/lib/auth-helpers";

export const GET = withAdmin(async (_request) => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

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
  ]);

  // Wrapped in { data: ... } envelope to match Flutter API client expectations.
  // Recent orders use camelCase keys (Flutter's OrderListItem.fromJson contract).
  return jsonResponse({
    data: {
      stats: {
        total_orders: totalOrders,
        pending_orders: pendingOrders,
        today_orders: todayOrders,
        month_orders: monthOrders,
        total_products: totalProducts,
        low_stock_items: lowStockItems,
        total_customers: totalCustomers,
        total_revenue: revenueAgg._sum.total ?? 0,
        today_revenue: todayRevenueAgg._sum.total ?? 0,
        month_revenue: monthRevenueAgg._sum.total ?? 0,
      },
      flagged_orders_count: flaggedOrdersCount,
      recent_orders: recentOrders.map((o) => ({
        id: o.id,
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
      top_products: [],
    },
  });
});
