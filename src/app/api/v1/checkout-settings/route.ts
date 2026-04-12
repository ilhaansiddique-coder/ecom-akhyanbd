import { prisma } from "@/lib/prisma";
import { jsonResponse } from "@/lib/api-response";

/**
 * GET /api/v1/checkout-settings — Public endpoint for checkout customization
 * Returns only checkout-prefixed settings (no sensitive data)
 */
export async function GET() {
  try {
    const settings = await prisma.siteSetting.findMany({
      where: {
        OR: [
          { key: { startsWith: "checkout_" } },
          { key: "site_language" },
        ],
      },
    });

    const result: Record<string, string> = {};
    for (const s of settings) {
      result[s.key] = s.value || "";
    }

    return jsonResponse(result);
  } catch {
    return jsonResponse({});
  }
}
