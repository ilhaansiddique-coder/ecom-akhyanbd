import { prisma } from "@/lib/prisma";
import { jsonResponse, validationError, errorResponse } from "@/lib/api-response";
import { withStaff } from "@/lib/auth-helpers";
import { brandSchema } from "@/lib/validation";
import { uniqueSlug } from "@/lib/unique-slug";
import { bumpVersion } from "@/lib/sync";
import { revalidateAll } from "@/lib/revalidate";

export const GET = withStaff(async () => {
  const brands = await prisma.brand.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });

  const result = brands.map((b) => ({
    id: b.id,
    name: b.name,
    slug: b.slug,
    logo: b.logo,
    isActive: b.isActive,
    createdAt: b.createdAt?.toISOString() ?? null,
    updatedAt: b.updatedAt?.toISOString() ?? null,
    productsCount: b._count?.products ?? 0,
  }));

  return jsonResponse({ data: result });
});

export const POST = withStaff(async (request) => {
  try {
    const body = await request.json();
    const parsed = brandSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const data = parsed.data;
    const slug = await uniqueSlug(data.name, "brand", data.slug);

    const brand = await prisma.brand.create({
      data: {
        name: data.name,
        slug,
        logo: data.logo ?? null,
        isActive: data.is_active ?? true,
      },
    });

    revalidateAll("brands");
    bumpVersion("brands");
    return jsonResponse({ data: { id: brand.id } }, 201);
  } catch (error) {
    return errorResponse("Failed to create brand", 500);
  }
});
