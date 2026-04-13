import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse, validationError, notFound, errorResponse } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-helpers";
import { userSchema } from "@/lib/validation";
import bcrypt from "bcryptjs";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let admin;
  try { admin = await requireAdmin(); } catch (e) { return e as Response; }

  const { id } = await params;
  const existing = await prisma.user.findUnique({ where: { id: Number(id) } });
  if (!existing) return notFound("User not found");

  try {
    const body = await request.json();
    const parsed = userSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const data = parsed.data;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {
      name: data.name,
      email: data.email,
      phone: data.phone ?? null,
      address: data.address ?? null,
      role: data.role ?? "customer",
    };

    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    const user = await prisma.user.update({
      where: { id: Number(id) },
      data: updateData,
    });

    const { password, ...userWithoutPassword } = user;
    return jsonResponse(serialize(userWithoutPassword));
  } catch (error) {
    return errorResponse("Failed to update user", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let admin;
  try { admin = await requireAdmin(); } catch (e) { return e as Response; }

  const { id } = await params;
  const existing = await prisma.user.findUnique({ where: { id: Number(id) } });
  if (!existing) return notFound("User not found");

  await prisma.user.delete({ where: { id: Number(id) } });
  return jsonResponse({ message: "User deleted" });
}
