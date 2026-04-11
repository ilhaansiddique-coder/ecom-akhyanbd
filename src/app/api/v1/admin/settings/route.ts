import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse, errorResponse } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-helpers";

export async function GET(_request: NextRequest) {
  let admin;
  try { admin = await requireAdmin(); } catch (e) { return e as Response; }

  const settings = await prisma.siteSetting.findMany();

  // Convert to key-value object
  const result: Record<string, string | null> = {};
  for (const setting of settings) {
    result[setting.key] = setting.value;
  }

  return jsonResponse(result);
}

export async function PUT(request: NextRequest) {
  let admin;
  try { admin = await requireAdmin(); } catch (e) { return e as Response; }

  try {
    const body = await request.json();

    const updates = Object.entries(body).map(([key, value]) =>
      prisma.siteSetting.upsert({
        where: { key },
        update: { value: value as string },
        create: { key, value: value as string },
      })
    );

    await prisma.$transaction(updates);

    revalidateTag("settings", "max");
    return jsonResponse({ message: "Settings updated" });
  } catch (error) {
    return errorResponse("Failed to update settings", 500);
  }
}
