import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";

if (!process.env.NEXTAUTH_SECRET) {
  throw new Error("NEXTAUTH_SECRET environment variable is required. Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"");
}
const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
const COOKIE_NAME = "akhiyan_session";
const MAX_AGE = 7 * 24 * 60 * 60; // 7 days

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
}

/**
 * Single source of truth for deriving the JWT `role` claim from a User row.
 * Respects the `role` column (so DB-set "staff" reaches `requireStaff()`)
 * and promotes `isSuperAdmin` users to "admin" regardless of their stored role.
 */
export function deriveRole(user: { role?: string | null; isSuperAdmin?: boolean | null }): string {
  if (user.isSuperAdmin) return "admin";
  const r = (user.role || "customer").toLowerCase();
  if (r === "admin" || r === "staff") return r;
  return "customer";
}

/**
 * Canonical public shape for a user object across /auth/user, /auth/me,
 * and /auth/profile. Keep this the only place the shape is defined so
 * the three endpoints stay in sync.
 */
export interface PublicUser {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  role: string;
  avatar: string | null;
  createdAt: Date | null;
}

export function serializePublicUser(user: {
  id: string;
  fullName: string | null;
  email: string;
  phone: string | null;
  role?: string | null;
  isSuperAdmin?: boolean | null;
  image: string | null;
  createdAt: Date | null;
}): PublicUser {
  return {
    id: user.id,
    name: user.fullName,
    email: user.email,
    phone: user.phone,
    role: deriveRole(user),
    avatar: user.image,
    createdAt: user.createdAt,
  };
}

/**
 * Create a JWT token for a user.
 */
export async function createToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone || null,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${MAX_AGE}s`)
    .setIssuedAt()
    .sign(SECRET);
}

/**
 * Detect whether the inbound request is over HTTPS. Production cookies
 * with `Secure` set are silently dropped by browsers on plain-HTTP origins
 * (which broke auth on the Coolify deploy that exposes only HTTP via
 * sslip.io). We read `x-forwarded-proto` from the reverse proxy — Coolify,
 * Vercel, and most other platforms set it. Falls back to NODE_ENV when no
 * proxy header is present (covers `next start` on plain HTTP locally).
 */
async function isSecureRequest(): Promise<boolean> {
  try {
    const h = await headers();
    const proto = h.get("x-forwarded-proto") || "";
    if (proto) return proto.split(",")[0].trim().toLowerCase() === "https";
  } catch { /* no request scope (e.g. background job) — fall through */ }
  return process.env.NODE_ENV === "production";
}

/**
 * Set the session cookie with JWT token.
 */
export async function setSessionCookie(user: SessionUser): Promise<void> {
  const token = await createToken(user);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: await isSecureRequest(),
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });
}

/**
 * Clear the session cookie (logout).
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: await isSecureRequest(),
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}

/**
 * Get the current session user from the cookie, or null.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    // Prefer Authorization: Bearer <jwt> (used by Flutter web/mobile clients
    // since SameSite=Lax cookies are dropped on cross-origin fetch).
    let token: string | undefined;
    const headerStore = await headers();
    const auth = headerStore.get("authorization") || headerStore.get("Authorization");
    if (auth?.startsWith("Bearer ")) token = auth.slice(7).trim();
    if (!token) {
      const cookieStore = await cookies();
      token = cookieStore.get(COOKIE_NAME)?.value;
    }
    if (!token) return null;

    const { payload } = await jwtVerify(token, SECRET);
    return {
      id: payload.id as string,
      name: payload.name as string,
      email: payload.email as string,
      phone: (payload.phone as string | null) || null,
      role: payload.role as string,
    };
  } catch {
    return null;
  }
}

// Re-export for backward compatibility
export const auth = getSessionUser;
export const handlers = { GET: () => new Response("OK"), POST: () => new Response("OK") };
export const signIn = () => {};
export const signOut = () => {};
