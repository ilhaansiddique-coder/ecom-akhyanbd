import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse, validationError } from "@/lib/api-response";
import { withAdmin } from "@/lib/auth-helpers";
import { bumpVersion } from "@/lib/sync";
import { revalidateAll } from "@/lib/revalidate";
import { pickBannerFields, toAdminBanner } from "./_shared";

export const GET = withAdmin(async (request) => {
  const position = request.nextUrl.searchParams.get("position")?.trim();
  const where: Prisma.BannerWhereInput = {};
  if (position) where.position = position;

  const banners = await prisma.banner.findMany({
    where,
    orderBy: { sortOrder: "asc" },
  });

  return jsonResponse({ data: banners.map(toAdminBanner) });
});

export const POST = withAdmin(async (request) => {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const f = pickBannerFields(body);

    if (!f.title || typeof f.title !== "string" || !f.title.trim()) {
      return validationError({ title: ["Title is required"] });
    }

    const banner = await prisma.banner.create({
      data: {
        title: f.title,
        subtitle: f.subtitle ?? null,
        description: f.description ?? null,
        buttonText: f.buttonText ?? null,
        buttonUrl: f.buttonUrl ?? null,
        image: f.image ?? null,
        gradient: f.gradient ?? null,
        emoji: f.emoji ?? null,
        position: f.position ?? "hero",
        sortOrder: f.sortOrder ?? 0,
        isActive: f.isActive ?? true,
      },
    });

    revalidateAll("banners");
    bumpVersion("banners");
    return jsonResponse({ data: toAdminBanner(banner) }, 201);
  } catch {
    return errorResponse("Failed to create banner", 500);
  }
});
