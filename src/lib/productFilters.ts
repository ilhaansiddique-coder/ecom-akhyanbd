/**
 * Prisma `where` fragment that matches only products with at least one unit
 * available to sell. Use anywhere customer-facing lists products (shop,
 * search, related, homepage, landing pages, top-rated, listing API).
 *
 * Rules:
 *  - Simple product (`hasVariations: false`):
 *      visible IF `unlimitedStock = true` OR `stock > 0`.
 *  - Variable product (`hasVariations: true`):
 *      visible IF AT LEAST ONE active variant has
 *      `unlimitedStock = true` OR `stock > 0`.
 *
 * Compose with other filters via `AND` so callers don't lose their existing
 * `isActive`, `deletedAt`, etc. constraints.
 */
export const inStockWhere = {
  OR: [
    {
      hasVariations: false,
      OR: [{ unlimitedStock: true }, { stock: { gt: 0 } }],
    },
    {
      hasVariations: true,
      variants: {
        some: {
          isActive: true,
          OR: [{ unlimitedStock: true }, { stock: { gt: 0 } }],
        },
      },
    },
  ],
};
