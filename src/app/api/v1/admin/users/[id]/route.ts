import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse, validationError, notFound, errorResponse } from "@/lib/api-response";
import { withAdmin } from "@/lib/auth-helpers";
import { userSchema } from "@/lib/validation";
import bcrypt from "bcryptjs";
import { bumpVersion } from "@/lib/sync";

export const PUT = withAdmin<{ params: Promise<{ id: string }> }>(async (request, { params }) => {
  const { id } = await params;
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return notFound("User not found");

  try {
    const body = await request.json();
    const parsed = userSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const data = parsed.data;

    const updateData: Prisma.UserUpdateInput = {
      fullName: data.name,
      email: data.email,
      phone: data.phone ?? null,
      isSuperAdmin: data.role === "admin",
    };

    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    const { passwordHash, ...userWithoutPassword } = user;
    const isStaff = !!user.isSuperAdmin;
    bumpVersion(isStaff ? "staff" : "customers", {
      kind: isStaff ? "staff.updated" : "customer.updated",
      title: isStaff ? "Staff updated" : "Customer updated",
      body: user.fullName || user.email,
      severity: "info",
    });
    return jsonResponse(serialize(userWithoutPassword));
  } catch (error) {
    console.error("User update error:", error);
    const message = error instanceof Error ? error.message : "Failed to update user";
    return errorResponse(message, 500);
  }
});

export const DELETE = withAdmin<{ params: Promise<{ id: string }> }>(async (_request, { params }) => {
  const { id } = await params;
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return notFound("User not found");

  try {
    await prisma.user.delete({ where: { id } });
    const wasStaff = !!existing.isSuperAdmin;
    bumpVersion(wasStaff ? "staff" : "customers", {
      kind: wasStaff ? "staff.deleted" : "customer.deleted",
      title: wasStaff ? "Staff removed" : "Customer removed",
      body: existing.fullName || existing.email,
      severity: "warn",
    });
    return jsonResponse({ message: "User deleted" });
  } catch (error) {
    console.error("User delete error:", error);
    const message = error instanceof Error ? error.message : "Failed to delete user";
    return errorResponse(message, 500);
  }
});
