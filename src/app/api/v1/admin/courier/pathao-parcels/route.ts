import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getMerchantPanelToken,
  clearMerchantPanelTokenCache,
} from "@/lib/pathaoMerchantAuth";
import { requireStaff } from "@/lib/auth-helpers";
import { jsonResponse, errorResponse } from "@/lib/api-response";

const BASE = "https://merchant.pathao.com/api/v1";

// ─── Types ────────────────────────────────────────────────────────────────────
export type PathaoTab = "active" | "delivered" | "returned_reversed" | "paid_zero";

interface PathaoRawParcel {
  order_consignment_id: string;
  order_created_at: string;
  order_description: string;
  merchant_order_id: string;
  recipient_name: string;
  recipient_address: string;
  recipient_phone: string;
  order_amount: number;
  total_fee: number;
  cod_fee: number;
  delivery_fee: number;
  discount: number;
  order_status: string;
  order_status_updated_at: string;
  store_name: string;
  order_type: string;   // "Delivery" | "Return"
  billing_status: string;
  billing_date: string | null;
  cash_on_delivery: string; // "Yes" | "No"
  color: string;
  order_invoice_id: string | null;
  related_consignment_id?: string | null;  // reverse entries carry the original delivery consignment ID
  _subtype?: "returned" | "reversed" | "both";
  _reverse?: PathaoRawParcel;              // attached when the same order exists in both ts=3 and ts=5
}

interface LocalOrder {
  id: number;
  status: string;
  items: { productName: string; quantity: number; variantLabel: string | null }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseLocalOrderId(merchantOrderId: string): number | null {
  if (!merchantOrderId) return null;
  const m = merchantOrderId.match(/-(\d+)$/);
  if (!m) return null;
  const id = parseInt(m[1], 10);
  return isNaN(id) ? null : id;
}

function pathaoHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept:        "application/json",
    "User-Agent":  "Mozilla/5.0 (compatible; AkhiyanBot/1.0)",
    Origin:        "https://merchant.pathao.com",
    Referer:       "https://merchant.pathao.com/courier/orders/list",
  };
}

/** Generic GET to Pathao merchant API. Returns parsed JSON or null on failure. */
async function pathaoGet(url: string, token: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(url, {
      headers: pathaoHeaders(token),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) clearMerchantPanelTokenCache();
      console.warn(`[PathaoParcelProxy] ${url} → HTTP ${res.status}`);
      return null;
    }
    return await res.json() as Record<string, unknown>;
  } catch (e) {
    console.warn(`[PathaoParcelProxy] fetch failed:`, e instanceof Error ? e.message : e);
    return null;
  }
}

/** Build orders/all URL with all query params */
function ordersUrl(
  transferStatus: number,
  archive: string,
  page: number,
  limit: number,
  extra: Record<string, string> = {},
): string {
  const url = new URL(`${BASE}/orders/all`);
  url.searchParams.set("transfer_status", String(transferStatus));
  url.searchParams.set("archive",         archive);
  url.searchParams.set("page",            String(page));
  url.searchParams.set("limit",           String(limit));
  for (const [k, v] of Object.entries(extra)) url.searchParams.set(k, v);
  return url.toString();
}

interface OrdersPage {
  parcels: PathaoRawParcel[];
  total: number;
  lastPage: number;
}

async function fetchOrdersPage(
  url: string,
  token: string,
  subtype?: "returned" | "reversed",
): Promise<OrdersPage> {
  const json = await pathaoGet(url, token);
  const data = (json?.data ?? {}) as Record<string, unknown>;
  const parcels: PathaoRawParcel[] = (data.data as PathaoRawParcel[]) ?? [];
  if (subtype) for (const p of parcels) p._subtype = subtype;
  return {
    parcels,
    total:    Number(data.total    ?? 0),
    lastPage: Number(data.last_page ?? 1),
  };
}

/**
 * Fetch ALL entries for a transfer_status in a single request.
 *
 * Pathao honours limit values up to at least 5000 — confirmed live:
 *   limit=5000, archive=1 → returns all 2780 archived reversed entries in 1 request.
 *   limit=5000, archive=0 → returns all 784  active  reversed entries in 1 request.
 *
 * This replaces the old paginated approach that caused rate-limit errors when
 * firing 20-28 parallel requests.
 */
async function fetchAllForStats(
  transferStatus: number,
  archive: string,
  token: string,
  extra: Record<string, string> = {},
): Promise<PathaoRawParcel[]> {
  const ONE_SHOT_LIMIT = 5000;
  const page = await fetchOrdersPage(
    ordersUrl(transferStatus, archive, 1, ONE_SHOT_LIMIT, extra), token,
  );
  return page.parcels;
}

async function fetchOrderStats(token: string, type: string): Promise<Record<string, unknown>> {
  const json = await pathaoGet(`${BASE}/stats/order?type=${type}`, token);
  return (json?.data ?? {}) as Record<string, unknown>;
}

async function fetchInvoiceStats(token: string): Promise<Record<string, unknown>> {
  const json = await pathaoGet(`${BASE}/monetary/stats/invoice?type=all`, token);
  return (json?.data ?? {}) as Record<string, unknown>;
}

// ─── GET /api/v1/admin/courier/pathao-parcels ─────────────────────────────────
export async function GET(request: NextRequest) {
  try { await requireStaff(); } catch (e) { return e as Response; }

  try {
    const sp      = request.nextUrl.searchParams;
    const tab     = (sp.get("tab") || "active") as PathaoTab;
    const archive = sp.get("archive") ?? "0";
    const page    = Math.max(1, parseInt(sp.get("page")  || "1",  10));
    const limit   = Math.min(50, Math.max(1, parseInt(sp.get("limit") || "20", 10)));
    const search  = (sp.get("q") || "").trim().toLowerCase();

    // ── Auth ─────────────────────────────────────────────────────────────────
    const token = await getMerchantPanelToken();
    if (!token) {
      return errorResponse(
        "Pathao merchant token unavailable — add Pathao credentials in Courier Settings",
        503,
      );
    }

    // ── Fetch based on tab ────────────────────────────────────────────────────
    let rawParcels: PathaoRawParcel[] = [];
    let pathaoTotal    = 0;
    let pathaoLastPage = 1;
    let tabStats: Record<string, unknown> = {};

    if (tab === "returned_reversed") {
      // ── Returned (ts=3) drives pagination; ALL reversed (ts=5) fetched once
      //    so every returned entry on any page can find its reverse match.
      //
      // Why "all reversed"?  Reverse entries are 1-to-1 with returns but live
      // on different pages when both lists are paginated independently.
      // Fetching all reversed (capped at 20 pages × 100 = 2000) is cheap
      // relative to the matching benefit.
      // Pathao stores reverse-delivery (RA…) consignments across THREE buckets:
      //
      //  ts=5, archive=0 → dispatched reverse deliveries (in-progress)
      //  ts=5, archive=1 → completed reverse deliveries ("Returned To Merchant")
      //  ts=1, archive=0 → RA entries that are still "In Transit" live here,
      //                     NOT in ts=5, confirmed via live API inspection.
      //                     We filter ts=1 results to RA-prefixed IDs only.
      //
      // All three fetches use limit=5000 (single request each, confirmed supported).
      const [retPage, revTs5Active, revTs5Archived, revTs1All, retStats, revStats] = await Promise.all([
        fetchOrdersPage(ordersUrl(3, archive, page, limit), token, "returned"),
        fetchAllForStats(5, "0", token),   // dispatched reverse deliveries
        fetchAllForStats(5, "1", token),   // completed/archived reverse deliveries
        fetchAllForStats(1, "0", token),   // active orders — RA entries in transit live here
        fetchOrderStats(token, "return"),
        fetchOrderStats(token, "reverse"),
      ]);

      // Keep only RA-prefixed entries from the active (ts=1) bucket
      const revFromActive = revTs1All.filter(
        (p) => p.order_consignment_id?.toUpperCase().startsWith("RA"),
      );

      const revAll = [...revTs5Active, ...revTs5Archived, ...revFromActive];
      for (const p of revAll) p._subtype = "reversed";

      // ── Merge returned (ts=3) + reverse (ts=5) into one row per order ───────
      //
      // Pathao reverse-delivery entries link to their original delivery via:
      //   1. related_consignment_id  — explicit API field (e.g. "DA270426UTKDAW")
      //   2. Consignment suffix      — RA270426UTKDAW shares suffix with DA270426UTKDAW
      //      (Pathao always uses a 2-char prefix: DA=delivery, RA=reverse)
      //   3. merchant_order_id       — fallback when both entries share the same ID

      // -- index returned parcels ------------------------------------------
      const retByConsignment = new Map<string, PathaoRawParcel>();
      const retBySuffix      = new Map<string, PathaoRawParcel>();
      const retByMerchantId  = new Map<string, PathaoRawParcel>();
      const mergeMap         = new Map<string, PathaoRawParcel>();

      for (const p of retPage.parcels) {
        mergeMap.set(p.order_consignment_id, p);
        retByConsignment.set(p.order_consignment_id, p);
        const suffix = p.order_consignment_id.length > 2 ? p.order_consignment_id.slice(2) : "";
        if (suffix) retBySuffix.set(suffix, p);
        if (p.merchant_order_id) retByMerchantId.set(p.merchant_order_id, p);
      }

      // -- match each reverse-delivery entry to a returned entry on this page -
      for (const p of revAll) {
        let matched: PathaoRawParcel | undefined;

        // Strategy 1: explicit related_consignment_id field
        const relId = (p.related_consignment_id ?? "").replace(/^#/, "").trim();
        if (relId) matched = retByConsignment.get(relId);

        // Strategy 2: consignment suffix (RA270426UTKDAW → suffix → DA entry)
        if (!matched) {
          const suffix = p.order_consignment_id.length > 2 ? p.order_consignment_id.slice(2) : "";
          if (suffix) matched = retBySuffix.get(suffix);
        }

        // Strategy 3: merchant_order_id fallback
        if (!matched && p.merchant_order_id) {
          matched = retByMerchantId.get(p.merchant_order_id);
        }

        if (matched) {
          matched._subtype = "both";
          matched._reverse = p;
        }
      }

      // ── Fallback: synthesize RA consignment for any unmatched return ──────
      //
      // Pathao auto-creates an RA for every DA the moment it's marked Return.
      // If our fetch missed it (rate-limit, brief gap before Pathao dispatches
      // the RA, or a Pathao-side glitch), synthesize the RA ID locally by
      // swapping the 2-char prefix: DA{suffix} → RA{suffix}. The status will
      // be unknown (we couldn't fetch it) but the column never goes blank.
      for (const p of retPage.parcels) {
        if (p._subtype === "both") continue;     // already matched real RA
        const cid = p.order_consignment_id;
        if (cid.length <= 2 || !cid.toUpperCase().startsWith("DA")) continue;
        const synthesizedRa = "RA" + cid.slice(2);
        p._subtype = "both";
        p._reverse = {
          ...p,
          order_consignment_id: synthesizedRa,
          order_status: "Pending",
          _subtype: "reversed",
        } as PathaoRawParcel;
      }

      // Sort merged result newest-first
      rawParcels = Array.from(mergeMap.values()).sort(
        (a, b) =>
          new Date(b.order_created_at).getTime() -
          new Date(a.order_created_at).getTime(),
      );
      // Pagination is driven entirely by the returned (ts=3) list
      pathaoTotal    = retPage.total;
      pathaoLastPage = retPage.lastPage;

      tabStats = {
        returnTotal:       Number(retStats.total_orders ?? 0),
        reverseTotal:      Number(revStats.total_orders ?? 0),
        paidReturn:        Number(retStats.paid_return  ?? 0),
        activeReturn:      Number(retStats.return       ?? 0),
        reverseInProgress: Number(revStats.return_at_sorting ?? 0) + Number(revStats.return_in_transit ?? 0),
        total:             Number(retStats.total_orders ?? 0) + Number(revStats.total_orders ?? 0),
      };

    } else if (tab === "paid_zero") {
      // ── Paid orders (billing_status=paid, all types) + invoice totals ─────
      const [paidPage, invStats] = await Promise.all([
        fetchOrdersPage(ordersUrl(4, archive, page, limit, { billing_status: "paid" }), token),
        fetchInvoiceStats(token),
      ]);

      // ── Keep only low / zero COD parcels (৳0 – ৳150) ──────────────────
      rawParcels     = paidPage.parcels.filter((p) => p.order_amount <= 150);
      pathaoTotal    = rawParcels.length;   // filtered count for this page
      pathaoLastPage = paidPage.lastPage;

      tabStats = {
        total:          paidPage.total,
        totalCollected: Number(invStats.total_collected  ?? 0),
        totalFee:       Number(invStats.total_fee        ?? 0),
        totalReceived:  Number(invStats.total_received   ?? 0),
        totalReceivable:Number(invStats.total_receivable ?? 0),
      };

    } else {
      // ── Active (ts=1) or Delivered (ts=2) ─────────────────────────────────
      const ts        = tab === "active" ? 1 : 2;
      const statsType = tab === "active" ? "active" : "delivered";

      // Fetch current page + official stats in parallel (just 2 requests)
      const [mainPage, st] = await Promise.all([
        fetchOrdersPage(ordersUrl(ts, archive, page, limit), token),
        fetchOrderStats(token, statsType),
      ]);

      if (!mainPage.parcels) {
        clearMerchantPanelTokenCache();
        return errorResponse("Pathao session expired — will auto-refresh on next request", 502);
      }

      rawParcels     = mainPage.parcels;
      pathaoTotal    = mainPage.total;
      pathaoLastPage = mainPage.lastPage;
      tabStats       = st;
    }

    // ── Client-side search ────────────────────────────────────────────────────
    if (search) {
      rawParcels = rawParcels.filter((p) =>
        p.recipient_name.toLowerCase().includes(search) ||
        p.recipient_phone.includes(search) ||
        p.order_consignment_id.toLowerCase().includes(search) ||
        (p.merchant_order_id && p.merchant_order_id.toLowerCase().includes(search)),
      );
    }

    // ── Cross-reference current page with local DB ────────────────────────────
    const consignmentToLocalId = new Map<string, number>();
    const localOrderIds: number[] = [];

    for (const p of rawParcels) {
      const localId = parseLocalOrderId(p.merchant_order_id);
      if (localId !== null) {
        consignmentToLocalId.set(p.order_consignment_id, localId);
        localOrderIds.push(localId);
      }
    }

    const localOrderMap = new Map<number, LocalOrder>();
    if (localOrderIds.length > 0) {
      const rows = await prisma.order.findMany({
        where: { id: { in: localOrderIds } },
        select: {
          id:     true,
          status: true,
          items:  { select: { productName: true, quantity: true, variantLabel: true } },
        },
      });
      for (const o of rows) localOrderMap.set(o.id, o as LocalOrder);
    }

    // ── Normalize ─────────────────────────────────────────────────────────────
    const parcels = rawParcels.map((p) => {
      const localId    = consignmentToLocalId.get(p.order_consignment_id) ?? null;
      const localOrder = localId ? localOrderMap.get(localId) : undefined;
      return {
        id:              localId,
        consignmentId:   p.order_consignment_id,
        merchantOrderId: p.merchant_order_id || null,
        customerName:    p.recipient_name,
        customerPhone:   p.recipient_phone,
        customerAddress: p.recipient_address,
        city:            null as string | null,
        total:           p.order_amount,
        deliveryFee:     p.delivery_fee,
        codFee:          p.cod_fee,
        totalFee:        p.total_fee,
        cashOnDelivery:  p.cash_on_delivery === "Yes",
        courierType:     "pathao",
        courierStatus:   p.order_status,
        courierScore:    null as string | null,
        billingStatus:   p.billing_status,
        billingDate:     p.billing_date,
        orderType:       p.order_type,
        subtype:         p._subtype ?? null,   // "returned" | "reversed" | "both" | null
        // When subtype === "both", these carry the reverse-delivery consignment details
        reverseConsignmentId:   p._reverse?.order_consignment_id ?? null,
        reverseCourierStatus:   p._reverse?.order_status         ?? null,
        statusColor:     p.color,
        invoiceId:       p.order_invoice_id,
        courierSentAt:   null as string | null,
        createdAt:       p.order_created_at,
        status:          localOrder?.status ?? null,
        items:           localOrder?.items  ?? [],
        source:          "pathao" as const,
      };
    });

    return jsonResponse({
      parcels,
      total:    pathaoTotal,
      page,
      limit,
      lastPage: pathaoLastPage,
      tab,
      stats:    tabStats,
    });
  } catch (error) {
    console.error("[PathaoParcelProxy] Error:", error);
    return errorResponse("Failed to fetch Pathao parcels", 500);
  }
}
