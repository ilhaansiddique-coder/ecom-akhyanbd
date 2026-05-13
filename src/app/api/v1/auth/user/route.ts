import { prisma } from "@/lib/prisma";
import { jsonResponse, unauthorized } from "@/lib/api-response";
import { getSessionUser, serializePublicUser } from "@/lib/auth";

// Returns the current user as a flat object. Used by the dashboard frontend.
// Flutter clients should call /auth/me which wraps the same payload in
// { data: ... }; both endpoints share serializePublicUser() so the shape
// inside is identical.
export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return unauthorized();

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { id: true, fullName: true, email: true, phone: true, role: true, image: true, createdAt: true },
  });

  if (!user) return unauthorized();

  return jsonResponse(serializePublicUser(user));
}
