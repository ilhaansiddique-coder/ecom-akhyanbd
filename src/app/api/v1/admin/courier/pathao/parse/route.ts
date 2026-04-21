import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-response";
import { requireStaff } from "@/lib/auth-helpers";

/**
 * POST /api/v1/admin/courier/pathao/parse
 * Body: { address: string, phone: string }
 *
 * Proxies to merchant.pathao.com/api/v1/address-parser using the merchant
 * panel session token (settings: pathao_web_token). That token comes from
 * the user logging into merchant.pathao.com manually — the OAuth2 Aladdin
 * token we use for sendToPathao does NOT work on this endpoint.
 *
 * Response on 200:
 *   { data: { area_id, area_name, zone_id, zone_name, district_id (=city_id),
 *             district_name, hub_id, hub_name, score, source, is_implicit } }
 *
 * On 401 from upstream → token expired, surface clear message so user knows
 * to refresh it from Settings → Courier.
 */
export async function POST(req: NextRequest) {
  try { await requireStaff(); } catch (e) { return e as Response; }

  const tokenRow = await prisma.siteSetting.findUnique({ where: { key: "pathao_web_token" } });
  const token = tokenRow?.value?.trim();
  if (!token) {
    return errorResponse("Pathao web token missing. Add it in Settings → Courier (paste from merchant.pathao.com session).", 400);
  }

  const body = await req.json().catch(() => ({}));
  const address = String(body.address || "").trim();
  const phone = String(body.phone || "").trim();
  if (!address) return errorResponse("address required", 400);

  try {
    const upstream = await fetch("https://merchant.pathao.com/api/v1/address-parser", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Origin": "https://merchant.pathao.com",
        "Referer": "https://merchant.pathao.com/courier/orders/create",
      },
      body: JSON.stringify({ address, recipient_identifier: phone }),
      // Pathao address parser is fast; fail loud if it stalls
      signal: AbortSignal.timeout(15000),
    });
    const text = await upstream.text();

    if (upstream.status === 401) {
      return errorResponse("Pathao web token expired. Re-paste from merchant.pathao.com in Settings → Courier.", 401);
    }
    let json: unknown;
    try { json = JSON.parse(text); } catch { return errorResponse(`Pathao parse failed (${upstream.status})`, 502); }
    if (!upstream.ok) return errorResponse(`Pathao parse failed: ${(json as { message?: string })?.message || upstream.status}`, 502);

    return jsonResponse(json as Record<string, unknown>);
  } catch (err) {
    console.error("[pathao/parse] error:", err);
    return errorResponse(err instanceof Error ? err.message : "Parse failed", 500);
  }
}
