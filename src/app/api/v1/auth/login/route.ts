import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validation";
import { jsonResponse, validationError } from "@/lib/api-response";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { setSessionCookie } from "@/lib/auth";

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

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return validationError({ email: ["ইমেইল অথবা পাসওয়ার্ড সঠিক নয়।"] });
  }

  const sessionUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
  };

  // Set httpOnly JWT cookie
  await setSessionCookie(sessionUser);

  return jsonResponse({
    user: sessionUser,
    token: "session",
  });
}
