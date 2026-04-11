import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse } from "@/lib/api-response";
import { getVersion, initVersion } from "@/lib/sync";

/**
 * GET /api/v1/sync?channel=products
 * Returns the current version number for a channel.
 * Clients poll this to detect changes.
 */
export async function GET(request: NextRequest) {
  const channel = request.nextUrl.searchParams.get("channel") || "all";

  // Initialize version from DB count on first request
  if (getVersion(channel) === 0) {
    try {
      let count = 0;
      switch (channel) {
        case "products": count = await prisma.product.count(); break;
        case "categories": count = await prisma.category.count(); break;
        case "brands": count = await prisma.brand.count(); break;
        case "orders": count = await prisma.order.count(); break;
        case "reviews": count = await prisma.review.count(); break;
        default: count = 1;
      }
      initVersion(channel, count);
    } catch {
      initVersion(channel, 1);
    }
  }

  return jsonResponse({
    channel,
    version: getVersion(channel),
    timestamp: Date.now(),
  });
}
