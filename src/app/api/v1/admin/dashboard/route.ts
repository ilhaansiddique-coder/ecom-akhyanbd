import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse, errorResponse } from "@/lib/api-response";
import { requireStaff } from "@/lib/auth-helpers";

/** Parse YYYY-MM-DD (BD, UTC+6) → UTC Date at BD midnight */
function bdMidnightUtc(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  // BD midnight = UTC midnight - 6 h
  return new Date(Date.UTC(y, m - 1, d) - 6 * 60 * 60 * 1000);
}

export async function GET(request: NextRequest) {
  let admin;
  try { admin = await requireStaff(); } catch (e) { return e as Response; }

  try {
    const { searchParams } = request.nextUrl;
    const fromParam = searchParams.get("from"); // YYYY-MM-DD BD
    const toParam   = searchParams.get("to");   // YYYY-MM-DD BD

    // BD timezone offset (UTC+6, no DST)
    const BD_OFFSET_MS = 6 * 60 * 60 * 1000;
    const nowMs = Date.now();
    const bdDayStartShifted = Math.floor((nowMs + BD_OFFSET_MS) / 86400000) * 86400000;
    const today = new Date(bdDayStartShifted - BD_OFFSET_MS);

    // Build date range filter for order queries
    let dateFilter: { gte?: Date; lt?: Date } | undefined;
    if (fromParam || toParam) {
      dateFilter = {};
      if (fromParam) dateFilter.gte = bdMidnightUtc(fromParam);
      if (toParam) {
        // Inclusive end — use start of NEXT BD day
        const [y, m, d] = toParam.split("-").map(Number);
        dateFilter.lt = new Date(Date.UTC(y, m - 1, d + 1) - BD_OFFSET_MS);
      }
    }
    const createdAtFilter = dateFilter ? { createdAt: dateFilter } : {};

    // Build last 7 days as BD-midnight markers (bar chart)
    const days: Date[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400000);
      days.push(d);
    }

    const [
      totalOrders,
      todayOrders,
      revenueResult,
      todayRevenueResult,
      cancelledRevResult,
      totalCustomers,
      totalProducts,
      pendingOrders,
      lowStockCount,
      recentOrders,
      topProducts,
      lowStockProducts,
      ordersByStatus,
      revenueByStatus,
      shippedCount,
      shippedRevAgg,
      todayShippedCount,
      todayShippedRevAgg,
      shippedCustomerGroups,
      ...dailyCounts
    ] = await Promise.all([
      // Total non-trashed orders (scoped to date if filter set)
      prisma.order.count({ where: { status: { not: "trashed" }, ...createdAtFilter } }),
      // Today's orders (always fixed to today, not date-filter)
      prisma.order.count({ where: { createdAt: { gte: today }, status: { not: "trashed" } } }),
      // Revenue excl. cancelled + trashed + delivery (date-scoped)
      prisma.order.aggregate({
        _sum: { total: true, shippingCost: true },
        where: { status: { notIn: ["cancelled", "trashed"] }, ...createdAtFilter },
      }),
      // Today's revenue (always fixed to today)
      prisma.order.aggregate({
        _sum: { total: true, shippingCost: true },
        where: { createdAt: { gte: today }, status: { notIn: ["cancelled", "trashed"] } },
      }),
      // Cancelled orders revenue — always excludes shipping charge
      prisma.order.aggregate({
        _sum: { total: true, shippingCost: true },
        where: { status: "cancelled", ...createdAtFilter },
      }),
      prisma.user.count({ where: { role: "customer" } }),
      prisma.product.count(),
      // activeProducts removed — not consumed by the frontend Stats interface
      prisma.order.count({ where: { status: "pending", ...createdAtFilter } }),
      prisma.product.count({ where: { stock: { lt: 10 } } }),
      // Select only columns rendered by the dashboard — avoids pulling address,
      // notes, weight, SEO fields, etc. over the wire.
      prisma.order.findMany({
        take: 10,
        where: { status: { not: "trashed" }, ...createdAtFilter },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          customerName: true,
          customerPhone: true,
          total: true,
          status: true,
          paymentStatus: true,
          paymentMethod: true,
          createdAt: true,
          items: {
            select: { id: true, productName: true, price: true, quantity: true },
          },
        },
      }),
      prisma.product.findMany({
        take: 10,
        orderBy: { soldCount: "desc" },
        select: { id: true, name: true, soldCount: true, price: true, image: true },
      }),
      prisma.product.findMany({
        where: { stock: { lt: 10 } },
        take: 20,
        orderBy: { stock: "asc" },
        select: { id: true, name: true, stock: true, image: true },
      }),
      // Order counts by status (date-scoped)
      prisma.order.groupBy({
        by: ["status"],
        _count: { _all: true },
        ...(dateFilter ? { where: { createdAt: dateFilter } } : {}),
      }),
      // Revenue by status excl. cancelled/trashed (date-scoped)
      prisma.order.groupBy({
        by: ["status"],
        _sum: { total: true, shippingCost: true },
        where: { status: { notIn: ["cancelled", "trashed"] }, ...createdAtFilter },
      }),
      // ── Courier-sent ("actual sales") stats ──────────────────────────────────
      // Shipped order count (date-scoped)
      prisma.order.count({ where: { status: "shipped", ...createdAtFilter } }),
      // Shipped revenue excl. shipping cost (date-scoped)
      prisma.order.aggregate({
        _sum: { total: true, shippingCost: true },
        where: { status: "shipped", ...createdAtFilter },
      }),
      // Today's shipped orders (always fixed to today)
      prisma.order.count({ where: { status: "shipped", createdAt: { gte: today } } }),
      // Today's shipped revenue excl. shipping (always fixed to today)
      prisma.order.aggregate({
        _sum: { total: true, shippingCost: true },
        where: { status: "shipped", createdAt: { gte: today } },
      }),
      // Unique customers (by phone) from shipped orders (date-scoped)
      prisma.order.groupBy({
        by: ["customerPhone"],
        where: { status: "shipped", ...createdAtFilter },
      }),
      // Daily bar chart — always last 7 days (not date-scoped)
      ...days.map((day) => {
        const next = new Date(day);
        next.setDate(next.getDate() + 1);
        return prisma.order.count({ where: { createdAt: { gte: day, lt: next } } });
      }),
    ]);

    // Build order counts map
    const orderCounts: Record<string, number> = {};
    for (const g of ordersByStatus) orderCounts[g.status] = g._count._all;

    // Build revenue map for non-cancelled statuses
    const revMap: Record<string, number> = {};
    for (const g of revenueByStatus) {
      revMap[g.status] = Number(g._sum.total || 0) - Number(g._sum.shippingCost || 0);
    }

    // Cancelled revenue: product total minus shipping (never add delivery charge to cancelled)
    const cancelledRevenue = Number(cancelledRevResult._sum.total || 0) - Number(cancelledRevResult._sum.shippingCost || 0);

    const dailyOrders = days.map((day, i) => ({
      date: day.toISOString().slice(5, 10),
      count: dailyCounts[i] as number,
    }));

    const shippedRevenue = Number(shippedRevAgg._sum.total || 0) - Number(shippedRevAgg._sum.shippingCost || 0);
    const todayShippedRevenue = Number(todayShippedRevAgg._sum.total || 0) - Number(todayShippedRevAgg._sum.shippingCost || 0);

    return jsonResponse({
      stats: serialize({
        // snake_case to match Stats interface in DashboardHomeClient
        total_orders: totalOrders,
        today_orders: todayOrders,
        total_revenue: Number(revenueResult._sum.total || 0) - Number(revenueResult._sum.shippingCost || 0),
        today_revenue: Number(todayRevenueResult._sum.total || 0) - Number(todayRevenueResult._sum.shippingCost || 0),
        total_customers: totalCustomers,
        total_products: totalProducts,
        pending_orders: pendingOrders,
        low_stock_count: lowStockCount,
        low_stock: lowStockCount,
        cancelled_revenue: cancelledRevenue,
        // Courier-sent ("actual sales") stats
        shipped_orders: shippedCount,
        shipped_revenue: shippedRevenue,
        today_shipped: todayShippedCount,
        today_shipped_revenue: todayShippedRevenue,
        shipped_customers: shippedCustomerGroups.length,
      }),
      order_counts: {
        pending:   orderCounts.pending   || 0,
        confirmed: orderCounts.confirmed || 0,
        processing: orderCounts.processing || 0,
        shipped:   orderCounts.shipped   || 0,
        delivered: orderCounts.delivered || 0,
        cancelled: orderCounts.cancelled || 0,
      },
      revenue_by_status: {
        pending:   revMap.pending   || 0,
        confirmed: revMap.confirmed || 0,
        processing: revMap.processing || 0,
        shipped:   revMap.shipped   || 0,
        delivered: revMap.delivered || 0,
        cancelled: cancelledRevenue,
      },
      daily_orders: dailyOrders,
      recent_orders: recentOrders.map(serialize),
      top_products:  topProducts.map(serialize),
      low_stock:     lowStockProducts.map(serialize),
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return errorResponse("Failed to fetch dashboard data", 500);
  }
}
