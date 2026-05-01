import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse } from "@/lib/api-response";
import { inStockWhere } from "@/lib/productFilters";

export async function GET() {
  const products = await prisma.product.findMany({
    where: { isActive: true, AND: [inStockWhere] },
    orderBy: { soldCount: "desc" },
    take: 6,
    include: { category: true, brand: true },
  });

  return jsonResponse(products.map(serialize));
}
