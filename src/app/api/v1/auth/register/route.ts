import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validation";
import { jsonResponse, validationError } from "@/lib/api-response";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { setSessionCookie, createToken, deriveRole } from "@/lib/auth";
import { sendWelcomeEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (rateLimit(`register:${ip}`, 5, 60000)) {
    return jsonResponse({ message: "Too many requests. Please try again later." }, 429);
  }

  const body = await request.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      errors[key] = [issue.message];
    }
    return validationError(errors);
  }

  const { name, email, password, phone } = parsed.data;

  // Check unique email
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return validationError({ email: ["এই ইমেইল দিয়ে ইতিমধ্যে একটি অ্যাকাউন্ট আছে।"] });
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { fullName: name, email, passwordHash: hashedPassword, phone: phone || null },
  });

  const sessionUser = {
    id: user.id,
    name: user.fullName || email,
    email: user.email,
    phone: user.phone,
    role: deriveRole(user),
  };

  await setSessionCookie(sessionUser);
  const token = await createToken(sessionUser);

  sendWelcomeEmail(email, user.fullName || name);

  return jsonResponse({ user: sessionUser, token }, 201);
}
