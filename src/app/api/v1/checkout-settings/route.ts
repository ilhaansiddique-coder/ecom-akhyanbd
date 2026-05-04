import { jsonResponse } from "@/lib/api-response";
import { getAllSettings } from "@/lib/settingsCache";

/**
 * GET /api/v1/checkout-settings — Public endpoint for checkout customization
 * Returns only checkout-prefixed settings (no sensitive data).
 * Reads from the cached settings map (60s TTL + tag invalidation) so
 * polling browsers don't keep hitting Postgres.
 */
export async function GET() {
  try {
    const all = await getAllSettings();
    const result: Record<string, string> = {};
    for (const key of Object.keys(all)) {
      if (key.startsWith("checkout_") || key === "site_language" || key === "dashboard_language") {
        result[key] = all[key] || "";
      }
    }
    return jsonResponse(result);
  } catch {
    return jsonResponse({});
  }
}
