import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonResponse, notFound } from "@/lib/api-response";
import { withAdmin } from "@/lib/auth-helpers";

// Mobile-shaped customer detail. Matches Flutter's CustomerDetail.fromJson:
//   { data: { id, name, email, phone, address, avatar, createdAt,
//             stats: { ordersCount, totalSpent, lastOrderAt },
//             orders: OrderListItem[] } }
export const GET = withAdmin<{ params: Promise<{ id: string }> }>(
  async (_request, { params }) => {
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        address: true,
        image: true,
        createdAt: true,
      },
    });
    if (!user) return notFound("Customer not found");

    // All paid orders for the spend rollup, plus the most-recent 50 for the
    // detail screen's order list. Unlike the customers/list query we don't
    // need a count() — orders.length suffices for ordersCount on this page.
    const orders = await prisma.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
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
    });

    const totalSpent = orders
      .filter((o) => o.paymentStatus === "paid")
      .reduce((sum, o) => sum + (o.total ?? 0), 0);
    const lastOrderAt = orders[0]?.createdAt ?? null;

    return jsonResponse({
      data: {
        id: user.id,
        name: user.fullName ?? "",
        email: user.email,
        phone: user.phone,
        address: user.address,
        avatar: user.image,
        createdAt: user.createdAt?.toISOString() ?? null,
        stats: {
          ordersCount: orders.length,
          totalSpent,
          lastOrderAt: lastOrderAt?.toISOString() ?? null,
        },
        orders: orders.map((o) => ({
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
      },
    });
  },
);
