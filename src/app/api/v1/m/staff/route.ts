import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonResponse, validationError, errorResponse } from "@/lib/api-response";
import { withAdmin } from "@/lib/auth-helpers";
import { mobileStaffCreateSchema } from "@/lib/validation";
import { bumpVersion } from "@/lib/sync";
import { revalidateAll } from "@/lib/revalidate";

type StaffRow = {
  id: string;
  fullName: string | null;
  email: string;
  phone: string | null;
  image: string | null;
  role: string;
  isSuperAdmin: boolean;
  createdAt: Date | null;
};

function toStaffDto(u: StaffRow) {
  // role: "admin" wins if isSuperAdmin even when the column says otherwise.
  const role = u.isSuperAdmin ? "admin" : u.role;
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

export const GET = withAdmin(async (_request) => {
  const where: Prisma.UserWhereInput = {
    OR: [{ role: { in: ["admin", "staff"] } }, { isSuperAdmin: true }],
  };

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      image: true,
      role: true,
      isSuperAdmin: true,
      createdAt: true,
    },
  });

  return jsonResponse({ data: users.map(toStaffDto) });
});

export const POST = withAdmin(async (request) => {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return errorResponse("Invalid body", 400);

    const parsed = mobileStaffCreateSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }
    const data = parsed.data;

    const email = data.email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return errorResponse("Email already in use", 409);

    const passwordHash = await bcrypt.hash(data.password, 12);

    const created = await prisma.user.create({
      data: {
        fullName: data.name,
        email,
        passwordHash,
        phone: data.phone ?? null,
        role: data.role,
        isSuperAdmin: data.role === "admin",
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        image: true,
        role: true,
        isSuperAdmin: true,
        createdAt: true,
      },
    });

    revalidateAll("staff");
    bumpVersion("staff");
    return jsonResponse({ data: toStaffDto(created) }, 201);
  } catch (error) {
    console.error("[m/staff] create error:", error);
    return errorResponse("Failed to create staff member", 500);
  }
});
