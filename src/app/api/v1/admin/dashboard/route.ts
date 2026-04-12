import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse, errorResponse } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-helpers";

export async function GET(_request: NextRequest) {
  let admin;
  try { admin = await requireAdmin(); } catch (e) { return e as Response; }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Build last 7 days date range
    const days: Date[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      days.push(d);
    }

    const [
      totalOrders,
      todayOrders,
      revenueResult,
      todayRevenueResult,
      totalCustomers,
      totalProducts,
      activeProducts,
      pendingOrders,
      lowStockCount,
      recentOrders,
      topProducts,
      lowStockProducts,
      ordersByStatus,
      revenueByStatus,
      // Daily orders for last 7 days
      ...dailyCounts
    ] = await Promise.all([
      prisma.order.count({ where: { status: { not: "trashed" } } }),
      prisma.order.count({ where: { createdAt: { gte: today }, status: { not: "trashed" } } }),
      prisma.order.aggregate({ _sum: { total: true }, where: { status: { notIn: ["cancelled", "trashed"] } } }),
      prisma.order.aggregate({ _sum: { total: true }, where: { createdAt: { gte: today }, status: { notIn: ["cancelled", "trashed"] } } }),
      prisma.user.count({ where: { role: "customer" } }),
      prisma.product.count(),
      prisma.product.count({ where: { isActive: true } }),
      prisma.order.count({ where: { status: "pending" } }),
      prisma.product.count({ where: { stock: { lt: 10 } } }),
      prisma.order.findMany({
        take: 10,
        where: { status: { not: "trashed" } },
        orderBy: { createdAt: "desc" },
        include: { items: true },
      }),
      prisma.product.findMany({
        take: 10,
        orderBy: { soldCount: "desc" },
      }),
      prisma.product.findMany({
        where: { stock: { lt: 10 } },
        orderBy: { stock: "asc" },
      }),
      prisma.order.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.order.groupBy({
        by: ["status"],
        _sum: { total: true },
      }),
      // 7 daily count queries
      ...days.map((day) => {
        const next = new Date(day);
        next.setDate(next.getDate() + 1);
        return prisma.order.count({
          where: { createdAt: { gte: day, lt: next } },
        });
      }),
    ]);

    // Build order counts map
    const orderCounts: Record<string, number> = {};
    for (const g of ordersByStatus) {
      orderCounts[g.status] = g._count._all;
    }

    // Build revenue map
    const revMap: Record<string, number> = {};
    for (const g of revenueByStatus) {
      revMap[g.status] = Number(g._sum.total || 0);
    }

    // Build daily orders array
    const dailyOrders = days.map((day, i) => ({
      date: day.toISOString().slice(5, 10), // "MM-DD"
      count: dailyCounts[i] as number,
    }));

    return jsonResponse({
      stats: serialize({
        totalOrders,
        todayOrders,
        totalRevenue: Number(revenueResult._sum.total || 0),
        todayRevenue: Number(todayRevenueResult._sum.total || 0),
        totalCustomers,
        totalProducts,
        activeProducts,
        pendingOrders,
        lowStockCount,
      }),
      order_counts: {
        pending: orderCounts.pending || 0,
        confirmed: orderCounts.confirmed || 0,
        processing: orderCounts.processing || 0,
        shipped: orderCounts.shipped || 0,
        delivered: orderCounts.delivered || 0,
        cancelled: orderCounts.cancelled || 0,
      },
      revenue_by_status: {
        pending: revMap.pending || 0,
        confirmed: revMap.confirmed || 0,
        processing: revMap.processing || 0,
        shipped: revMap.shipped || 0,
        delivered: revMap.delivered || 0,
        cancelled: revMap.cancelled || 0,
      },
      daily_orders: dailyOrders,
      recent_orders: recentOrders.map(serialize),
      top_products: topProducts.map(serialize),
      low_stock: lowStockProducts.map(serialize),
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return errorResponse("Failed to fetch dashboard data", 500);
  }
}
