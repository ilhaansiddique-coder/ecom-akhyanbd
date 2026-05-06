import { prisma } from "@/lib/prisma";
import { jsonResponse, unauthorized } from "@/lib/api-response";
import { getSessionUser } from "@/lib/auth-helpers";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const count = await prisma.wishlist.count({
    where: { userId: user.id },
  });

  return jsonResponse({ count });
}
