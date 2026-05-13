import { prisma } from "@/lib/prisma";
import { jsonResponse, unauthorized } from "@/lib/api-response";
import { getSessionUser, serializePublicUser } from "@/lib/auth";

// Canonical Flutter contract — { data: {...user} } envelope.
// The flat-object equivalent is /auth/user (used by the dashboard frontend).
// Both endpoints share serializePublicUser() so the user shape stays in sync.
export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return unauthorized();

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { id: true, fullName: true, email: true, phone: true, role: true, image: true, createdAt: true },
  });

  if (!user) return unauthorized();

  return jsonResponse({ data: serializePublicUser(user) });
}
