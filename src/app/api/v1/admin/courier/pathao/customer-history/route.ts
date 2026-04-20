import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-helpers";

/**
 * POST /api/v1/admin/courier/pathao/customer-history
 * Body: { phone: string }
 *
 * Proxies merchant.pathao.com/api/v1/user/success — returns past Pathao
 * deliveries for this phone (address book) plus customer success rating.
 * Uses the same merchant panel token as /parse.
 *
 * Response on 200:
 *   { data: {
 *       address_book: [{ customer_name, customer_address,
 *                        customer_city_id, customer_zone_id, customer_area_id, ... }],
 *       customer_rating: "excellent_customer" | ...,
 *       customer: { total_delivery, successful_delivery }
 *   } }
 */
export async function POST(req: NextRequest) {
  try { await requireAdmin(); } catch (e) { return e as Response; }

  const tokenRow = await prisma.siteSetting.findUnique({ where: { key: "pathao_web_token" } });
  const token = tokenRow?.value?.trim();
  if (!token) {
    return errorResponse("Pathao web token missing. Add it in Settings → Courier.", 400);
  }

  const body = await req.json().catch(() => ({}));
  const phone = String(body.phone || "").trim();
  if (!phone) return errorResponse("phone required", 400);

  try {
    const upstream = await fetch("https://merchant.pathao.com/api/v1/user/success", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Origin": "https://merchant.pathao.com",
        "Referer": "https://merchant.pathao.com/courier/orders/create",
      },
      body: JSON.stringify({ phone }),
      signal: AbortSignal.timeout(15000),
    });
    const text = await upstream.text();

    if (upstream.status === 401) {
      return errorResponse("Pathao web token expired. Re-paste from merchant.pathao.com in Settings → Courier.", 401);
    }
    let json: unknown;
    try { json = JSON.parse(text); } catch { return errorResponse(`Pathao history failed (${upstream.status})`, 502); }
    if (!upstream.ok) return errorResponse(`Pathao history failed: ${(json as { message?: string })?.message || upstream.status}`, 502);

    return jsonResponse(json as Record<string, unknown>);
  } catch (err) {
    console.error("[pathao/customer-history] error:", err);
    return errorResponse(err instanceof Error ? err.message : "History failed", 500);
  }
}
