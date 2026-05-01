import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse, notFound } from "@/lib/api-response";
import { inStockWhere } from "@/lib/productFilters";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const page = await prisma.landingPage.findFirst({
    where: { slug, isActive: true },
  });

  if (!page) return notFound("Landing page not found");

  // Resolve product data from product IDs in JSON
  let resolvedProducts: Record<string, unknown>[] = [];
  if (page.products) {
    try {
      const productEntries = JSON.parse(page.products) as { product_id: number; quantity?: number }[];
      const productIds = productEntries.map((p) => p.product_id);
      const products = await prisma.product.findMany({
        // Admin curated list, but still filter out fully-out-of-stock so
        // landing-page CTAs never offer something the customer can't buy.
        where: { id: { in: productIds }, AND: [inStockWhere] },
        include: {
          category: true,
          variants: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
        },
      });

      resolvedProducts = productEntries.map((entry) => {
        const product = products.find((p) => p.id === entry.product_id);
        if (!product) return null;
        return {
          ...serialize(product),
          selected_quantity: entry.quantity || 1,
        };
      }).filter(Boolean) as Record<string, unknown>[];
    } catch {}
  }

  return jsonResponse({
    ...serialize(page),
    resolved_products: resolvedProducts,
  });
}
