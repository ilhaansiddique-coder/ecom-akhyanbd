import { mapApiProduct } from "@/data/products";
import type { Product } from "@/data/products";
import ShopClient from "./ShopClient";

export const dynamic = "force-dynamic";

const API_URL = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/v1`;

async function getProducts(): Promise<Product[]> {
  try {
    const res = await fetch(`${API_URL}/products?per_page=100`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 300, tags: ["products"] },
    });
    if (!res.ok) return [];
    const json = await res.json();
    const data = json.data || json;
    if (Array.isArray(data)) return data.map(mapApiProduct);
    return [];
  } catch {
    return [];
  }
}

async function getCategories(): Promise<{ id: number; name: string; slug: string }[]> {
  try {
    const res = await fetch(`${API_URL}/categories`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 300, tags: ["categories"] },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json) ? json : json.data || [];
  } catch {
    return [];
  }
}

export default async function ShopPage() {
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);
  return <ShopClient initialProducts={products} apiCategories={categories} />;
}
