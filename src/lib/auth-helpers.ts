import { getSessionUser, type SessionUser } from "./auth";
import { unauthorized, forbidden } from "./api-response";

export type { SessionUser };
export { getSessionUser };

/**
 * Require authentication. Returns the user or throws a NextResponse.
 */
export async function requireAuth(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw unauthorized();
  return user;
}

/**
 * Require admin role. Returns the user or throws a NextResponse.
 */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw unauthorized();
  if (user.role !== "admin") throw forbidden();
  return user;
}
