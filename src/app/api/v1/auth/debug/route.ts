/**
 * GET /api/v1/auth/debug
 *
 * Reports what the server sees about the current session — useful when
 * cookies appear correct in DevTools but `getSessionUser()` keeps
 * returning null (cookie not sent, JWT verify failing on secret mismatch
 * after a redeploy with rotated NEXTAUTH_SECRET, etc.).
 */
import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { jwtVerify } from "jose";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const h = await headers();
  const c = await cookies();
  const cookieHeader = h.get("cookie") || "";
  const sessionCookie = c.get("akhiyan_session")?.value;
  const auth = h.get("authorization");

  let jwtCheck: { ok: boolean; error?: string; payload?: Record<string, unknown> } = { ok: false };
  if (sessionCookie) {
    try {
      const { payload } = await jwtVerify(
        sessionCookie,
        new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "")
      );
      jwtCheck = { ok: true, payload };
    } catch (e) {
      jwtCheck = { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  return NextResponse.json({
    cookieHeaderPresent: !!cookieHeader,
    cookieHeaderLength: cookieHeader.length,
    sessionCookiePresent: !!sessionCookie,
    sessionCookieLength: sessionCookie?.length ?? 0,
    authHeaderPresent: !!auth,
    nextauthSecretPresent: !!process.env.NEXTAUTH_SECRET,
    nextauthSecretLength: (process.env.NEXTAUTH_SECRET || "").length,
    xForwardedProto: h.get("x-forwarded-proto"),
    host: h.get("host"),
    jwtCheck,
  });
}
