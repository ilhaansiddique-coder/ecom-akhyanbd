import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse, notFound } from "@/lib/api-response";
import { withAdmin } from "@/lib/auth-helpers";
import { bumpVersion } from "@/lib/sync";
import { revalidateAll } from "@/lib/revalidate";
import { pickBannerFields, toAdminBanner } from "../_shared";

export const PATCH = withAdmin<{ params: Promise<{ id: string }> }>(async (request, { params }) => {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) return notFound("Banner not found");

  const existing = await prisma.banner.findUnique({ where: { id: numericId } });
  if (!existing) return notFound("Banner not found");

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const f = pickBannerFields(body);

    const data: Prisma.BannerUpdateInput = {};
    if (f.title !== undefined) data.title = f.title;
    if (f.subtitle !== undefined) data.subtitle = f.subtitle ?? null;
    if (f.description !== undefined) data.description = f.description ?? null;
    if (f.buttonText !== undefined) data.buttonText = f.buttonText ?? null;
    if (f.buttonUrl !== undefined) data.buttonUrl = f.buttonUrl ?? null;
    if (f.image !== undefined) data.image = f.image ?? null;
    if (f.gradient !== undefined) data.gradient = f.gradient ?? null;
    if (f.emoji !== undefined) data.emoji = f.emoji ?? null;
    if (f.position !== undefined) data.position = f.position ?? "hero";
    if (f.sortOrder !== undefined) data.sortOrder = f.sortOrder ?? 0;
    if (f.isActive !== undefined) data.isActive = f.isActive ?? true;

    const banner = await prisma.banner.update({ where: { id: numericId }, data });

    revalidateAll("banners");
    bumpVersion("banners");
    return jsonResponse({ data: toAdminBanner(banner) });
  } catch {
    return errorResponse("Failed to update banner", 500);
  }
});

export const DELETE = withAdmin<{ params: Promise<{ id: string }> }>(async (_request, { params }) => {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) return notFound("Banner not found");

  const existing = await prisma.banner.findUnique({ where: { id: numericId } });
  if (!existing) return notFound("Banner not found");

  await prisma.banner.delete({ where: { id: numericId } });
  revalidateAll("banners");
  bumpVersion("banners");
  return jsonResponse({ data: { id: numericId, deleted: true } });
});
