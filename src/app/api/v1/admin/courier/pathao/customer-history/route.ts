import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-response";
import { requireStaff } from "@/lib/auth-helpers";
import { getMerchantPanelToken, clearMerchantPanelTokenCache } from "@/lib/pathaoMerchantAuth";

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
  try { await requireStaff(); } catch (e) { return e as Response; }

  const body = await req.json().catch(() => ({}));
  const phone = String(body.phone || "").trim();
  if (!phone) return errorResponse("phone required", 400);

  const token = await getMerchantPanelToken();
  if (!token) {
    return errorResponse("Pathao auto-login failed. Verify Pathao email + password in Settings → Courier.", 400);
  }

  const callOnce = (jwt: string) =>
    fetch("https://merchant.pathao.com/api/v1/user/success", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${jwt}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Origin": "https://merchant.pathao.com",
        "Referer": "https://merchant.pathao.com/courier/orders/create",
      },
      body: JSON.stringify({ phone }),
      signal: AbortSignal.timeout(15000),
    });

  try {
    let upstream = await callOnce(token);
    if (upstream.status === 401 || upstream.status === 403) {
      clearMerchantPanelTokenCache();
      try {
        await prisma.siteSetting.deleteMany({
          where: { key: { in: ["pathao_web_token_auto", "pathao_web_token_auto_exp"] } },
        });
      } catch {}
      const fresh = await getMerchantPanelToken();
      if (!fresh) {
        return errorResponse("Pathao login failed — verify your Pathao email + password.", 401);
      }
      upstream = await callOnce(fresh);
    }

    const text = await upstream.text();
    let json: unknown;
    try { json = JSON.parse(text); } catch { return errorResponse(`Pathao history failed (${upstream.status})`, 502); }
    if (!upstream.ok) return errorResponse(`Pathao history failed: ${(json as { message?: string })?.message || upstream.status}`, 502);

    return jsonResponse(json as Record<string, unknown>);
  } catch (err) {
    console.error("[pathao/customer-history] error:", err);
    return errorResponse(err instanceof Error ? err.message : "History failed", 500);
  }
}
