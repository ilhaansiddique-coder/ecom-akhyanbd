import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { paginatedResponse } from "@/lib/paginate";
import { jsonResponse } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q") || "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const perPage = 12;

  if (!q.trim()) return jsonResponse(paginatedResponse([], { page, perPage, total: 0 }));

  const where = {
    isActive: true,
    OR: [
      { name: { contains: q } },
      { description: { contains: q } },
      { badge: { contains: q } },
    ],
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: true, brand: true },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.product.count({ where }),
  ]);

  return jsonResponse(paginatedResponse(products, { page, perPage, total }));
}
