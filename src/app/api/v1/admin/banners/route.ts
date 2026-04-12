import { NextRequest } from "next/server";
import { revalidateAll } from "@/lib/revalidate";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse, validationError, errorResponse } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-helpers";
import { bannerSchema } from "@/lib/validation";

export async function GET(_request: NextRequest) {
  let admin;
  try { admin = await requireAdmin(); } catch (e) { return e as Response; }

  const banners = await prisma.banner.findMany({
    orderBy: { sortOrder: "asc" },
  });

  return jsonResponse(banners.map(serialize));
}

export async function POST(request: NextRequest) {
  let admin;
  try { admin = await requireAdmin(); } catch (e) { return e as Response; }

  try {
    const body = await request.json();
    const parsed = bannerSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const data = parsed.data;

    const banner = await prisma.banner.create({
      data: {
        title: data.title,
        subtitle: data.subtitle ?? null,
        description: data.description ?? null,
        buttonText: data.button_text ?? null,
        buttonUrl: data.button_url ?? null,
        image: data.image ?? null,
        gradient: data.gradient ?? null,
        emoji: data.emoji ?? null,
        position: data.position ?? "hero",
        sortOrder: data.sort_order ?? 0,
        isActive: data.is_active ?? true,
      },
    });

    revalidateAll("banners");
    return jsonResponse(serialize(banner), 201);
  } catch (error) {
    return errorResponse("Failed to create banner", 500);
  }
}
