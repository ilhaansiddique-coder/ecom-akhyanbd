import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardPage from "../DashboardHomeClient";

export const dynamic = "force-dynamic";

export default async function DashboardServerPage() {
  const user = await getSessionUser();

  // Staff have no dashboard home — bounce them to their first allowed page.
  if (user?.role === "staff") redirect("/dashboard/products");

  // Customers + unauthenticated users get the customer-view fallback (the
  // client decides what to render). Only admin sees the full analytics block.
  if (!user || user.role !== "admin") {
    return <DashboardPage />;
  }

  try {
    // BD timezone (UTC+6, no DST). Computed first — referenced by all queries.
    const BD_OFFSET_MS = 6 * 60 * 60 * 1000;
    const nowMs = Date.now();
    const bdDayStartShifted = Math.floor((nowMs + BD_OFFSET_MS) / 86400000) * 86400000;
    const today = new Date(bdDayStartShifted - BD_OFFSET_MS);
    const todayStr = new Date(today.getTime() + BD_OFFSET_MS).toISOString().slice(0, 10);

    // Build last-7-days array BEFORE the Promise.all so it can be spread inline.
    // This eliminates the separate dailyCounts Promise.all waterfall entirely.
    const days: Date[] = [];
    for (let i = 6; i >= 0; i--) {
      days.push(new Date(today.getTime() - i * 86400000));
    }

    // ── Single Promise.all — all queries fire in parallel, zero waterfalls ──
    const [
      totalOrders,
      pendingOrders,
      revenueAgg,
      cancelledRevAgg,
      totalProducts,
      totalCustomers,
      recentOrdersRaw,
      shippedCount,
      shippedRevAgg,
      shippedCustomerGroups,
      statusCountsRaw,
      revByStatusRaw,
      lowStockRaw,
      topProductsRaw,
      ...dailyCounts
    ] = await Promise.all([
      // Order counts / aggregates — all scoped to today (default view)
      prisma.order.count({ where: { status: { not: "trashed" }, createdAt: { gte: today } } }),
      prisma.order.count({ where: { status: "pending", createdAt: { gte: today } } }),
      prisma.order.aggregate({
        _sum: { total: true, shippingCost: true },
        where: { status: { notIn: ["cancelled", "trashed"] }, createdAt: { gte: today } },
      }),
      prisma.order.aggregate({
        _sum: { total: true, shippingCost: true },
        where: { status: "cancelled", createdAt: { gte: today } },
      }),
      prisma.product.count(),
      prisma.user.count({ where: { role: "customer" } }),
      // Only select columns the dashboard actually renders — avoids pulling
      // address, notes, createdBy, etc. over the wire.
      prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        where: { status: { not: "trashed" }, createdAt: { gte: today } },
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
      // Courier-sent ("actual sales") — today-scoped for SSR default.
      // Anchored on courierSentAt (dispatch day) not createdAt, and uses
      // the courierSent flag rather than status="shipped" so orders that
      // were sent today but already delivered/cancelled still count.
      // COUNT includes cancelled-after-dispatch (matches the courier-monitor
      // "Total Sent" view); REVENUE excludes cancelled (no real money).
      prisma.order.count({
        where: { courierSent: true, status: { not: "trashed" }, courierSentAt: { gte: today } },
      }),
      prisma.order.aggregate({
        _sum: { total: true, shippingCost: true },
        where: { courierSent: true, status: { notIn: ["cancelled", "trashed"] }, courierSentAt: { gte: today } },
      }),
      prisma.order.groupBy({
        by: ["customerPhone"],
        where: { courierSent: true, status: { not: "trashed" }, courierSentAt: { gte: today } },
      }),
      // Status breakdown — previously a sequential await after the first batch
      prisma.order.groupBy({
        by: ["status"],
        _count: { id: true },
        where: { createdAt: { gte: today } },
      }),
      // Revenue by status — previously a sequential await after statusCountsRaw
      prisma.order.groupBy({
        by: ["status"],
        _sum: { total: true, shippingCost: true },
        where: { status: { notIn: ["cancelled", "trashed"] }, createdAt: { gte: today } },
      }),
      // Low stock — threshold ≤ 10. Split simple vs variable:
      //  - Simple:   parent.stock ≤ 10 AND !unlimited.
      //  - Variable: ANY active variant with stock ≤ 10 AND !unlimited.
      // Parent.stock is stale on variable products (admin edits per-variant);
      // old `stock: lte: N` query falsely flagged every variable product whose
      // parent column was 0 even when every variant had healthy stock.
      prisma.product.findMany({
        where: {
          OR: [
            { hasVariations: false, unlimitedStock: false, stock: { lt: 10 } },
            { hasVariations: true, variants: { some: { isActive: true, unlimitedStock: false, stock: { lt: 10 } } } },
          ],
        },
        take: 10,
        orderBy: { stock: "asc" },
        select: {
          id: true, name: true, stock: true, image: true,
          hasVariations: true, unlimitedStock: true,
          variants: {
            where: { isActive: true },
            select: { label: true, stock: true, unlimitedStock: true },
          },
        },
      }),
      // Top products — previously a sequential await, now parallel
      prisma.product.findMany({
        orderBy: { soldCount: "desc" },
        take: 5,
        select: { id: true, name: true, soldCount: true, price: true, image: true },
      }),
      // Daily bar chart — last 7 BD days, spread inline to avoid a second Promise.all
      ...days.map((day) => {
        const next = new Date(day.getTime() + 86400000);
        return prisma.order.count({
          where: { createdAt: { gte: day, lt: next }, status: { not: "trashed" } },
        });
      }),
    ]);

    // Build order counts by status
    const orderCounts = { pending: 0, confirmed: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 } as Record<string, number>;
    for (const s of statusCountsRaw) {
      if (s.status in orderCounts) orderCounts[s.status] = s._count.id;
    }
    // Roll up confirmed + processing + shipped + delivered into "confirmed".
    // Once an order is confirmed it never reverts — shipping/delivery are
    // downstream stages of the same locked-in sale, so the merchant-facing
    // "Confirmed" count covers all of them. Mirrors the same rollup in
    // /api/v1/admin/dashboard so SSR and client-fetch agree.
    orderCounts.confirmed = orderCounts.confirmed + orderCounts.processing + orderCounts.shipped + orderCounts.delivered;

    // Build revenue by status
    const cancelledRevenue = Number(cancelledRevAgg._sum.total ?? 0) - Number(cancelledRevAgg._sum.shippingCost ?? 0);
    const revByStatus = { pending: 0, confirmed: 0, processing: 0, shipped: 0, delivered: 0, cancelled: cancelledRevenue } as Record<string, number>;
    for (const s of revByStatusRaw) {
      if (s.status in revByStatus) revByStatus[s.status] = Number(s._sum.total ?? 0) - Number(s._sum.shippingCost ?? 0);
    }
    // Same rollup for revenue.
    revByStatus.confirmed = revByStatus.confirmed + revByStatus.processing + revByStatus.shipped + revByStatus.delivered;

    const dailyOrders = days.map((day, i) => ({
      date: day.toISOString().slice(5, 10),
      count: dailyCounts[i] as number,
    }));

    const totalRevenue = Number(revenueAgg._sum.total ?? 0) - Number(revenueAgg._sum.shippingCost ?? 0);
    // SSR default is today-scoped, so shipped = today_shipped (same query result)
    const shippedRevenue = Number(shippedRevAgg._sum.total ?? 0) - Number(shippedRevAgg._sum.shippingCost ?? 0);

    const stats = {
      total_orders: totalOrders,
      today_orders: totalOrders,
      total_revenue: totalRevenue,
      today_revenue: totalRevenue,
      cancelled_revenue: cancelledRevenue,
      total_customers: totalCustomers,
      total_products: totalProducts,
      pending_orders: pendingOrders,
      low_stock: lowStockRaw.length,
      low_stock_count: lowStockRaw.length,
      shipped_orders: shippedCount,
      shipped_revenue: shippedRevenue,
      today_shipped: shippedCount,          // same scope → same value
      today_shipped_revenue: shippedRevenue, // same scope → same value
      shipped_customers: shippedCustomerGroups.length,
    };

    const recentOrders = recentOrdersRaw.map((o) => ({
      id: o.id,
      customer_name: o.customerName,
      phone: o.customerPhone ?? undefined,
      total: Number(o.total),
      status: o.status,
      payment_status: o.paymentStatus,
      payment_method: o.paymentMethod,
      created_at: o.createdAt?.toISOString() ?? "",
      items: o.items.map((i) => ({
        id: i.id,
        product_name: i.productName,
        price: Number(i.price),
        quantity: i.quantity,
      })),
    }));

    const topProducts = topProductsRaw.map((p) => ({
      id: p.id,
      name: p.name,
      sold: p.soldCount,
      revenue: p.soldCount * Number(p.price),
      image: p.image ?? undefined,
    }));

    // Build low-stock card payload. Variable products carry the offending
    // variants (label + count) instead of a misleading sum; simple products
    // keep the legacy { stock } field. UI picks layout off `variants`.
    const lowStockItems = lowStockRaw.map((p) => {
      if (p.hasVariations) {
        const lowVariants = (p.variants ?? [])
          .filter((v) => !v.unlimitedStock && (Number(v.stock) || 0) < 10)
          .sort((a, b) => (Number(a.stock) || 0) - (Number(b.stock) || 0))
          .map((v) => ({ label: v.label, stock: Number(v.stock) || 0 }));
        return {
          id: p.id, name: p.name, image: p.image ?? undefined,
          stock: lowVariants.reduce((s, v) => s + v.stock, 0), // total of low ones
          variants: lowVariants,
        };
      }
      return { id: p.id, name: p.name, stock: p.stock, image: p.image ?? undefined };
    });

    return (
      <DashboardPage
        initialData={{
          stats,
          orderCounts: orderCounts as any,
          revByStatus: revByStatus as any,
          dailyOrders,
          recentOrders: recentOrders as any,
          topProducts,
          lowStockItems,
          initialFrom: todayStr,
          initialTo: todayStr,
        }}
      />
    );
  } catch {
    return <DashboardPage />;
  }
}
