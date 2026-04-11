import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse, notFound } from "@/lib/api-response";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const product = await prisma.product.findFirst({
    where: { slug, isActive: true },
    include: { category: true, brand: true, landingPage: true },
  });

  if (!product) return notFound("Product not found");

  return jsonResponse(serialize(product));
}
