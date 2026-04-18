import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { paginatedResponse } from "@/lib/paginate";
import { jsonResponse } from "@/lib/api-response";
import { requireStaff } from "@/lib/auth-helpers";

export async function GET(request: NextRequest) {
  let admin;
  try { admin = await requireStaff(); } catch (e) { return e as Response; }

  const { searchParams } = request.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const perPage = 15;
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { customerName: { contains: search } },
      { customerPhone: { contains: search } },
    ];
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: { items: { include: { product: { select: { image: true } } } }, user: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.order.count({ where }),
  ]);

  return jsonResponse(paginatedResponse(orders, { page, perPage, total }));
}
