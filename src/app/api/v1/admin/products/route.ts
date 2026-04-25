import { NextRequest } from "next/server";
import { revalidateAll } from "@/lib/revalidate";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { paginatedResponse } from "@/lib/paginate";
import { jsonResponse, validationError, errorResponse } from "@/lib/api-response";
import { requireStaff } from "@/lib/auth-helpers";
import { productSchema } from "@/lib/validation";
import { uniqueSlug } from "@/lib/unique-slug";
import { bumpVersion } from "@/lib/sync";

export async function GET(request: NextRequest) {
  let admin;
  try { admin = await requireStaff(); } catch (e) { return e as Response; }

  const { searchParams } = request.nextUrl;
  const page    = Math.max(1, Number(searchParams.get("page")) || 1);
  // Cap raised to 1000 so the dashboard's full-list refetch (per_page=500)
  // returns every product instead of being silently truncated to 50. The
  // products client paginates + searches in memory, so it needs the
  // complete set; the old 50 cap was hiding older products from view.
  const perPage = Math.min(1000, Math.max(1, Number(searchParams.get("per_page")) || 20));
  const search     = searchParams.get("search");
  const categoryId = searchParams.get("category_id");
  const trash      = searchParams.get("trash") === "1";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (search)     where.name = { contains: search, mode: "insensitive" };
  if (categoryId) where.categoryId = Number(categoryId);
  // Trash view shows only soft-deleted; default view excludes them.
  where.deletedAt = trash ? { not: null } : null;

  const [products, total, soldAgg] = await Promise.all([
    prisma.product.findMany({
      where,
      select: {
        id: true, name: true, slug: true, price: true, originalPrice: true,
        image: true, badge: true, weight: true, stock: true, unlimitedStock: true,
        soldCount: true, isActive: true, isFeatured: true,
        hasVariations: true, variationType: true,
        customShipping: true, shippingCost: true, description: true,
        createdAt: true,
        category: { select: { id: true, name: true } },
        brand:    { select: { id: true, name: true } },
        variants: {
          orderBy: { sortOrder: "asc" },
          select: { id: true, label: true, price: true, originalPrice: true, sku: true, stock: true, unlimitedStock: true, image: true, isActive: true, sortOrder: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.product.count({ where }),
    // Live sold count from OrderItem — excludes cancelled/trashed orders.
    // Must match the SSR path in src/app/dashboard/products/page.tsx so the
    // background refetch doesn't overwrite good counts with stale soldCount.
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: { productId: { not: null }, order: { status: { notIn: ["cancelled", "trashed"] } } },
      _sum: { quantity: true },
    }),
  ]);
  const soldMap = new Map<number, number>();
  for (const row of soldAgg) {
    if (row.productId != null) soldMap.set(row.productId, row._sum.quantity || 0);
  }
  // Merge live sales into each product. `sold_count` (snake) is what the client reads.
  const withSold = products.map((p) => ({
    ...p,
    soldCount: soldMap.get(p.id) ?? p.soldCount,
    sold_count: soldMap.get(p.id) ?? p.soldCount,
  }));

  return jsonResponse(paginatedResponse(withSold, { page, perPage, total }));
}

export async function POST(request: NextRequest) {
  let admin;
  try { admin = await requireStaff(); } catch (e) { return e as Response; }

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
            create: data.variants.map((v: any, i: number) => ({
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
      include: { category: true, brand: true, variants: { orderBy: { sortOrder: "asc" } } },
    });

    revalidateAll("products");
    bumpVersion("products");
    return jsonResponse(serialize(product), 201);
  } catch (error) {
    console.error("Product create error:", error);
    const msg = error instanceof Error ? error.message : "Failed to create product";
    return errorResponse(msg, 500);
  }
}
