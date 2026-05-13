import { NextRequest } from "next/server";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { SessionUser } from "./auth";
import { unauthorized, forbidden } from "./api-response";

if (!process.env.NEXTAUTH_SECRET) {
  throw new Error(
    "NEXTAUTH_SECRET environment variable is required for mobile auth.",
  );
}
const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
const COOKIE_NAME = "akhiyan_session";
const MOBILE_TOKEN_TTL = 30 * 24 * 60 * 60;

export async function issueMobileToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    id: user.id,
    name: user.name ?? null,
    email: user.email || "",
    phone: user.phone || null,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${MOBILE_TOKEN_TTL}s`)
    .setIssuedAt()
    .sign(SECRET);
}

async function decodeToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return {
      id: String(payload.id ?? ""),
      name: (payload.name as string | null) || null,
      email: (payload.email as string) || "",
      phone: (payload.phone as string | null) || null,
      role: (payload.role as string) || "customer",
    };
  } catch {
    return null;
  }
}

export async function getMobileUser(
  request: NextRequest,
): Promise<SessionUser | null> {
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token && token !== "session") {
      const user = await decodeToken(token);
      if (user) return user;
    }
  }
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(COOKIE_NAME)?.value;
  if (cookieToken) return decodeToken(cookieToken);
  return null;
}

export async function requireMobileAuth(
  request: NextRequest,
): Promise<SessionUser> {
  const user = await getMobileUser(request);
  if (!user) throw unauthorized();
  return user;
}

export async function requireMobileStaff(
  request: NextRequest,
): Promise<SessionUser> {
  const user = await getMobileUser(request);
  if (!user) throw unauthorized();
  if (user.role !== "admin" && user.role !== "staff") throw forbidden();
  return user;
}

export async function requireMobileAdmin(
  request: NextRequest,
): Promise<SessionUser> {
  const user = await getMobileUser(request);
  if (!user) throw unauthorized();
  if (user.role !== "admin") throw forbidden();
  return user;
}
