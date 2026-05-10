import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonResponse, validationError, notFound, errorResponse } from "@/lib/api-response";
import { withStaff } from "@/lib/auth-helpers";
import { uniqueSlug } from "@/lib/unique-slug";
import { bumpVersion } from "@/lib/sync";
import { revalidateAll } from "@/lib/revalidate";

const categoryPatchSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().optional().nullable(),
  image: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  sort_order: z.number().int().optional(),
  is_active: z.boolean().optional(),
});

export const PATCH = withStaff<{ params: Promise<{ id: string }> }>(async (request, { params }) => {
  const { id } = await params;
  const categoryId = Number(id);
  const existing = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!existing) return notFound("Category not found");

  try {
    const body = await request.json();
    const parsed = categoryPatchSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const data = parsed.data;
    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) {
      const newSlug = await uniqueSlug(data.name, "category", data.slug ?? undefined, categoryId);
      updateData.name = data.name;
      updateData.slug = newSlug;
    } else if (data.slug !== undefined && data.slug !== null) {
      updateData.slug = await uniqueSlug(existing.name, "category", data.slug, categoryId);
    }
    if (data.image !== undefined) updateData.image = data.image;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.sort_order !== undefined) updateData.sortOrder = data.sort_order;
    if (data.is_active !== undefined) updateData.isActive = data.is_active;

    if (Object.keys(updateData).length > 0) {
      await prisma.category.update({ where: { id: categoryId }, data: updateData });
    }

    const updated = await prisma.category.findUnique({
      where: { id: categoryId },
      include: { _count: { select: { products: true } } },
    });
    if (!updated) return notFound("Category not found");

    revalidateAll("categories");
    bumpVersion("categories");
    return jsonResponse({
      data: {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        image: updated.image,
        description: updated.description,
        sortOrder: updated.sortOrder,
        isActive: updated.isActive,
        createdAt: updated.createdAt?.toISOString() ?? null,
        updatedAt: updated.updatedAt?.toISOString() ?? null,
        productsCount: updated._count?.products ?? 0,
      },
    });
  } catch (error) {
    return errorResponse("Failed to update category", 500);
  }
});

export const DELETE = withStaff<{ params: Promise<{ id: string }> }>(async (_request, { params }) => {
  const { id } = await params;
  const categoryId = Number(id);
  const existing = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!existing) return notFound("Category not found");

  await prisma.category.delete({ where: { id: categoryId } });
  revalidateAll("categories");
  bumpVersion("categories");
  return jsonResponse({ data: { id: categoryId, deleted: true } });
});
