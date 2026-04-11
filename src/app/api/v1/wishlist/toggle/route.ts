import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, unauthorized } from "@/lib/api-response";
import { getSessionUser } from "@/lib/auth-helpers";

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const { product_id } = await request.json();

  const existing = await prisma.wishlist.findFirst({
    where: { userId: user.id, productId: product_id },
  });

  if (existing) {
    await prisma.wishlist.delete({ where: { id: existing.id } });
    return jsonResponse({ message: "Removed from wishlist", wishlisted: false });
  }

  await prisma.wishlist.create({
    data: { userId: user.id, productId: product_id },
  });

  return jsonResponse({ message: "Added to wishlist", wishlisted: true });
}
