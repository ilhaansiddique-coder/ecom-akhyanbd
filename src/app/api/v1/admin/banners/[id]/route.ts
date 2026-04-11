import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse, validationError, notFound, errorResponse } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-helpers";
import { bannerSchema } from "@/lib/validation";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let admin;
  try { admin = await requireAdmin(); } catch (e) { return e as Response; }

  const { id } = await params;
  const existing = await prisma.banner.findUnique({ where: { id: Number(id) } });
  if (!existing) return notFound("Banner not found");

  try {
    const body = await request.json();
    const parsed = bannerSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const data = parsed.data;

    const banner = await prisma.banner.update({
      where: { id: Number(id) },
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

    revalidateTag("banners", "max");
    return jsonResponse(serialize(banner));
  } catch (error) {
    return errorResponse("Failed to update banner", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let admin;
  try { admin = await requireAdmin(); } catch (e) { return e as Response; }

  const { id } = await params;
  const existing = await prisma.banner.findUnique({ where: { id: Number(id) } });
  if (!existing) return notFound("Banner not found");

  await prisma.banner.delete({ where: { id: Number(id) } });
  revalidateTag("banners", "max");
  return jsonResponse({ message: "Banner deleted" });
}
