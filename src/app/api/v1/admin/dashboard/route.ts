import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse, errorResponse } from "@/lib/api-response";
import { withStaff } from "@/lib/auth-helpers";

/**
 * Parse a BD calendar date → UTC Date at BD midnight.
 *
 * Accepts either:
 *   • Plain YYYY-MM-DD (e.g. "2026-05-09") — what the web admin sends.
 *   • ISO 8601 datetime (e.g. "2026-05-09T17:59:59.999Z") — what the
 *     Flutter app sends from the date-range picker. We slice off
 *     everything past the date portion so both formats produce the
 *     same BD-midnight anchor.
 *
 * Throws on garbage input so the route's try/catch returns a clean 400
 * rather than passing NaN dates to Prisma (which 500s).
 */
function bdMidnightUtc(dateStr: string): Date {
  const datePart = dateStr.slice(0, 10); // "2026-05-09"
  const [y, m, d] = datePart.split("-").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    throw new Error(`Invalid date param: "${dateStr}"`);
  }
  // BD midnight = UTC midnight - 6 h
  return new Date(Date.UTC(y, m - 1, d) - 6 * 60 * 60 * 1000);
}

export const GET = withStaff(async (request) => {
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
        // Inclusive end — use start of NEXT BD day. Same forgiving slice
        // as `bdMidnightUtc` so ISO 8601 strings from Flutter still parse.
        const [y, m, d] = toParam.slice(0, 10).split("-").map(Number);
        if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
          throw new Error(`Invalid 'to' param: "${toParam}"`);
        }
        dateFilter.lt = new Date(Date.UTC(y, m - 1, d + 1) - BD_OFFSET_MS);
      }
    }
    const createdAtFilter = dateFilter ? { createdAt: dateFilter } : {};
    // Courier-sent stats anchor on courierSentAt rather than createdAt so an
    // order created earlier but dispatched within the range still counts.
    const shippedFilter = dateFilter ? { courierSentAt: dateFilter } : {};

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
      prisma.user.count({ where: { isSuperAdmin: false } }),
      prisma.product.count(),
      // activeProducts removed — not consumed by the frontend Stats interface
      prisma.order.count({ where: { status: "pending", ...createdAtFilter } }),
      // Low-stock count — threshold ≤10, split simple vs variable.
      prisma.product.count({
        where: {
          OR: [
            { hasVariations: false, unlimitedStock: false, stock: { lt: 10 } },
            { hasVariations: true, variants: { some: { isActive: true, unlimitedStock: false, stock: { lt: 10 } } } },
          ],
        },
      }),
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
      // Low-stock products — threshold ≤10. Simple by parent.stock; variable
      // by any active non-unlimited variant. Variants included so client can
      // render the offending variant labels instead of a misleading sum.
      prisma.product.findMany({
        where: {
          OR: [
            { hasVariations: false, unlimitedStock: false, stock: { lt: 10 } },
            { hasVariations: true, variants: { some: { isActive: true, unlimitedStock: false, stock: { lt: 10 } } } },
          ],
        },
        take: 20,
        orderBy: { stock: "asc" },
        select: {
          id: true, name: true, stock: true, image: true,
          hasVariations: true, unlimitedStock: true,
          variants: { where: { isActive: true }, select: { label: true, stock: true, unlimitedStock: true } },
        },
      }),
      // Single groupBy returns both count + revenue per status — used to
      // derive `order_counts.*` and `revenue_by_status.*` without firing a
      // second groupBy on the same table.
      prisma.order.groupBy({
        by: ["status"],
        _count: { _all: true },
        _sum: { total: true, shippingCost: true },
        ...(dateFilter ? { where: { createdAt: dateFilter } } : {}),
      }),
      // ── Courier-sent ("actual sales") stats ──────────────────────────────────
      // Anchored on `courierSentAt`, NOT `createdAt`, so an order created two
      // days ago but dispatched today still counts on today's stats. This
      // matches how a merchant intuitively reads "today's courier sent" —
      // the day the parcel left their hands, not the day the order arrived.
      //
      // COUNTS include cancelled-after-dispatch (the parcel was still sent —
      // matches the courier-monitor's "Total Sent" view). REVENUE excludes
      // cancelled (cancelled money isn't real money), but only `cancelled`,
      // not the pre-dispatch trash.
      prisma.order.count({
        where: { courierSent: true, status: { not: "trashed" }, ...shippedFilter },
      }),
      // Shipped revenue excl. shipping cost (date-scoped on courierSentAt)
      prisma.order.aggregate({
        _sum: { total: true, shippingCost: true },
        where: { courierSent: true, status: { notIn: ["cancelled", "trashed"] }, ...shippedFilter },
      }),
      // Today's shipped orders — count includes cancelled-after-dispatch
      prisma.order.count({
        where: { courierSent: true, status: { not: "trashed" }, courierSentAt: { gte: today } },
      }),
      // Today's shipped revenue — excludes cancelled (no revenue from those)
      prisma.order.aggregate({
        _sum: { total: true, shippingCost: true },
        where: { courierSent: true, status: { notIn: ["cancelled", "trashed"] }, courierSentAt: { gte: today } },
      }),
      // Unique customers (by phone) from courier-sent orders in range
      prisma.order.groupBy({
        by: ["customerPhone"],
        where: { courierSent: true, status: { not: "trashed" }, ...shippedFilter },
      }),
      // Daily bar chart — always last 7 days (not date-scoped)
      ...days.map((day) => {
        const next = new Date(day);
        next.setDate(next.getDate() + 1);
        return prisma.order.count({ where: { createdAt: { gte: day, lt: next } } });
      }),
    ]);

    // Build order counts + revenue map from the single merged groupBy.
    // Revenue is excluded for cancelled/trashed (those flow through
    // cancelledRevResult separately, surfaced as `cancelled_revenue`).
    const orderCounts: Record<string, number> = {};
    const revMap: Record<string, number> = {};
    for (const g of ordersByStatus) {
      orderCounts[g.status] = g._count._all;
      if (g.status !== "cancelled" && g.status !== "trashed") {
        revMap[g.status] = Number(g._sum.total || 0) - Number(g._sum.shippingCost || 0);
      }
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
        // "Confirmed" rolls up confirmed + processing + shipped + delivered.
        // Once an order is confirmed it never reverts, so for dashboard
        // reporting we treat the entire post-confirmation funnel as
        // "confirmed orders" — the merchant cares about how many sales were
        // locked in, not the current logistics state.
        confirmed: (orderCounts.confirmed || 0) + (orderCounts.processing || 0) + (orderCounts.shipped || 0) + (orderCounts.delivered || 0),
        processing: orderCounts.processing || 0,
        shipped:   orderCounts.shipped   || 0,
        delivered: orderCounts.delivered || 0,
        cancelled: orderCounts.cancelled || 0,
      },
      revenue_by_status: {
        pending:   revMap.pending   || 0,
        // Same rollup logic for revenue.
        confirmed: (revMap.confirmed || 0) + (revMap.processing || 0) + (revMap.shipped || 0) + (revMap.delivered || 0),
        processing: revMap.processing || 0,
        shipped:   revMap.shipped   || 0,
        delivered: revMap.delivered || 0,
        cancelled: cancelledRevenue,
      },
      daily_orders: dailyOrders,
      recent_orders: recentOrders.map(serialize),
      top_products:  topProducts.map(serialize),
      // Same shape the SSR home page emits: simple products carry parent stock;
      // variable products carry only the offending variants (label + stock).
      // Avoids the "Stock: 143" misleading sum on a product flagged because
      // ONE variant is at 2.
      low_stock: lowStockProducts.map((p) => {
        if (p.hasVariations) {
          const lowVariants = (p.variants ?? [])
            .filter((v) => !v.unlimitedStock && (Number(v.stock) || 0) < 10)
            .sort((a, b) => (Number(a.stock) || 0) - (Number(b.stock) || 0))
            .map((v) => ({ label: v.label, stock: Number(v.stock) || 0 }));
          return {
            id: p.id, name: p.name, image: p.image ?? null,
            stock: lowVariants.reduce((s, v) => s + v.stock, 0),
            variants: lowVariants,
          };
        }
        return { id: p.id, name: p.name, stock: p.stock, image: p.image ?? null };
      }),
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return errorResponse("Failed to fetch dashboard data", 500);
  }
});
