import { prisma } from "@/lib/prisma";
import { jsonResponse, unauthorized } from "@/lib/api-response";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return unauthorized();

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { id: true, name: true, email: true, phone: true, role: true, avatar: true, createdAt: true },
  });

  if (!user) return unauthorized();

  return jsonResponse(user);
}
