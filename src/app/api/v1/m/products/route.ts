import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonResponse, validationError, errorResponse, cachedJsonResponse } from "@/lib/api-response";
import { withStaff } from "@/lib/auth-helpers";
import { productSchema } from "@/lib/validation";
import { uniqueSlug } from "@/lib/unique-slug";
import { bumpVersion } from "@/lib/sync";
import { revalidateAll } from "@/lib/revalidate";
import {
  productListSelect,
  productDetailSelect,
  shapeListProduct,
  shapeDetailProduct,
} from "./_shared";

export const GET = withStaff(async (request) => {
  const { searchParams } = request.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 20));
  const q = searchParams.get("q")?.trim();
  const status = searchParams.get("status");
  const stockFilter = searchParams.get("stockFilter");

  const where: Prisma.ProductWhereInput = { deletedAt: null };
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { slug: { contains: q, mode: "insensitive" } },
    ];
  }
  if (status === "active") where.isActive = true;
  else if (status === "draft") where.isActive = false;

  if (stockFilter === "low") where.stock = { lte: 5 };
  else if (stockFilter === "out") where.stock = { lte: 0 };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      select: productListSelect,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  return cachedJsonResponse({
    data: products.map(shapeListProduct),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  }, { sMaxAge: 60 });
});

// POST mirrors the create logic in /admin/products/route.ts but returns the
// camelCase envelope. Reuses productSchema verbatim.
export const POST = withStaff(async (request) => {
  try {
    const body = await request.json();
    const parsed = productSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const data = parsed.data;
    const slug = await uniqueSlug(data.name, "product", data.slug);

    const rawCatIds: number[] = data.category_ids?.length
      ? data.category_ids
      : data.category_id ? [data.category_id] : [];

    let primaryCategoryId: number | null = rawCatIds[0] ?? null;
    if (!primaryCategoryId) {
      const firstCat = await prisma.category.findFirst({ orderBy: { id: "asc" } });
      if (firstCat) {
        primaryCategoryId = firstCat.id;
        rawCatIds.unshift(firstCat.id);
      } else {
        const uncategorized = await prisma.category.create({
          data: { name: "অশ্রেণীভুক্ত", slug: "uncategorized", isActive: true },
        });
        primaryCategoryId = uncategorized.id;
        rawCatIds.unshift(uncategorized.id);
      }
    }

    const product = await prisma.product.create({
      data: {
        name: data.name,
        slug,
        categoryId: primaryCategoryId,
        categories: rawCatIds.length ? { connect: rawCatIds.map((id) => ({ id })) } : undefined,
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
        unlimitedStock: data.unlimited_stock ?? false,
        soldCount: data.sold_count ?? 0,
        isActive: data.is_active ?? true,
        isFeatured: data.is_featured ?? false,
        hasVariations: data.has_variations ?? false,
        variationType: data.variation_type ?? null,
        customShipping: data.custom_shipping ?? false,
        shippingCost: data.shipping_cost != null ? Number(data.shipping_cost) : null,
        sortOrder: data.sort_order ?? 0,
        ...(data.variants && Array.isArray(data.variants) && data.variants.length > 0 ? {
          variants: {
            create: data.variants.map((v, i) => ({
              label: v.label,
              price: Number(v.price),
              originalPrice: v.original_price ? Number(v.original_price) : null,
              sku: v.sku || null,
              stock: Number(v.stock) || 0,
              unlimitedStock: v.unlimited_stock ?? false,
              image: v.image || null,
              sortOrder: v.sort_order ?? i,
              isActive: v.is_active ?? true,
            })),
          },
        } : {}),
      },
      select: productDetailSelect,
    });

    revalidateAll("products");
    bumpVersion("products", {
      kind: "product.created",
      title: "New product added",
      body: product.name,
      href: `/products/${product.id}`,
      icon: "inventory_2",
      severity: "info",
    });
    return jsonResponse({ data: shapeDetailProduct(product) }, 201);
  } catch (error) {
    console.error("Mobile product create error:", error);
    const msg = error instanceof Error ? error.message : "Failed to create product";
    return errorResponse(msg, 500);
  }
});
