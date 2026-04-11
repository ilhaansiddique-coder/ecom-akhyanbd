import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { paginatedResponse } from "@/lib/paginate";
import { jsonResponse, validationError, errorResponse } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-helpers";
import { productSchema } from "@/lib/validation";
import { uniqueSlug } from "@/lib/unique-slug";
import { bumpVersion } from "@/lib/sync";

export async function GET(request: NextRequest) {
  let admin;
  try { admin = await requireAdmin(); } catch (e) { return e as Response; }

  const { searchParams } = request.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const perPage = 15;
  const search = searchParams.get("search");
  const categoryId = searchParams.get("category_id");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (search) where.name = { contains: search };
  if (categoryId) where.categoryId = Number(categoryId);

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: true, brand: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.product.count({ where }),
  ]);

  return jsonResponse(paginatedResponse(products, { page, perPage, total }));
}

export async function POST(request: NextRequest) {
  let admin;
  try { admin = await requireAdmin(); } catch (e) { return e as Response; }

  try {
    const body = await request.json();
    const parsed = productSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const data = parsed.data;
    const slug = await uniqueSlug(data.name, "product", data.slug);

    // If no category selected, use the first available or create "uncategorized"
    let categoryId = data.category_id;
    if (!categoryId) {
      const firstCat = await prisma.category.findFirst({ orderBy: { id: "asc" } });
      if (firstCat) {
        categoryId = firstCat.id;
      } else {
        const uncategorized = await prisma.category.create({
          data: { name: "অশ্রেণীভুক্ত", slug: "uncategorized", isActive: true },
        });
        categoryId = uncategorized.id;
      }
    }

    const product = await prisma.product.create({
      data: {
        name: data.name,
        slug,
        categoryId,
        brandId: data.brand_id ?? null,
        description: data.description,
        price: data.price,
        originalPrice: data.original_price ?? null,
        image: data.image || "/placeholder.svg",
        images: JSON.stringify(data.images ?? []),
        badge: data.badge ?? null,
        badgeColor: data.badge_color ?? null,
        weight: data.weight ?? null,
        stock: data.stock ?? 0,
        soldCount: data.sold_count ?? 0,
        isActive: data.is_active ?? true,
        isFeatured: data.is_featured ?? false,
        sortOrder: data.sort_order ?? 0,
      },
      include: { category: true, brand: true },
    });

    revalidateTag("products", "max");
    bumpVersion("products");
    return jsonResponse(serialize(product), 201);
  } catch (error) {
    console.error("Product create error:", error);
    const msg = error instanceof Error ? error.message : "Failed to create product";
    return errorResponse(msg, 500);
  }
}
