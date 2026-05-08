import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse, validationError } from "@/lib/api-response";
import { withStaff } from "@/lib/auth-helpers";
import { loadFeedDefaults, loadFeedItems } from "@/lib/feedSource";
import { feedDefaultsSchema } from "@/lib/validation";
import { bumpVersion } from "@/lib/sync";

// Lightweight stats for the /dashboard/feeds page. Counts how many products
// + variant rows the feeds expose, plus the active flash-sale tally so admin
// can confirm sales are flowing through to ads. Defaults are returned too
// so the settings panel can hydrate without a second request.
export const GET = withStaff(async (request) => {
  try {
    const [items, defaults, totalProducts, activeProducts, activeFlashSales] = await Promise.all([
      loadFeedItems(),
      loadFeedDefaults(),
      prisma.product.count(),
      prisma.product.count({ where: { isActive: true, deletedAt: null } }),
      prisma.flashSale.count({
        where: { isActive: true, startsAt: { lte: new Date() }, endsAt: { gte: new Date() } },
      }),
    ]);

    return jsonResponse({
      data: {
        defaults,
        stats: {
          rowsInFeed: items.length,
          activeProducts,
          totalProducts,
          activeFlashSales,
          inStock: items.filter((i) => i.availability === "in stock").length,
          outOfStock: items.filter((i) => i.availability === "out of stock").length,
          onSale: items.filter((i) => !!i.salePrice).length,
        },
      },
    });
  } catch (e) {
    console.error("[Feeds] stats error:", e);
    return errorResponse("Failed to load feed stats", 500);
  }
});

// Update shared defaults (brand, condition, google_product_category).
export const PUT = withStaff(async (request) => {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return errorResponse("Invalid body", 400);
    const parsed = feedDefaultsSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }
    const data = parsed.data;

    const updates: { key: string; value: string }[] = [];
    if (typeof data.brand === "string") updates.push({ key: "feed_brand", value: data.brand.trim() });
    if (data.condition) {
      updates.push({ key: "feed_condition", value: data.condition });
    }
    if (typeof data.google_product_category === "string") {
      updates.push({ key: "feed_google_category", value: data.google_product_category.trim() });
    }
    if (typeof data.site_url === "string") {
      updates.push({ key: "site_url", value: data.site_url.trim().replace(/\/$/, "") });
    }
    if (updates.length === 0) return errorResponse("Nothing to update", 400);

    await Promise.all(updates.map((u) =>
      prisma.siteSetting.upsert({
        where: { key: u.key },
        create: { key: u.key, value: u.value },
        update: { value: u.value },
      })
    ));

    // Mobile feed editor watches the `feeds` channel; tell connected
    // clients to refetch defaults + stats so two admins editing in
    // parallel see each other's saves.
    bumpVersion("feeds");
    return jsonResponse({ message: "Saved" });
  } catch (e) {
    console.error("[Feeds] settings save error:", e);
    return errorResponse("Failed to save settings", 500);
  }
});
