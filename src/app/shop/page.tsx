import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { mapApiProduct } from "@/data/products";
import type { Product } from "@/data/products";
import ShopClient from "./ShopClient";

// ISR: regenerate every 60s
export const revalidate = 60;

const getProducts = unstable_cache(
  async (): Promise<Product[]> => {
    const rows = await prisma.product.findMany({
      where: { isActive: true },
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
      orderBy: { sortOrder: "asc" },
      take: 24,
    });
    return rows.map((p) => mapApiProduct(serialize(p)));
  },
  ["shop-products"],
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
  let categories: { id: number; name: string; slug: string }[] = [];

  try {
    [products, categories] = await Promise.all([getProducts(), getCategories()]);
  } catch {
    // DB unavailable at build time — revalidated on first request
  }

  return <ShopClient initialProducts={products} apiCategories={categories} />;
}
