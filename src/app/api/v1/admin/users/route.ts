import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { paginatedResponse } from "@/lib/paginate";
import { jsonResponse, validationError, errorResponse } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-helpers";
import { userSchema } from "@/lib/validation";
import bcrypt from "bcryptjs";

export async function GET(request: NextRequest) {
  let admin;
  try { admin = await requireAdmin(); } catch (e) { return e as Response; }

  const { searchParams } = request.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  // 20/page → matches orders/products convention. Pagination only renders
  // when totalPages > 1.
  const perPage = 20;
  const role = searchParams.get("role");
  const search = searchParams.get("search");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (role) where.role = role;
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true, name: true, email: true, phone: true, address: true, role: true,
        avatar: true, createdAt: true, updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.user.count({ where }),
  ]);

  return jsonResponse(paginatedResponse(users, { page, perPage, total }));
}

export async function POST(request: NextRequest) {
  let admin;
  try { admin = await requireAdmin(); } catch (e) { return e as Response; }

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
        name: data.name,
        email: data.email,
        password: hashedPassword,
        phone: data.phone ?? null,
        address: data.address ?? null,
        role: data.role ?? "customer",
      },
    });

    const created = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, name: true, email: true, phone: true, address: true, role: true, createdAt: true },
    });
    return jsonResponse(serialize(created), 201);
  } catch (error) {
    return errorResponse("Failed to create user", 500);
  }
}
