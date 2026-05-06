import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonResponse } from "@/lib/api-response";
import { withStaff } from "@/lib/auth-helpers";

// Mobile-shaped orders list. Returns OrderListItem[] (camelCase) plus
// pagination envelope. Mirrors the filter logic from /admin/orders/route.ts
// but reshapes JSON keys for the Flutter client.
export const GET = withStaff(async (request) => {
  const { searchParams } = request.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 20));
  const q = searchParams.get("q")?.trim();
  const status = searchParams.get("status");
  const flagged = searchParams.get("flagged");

  const where: Prisma.OrderWhereInput = {};
  if (status) {
    where.status = status;
  } else {
    where.status = { not: "trashed" };
  }
  if (q) {
    const asNumber = Number(q);
    where.OR = [
      { customerName: { contains: q, mode: "insensitive" } },
      { customerPhone: { contains: q, mode: "insensitive" } },
      ...(Number.isFinite(asNumber) && asNumber > 0 ? [{ id: asNumber }] : []),
    ];
  }
  if (flagged === "true" || flagged === "1") {
    where.riskScore = { gte: 70 };
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
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
    prisma.order.count({ where }),
  ]);

  const data = orders.map((o) => ({
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
  }));

  return jsonResponse({
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  });
});
