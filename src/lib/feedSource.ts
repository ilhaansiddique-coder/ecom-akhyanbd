import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { mapProductToFeedItems, type FeedItem, type FeedDefaults } from "./feedMapper";

/**
 * Load feed defaults from site_settings + env. Admin can override via
 * /dashboard/feeds settings panel. Sensible fallbacks for first deploy
 * so the feed renders something usable on day one.
 */
export async function loadFeedDefaults(): Promise<FeedDefaults> {
  const rows = await prisma.siteSetting.findMany({
    where: {
      key: {
        in: [
          "feed_brand",
          "feed_condition",
          "feed_google_category",
          "site_url",
          "site_name",
        ],
      },
    },
  });
  const map: Record<string, string> = {};
  for (const r of rows) if (r.value) map[r.key] = r.value;

  // Site URL: try setting, then env, finally guess.
  const baseUrl = (
    map.site_url ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    "https://akhiyanbd.com"
  ).replace(/\/$/, "");

  return {
    brand: map.feed_brand || map.site_name || "Akhiyan",
    condition: (map.feed_condition === "refurbished" || map.feed_condition === "used")
      ? map.feed_condition as "refurbished" | "used"
      : "new",
    googleProductCategory: map.feed_google_category || null,
    baseUrl,
    currency: "BDT",
  };
}

/**
 * Pull every feed-eligible product + its variants + active flash sales,
 * then map each to one or more FeedItem rows. Returns the flat list ready
 * for whichever format renderer the caller needs.
 *
 * Eligibility: isActive=true AND deletedAt is null. Out-of-stock items
 * are kept (rendered with availability="out of stock") so retargeting
 * audiences don't churn whenever inventory dips.
 */
// Wrap the heavy feed query in `unstable_cache` so the 5 feed endpoints
// (facebook.csv/.xml, google.csv/.xml, tiktok.csv) share one underlying
// fetch instead of each running its own Prisma query.
//
// Tagged with both:
//   - "feeds"     — admin "Refresh feeds now" button busts this directly.
//   - "products"  — product CRUD routes (create/update/delete + price/stock
//                   changes + flash sales) already call
//                   revalidateTag("products"), so feeds auto-bust whenever
//                   any catalog change happens. No extra wiring needed.
//
// 1 hour TTL = the same window the route-level `revalidate = 3600` used,
// kept as the long-tail fallback in case revalidateTag misses a path.
const fetchFeedItems = unstable_cache(
  async (): Promise<FeedItem[]> => {
    const defaults = await loadFeedDefaults();
    const products = await prisma.product.findMany({
      where: { isActive: true, deletedAt: null },
      include: {
        variants: { orderBy: { sortOrder: "asc" } },
        category: { select: { name: true } },
        flashSales: {
          include: { flashSale: true },
        },
      },
      orderBy: { id: "asc" },
    });
    return products.flatMap((p) => mapProductToFeedItems(p, defaults));
  },
  ["feed-items"],
  { tags: ["feeds", "products"], revalidate: 3600 },
);

export async function loadFeedItems(): Promise<FeedItem[]> {
  return fetchFeedItems();
}
