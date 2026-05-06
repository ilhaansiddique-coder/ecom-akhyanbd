import { NextRequest } from "next/server";
import { revalidateAll } from "@/lib/revalidate";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse, validationError, notFound, errorResponse } from "@/lib/api-response";
import { withStaff } from "@/lib/auth-helpers";
import { brandSchema } from "@/lib/validation";
import { uniqueSlug } from "@/lib/unique-slug";
import { bumpVersion } from "@/lib/sync";

export const PUT = withStaff<{ params: Promise<{ id: string }> }>(async (request, { params }) => {
  const { id } = await params;
  const existing = await prisma.brand.findUnique({ where: { id: Number(id) } });
  if (!existing) return notFound("Brand not found");

  try {
    const body = await request.json();
    const parsed = brandSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const data = parsed.data;
    const slug = await uniqueSlug(data.name, "brand", data.slug, Number(id));

    const brand = await prisma.brand.update({
      where: { id: Number(id) },
      data: {
        name: data.name,
        slug,
        logo: data.logo ?? null,
        isActive: data.is_active ?? true,
      },
    });

    revalidateAll("brands");
    bumpVersion("brands");
    return jsonResponse(serialize(brand));
  } catch (error) {
    return errorResponse("Failed to update brand", 500);
  }
});

export const DELETE = withStaff<{ params: Promise<{ id: string }> }>(async (_request, { params }) => {
  const { id } = await params;
  const existing = await prisma.brand.findUnique({ where: { id: Number(id) } });
  if (!existing) return notFound("Brand not found");

  await prisma.brand.delete({ where: { id: Number(id) } });
  revalidateAll("brands");
  bumpVersion("brands");
  return jsonResponse({ message: "Brand deleted" });
});
