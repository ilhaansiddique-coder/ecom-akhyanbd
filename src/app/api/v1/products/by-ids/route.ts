import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

  // Filter to ACTIVE + non-deleted products only. The cart uses absence
  // from this response as the signal to prune stale items, so admins
  // disabling or trashing a product must propagate through here as
  // "missing" — same behaviour the storefront product page uses.
  const products = await prisma.product.findMany({
    where: { id: { in: ids }, isActive: true, deletedAt: null },
    select: {
      id: true,
      name: true,
      image: true,
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
      variants: p.variants,
    })),
  });
}
