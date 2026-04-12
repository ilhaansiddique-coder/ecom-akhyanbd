import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

if (!process.env.NEXTAUTH_SECRET) {
  throw new Error("NEXTAUTH_SECRET environment variable is required. Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"");
}
const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
const COOKIE_NAME = "mavesoj_session";
const MAX_AGE = 7 * 24 * 60 * 60; // 7 days

export interface SessionUser {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
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
 * Set the session cookie with JWT token.
 */
export async function setSessionCookie(user: SessionUser): Promise<void> {
  const token = await createToken(user);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
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
    secure: process.env.NODE_ENV === "production",
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
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, SECRET);
    return {
      id: payload.id as number,
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
