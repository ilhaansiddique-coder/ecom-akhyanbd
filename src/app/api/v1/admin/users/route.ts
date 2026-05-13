import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { paginatedResponse } from "@/lib/paginate";
import { jsonResponse, validationError, errorResponse } from "@/lib/api-response";
import { withAdmin } from "@/lib/auth-helpers";
import { userSchema } from "@/lib/validation";
import bcrypt from "bcryptjs";
import { bumpVersion } from "@/lib/sync";

export const GET = withAdmin(async (request) => {
  const { searchParams } = request.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  // 20/page → matches orders/products convention. Pagination only renders
  // when totalPages > 1.
  const perPage = 20;
  const role = searchParams.get("role");
  const search = searchParams.get("search");

  const where: Prisma.UserWhereInput = {};
  if (role) where.role = role;
  if (search) {
    where.OR = [
      { fullName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        image: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.user.count({ where }),
  ]);

  // Transform response to match frontend expectations
  const formattedUsers = users.map((u) => ({
    id: u.id,
    name: u.fullName,
    email: u.email,
    phone: u.phone,
    address: "", // Address is a separate model, return empty for now
    role: u.role,
    avatar: u.image,
    created_at: u.createdAt,
    updated_at: u.updatedAt,
  }));

  return jsonResponse(paginatedResponse(formattedUsers, { page, perPage, total }));
});

export const POST = withAdmin(async (request) => {
  try {
    const body = await request.json();
    const parsed = userSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const data = parsed.data;
    if (!data.password) {
      return errorResponse("Password is required", 422);
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        fullName: data.name,
        email: data.email,
        passwordHash: hashedPassword,
        phone: data.phone ?? null,
        role: data.role || "customer",
      },
    });

    const created = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        image: true,
        role: true,
        createdAt: true,
      },
    });

    // Transform response to match frontend expectations
    const formatted = {
      id: created!.id,
      name: created!.fullName,
      email: created!.email,
      phone: created!.phone,
      address: "",
      role: created!.role,
      avatar: created!.image,
      created_at: created!.createdAt,
    };

    // Admin/staff users land on the staff channel; customers on customers.
    const isStaff = created!.role === "admin";
    bumpVersion(isStaff ? "staff" : "customers", {
      kind: isStaff ? "staff.created" : "customer.created",
      title: isStaff ? "Staff added" : "Customer added",
      body: created!.fullName || created!.email,
      severity: "info",
    });

    return jsonResponse(serialize(formatted), 201);
  } catch (error) {
    console.error("User create error:", error);
    const message = error instanceof Error ? error.message : "Failed to create user";
    return errorResponse(message, 500);
  }
});
