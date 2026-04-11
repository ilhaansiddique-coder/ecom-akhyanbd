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

    const [
      totalOrders,
      todayOrders,
      revenueResult,
      totalCustomers,
      totalProducts,
      activeProducts,
      pendingOrders,
      lowStockCount,
      recentOrders,
      topProducts,
      lowStockProducts,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { createdAt: { gte: today } } }),
      prisma.order.aggregate({ _sum: { total: true } }),
      prisma.user.count({ where: { role: "customer" } }),
      prisma.product.count(),
      prisma.product.count({ where: { isActive: true } }),
      prisma.order.count({ where: { status: "pending" } }),
      prisma.product.count({ where: { stock: { lt: 10 } } }),
      prisma.order.findMany({
        take: 10,
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
    ]);

    return jsonResponse({
      stats: serialize({
        totalOrders,
        todayOrders,
        totalRevenue: Number(revenueResult._sum.total || 0),
        totalCustomers,
        totalProducts,
        activeProducts,
        pendingOrders,
        lowStockCount,
      }),
      recent_orders: recentOrders.map(serialize),
      top_products: topProducts.map(serialize),
      low_stock: lowStockProducts.map(serialize),
    });
  } catch (error) {
    return errorResponse("Failed to fetch dashboard data", 500);
  }
}
