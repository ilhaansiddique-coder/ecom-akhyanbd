import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse } from "@/lib/api-response";

export async function GET() {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      _count: { select: { products: { where: { isActive: true } } } },
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = categories.map((cat: any) => ({
    ...serialize(cat),
    products_count: cat._count.products,
  }));

  return jsonResponse(result);
}
