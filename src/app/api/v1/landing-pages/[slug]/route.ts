import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse, notFound } from "@/lib/api-response";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const page = await prisma.landingPage.findFirst({
    where: { slug, isActive: true },
    include: {
      product: { include: { category: true, brand: true } },
    },
  });

  if (!page) return notFound("Landing page not found");

  return jsonResponse(serialize(page));
}
