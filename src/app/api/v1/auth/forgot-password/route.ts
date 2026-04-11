import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validation";
import { jsonResponse, validationError } from "@/lib/api-response";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (rateLimit(`forgot:${ip}`, 5, 60000)) {
    return jsonResponse({ message: "Too many requests." }, 429);
  }

  const body = await request.json();
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) return validationError({ email: ["ইমেইল দিন।"] });

  const { email } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return validationError({ email: ["এই ইমেইল দিয়ে কোনো অ্যাকাউন্ট পাওয়া যায়নি।"] });
  }

  const code = crypto.randomBytes(3).toString("hex").substring(0, 6);
  const hashedCode = await bcrypt.hash(code, 10);

  await prisma.passwordResetToken.upsert({
    where: { email },
    update: { token: hashedCode, createdAt: new Date() },
    create: { email, token: hashedCode, createdAt: new Date() },
  });

  // TODO: Send code via email
  return jsonResponse({ message: "রিসেট কোড আপনার ইমেইলে পাঠানো হয়েছে।" });
}
