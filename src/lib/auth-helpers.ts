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

// ---------------------------------------------------------------------------
// Route-handler wrappers
// ---------------------------------------------------------------------------
// These remove the `let user; try { user = await requireX(); } catch (e) {
// return e as Response; }` boilerplate that was duplicated across ~40 files.
// Use them on Next.js App Router route handlers:
//
//   export const POST = withAdmin(async (req, ctx, user) => {
//     // user: SessionUser, guaranteed admin
//     ...
//   });
//
// For routes without dynamic params, ctx is just `unknown` — ignore it.
// For routes with params: `withStaff<{ params: Promise<{ id: string }> }>(...)`.

type RouteHandler<TCtx> = (
  req: import("next/server").NextRequest,
  ctx: TCtx,
  user: SessionUser,
) => Promise<Response> | Response;

export function withAuth<TCtx = unknown>(handler: RouteHandler<TCtx>) {
  return async (req: import("next/server").NextRequest, ctx: TCtx) => {
    let user: SessionUser;
    try { user = await requireAuth(); } catch (e) { return e as Response; }
    return handler(req, ctx, user);
  };
}

export function withAdmin<TCtx = unknown>(handler: RouteHandler<TCtx>) {
  return async (req: import("next/server").NextRequest, ctx: TCtx) => {
    let user: SessionUser;
    try { user = await requireAdmin(); } catch (e) { return e as Response; }
    return handler(req, ctx, user);
  };
}

export function withStaff<TCtx = unknown>(handler: RouteHandler<TCtx>) {
  return async (req: import("next/server").NextRequest, ctx: TCtx) => {
    let user: SessionUser;
    try { user = await requireStaff(); } catch (e) { return e as Response; }
    return handler(req, ctx, user);
  };
}
