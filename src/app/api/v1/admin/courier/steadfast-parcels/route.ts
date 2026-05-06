/**
 * GET /api/v1/admin/courier/steadfast-parcels
 *
 * Mirror of /pathao-parcels but DB-backed — Steadfast's public API doesn't
 * expose a bulk list endpoint, so we read from local Order rows where
 * courierType = "steadfast" and bucket them into the same five tabs the
 * Pathao Live view uses.
 *
 * Response shape matches /pathao-parcels exactly so the courier-monitor
 * client can reuse the same renderers / filter UI / tabs without conditional
 * logic.
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withStaff } from "@/lib/auth-helpers";
import { jsonResponse, errorResponse } from "@/lib/api-response";

export type SteadfastTab = "active" | "delivered" | "partial" | "returned_reversed" | "paid_zero";

// ─── Steadfast status buckets ────────────────────────────────────────────────
// Status strings come from Steadfast's status_by_cid endpoint and our own
// courier-send response. Lowercased before matching to dodge casing drift.
const DELIVERED_STATUSES = new Set([
  "delivered", "delivered_approval_pending",
]);
const PARTIAL_STATUSES = new Set([
  "partial_delivered", "partial_delivered_approval_pending",
]);
const RETURNED_STATUSES = new Set([
  "cancelled", "cancelled_approval_pending", "returned", "lost",
]);
const IN_TRANSIT_STATUSES = new Set([
  "in_transit", "on_the_way",
]);
const HOLD_STATUSES = new Set([
  "hold", "on_hold",
]);
// Pending = anything else (in_review, pending, unknown_approval, etc.)

const norm = (s: string | null | undefined) =>
  (s ?? "").toString().trim().toLowerCase().replace(/[\s-]+/g, "_");

const isDelivered = (s: string | null | undefined) => DELIVERED_STATUSES.has(norm(s));
const isPartial   = (s: string | null | undefined) => PARTIAL_STATUSES.has(norm(s));
const isReturned  = (s: string | null | undefined) => RETURNED_STATUSES.has(norm(s));
const isInTransit = (s: string | null | undefined) => IN_TRANSIT_STATUSES.has(norm(s));
const isHold      = (s: string | null | undefined) => HOLD_STATUSES.has(norm(s));

/** Parse YYYY-MM-DD (BD, UTC+6) → UTC Date at BD midnight */
function bdMidnightUtc(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) - 6 * 60 * 60 * 1000);
}

// ─── GET handler ─────────────────────────────────────────────────────────────
export const GET = withStaff(async (request) => {
  try {
    const sp        = request.nextUrl.searchParams;
    const tab       = (sp.get("tab") || "active") as SteadfastTab;
    const archive   = sp.get("archive") ?? "0"; // unused for DB but kept for API parity
    const page      = Math.max(1, parseInt(sp.get("page")  || "1",   10));
    const limit     = Math.min(200, Math.max(1, parseInt(sp.get("limit") || "100", 10)));
    const search    = (sp.get("q") || "").trim();
    const subFilter = (sp.get("subFilter") || "").trim().toLowerCase();
    const fromStr   = (sp.get("from") || "").trim();
    const toStr     = (sp.get("to")   || "").trim();

    // Date filter on courierSentAt (the dispatch day, matches dashboard logic)
    const dateFilter: { gte?: Date; lt?: Date } = {};
    if (fromStr) dateFilter.gte = bdMidnightUtc(fromStr);
    if (toStr) {
      const [y, m, d] = toStr.split("-").map(Number);
      dateFilter.lt = new Date(Date.UTC(y, m - 1, d + 1) - 6 * 60 * 60 * 1000);
    }

    // ── Base filter — all Steadfast courier-sent orders ─────────────────────
    const baseAnd: object[] = [
      { courierSent: true },
      { courierType: "steadfast" },
      { consignmentId: { not: null } },
      { status: { not: "trashed" } },
    ];
    if (Object.keys(dateFilter).length > 0) baseAnd.push({ courierSentAt: dateFilter });

    // Fetch everything matching base filter — Steadfast volumes are typically
    // small enough that one query is cheaper than multiple paginated round
    // trips, and we need the full set for accurate stat-card counts anyway.
    const allMatching = await prisma.order.findMany({
      where: { AND: baseAnd },
      orderBy: { courierSentAt: "desc" },
      select: {
        id: true,
        customerName: true,
        customerPhone: true,
        customerAddress: true,
        city: true,
        total: true,
        shippingCost: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        courierType: true,
        consignmentId: true,
        courierStatus: true,
        courierScore: true,
        courierSentAt: true,
        createdAt: true,
        items: { select: { productName: true, quantity: true, variantLabel: true } },
      },
    });

    // ── Tab bucketing ────────────────────────────────────────────────────────
    type Row = (typeof allMatching)[number];

    const inActiveTab    = (r: Row) => !isDelivered(r.courierStatus) && !isPartial(r.courierStatus) && !isReturned(r.courierStatus);
    const inDeliveredTab = (r: Row) => isDelivered(r.courierStatus);
    const inPartialTab   = (r: Row) => isPartial(r.courierStatus);
    const inReturnedTab  = (r: Row) => isReturned(r.courierStatus);
    const inPaidTab      = (r: Row) => r.paymentStatus === "paid";

    let bucket: Row[] = [];
    if (tab === "active")            bucket = allMatching.filter(inActiveTab);
    else if (tab === "delivered")    bucket = allMatching.filter(inDeliveredTab);
    else if (tab === "partial")      bucket = allMatching.filter(inPartialTab);
    else if (tab === "returned_reversed") bucket = allMatching.filter(inReturnedTab);
    else if (tab === "paid_zero")    bucket = allMatching.filter(inPaidTab);

    // ── Sub-filter within tab ────────────────────────────────────────────────
    let filtered = bucket;
    if (tab === "active") {
      if (subFilter === "in_transit") filtered = bucket.filter((r) => isInTransit(r.courierStatus));
      else if (subFilter === "at_hub") filtered = bucket.filter((r) => isHold(r.courierStatus));
      else if (subFilter === "pending") {
        filtered = bucket.filter((r) => !isInTransit(r.courierStatus) && !isHold(r.courierStatus));
      }
      // "assigned" doesn't really apply to Steadfast — fall through with no filter.
    } else if (tab === "delivered") {
      if (subFilter === "delivered") filtered = bucket.filter((r) => norm(r.courierStatus) === "delivered");
      // "partial" / "exchange" — partial has its own tab; exchange not used
    }

    // ── Free-text search ─────────────────────────────────────────────────────
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter((r) =>
        r.customerName.toLowerCase().includes(q) ||
        r.customerPhone.includes(search) ||
        (r.consignmentId ?? "").toLowerCase().includes(q),
      );
    }

    // ── Pagination ───────────────────────────────────────────────────────────
    const start = (page - 1) * limit;
    const pageRows = filtered.slice(start, start + limit);
    const total    = filtered.length;
    const lastPage = Math.max(1, Math.ceil(total / limit));

    // ── Per-tab stats — computed locally so they always match predicates ────
    let tabStats: Record<string, unknown> = {};
    if (tab === "active") {
      const active = allMatching.filter(inActiveTab);
      let inT = 0, hold = 0, pending = 0, collectable = 0;
      for (const r of active) {
        if (isInTransit(r.courierStatus))   inT++;
        else if (isHold(r.courierStatus))   hold++;
        else                                pending++;
        collectable += Number(r.total || 0);
      }
      tabStats = {
        total_orders:             active.length,
        total_pending_orders:     pending,
        in_transit:               inT,
        at_delivery_hub:          hold,
        assigned_for_delivery:    0, // Steadfast doesn't expose this stage
        total_collectable_amount: collectable,
      };
    } else if (tab === "delivered") {
      const del = allMatching.filter(inDeliveredTab);
      let dDel = 0, dPart = 0, dColl = 0;
      for (const r of del) {
        if (norm(r.courierStatus) === "delivered") dDel++;
        if (isPartial(r.courierStatus))             dPart++;
        dColl += Number(r.total || 0);
      }
      const pct = del.length > 0 ? `${Math.round((dDel / del.length) * 100)}%` : "0%";
      tabStats = {
        total_orders:           del.length,
        delivered:              dDel,
        delivered_percentage:   pct,
        partial_delivery:       dPart,
        exchange:               0,
        total_collected_amount: dColl,
      };
    } else if (tab === "partial") {
      const part = allMatching.filter(inPartialTab);
      const totalCod = part.reduce((s, r) => s + Number(r.total || 0), 0);
      tabStats = {
        total_orders: part.length,
        total_cod:    totalCod,
        avg_cod:      part.length > 0 ? Math.round(totalCod / part.length) : 0,
      };
    } else if (tab === "returned_reversed") {
      const ret = allMatching.filter(inReturnedTab);
      const paid = ret.filter((r) => r.paymentStatus === "paid").length;
      tabStats = {
        returnTotal:        ret.length,
        reverseTotal:       0, // no reverse-delivery concept on Steadfast
        paidReturn:         paid,
        activeReturn:       ret.length - paid,
        reverseInProgress:  0,
        total:              ret.length,
      };
    } else if (tab === "paid_zero") {
      const paid = allMatching.filter(inPaidTab);
      const collected = paid.reduce((s, r) => s + Number(r.total || 0), 0);
      tabStats = {
        total:           paid.length,
        totalCollected:  collected,
        totalFee:        0,
        totalReceived:   collected,
        totalReceivable: 0,
      };
    }

    // ── Normalize to the same response shape pathao-parcels uses ─────────────
    const parcels = pageRows.map((r) => ({
      id:                   r.id,
      consignmentId:        r.consignmentId,
      merchantOrderId:      String(r.id),
      customerName:         r.customerName,
      customerPhone:        r.customerPhone,
      customerAddress:      r.customerAddress,
      city:                 r.city,
      total:                Number(r.total),
      deliveryFee:          Number(r.shippingCost),
      codFee:               0,
      totalFee:             Number(r.shippingCost),
      cashOnDelivery:       r.paymentMethod === "cod",
      courierType:          "steadfast",
      courierStatus:        r.courierStatus,
      courierScore:         r.courierScore,
      billingStatus:        r.paymentStatus,
      billingDate:          null,
      orderType:            "Delivery",
      subtype:              null,
      reverseConsignmentId: null,
      reverseCourierStatus: null,
      statusColor:          null,
      invoiceId:            null,
      courierSentAt:        r.courierSentAt?.toISOString() ?? null,
      createdAt:            r.createdAt?.toISOString() ?? null,
      status:               r.status,
      items: r.items.map((i) => ({
        productName:  i.productName,
        quantity:     i.quantity,
        variantLabel: i.variantLabel ?? null,
      })),
      source: "steadfast" as const,
    }));

    return jsonResponse({
      parcels,
      total,
      page,
      limit,
      lastPage,
      tab,
      stats: tabStats,
    });
  } catch (error) {
    console.error("[SteadfastParcels] Error:", error);
    return errorResponse("Failed to fetch Steadfast parcels", 500);
  }
});
