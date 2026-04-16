import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse } from "@/lib/api-response";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug);

  // Find product by slug to get its ID
  const product = await prisma.product.findFirst({
    where: { OR: [{ slug }, { slug: decoded }] },
    select: { id: true },
  });

  if (!product) return jsonResponse([]);

  const reviews = await prisma.review.findMany({
    where: { productId: product.id, isApproved: true },
    orderBy: { createdAt: "desc" },
  });

  return jsonResponse(reviews.map(serialize));
}
