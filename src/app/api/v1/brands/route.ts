import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse } from "@/lib/api-response";

export async function GET() {
  const brands = await prisma.brand.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { products: { where: { isActive: true } } } },
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = brands.map((b: any) => ({
    ...serialize(b),
    products_count: b._count.products,
  }));

  return jsonResponse(result);
}
