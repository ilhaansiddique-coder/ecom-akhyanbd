import { prisma } from "@/lib/prisma";
import { jsonResponse, unauthorized } from "@/lib/api-response";
import { getSessionUser, deriveRole } from "@/lib/auth";

// Flutter clients call /auth/me and expect { data: {...user...} } envelope.
// (The dashboard frontend uses /auth/user which returns the user directly.)
export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return unauthorized();

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { id: true, fullName: true, email: true, phone: true, role: true, isSuperAdmin: true, image: true, createdAt: true },
  });

  if (!user) return unauthorized();

  return jsonResponse({
    data: {
      id: user.id,
      name: user.fullName,
      email: user.email,
      phone: user.phone,
      role: deriveRole(user),
      avatar: user.image,
      createdAt: user.createdAt,
    },
  });
}
