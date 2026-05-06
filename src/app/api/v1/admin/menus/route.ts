import { NextRequest } from "next/server";
import { revalidateAll } from "@/lib/revalidate";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse, validationError, errorResponse } from "@/lib/api-response";
import { withAdmin } from "@/lib/auth-helpers";
import { menuSchema } from "@/lib/validation";
import { bumpVersion } from "@/lib/sync";

export const GET = withAdmin(async (_request) => {
  const menus = await prisma.navMenu.findMany({
    include: { children: true },
    orderBy: { sortOrder: "asc" },
  });

  return jsonResponse(menus.map(serialize));
});

export const POST = withAdmin(async (request) => {
  try {
    const body = await request.json();
    const parsed = menuSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const data = parsed.data;

    const menu = await prisma.navMenu.create({
      data: {
        label: data.label,
        url: data.url,
        sortOrder: data.sort_order ?? 0,
        parentId: data.parent_id ?? null,
        isActive: data.is_active ?? true,
      },
    });

    revalidateAll("menus");

    bumpVersion("menus");
    return jsonResponse(serialize(menu), 201);
  } catch (error) {
    return errorResponse("Failed to create menu", 500);
  }
});
