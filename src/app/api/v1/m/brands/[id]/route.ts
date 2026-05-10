import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonResponse, validationError, notFound, errorResponse } from "@/lib/api-response";
import { withStaff } from "@/lib/auth-helpers";
import { uniqueSlug } from "@/lib/unique-slug";
import { bumpVersion } from "@/lib/sync";
import { revalidateAll } from "@/lib/revalidate";

const brandPatchSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().optional().nullable(),
  logo: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
});

export const PATCH = withStaff<{ params: Promise<{ id: string }> }>(async (request, { params }) => {
  const { id } = await params;
  const brandId = Number(id);
  const existing = await prisma.brand.findUnique({ where: { id: brandId } });
  if (!existing) return notFound("Brand not found");

  try {
    const body = await request.json();
    const parsed = brandPatchSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const data = parsed.data;
    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) {
      const newSlug = await uniqueSlug(data.name, "brand", data.slug ?? undefined, brandId);
      updateData.name = data.name;
      updateData.slug = newSlug;
    } else if (data.slug !== undefined && data.slug !== null) {
      updateData.slug = await uniqueSlug(existing.name, "brand", data.slug, brandId);
    }
    if (data.logo !== undefined) updateData.logo = data.logo;
    if (data.is_active !== undefined) updateData.isActive = data.is_active;

    if (Object.keys(updateData).length > 0) {
      await prisma.brand.update({ where: { id: brandId }, data: updateData });
    }

    const updated = await prisma.brand.findUnique({
      where: { id: brandId },
      include: { _count: { select: { products: true } } },
    });
    if (!updated) return notFound("Brand not found");

    revalidateAll("brands");
    bumpVersion("brands");
    return jsonResponse({
      data: {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        logo: updated.logo,
        isActive: updated.isActive,
        createdAt: updated.createdAt?.toISOString() ?? null,
        updatedAt: updated.updatedAt?.toISOString() ?? null,
        productsCount: updated._count?.products ?? 0,
      },
    });
  } catch (error) {
    return errorResponse("Failed to update brand", 500);
  }
});

export const DELETE = withStaff<{ params: Promise<{ id: string }> }>(async (_request, { params }) => {
  const { id } = await params;
  const brandId = Number(id);
  const existing = await prisma.brand.findUnique({ where: { id: brandId } });
  if (!existing) return notFound("Brand not found");

  await prisma.brand.delete({ where: { id: brandId } });
  revalidateAll("brands");
  bumpVersion("brands");
  return jsonResponse({ data: { id: brandId, deleted: true } });
});
