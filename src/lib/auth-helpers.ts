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

/**
 * Require admin OR staff role. Use this on endpoints that staff can manage —
 * currently products and orders. Anything more sensitive (settings, users,
 * customizer, shipping, coupons, banners, etc.) should keep using requireAdmin.
 */
export async function requireStaff(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw unauthorized();
  if (user.role !== "admin" && user.role !== "staff") throw forbidden();
  return user;
}

/** True if the role is admin or staff. Cheap, non-throwing. */
export function isStaffOrAdmin(role: string | null | undefined): boolean {
  return role === "admin" || role === "staff";
}
