import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse } from "@/lib/api-response";
import { paginatedResponse } from "@/lib/paginate";

export async function GET() {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      _count: { select: { products: { where: { isActive: true } } } },
    },
  });

  const result = categories.map((cat) => ({
    ...serialize(cat),
    products_count: cat._count.products,
  }));

  return jsonResponse(
    paginatedResponse(result, { page: 1, perPage: result.length || 1, total: result.length }),
  );
}
