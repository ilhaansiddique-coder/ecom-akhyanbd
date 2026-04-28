import { Suspense } from "react";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { mapApiProduct } from "@/data/products";
import type { Product } from "@/data/products";
import { toBilingual, type Bilingual } from "@/lib/bilingual";
import ShopClient from "./ShopClient";

// ISR: regenerate every 60s
export const revalidate = 60;

interface ShopContent {
  heroBadge: Bilingual;
  heroTitle: Bilingual;
  heroSubtitle: Bilingual;
  filtersTitle: Bilingual;
  categoryLabel: Bilingual;
  brandLabel: Bilingual;
  priceLabel: Bilingual;
  sortLabel: Bilingual;
  emptyTitle: Bilingual;
  emptyDescription: Bilingual;
  loadMoreText: Bilingual;
}

const DEFAULT_SHOP: ShopContent = {
  heroBadge: { en: "Browse Products", bn: "পণ্য ব্রাউজ করুন" },
  heroTitle: { en: "Shop", bn: "শপ" },
  heroSubtitle: { en: "Discover quality products at great prices", bn: "চমৎকার মূল্যে মানসম্পন্ন পণ্য আবিষ্কার করুন" },
  filtersTitle: { en: "Filters", bn: "ফিল্টার" },
  categoryLabel: { en: "Category", bn: "ক্যাটাগরি" },
  brandLabel: { en: "Brand", bn: "ব্র্যান্ড" },
  priceLabel: { en: "Price Range", bn: "মূল্য সীমা" },
  sortLabel: { en: "Sort by", bn: "সাজান" },
  emptyTitle: { en: "No products found", bn: "কোনো পণ্য পাওয়া যায়নি" },
  emptyDescription: { en: "Try adjusting your filters or search criteria", bn: "আপনার ফিল্টার বা সার্চ পরিবর্তন করে দেখুন" },
  loadMoreText: { en: "Load More", bn: "আরও দেখুন" },
};

function normalizeShop(raw: unknown): ShopContent {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    heroBadge: toBilingual(r.heroBadge ?? DEFAULT_SHOP.heroBadge),
    heroTitle: toBilingual(r.heroTitle ?? DEFAULT_SHOP.heroTitle),
    heroSubtitle: toBilingual(r.heroSubtitle ?? DEFAULT_SHOP.heroSubtitle),
    filtersTitle: toBilingual(r.filtersTitle ?? DEFAULT_SHOP.filtersTitle),
    categoryLabel: toBilingual(r.categoryLabel ?? DEFAULT_SHOP.categoryLabel),
    brandLabel: toBilingual(r.brandLabel ?? DEFAULT_SHOP.brandLabel),
    priceLabel: toBilingual(r.priceLabel ?? DEFAULT_SHOP.priceLabel),
    sortLabel: toBilingual(r.sortLabel ?? DEFAULT_SHOP.sortLabel),
    emptyTitle: toBilingual(r.emptyTitle ?? DEFAULT_SHOP.emptyTitle),
    emptyDescription: toBilingual(r.emptyDescription ?? DEFAULT_SHOP.emptyDescription),
    loadMoreText: toBilingual(r.loadMoreText ?? DEFAULT_SHOP.loadMoreText),
  };
}

async function getShopContent(): Promise<ShopContent> {
  try {
    const setting = await prisma.siteSetting.findUnique({ where: { key: "page_shop" } });
    if (setting?.value) return normalizeShop(JSON.parse(setting.value));
  } catch { /* */ }
  return DEFAULT_SHOP;
}

export async function generateMetadata() {
  const c = await getShopContent();
  return {
    title: c.heroTitle.bn || c.heroTitle.en,
    description: c.heroSubtitle.bn || c.heroSubtitle.en,
  };
}

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

  const content = await getShopContent();

  return (
    <Suspense fallback={null}>
      <ShopClient
        initialProducts={products}
        initialTotal={total}
        pageSize={PAGE_SIZE}
        apiCategories={categories}
        content={content}
      />
    </Suspense>
  );
}
