import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { toBilingual } from "@/lib/bilingual";
import ShopPageEditor, { type ShopContent } from "./ShopPageEditor";

export const dynamic = "force-dynamic";

const DEFAULT_SHOP: ShopContent = {
  heroBadge: { en: "Browse Products", bn: "à¦ªà¦£à§à¦¯ à¦¬à§à¦°à¦¾à¦‰à¦œ à¦•à¦°à§à¦¨" },
  heroTitle: { en: "Shop", bn: "à¦¶à¦ª" },
  heroSubtitle: { en: "Discover quality products at great prices", bn: "à¦šà¦®à§Žà¦•à¦¾à¦° à¦®à§‚à¦²à§à¦¯à§‡ à¦®à¦¾à¦¨à¦¸à¦®à§à¦ªà¦¨à§à¦¨ à¦ªà¦£à§à¦¯ à¦†à¦¬à¦¿à¦·à§à¦•à¦¾à¦° à¦•à¦°à§à¦¨" },
  filtersTitle: { en: "Filters", bn: "à¦«à¦¿à¦²à§à¦Ÿà¦¾à¦°" },
  categoryLabel: { en: "Category", bn: "à¦•à§à¦¯à¦¾à¦Ÿà¦¾à¦—à¦°à¦¿" },
  brandLabel: { en: "Brand", bn: "à¦¬à§à¦°à§à¦¯à¦¾à¦¨à§à¦¡" },
  priceLabel: { en: "Price Range", bn: "à¦®à§‚à¦²à§à¦¯ à¦¸à§€à¦®à¦¾" },
  sortLabel: { en: "Sort by", bn: "à¦¸à¦¾à¦œà¦¾à¦¨" },
  emptyTitle: { en: "No products found", bn: "à¦•à§‹à¦¨à§‹ à¦ªà¦£à§à¦¯ à¦ªà¦¾à¦“à¦¯à¦¼à¦¾ à¦¯à¦¾à¦¯à¦¼à¦¨à¦¿" },
  emptyDescription: { en: "Try adjusting your filters or search criteria", bn: "à¦†à¦ªà¦¨à¦¾à¦° à¦«à¦¿à¦²à§à¦Ÿà¦¾à¦° à¦¬à¦¾ à¦¸à¦¾à¦°à§à¦š à¦ªà¦°à¦¿à¦¬à¦°à§à¦¤à¦¨ à¦•à¦°à§‡ à¦¦à§‡à¦–à§à¦¨" },
  loadMoreText: { en: "Load More", bn: "à¦†à¦°à¦“ à¦¦à§‡à¦–à§à¦¨" },
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


