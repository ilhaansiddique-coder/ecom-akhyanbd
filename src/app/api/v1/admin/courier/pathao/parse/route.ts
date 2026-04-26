import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-response";
import { requireStaff } from "@/lib/auth-helpers";
import { getMerchantPanelToken, clearMerchantPanelTokenCache } from "@/lib/pathaoMerchantAuth";
import { listPathaoAreas } from "@/lib/pathao";
import { rescoreArea } from "@/lib/pathaoAreaRescore";

/**
 * POST /api/v1/admin/courier/pathao/parse
 * Body: { address: string, phone: string }
 *
 * Proxies to merchant.pathao.com/api/v1/address-parser. Token is auto-
 * refreshed via pathaoMerchantAuth (logs into merchant.pathao.com using
 * the stored email + password — no manual paste needed).
 *
 * On 401: bust cached token, force a fresh login, retry once. If still
 * 401 the credentials themselves are likely wrong.
 */
export async function POST(req: NextRequest) {
  try { await requireStaff(); } catch (e) { return e as Response; }

  const body = await req.json().catch(() => ({}));
  const address = String(body.address || "").trim();
  const phone = String(body.phone || "").trim();
  if (!address) return errorResponse("address required", 400);

  const token = await getMerchantPanelToken();
  if (!token) {
    return errorResponse("Pathao auto-login failed. Verify Pathao email + password in Settings → Courier.", 400);
  }

  const callOnce = (jwt: string) =>
    fetch("https://merchant.pathao.com/api/v1/address-parser", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${jwt}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Origin": "https://merchant.pathao.com",
        "Referer": "https://merchant.pathao.com/courier/orders/create",
      },
      body: JSON.stringify({ address, recipient_identifier: phone }),
      signal: AbortSignal.timeout(15000),
    });

  try {
    let upstream = await callOnce(token);

    // Stale-token recovery — clear cache, fetch a fresh JWT, retry once.
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
    try { json = JSON.parse(text); } catch { return errorResponse(`Pathao parse failed (${upstream.status})`, 502); }
    if (!upstream.ok) return errorResponse(`Pathao parse failed: ${(json as { message?: string })?.message || upstream.status}`, 502);

    // Local re-scoring layer — see pathaoAreaRescore.ts for details. Pathao's
    // parser sometimes locks onto a generic substring ("Bazar") when a more
    // specific area name is actually present in the address ("Chowdhuri
    // Market area"). We pull the area list for the matched zone, score each
    // against the address, and override the area_id when our top match
    // clearly beats Pathao's pick.
    try {
      const wrapped = json as { data?: { district_id?: number; zone_id?: number; area_id?: number | null; area_name?: string | null; score?: number } };
      const d = wrapped?.data;
      if (d?.zone_id) {
        const areas = await listPathaoAreas(d.zone_id).catch(() => []);
        const refined = rescoreArea(address, d, areas);
        wrapped.data = { ...d, ...refined };
      }
    } catch {
      // Re-scoring is best-effort. If anything throws, return the original
      // Pathao response unchanged so the caller still gets the city/zone.
    }

    return jsonResponse(json as Record<string, unknown>);
  } catch (err) {
    console.error("[pathao/parse] error:", err);
    return errorResponse(err instanceof Error ? err.message : "Parse failed", 500);
  }
}
