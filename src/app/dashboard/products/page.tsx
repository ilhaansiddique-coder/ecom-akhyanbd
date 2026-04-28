/**
 * Server component — fetches ALL products once, cached with "products" tag.
 * Cache is busted automatically when products are created/updated/deleted
 * (admin mutations call revalidateTag("products")).
 *
 * Passing ALL products to the client means search & pagination are done
 * entirely in memory — zero network requests, zero loading spinners.
 */
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { isStaffOrAdmin } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import ProductsClient from "./ProductsClient";

export const dynamic = "force-dynamic";

const productSelect = {
  id: true, name: true, slug: true, price: true, originalPrice: true,
  image: true, images: true, badge: true, weight: true, stock: true, unlimitedStock: true,
  soldCount: true, isActive: true, isFeatured: true,
  hasVariations: true, variationType: true,
  customShipping: true, shippingCost: true, description: true,
  createdAt: true,
  category:   { select: { id: true, name: true } },
  categories: { select: { id: true, name: true } },
  brand:      { select: { id: true, name: true } },
  variants: {
    orderBy: { sortOrder: "asc" as const },
    select: { id: true, label: true, price: true, originalPrice: true, sku: true, stock: true, unlimitedStock: true, image: true, isActive: true, sortOrder: true },
  },
} as const;

// Cache the heavy DB fetch — busted by revalidateTag("products") on every mutation
const prefetch = unstable_cache(
  async () => {
    // Try with soft-delete filter; fall back if `deleted_at` column missing
    // (e.g. prisma generate / db:push not yet run after schema change).
    let products;
    try {
      products = await prisma.product.findMany({ where: { deletedAt: null }, select: productSelect, orderBy: { createdAt: "desc" } });
    } catch (e) {
      console.warn("[products] deletedAt filter failed, falling back. Run `npx prisma generate && npx prisma db push`. Err:", e instanceof Error ? e.message : e);
      products = await prisma.product.findMany({ select: productSelect, orderBy: { createdAt: "desc" } });
    }
    const [categories, brands, soldAgg] = await Promise.all([
      prisma.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
      prisma.brand.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
      // Live sales count from OrderItem — excludes cancelled orders.
      // `soldCount` column stays as fallback for legacy data but this wins.
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
    return { products, categories, brands, soldMap: Object.fromEntries(soldMap) };
  },
  ["admin-products-all-v2-sold"],
  { tags: ["products"], revalidate: 30 }
);

export default async function ProductsPage() {
  const user = await getSessionUser();
  if (!user || !isStaffOrAdmin(user.role)) redirect("/cdlogin");

  const data = await prefetch();

  // Serialize Prisma types → plain JSON (dates → strings, Decimal → number)
  const serialized = {
    categories: data.categories,
    brands: data.brands,
    products: data.products.map((p) => ({
      ...p,
      price: Number(p.price),
      originalPrice: p.originalPrice != null ? Number(p.originalPrice) : null,
      shippingCost: p.shippingCost != null ? Number(p.shippingCost) : null,
      createdAt: p.createdAt ? (p.createdAt instanceof Date ? p.createdAt.toISOString() : String(p.createdAt)) : null,
      // snake_case aliases for client (which reads p.unlimited_stock / p.has_variations / p.custom_shipping)
      unlimited_stock: Boolean(p.unlimitedStock),
      has_variations: Boolean(p.hasVariations),
      custom_shipping: Boolean(p.customShipping),
      shipping_cost: p.shippingCost != null ? Number(p.shippingCost) : null,
      variation_type: p.variationType,
      // Prefer live order aggregate; fall back to stored soldCount for legacy rows
      sold_count: (data.soldMap as Record<number, number>)[p.id] ?? p.soldCount,
      original_price: p.originalPrice != null ? Number(p.originalPrice) : null,
      is_active: p.isActive,
      is_featured: p.isFeatured,
      categories: p.categories ?? [],
      variants: p.variants.map((v) => ({
        ...v,
        price: Number(v.price),
        originalPrice: v.originalPrice != null ? Number(v.originalPrice) : null,
        original_price: v.originalPrice != null ? Number(v.originalPrice) : null,
        unlimited_stock: Boolean(v.unlimitedStock),
        is_active: v.isActive,
        sort_order: v.sortOrder,
      })),
    })),
  };

  return <ProductsClient initialData={serialized as any} />;
}
