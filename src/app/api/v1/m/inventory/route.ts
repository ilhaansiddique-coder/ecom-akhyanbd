import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonResponse } from "@/lib/api-response";
import { withAdmin } from "@/lib/auth-helpers";

const LOW_THRESHOLD = 5;
const CRITICAL_THRESHOLD = 2;

function levelFor(stock: number, unlimited: boolean | null | undefined): string {
  if (unlimited) return "unlimited";
  if (stock <= CRITICAL_THRESHOLD) return "critical";
  if (stock <= LOW_THRESHOLD) return "low";
  return "ok";
}

// Inventory list with summary. Shape:
//   { data: InventoryItem[], pagination: {...}, summary: { criticalCount, lowThreshold } }
export const GET = withAdmin(async (request) => {
  const { searchParams } = request.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(200, Math.max(1, Number(searchParams.get("pageSize")) || 50));
  const stockFilter = searchParams.get("stockFilter");
  const q = searchParams.get("q")?.trim();

  const where: Prisma.ProductWhereInput = { deletedAt: null };
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { slug: { contains: q, mode: "insensitive" } },
    ];
  }
  if (stockFilter === "critical") where.stock = { lte: CRITICAL_THRESHOLD };
  else if (stockFilter === "low") where.stock = { lte: LOW_THRESHOLD };
  else if (stockFilter === "out") where.stock = { lte: 0 };

  const [products, total, criticalCount] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { stock: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        slug: true,
        image: true,
        stock: true,
        unlimitedStock: true,
        soldCount: true,
        price: true,
        hasVariations: true,
      },
    }),
    prisma.product.count({ where }),
    prisma.product.count({ where: { deletedAt: null, stock: { lte: CRITICAL_THRESHOLD } } }),
  ]);

  const data = products.map((p) => ({
    id: String(p.id),
    name: p.name,
    slug: p.slug,
    image: p.image,
    stock: p.stock,
    unlimitedStock: p.unlimitedStock,
    soldCount: p.soldCount,
    price: p.price,
    hasVariations: p.hasVariations,
    level: levelFor(p.stock, p.unlimitedStock),
    variants: [],
  }));

  return jsonResponse({
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
    summary: {
      criticalCount,
      lowThreshold: LOW_THRESHOLD,
    },
  });
});
