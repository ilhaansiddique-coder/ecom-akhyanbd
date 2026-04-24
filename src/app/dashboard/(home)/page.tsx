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
    const [
      totalOrders,
      pendingOrders,
      revenueAgg,
      totalProducts,
      totalCustomers,
      recentOrdersRaw,
    ] = await Promise.all([
      prisma.order.count({ where: { status: { not: "trashed" } } }),
      prisma.order.count({ where: { status: "pending" } }),
      prisma.order.aggregate({ _sum: { total: true } }),
      prisma.product.count(),
      prisma.user.count({ where: { role: "customer" } }),
      prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        where: { status: { not: "trashed" } },
        include: { items: true },
      }),
    ]);

    // Order counts by status
    const statusCountsRaw = await prisma.order.groupBy({
      by: ["status"],
      _count: { id: true },
    });
    const orderCounts = { pending: 0, confirmed: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 } as Record<string, number>;
    for (const s of statusCountsRaw) {
      if (s.status in orderCounts) orderCounts[s.status] = s._count.id;
    }

    // Revenue by status
    const revByStatusRaw = await prisma.order.groupBy({
      by: ["status"],
      _sum: { total: true },
    });
    const revByStatus = { pending: 0, confirmed: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 } as Record<string, number>;
    for (const s of revByStatusRaw) {
      if (s.status in revByStatus) revByStatus[s.status] = Number(s._sum.total ?? 0);
    }

    // Today stats — BD timezone (UTC+6, no DST). Hostinger Node has small-icu
    // so we avoid Intl tz lookups and use plain offset math instead.
    const BD_OFFSET_MS = 6 * 60 * 60 * 1000;
    const nowMs = Date.now();
    const bdDayStartShifted = Math.floor((nowMs + BD_OFFSET_MS) / 86400000) * 86400000;
    const today = new Date(bdDayStartShifted - BD_OFFSET_MS);
    const [todayOrders, todayRevAgg] = await Promise.all([
      prisma.order.count({ where: { createdAt: { gte: today }, status: { not: "trashed" } } }),
      prisma.order.aggregate({ where: { createdAt: { gte: today }, status: { not: "trashed" } }, _sum: { total: true } }),
    ]);

    // Low stock
    const lowStockRaw = await prisma.product.findMany({
      where: { stock: { lte: 5 }, unlimitedStock: false },
      take: 10,
      orderBy: { stock: "asc" },
      select: { id: true, name: true, stock: true, image: true },
    });

    // Top products by sold count
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

    const stats = {
      total_orders: totalOrders,
      today_orders: todayOrders,
      total_revenue: Number(revenueAgg._sum.total ?? 0),
      today_revenue: Number(todayRevAgg._sum.total ?? 0),
      total_customers: totalCustomers,
      total_products: totalProducts,
      pending_orders: pendingOrders,
      low_stock: lowStockRaw.length,
      low_stock_count: lowStockRaw.length,
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
        }}
      />
    );
  } catch {
    return <DashboardPage />;
  }
}
