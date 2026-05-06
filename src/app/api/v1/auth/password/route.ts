import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { updatePasswordSchema } from "@/lib/validation";
import { jsonResponse, validationError } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth-helpers";

export async function PUT(request: NextRequest) {
  let user;
  try { user = await requireAuth(); } catch (e) { return e as Response; }

  const body = await request.json();
  const parsed = updatePasswordSchema.safeParse(body);
  if (!parsed.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) errors[issue.path.join(".")] = [issue.message];
    return validationError(errors);
  }

  const { current_password, password } = parsed.data;

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser || !dbUser.passwordHash || !(await bcrypt.compare(current_password, dbUser.passwordHash))) {
    return validationError({ current_password: ["বর্তমান পাসওয়ার্ড সঠিক নয়।"] });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(password, 12) },
  });

  return jsonResponse({ message: "পাসওয়ার্ড পরিবর্তন হয়েছে।" });
}
