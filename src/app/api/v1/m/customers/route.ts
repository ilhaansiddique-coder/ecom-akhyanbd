import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonResponse, cachedJsonResponse } from "@/lib/api-response";
import { withAdmin } from "@/lib/auth-helpers";

// Customers = non-admin users with order rollups (count + total spent).
// Response shape matches Flutter's CustomersApi.list expectations:
//   { data: CustomerListItem[], pagination: { page, pageSize, total, totalPages } }
export const GET = withAdmin(async (request) => {
  const { searchParams } = request.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 20));
  const q = searchParams.get("q")?.trim();

  const where: Prisma.UserWhereInput = { isSuperAdmin: false };
  if (q) {
    where.OR = [
      { fullName: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        image: true,
        createdAt: true,
        orders: {
          where: { paymentStatus: "paid" },
          select: { total: true },
        },
        _count: { select: { orders: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const data = users.map((u) => ({
    id: u.id,
    name: u.fullName ?? "",
    email: u.email,
    phone: u.phone,
    avatar: u.image,
    createdAt: u.createdAt?.toISOString() ?? null,
    ordersCount: u._count.orders,
    totalSpent: u.orders.reduce((sum, o) => sum + (o.total ?? 0), 0),
  }));

  return cachedJsonResponse({
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  }, { sMaxAge: 60 });
});
