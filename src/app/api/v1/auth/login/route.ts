import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validation";
import { jsonResponse, validationError } from "@/lib/api-response";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { setSessionCookie, createToken, deriveRole } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (rateLimit(`login:${ip}`, 5, 60000)) {
    return jsonResponse({ message: "Too many requests. Please try again later." }, 429);
  }

  const body = await request.json();
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return validationError({ email: ["ইমেইল এবং পাসওয়ার্ড দিন।"] });
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
    return validationError({ email: ["ইমেইল অথবা পাসওয়ার্ড সঠিক নয়।"] });
  }

  const sessionUser = {
    id: user.id,
    name: user.fullName || email,
    email: user.email,
    phone: user.phone,
    role: deriveRole(user),
  };

  // Set httpOnly JWT cookie (works for same-origin browser clients)
  await setSessionCookie(sessionUser);
  // Also return JWT in response body — required for cross-origin Flutter web
  // (SameSite=Lax cookies are dropped on cross-origin fetch) and mobile clients.
  const token = await createToken(sessionUser);

  return jsonResponse({
    user: sessionUser,
    token,
  });
}
