import { NextRequest } from "next/server";
import { revalidateAll } from "@/lib/revalidate";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse, validationError, notFound, errorResponse } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-helpers";
import { menuSchema } from "@/lib/validation";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let admin;
  try { admin = await requireAdmin(); } catch (e) { return e as Response; }

  const { id } = await params;
  const existing = await prisma.navMenu.findUnique({ where: { id: Number(id) } });
  if (!existing) return notFound("Menu not found");

  try {
    const body = await request.json();
    const parsed = menuSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const data = parsed.data;

    const menu = await prisma.navMenu.update({
      where: { id: Number(id) },
      data: {
        label: data.label,
        url: data.url,
        sortOrder: data.sort_order ?? 0,
        parentId: data.parent_id ?? null,
        isActive: data.is_active ?? true,
      },
    });

    revalidateAll("menus");
    return jsonResponse(serialize(menu));
  } catch (error) {
    return errorResponse("Failed to update menu", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let admin;
  try { admin = await requireAdmin(); } catch (e) { return e as Response; }

  const { id } = await params;
  const existing = await prisma.navMenu.findUnique({ where: { id: Number(id) } });
  if (!existing) return notFound("Menu not found");

  await prisma.navMenu.delete({ where: { id: Number(id) } });
  revalidateAll("menus");
  return jsonResponse({ message: "Menu deleted" });
}
