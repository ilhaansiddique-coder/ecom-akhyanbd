import { Suspense } from "react";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { mapApiProduct } from "@/data/products";
import type { Product } from "@/data/products";
import ShopClient from "./ShopClient";

// ISR: regenerate every 60s
export const revalidate = 60;

const PAGE_SIZE = 24;

const getInitialProducts = unstable_cache(
  async (): Promise<{ products: Product[]; total: number }> => {
    const where = { isActive: true, deletedAt: null };
    const [rows, total] = await Promise.all([
      prisma.product.findMany({
        where,
        select: {
          id: true, name: true, slug: true, price: true, originalPrice: true,
          image: true, images: true, badge: true, badgeColor: true, weight: true,
          stock: true, unlimitedStock: true, soldCount: true, isActive: true,
          isFeatured: true, hasVariations: true, variationType: true,
          customShipping: true, shippingCost: true, sortOrder: true, createdAt: true,
          category: { select: { id: true, name: true, slug: true } },
          brand: { select: { id: true, name: true, slug: true } },
          variants: {
            where: { isActive: true },
            orderBy: { sortOrder: "asc" },
            select: { id: true, label: true, price: true, originalPrice: true, stock: true, unlimitedStock: true, image: true, sortOrder: true },
          },
        },
        orderBy: [{ sortOrder: "asc" }, { id: "desc" }],
        take: PAGE_SIZE,
      }),
      prisma.product.count({ where }),
    ]);
    return { products: rows.map((p) => mapApiProduct(serialize(p))), total };
  },
  ["shop-products-initial"],
  { tags: ["products"], revalidate: 60 }
);

const getCategories = unstable_cache(
  async (): Promise<{ id: number; name: string; slug: string }[]> =>
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, slug: true },
    }),
  ["shop-categories"],
  { tags: ["categories"], revalidate: 300 }
);

export default async function ShopPage() {
  let products: Product[] = [];
  let total = 0;
  let categories: { id: number; name: string; slug: string }[] = [];

  try {
    const [productsResult, cats] = await Promise.all([getInitialProducts(), getCategories()]);
    products = productsResult.products;
    total = productsResult.total;
    categories = cats;
  } catch {
    // DB unavailable at build time — revalidated on first request
  }

  return (
    <Suspense fallback={null}>
      <ShopClient initialProducts={products} initialTotal={total} pageSize={PAGE_SIZE} apiCategories={categories} />
    </Suspense>
  );
}
