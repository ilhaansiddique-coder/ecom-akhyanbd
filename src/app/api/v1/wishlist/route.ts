import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse, unauthorized } from "@/lib/api-response";
import { getSessionUser } from "@/lib/auth-helpers";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const wishlists = await prisma.wishlist.findMany({
    where: { userId: user.id },
    include: { product: { include: { category: true } } },
  });

  return jsonResponse(wishlists.map(serialize));
}
