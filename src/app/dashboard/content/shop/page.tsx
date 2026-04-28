import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { toBilingual } from "@/lib/bilingual";
import ShopPageEditor, { type ShopContent } from "./ShopPageEditor";

export const dynamic = "force-dynamic";

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

function normalize(raw: unknown): ShopContent {
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

export default async function ShopEditorPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/cdlogin");
  let content = DEFAULT_SHOP;
  try {
    const setting = await prisma.siteSetting.findUnique({ where: { key: "page_shop" } });
    if (setting?.value) content = normalize(JSON.parse(setting.value));
  } catch { /* */ }
  return <ShopPageEditor initialData={content} />;
}
