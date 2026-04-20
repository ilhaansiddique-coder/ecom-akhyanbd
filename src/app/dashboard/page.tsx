import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardPage from "./DashboardHomeClient";

export const dynamic = "force-dynamic";

export default async function DashboardServerPage() {
  const user = await getSessionUser();

  // Staff have no dashboard home — bounce them to their first allowed page.
  if (user?.role === "staff") redirect("/dashboard/products");

  // Unauthenticated → bounce to home with ?login=1 so the storefront opens
  // the AuthModal automatically. After successful login the modal pushes
  // back to /dashboard. Critical for the Capacitor Android app, which has
  // no in-app way to "find the login button" otherwise.
  if (!user) {
    redirect("/?login=1&next=/dashboard");
  }

  // Customers without admin role get the customer-view fallback.
  if (user.role !== "admin") {
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

    // Today stats
    const today = new Date(); today.setHours(0, 0, 0, 0);
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

    // Daily orders last 7 days
    const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dailyRaw = await prisma.order.groupBy({
      by: ["createdAt"],
      where: { createdAt: { gte: sevenDaysAgo } },
      _count: { id: true },
    });

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
          dailyOrders: [],
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
