import { prisma } from "@/lib/prisma";
import { jsonResponse, validationError, errorResponse } from "@/lib/api-response";
import { withStaff } from "@/lib/auth-helpers";
import { categorySchema } from "@/lib/validation";
import { uniqueSlug } from "@/lib/unique-slug";
import { bumpVersion } from "@/lib/sync";
import { revalidateAll } from "@/lib/revalidate";

export const GET = withStaff(async () => {
  const categories = await prisma.category.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { sortOrder: "asc" },
  });

  const result = categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    image: cat.image,
    description: cat.description,
    sortOrder: cat.sortOrder,
    isActive: cat.isActive,
    createdAt: cat.createdAt?.toISOString() ?? null,
    updatedAt: cat.updatedAt?.toISOString() ?? null,
    productsCount: cat._count?.products ?? 0,
  }));

  return jsonResponse({ data: result });
});

export const POST = withStaff(async (request) => {
  try {
    const body = await request.json();
    const parsed = categorySchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const data = parsed.data;
    const slug = await uniqueSlug(data.name, "category", data.slug);

    const category = await prisma.category.create({
      data: {
        name: data.name,
        slug,
        image: data.image ?? null,
        description: data.description ?? null,
        sortOrder: data.sort_order ?? 0,
        isActive: data.is_active ?? true,
      },
    });

    revalidateAll("categories");
    bumpVersion("categories");
    return jsonResponse({ data: { id: category.id } }, 201);
  } catch (error) {
    return errorResponse("Failed to create category", 500);
  }
});
