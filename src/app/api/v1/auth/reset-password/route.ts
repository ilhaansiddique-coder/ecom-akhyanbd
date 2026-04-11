import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { resetPasswordSchema } from "@/lib/validation";
import { setSessionCookie } from "@/lib/auth";
import { jsonResponse, validationError } from "@/lib/api-response";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (rateLimit(`reset:${ip}`, 5, 60000)) {
    return jsonResponse({ message: "Too many requests." }, 429);
  }

  const body = await request.json();
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) errors[issue.path.join(".")] = [issue.message];
    return validationError(errors);
  }

  const { email, code, password } = parsed.data;

  const record = await prisma.passwordResetToken.findUnique({ where: { email } });
  if (!record || !(await bcrypt.compare(code, record.token))) {
    return validationError({ code: ["রিসেট কোড সঠিক নয়।"] });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return validationError({ email: ["ব্যবহারকারী পাওয়া যায়নি।"] });

  await prisma.user.update({
    where: { id: user.id },
    data: { password: await bcrypt.hash(password, 12) },
  });

  await prisma.passwordResetToken.delete({ where: { email } });

  const sessionUser = { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role };
  await setSessionCookie(sessionUser);

  return jsonResponse({
    message: "পাসওয়ার্ড রিসেট সফল হয়েছে।",
    user: sessionUser,
    token: "session",
  });
}
