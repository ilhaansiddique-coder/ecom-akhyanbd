import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { paginatedResponse } from "@/lib/paginate";

const CACHE_TTL = 60; // seconds

function buildCachedQuery(
  page: number,
  perPage: number,
  categoryId: string | null,
  brandId: string | null,
  isFeatured: string | null,
  sortBy: string,
  sortDir: string,
  excludeCategoryId: string | null,
  excludeId: string | null,
) {
  const sortMap: Record<string, string> = {
    price: "price",
    sold_count: "soldCount",
    created_at: "createdAt",
    sort_order: "sortOrder",
  };
  const orderByField = sortMap[sortBy] || "sortOrder";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { isActive: true, deletedAt: null };
  if (categoryId) where.categoryId = Number(categoryId);
  if (brandId) where.brandId = Number(brandId);
  if (isFeatured === "1" || isFeatured === "true") where.isFeatured = true;
  // Exclusion filters power the PDP "Other Products" infinite-scroll strip
  // by letting the client ask for products from any category EXCEPT the
  // current one, paginated.
  if (excludeCategoryId) where.categoryId = { ...(where.categoryId ? {} : {}), not: Number(excludeCategoryId) };
  if (excludeId) where.id = { not: Number(excludeId) };

  const cacheKey = `products:${page}:${perPage}:${categoryId}:${brandId}:${isFeatured}:${sortBy}:${sortDir}:x${excludeCategoryId || ""}:i${excludeId || ""}`;

  return unstable_cache(
    async () => {
      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            originalPrice: true,
            image: true,
            images: true,
            badge: true,
            badgeColor: true,
            weight: true,
            stock: true,
            unlimitedStock: true,
            soldCount: true,
            isActive: true,
            isFeatured: true,
            hasVariations: true,
            variationType: true,
            customShipping: true,
            shippingCost: true,
            sortOrder: true,
            createdAt: true,
            category: { select: { id: true, name: true, slug: true } },
            brand: { select: { id: true, name: true, slug: true } },
            variants: {
              where: { isActive: true },
              orderBy: { sortOrder: "asc" },
              select: { id: true, label: true, price: true, originalPrice: true, stock: true, unlimitedStock: true, image: true, sortOrder: true },
            },
          },
          orderBy: { [orderByField]: sortDir as "asc" | "desc" },
          skip: (page - 1) * perPage,
          take: perPage,
        }),
        prisma.product.count({ where }),
      ]);
      return { products, total };
    },
    [cacheKey],
    { tags: ["products"], revalidate: CACHE_TTL }
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const page     = Math.max(1, Number(searchParams.get("page")) || 1);
  const perPage  = Math.min(50, Math.max(1, Number(searchParams.get("per_page")) || 12));
  const categoryId = searchParams.get("category_id");
  const brandId    = searchParams.get("brand_id");
  const isFeatured = searchParams.get("is_featured");
  const sortBy  = searchParams.get("sort_by") || "sort_order";
  const sortDir = searchParams.get("sort_dir") || "asc";
  const excludeCategoryId = searchParams.get("exclude_category_id");
  const excludeId = searchParams.get("exclude_id");

  const cachedQuery = buildCachedQuery(page, perPage, categoryId, brandId, isFeatured, sortBy, sortDir, excludeCategoryId, excludeId);
  const { products, total } = await cachedQuery();

  const body = JSON.stringify(paginatedResponse(products, { page, perPage, total }));

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
