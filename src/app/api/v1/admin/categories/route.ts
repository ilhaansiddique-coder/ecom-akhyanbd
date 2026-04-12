import { NextRequest } from "next/server";
import { revalidateAll } from "@/lib/revalidate";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse, validationError, errorResponse } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-helpers";
import { categorySchema } from "@/lib/validation";
import { uniqueSlug } from "@/lib/unique-slug";
import { bumpVersion } from "@/lib/sync";

export async function GET(_request: NextRequest) {
  let admin;
  try { admin = await requireAdmin(); } catch (e) { return e as Response; }

  const categories = await prisma.category.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { sortOrder: "asc" },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = categories.map((cat: any) => ({
    ...serialize(cat),
    products_count: cat._count?.products ?? 0,
  }));

  return jsonResponse(result);
}

export async function POST(request: NextRequest) {
  let admin;
  try { admin = await requireAdmin(); } catch (e) { return e as Response; }

  try {
    const body = await request.json();
    const parsed = categorySchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const data = parsed.data;
    const slug = await uniqueSlug(data.name, "category", data.slug);

    const category = await prisma.category.create({
      data: {
        name: data.name,
        slug,
        image: data.image ?? null,
        description: data.description ?? null,
        sortOrder: data.sort_order ?? 0,
        isActive: data.is_active ?? true,
      },
    });

    revalidateAll("categories");
    bumpVersion("categories");
    return jsonResponse(serialize(category), 201);
  } catch (error) {
    return errorResponse("Failed to create category", 500);
  }
}
