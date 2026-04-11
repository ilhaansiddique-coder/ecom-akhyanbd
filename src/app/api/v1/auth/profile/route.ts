import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { updateProfileSchema } from "@/lib/validation";
import { jsonResponse, validationError } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth-helpers";

export async function PUT(request: NextRequest) {
  let user;
  try { user = await requireAuth(); } catch (e) { return e as Response; }

  const body = await request.json();
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) errors[issue.path.join(".")] = [issue.message];
    return validationError(errors);
  }

  const data = parsed.data;

  // Check email uniqueness if changing
  if (data.email && data.email !== user.email) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) return validationError({ email: ["এই ইমেইল ইতিমধ্যে ব্যবহৃত হচ্ছে।"] });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.phone !== undefined && { phone: data.phone }),
    },
  });

  return jsonResponse(serialize(updated));
}
