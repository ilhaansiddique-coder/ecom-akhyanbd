import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { mapApiProduct } from "@/data/products";
import type { Product } from "@/data/products";
import ShopClient from "./ShopClient";

// ISR: regenerate every 60s
export const revalidate = 60;

async function getProducts(): Promise<Product[]> {
  const rows = await prisma.product.findMany({
    where: { isActive: true },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      brand: { select: { id: true, name: true, slug: true } },
      variants: { where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { id: true, label: true, price: true, originalPrice: true, stock: true, unlimitedStock: true, image: true, sortOrder: true } },
    },
    orderBy: { sortOrder: "asc" },
    take: 100,
  });

  return rows.map((p) => mapApiProduct(serialize(p)));
}

async function getCategories(): Promise<{ id: number; name: string; slug: string }[]> {
  const cats = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, slug: true },
  });
  return cats;
}

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
