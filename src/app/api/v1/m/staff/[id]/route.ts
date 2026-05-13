import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonResponse, validationError, notFound, errorResponse, forbidden } from "@/lib/api-response";
import { withAdmin } from "@/lib/auth-helpers";
import { mobileStaffUpdateSchema } from "@/lib/validation";
import { bumpVersion } from "@/lib/sync";
import { revalidateAll } from "@/lib/revalidate";

type StaffRow = {
  id: number;
  fullName: string | null;
  email: string;
  phone: string | null;
  image: string | null;
  role: string;
  createdAt: Date | null;
};

function toStaffDto(u: StaffRow) {
  const role = u.role === "admin" ? "admin" : u.role;
  return {
    id: u.id,
    name: u.fullName ?? "",
    email: u.email,
    phone: u.phone,
    role,
    avatar: u.image,
    createdAt: u.createdAt?.toISOString() ?? null,
  };
}

const staffSelect = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  image: true,
  role: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export const PATCH = withAdmin<{ params: Promise<{ id: string }> }>(async (request, { params }, admin) => {
  const id = Number((await params).id);

  const existing = await prisma.user.findUnique({ where: { id }, select: staffSelect });
  if (!existing) return notFound("Staff member not found");

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return errorResponse("Invalid body", 400);

    const parsed = mobileStaffUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }
    const input = parsed.data;

    // Don't let an admin demote themselves and lock the org out.
    if (input.role !== undefined && id === admin.id && input.role !== "admin") {
      return forbidden("You cannot change your own role.");
    }

    const data: Prisma.UserUncheckedUpdateInput = {};
    if (input.name !== undefined) data.fullName = input.name;
    if (input.phone !== undefined) data.phone = input.phone ?? null;
    if (input.role !== undefined) {
      data.role = input.role;
    }

    if (Object.keys(data).length === 0) return errorResponse("Nothing to update", 400);

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: staffSelect,
    });

    revalidateAll("staff");
    bumpVersion("staff");
    return jsonResponse({ data: toStaffDto(updated) });
  } catch (error) {
    console.error("[m/staff] update error:", error);
    return errorResponse("Failed to update staff member", 500);
  }
});

export const DELETE = withAdmin<{ params: Promise<{ id: string }> }>(async (_request, { params }, admin) => {
  const id = Number((await params).id);

  if (id === admin.id) {
    return forbidden("You cannot delete yourself.");
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return notFound("Staff member not found");

  await prisma.user.delete({ where: { id } });
  revalidateAll("staff");
  bumpVersion("staff");
  return jsonResponse({ data: { id, deleted: true } });
});
