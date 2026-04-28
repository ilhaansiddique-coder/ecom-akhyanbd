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
    // BD date string e.g. "2026-04-28" (add 6 h to get UTC midnight of the BD day)
    const todayStr = new Date(today.getTime() + BD_OFFSET_MS).toISOString().slice(0, 10);

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
      todayShippedCount,
      todayShippedRevAgg,
      shippedCustomerGroups,
    ] = await Promise.all([
      // All date-filterable order queries scoped to today (default view)
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
      prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        where: { status: { not: "trashed" }, createdAt: { gte: today } },
        include: { items: true },
      }),
      // Courier-sent ("actual sales") stats — today-scoped for SSR default
      prisma.order.count({ where: { status: "shipped", createdAt: { gte: today } } }),
      prisma.order.aggregate({
        _sum: { total: true, shippingCost: true },
        where: { status: "shipped", createdAt: { gte: today } },
      }),
      // todayShipped / todayShippedRevenue — always today (same as above when default=today)
      prisma.order.count({ where: { status: "shipped", createdAt: { gte: today } } }),
      prisma.order.aggregate({
        _sum: { total: true, shippingCost: true },
        where: { status: "shipped", createdAt: { gte: today } },
      }),
      prisma.order.groupBy({ by: ["customerPhone"], where: { status: "shipped", createdAt: { gte: today } } }),
    ]);

    // Order counts by status (today-scoped)
    const statusCountsRaw = await prisma.order.groupBy({
      by: ["status"],
      _count: { id: true },
      where: { createdAt: { gte: today } },
    });
    const orderCounts = { pending: 0, confirmed: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 } as Record<string, number>;
    for (const s of statusCountsRaw) {
      if (s.status in orderCounts) orderCounts[s.status] = s._count.id;
    }

    // Revenue by status (non-cancelled, today-scoped)
    const revByStatusRaw = await prisma.order.groupBy({
      by: ["status"],
      _sum: { total: true, shippingCost: true },
      where: { status: { notIn: ["cancelled", "trashed"] }, createdAt: { gte: today } },
    });
    const cancelledRevenue = Number(cancelledRevAgg._sum.total ?? 0) - Number(cancelledRevAgg._sum.shippingCost ?? 0);
    const revByStatus = { pending: 0, confirmed: 0, processing: 0, shipped: 0, delivered: 0, cancelled: cancelledRevenue } as Record<string, number>;
    for (const s of revByStatusRaw) {
      if (s.status in revByStatus) revByStatus[s.status] = Number(s._sum.total ?? 0) - Number(s._sum.shippingCost ?? 0);
    }

    // Low stock (always real-time, no date filter)
    const lowStockRaw = await prisma.product.findMany({
      where: { stock: { lte: 5 }, unlimitedStock: false },
      take: 10,
      orderBy: { stock: "asc" },
      select: { id: true, name: true, stock: true, image: true },
    });

    // Top products by sold count (always all-time)
    const topProductsRaw = await prisma.product.findMany({
      orderBy: { soldCount: "desc" },
      take: 5,
      select: { id: true, name: true, soldCount: true, price: true, image: true },
    });

    // Daily orders last 7 days — BD-day buckets
    const days: Date[] = [];
    for (let i = 6; i >= 0; i--) {
      days.push(new Date(today.getTime() - i * 86400000));
    }
    const dailyCounts = await Promise.all(
      days.map((day) => {
        const next = new Date(day.getTime() + 86400000);
        return prisma.order.count({
          where: { createdAt: { gte: day, lt: next }, status: { not: "trashed" } },
        });
      })
    );
    const dailyOrders = days.map((day, i) => ({
      date: day.toISOString().slice(5, 10),
      count: dailyCounts[i],
    }));

    const totalRevenue = Number(revenueAgg._sum.total ?? 0) - Number(revenueAgg._sum.shippingCost ?? 0);

    const stats = {
      total_orders: totalOrders,
      today_orders: totalOrders,          // same value — both scoped to today
      total_revenue: totalRevenue,
      today_revenue: totalRevenue,         // same value
      cancelled_revenue: cancelledRevenue,
      total_customers: totalCustomers,
      total_products: totalProducts,
      pending_orders: pendingOrders,
      low_stock: lowStockRaw.length,
      low_stock_count: lowStockRaw.length,
      // Courier-sent ("actual sales") stats
      shipped_orders: shippedCount,
      shipped_revenue: Number(shippedRevAgg._sum.total ?? 0) - Number(shippedRevAgg._sum.shippingCost ?? 0),
      today_shipped: todayShippedCount,
      today_shipped_revenue: Number(todayShippedRevAgg._sum.total ?? 0) - Number(todayShippedRevAgg._sum.shippingCost ?? 0),
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

    const lowStockItems = lowStockRaw.map((p) => ({
      id: p.id,
      name: p.name,
      stock: p.stock,
      image: p.image ?? undefined,
    }));

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
