import { NextRequest } from "next/server";
import { revalidateAll } from "@/lib/revalidate";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse, validationError, notFound, errorResponse } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-helpers";
import { categorySchema } from "@/lib/validation";
import { uniqueSlug } from "@/lib/unique-slug";
import { bumpVersion } from "@/lib/sync";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let admin;
  try { admin = await requireAdmin(); } catch (e) { return e as Response; }

  const { id } = await params;
  const existing = await prisma.category.findUnique({ where: { id: Number(id) } });
  if (!existing) return notFound("Category not found");

  try {
    const body = await request.json();
    const parsed = categorySchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const data = parsed.data;
    const slug = await uniqueSlug(data.name, "category", data.slug, Number(id));

    const category = await prisma.category.update({
      where: { id: Number(id) },
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
    return jsonResponse(serialize(category));
  } catch (error) {
    return errorResponse("Failed to update category", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let admin;
  try { admin = await requireAdmin(); } catch (e) { return e as Response; }

  const { id } = await params;
  const existing = await prisma.category.findUnique({ where: { id: Number(id) } });
  if (!existing) return notFound("Category not found");

  await prisma.category.delete({ where: { id: Number(id) } });
  revalidateAll("categories");
  bumpVersion("categories");
  return jsonResponse({ message: "Category deleted" });
}
