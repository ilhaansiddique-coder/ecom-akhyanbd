import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse, notFound } from "@/lib/api-response";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug);

  // Support lookup by slug OR numeric ID
  const isNumericId = /^\d+$/.test(slug);
  const product = await prisma.product.findFirst({
    where: isNumericId
      ? { id: Number(slug), isActive: true }
      : { OR: [{ slug }, { slug: decoded }], isActive: true },
    include: { category: true, brand: true, variants: { where: { isActive: true }, orderBy: { sortOrder: "asc" } } },
  });

  if (!product) return notFound("Product not found");

  return jsonResponse(serialize(product));
}
