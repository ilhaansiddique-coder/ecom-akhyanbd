import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse } from "@/lib/api-response";
import { paginatedResponse } from "@/lib/paginate";

export async function GET() {
  const brands = await prisma.brand.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { products: { where: { isActive: true } } } },
    },
  });

  const result = brands.map((b) => ({
    ...serialize(b),
    products_count: b._count.products,
  }));

  return jsonResponse(
    paginatedResponse(result, { page: 1, perPage: result.length || 1, total: result.length }),
  );
}
