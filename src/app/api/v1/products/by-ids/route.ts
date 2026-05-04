import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { inStockWhere } from "@/lib/productFilters";

/**
 * GET /api/v1/products/by-ids?ids=1,2,3
 *
 * Lightweight batch lookup used by the cart to re-hydrate images for
 * persisted items. Returns only what the cart needs: id, image, variants
 * (id + image) so we can patch missing/stale image refs without a full
 * product fetch per row.
 */
export async function GET(req: NextRequest) {
  const idsParam = req.nextUrl.searchParams.get("ids") || "";
  const ids = idsParam
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);

  if (ids.length === 0) {
    return NextResponse.json({ items: [] });
  }

  // Filter to ACTIVE + non-deleted + in-stock products only. The cart uses
  // absence from this response as the signal to prune stale items, so
  // disabled / trashed / fully-out-of-stock products propagate as "missing"
  // and the cart silently drops them — same behaviour the storefront PDP
  // uses (404 on fully OOS).
  const products = await prisma.product.findMany({
    where: { id: { in: ids }, isActive: true, deletedAt: null, AND: [inStockWhere] },
    select: {
      id: true,
      name: true,
      image: true,
      // hasVariations exposed so the cart can detect lines that were saved
      // BEFORE a product was converted to variable (or via a stale path)
      // and prompt the customer to re-pick a variant. Without this flag the
      // cart shipped items with variantId=null and the order POST would
      // either reject them (post-fix) or silently use parent price 0.
      hasVariations: true,
      variants: {
        where: { isActive: true },
        select: { id: true, label: true, image: true },
      },
    },
  });

  return NextResponse.json({
    items: products.map((p) => ({
      id: p.id,
      name: p.name,
      image: p.image,
      hasVariations: p.hasVariations,
      variants: p.variants,
    })),
  });
}
