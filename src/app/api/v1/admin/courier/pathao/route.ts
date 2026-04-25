import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse, errorResponse, notFound } from "@/lib/api-response";
import { requireStaff } from "@/lib/auth-helpers";
import {
  sendToPathao,
  sendBulkToPathao,
  parsePathaoAddress,
  checkPathaoStatus,
  checkPathaoBalance,
  isPathaoConfigured,
  hasPathaoAuth,
  clearPathaoCache,
  generatePathaoMerchantOrderId,
  listPathaoCities,
  listPathaoZones,
  listPathaoAreas,
  listPathaoStores,
  type PathaoOrder,
} from "@/lib/pathao";
import { formatPhone, isValidBDPhone, checkDeliveryStatus, isSteadfastConfigured, clearKeyCache } from "@/lib/steadfast";
import { mapCourierStatusToOrderStatus } from "@/lib/courierStatusMap";

// Same auto-sync helper as the Steadfast route — see comment there. Kept
// inline (not in the shared lib) because both routes already import the
// mapper and a 4-line wrapper isn't worth a third file.
function buildStatusUpdate(currentOrderStatus: string, courierStatus: string) {
  const derived = mapCourierStatusToOrderStatus(courierStatus);
  if (!derived || currentOrderStatus === "trashed" || currentOrderStatus === derived) {
    return { courierStatus };
  }
  return { courierStatus, status: derived };
}

// Spacing between sequential courier API hits inside bulk loops so we don't
// trip Pathao/Steadfast rate limits.
const COURIER_REQ_GAP_MS = 500;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * GET /api/v1/admin/courier/pathao?action=test
 * GET ?action=balance
 * GET ?action=status&consignment_id=XXX
 * GET ?action=cities | zones&city_id=XX | areas&zone_id=XX | stores
 */
export async function GET(request: NextRequest) {
  try { await requireStaff(); } catch (e) { return e as Response; }

  const action = request.nextUrl.searchParams.get("action");

  if (action === "test") {
    clearPathaoCache();
    try {
      // Test only needs auth creds — store can be picked after.
      const hasAuth = await hasPathaoAuth();
      if (!hasAuth) return jsonResponse({ success: false, message: "Pathao auth credentials missing (client_id, secret, email, password)." });
      const result = await checkPathaoBalance();
      if (result.code === 200 && result.data) return jsonResponse({ success: true, info: result.data });
      // Surface real reason from upstream
      return jsonResponse({
        success: false,
        message: result.message || `Pathao API responded ${result.code ?? "?"}`,
        upstream_status: result.code,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      console.error("Pathao test error:", err);
      return jsonResponse({ success: false, message: msg });
    }
  }

  // For lookup/balance actions we only need auth (store not required yet).
  const lookupActions = new Set(["balance", "cities", "zones", "areas", "stores"]);
  if (lookupActions.has(action || "")) {
    if (!(await hasPathaoAuth())) {
      return errorResponse("Pathao auth credentials missing", 400);
    }
  } else if (!(await isPathaoConfigured())) {
    return errorResponse("Pathao not configured. Go to Settings → Courier.", 400);
  }

  if (action === "balance") {
    clearPathaoCache();
    try {
      const result = await checkPathaoBalance();
      return jsonResponse({ info: result.data, message: result.message });
    } catch { return errorResponse("Failed to fetch Pathao info", 500); }
  }

  if (action === "status") {
    const cid = request.nextUrl.searchParams.get("consignment_id");
    if (!cid) return errorResponse("consignment_id required", 400);
    try {
      const result = await checkPathaoStatus(cid);
      return jsonResponse({ delivery_status: result.data?.order_status, consignment: result.data });
    } catch { return errorResponse("Failed to check status", 500); }
  }

  if (action === "cities") {
    try { return jsonResponse({ items: await listPathaoCities() }); }
    catch { return errorResponse("Failed to load cities", 500); }
  }
  if (action === "zones") {
    const cityId = Number(request.nextUrl.searchParams.get("city_id"));
    if (!cityId) return errorResponse("city_id required", 400);
    try { return jsonResponse({ items: await listPathaoZones(cityId) }); }
    catch { return errorResponse("Failed to load zones", 500); }
  }
  if (action === "areas") {
    const zoneId = Number(request.nextUrl.searchParams.get("zone_id"));
    if (!zoneId) return errorResponse("zone_id required", 400);
    try { return jsonResponse({ items: await listPathaoAreas(zoneId) }); }
    catch { return errorResponse("Failed to load areas", 500); }
  }
  if (action === "stores") {
    try { return jsonResponse({ items: await listPathaoStores() }); }
    catch { return errorResponse("Failed to load stores", 500); }
  }

  return errorResponse("Invalid action. Use: test, balance, status, cities, zones, areas, stores", 400);
}

// Build Pathao payload from order
function buildPathaoPayload(order: any): PathaoOrder {
  // Address: customer-typed address only. `order.city` is the shipping zone
  // label (e.g. "ঢাকার ভিতরে" / "ঢাকার বাহিরে") not a real city — appending
  // it muddies the courier address. Pathao resolves city/zone via its own
  // selectors below; the address parser also works better without the label.
  const address = order.customerAddress || "";

  // Item description sent to Pathao. Format: "Name – Variant x Qty",
  // simple products skip variant. Joined with " / ". No price.
  const items = (order.items || []).map((i: any) => {
    const name = i.productName || i.product_name;
    const variant = i.variantLabel || i.variant_label;
    const label = variant ? `${name} – ${variant}` : name;
    return `${label} * ${i.quantity}`;
  });
  const itemsDesc = items.join(" / ");
  const totalQty = (order.items || []).reduce((s: number, i: any) => s + Number(i.quantity || 1), 0) || 1;
  // Strip internal "Landing page: <slug>" marker — irrelevant to riders.
  const cleanNotes = (order.notes || "").replace(/^Landing page:.*$/i, "").trim();

  return {
    merchant_order_id: generatePathaoMerchantOrderId(order.id),
    recipient_name: order.customerName,
    recipient_phone: formatPhone(order.customerPhone),
    recipient_address: address || order.customerAddress || "N/A",
    item_quantity: totalQty,
    item_weight: 0.5,
    amount_to_collect: Math.round(Number(order.total)),
    item_description: itemsDesc,
    special_instruction: cleanNotes,
  };
}

/**
 * POST /api/v1/admin/courier/pathao
 * { order_id } | { order_ids } | { action: "bulk_send", order_ids } | { action: "check_status", order_id }
 */
export async function POST(request: NextRequest) {
  try { await requireStaff(); } catch (e) { return e as Response; }

  const body = await request.json();

  // Bust 5-min settings cache so a just-saved Pathao credential is read
  // fresh from DB, not reported as "not configured".
  clearPathaoCache();

  // Per-action gate: status check only needs auth to hit Pathao's read
  // endpoint, so it still works on pre-existing orders even if admin later
  // disables Pathao. Send actions do need full config — checked below.
  const isStatusCheck = body.action === "check_status";
  if (!isStatusCheck && !(await isPathaoConfigured())) {
    return errorResponse("Pathao not configured", 400);
  }

  // Check & update delivery status
  if (body.action === "check_status" && body.order_id) {
    const order = await prisma.order.findUnique({ where: { id: Number(body.order_id) } });
    if (!order) return notFound("Order not found");
    if (!order.consignmentId) return errorResponse("No consignment ID for this order", 400);

    // Auto-delegate to Steadfast if the order was actually sent through it
    // (client's activeCourier may not match the order's real provider).
    if (order.courierType === "steadfast") {
      clearKeyCache();
      if (!(await isSteadfastConfigured())) {
        return errorResponse("Steadfast API keys not configured — cannot check status for this Steadfast order.", 400);
      }
      try {
        const r = await checkDeliveryStatus(order.consignmentId);
        if (r.status === 200 && r.delivery_status) {
          await prisma.order.update({
            where: { id: order.id },
            data: buildStatusUpdate(order.status, r.delivery_status),
          });
          return jsonResponse({ delivery_status: r.delivery_status, consignment: r.consignment });
        }
        console.error("[courier status] Steadfast (delegated) returned:", r);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return errorResponse((r as any)?.message || `Steadfast status=${r.status}, no delivery_status`, 400);
      } catch (err) {
        console.error("[courier status] Steadfast (delegated) fetch failed:", err);
        return errorResponse("Failed to check status: " + (err instanceof Error ? err.message : "Unknown"), 500);
      }
    }

    // Pathao path (courierType === "pathao" or legacy null)
    if (!(await hasPathaoAuth())) {
      return errorResponse("Pathao credentials missing — cannot check status. Re-add credentials in Settings → Courier.", 400);
    }

    try {
      const result = await checkPathaoStatus(order.consignmentId);
      if (result.data?.order_status) {
        await prisma.order.update({
          where: { id: order.id },
          data: buildStatusUpdate(order.status, result.data.order_status),
        });
        return jsonResponse({ delivery_status: result.data.order_status, consignment: result.data });
      }
      console.error("[courier status] Pathao returned:", result);
      return errorResponse(result.message || `Pathao code=${result.code ?? "?"}, no order_status in response`, 400);
    } catch (err) {
      console.error("[courier status] Pathao fetch failed:", err);
      return errorResponse("Failed to check status: " + (err instanceof Error ? err.message : "Unknown"), 500);
    }
  }

  // Bulk preview — returns each order's base payload + auto-matched city/zone/area
  // for the review modal. No DB writes, no Pathao bulk call.
  if (body.action === "bulk_preview" && Array.isArray(body.order_ids)) {
    const orders = await prisma.order.findMany({
      where: { id: { in: body.order_ids.map(Number) }, courierSent: false },
      include: { items: true },
    });
    const items = await Promise.all(orders.map(async (o) => {
      const base = buildPathaoPayload(o);
      const validPhone = isValidBDPhone(o.customerPhone);
      let matched: any = null;
      if (validPhone) {
        const parsed = await parsePathaoAddress(base.recipient_address, base.recipient_phone);
        if (parsed?.district_id && parsed?.zone_id) {
          matched = {
            city_id: parsed.district_id,
            city_name: parsed.district_name,
            zone_id: parsed.zone_id,
            zone_name: parsed.zone_name,
            area_id: parsed.area_id || null,
            area_name: parsed.area_name || null,
            score: parsed.score,
          };
        }
      }
      return {
        order_id: o.id,
        customer_name: o.customerName,
        customer_phone: o.customerPhone,
        valid_phone: validPhone,
        address: base.recipient_address,
        amount: base.amount_to_collect,
        item_quantity: base.item_quantity,
        item_description: base.item_description,
        special_instruction: base.special_instruction,
        matched,
      };
    }));
    return jsonResponse({ items });
  }

  // Bulk send via Pathao bulk API
  if (body.action === "bulk_send" && Array.isArray(body.order_ids)) {
    const orders = await prisma.order.findMany({
      where: { id: { in: body.order_ids.map(Number) }, courierSent: false },
      include: { items: true },
    });
    const validOrders = orders.filter(o => isValidBDPhone(o.customerPhone));
    if (validOrders.length === 0) return errorResponse("No valid orders to send", 400);

    // Per-order overrides from review modal: { [orderId]: { recipient_city, recipient_zone, recipient_area, ... } }
    const overrides: Record<string, Partial<PathaoOrder>> = body.overrides || {};
    // Auto-match per-order city/zone/area from address (only if web token configured).
    // Without this every bulk order falls back to the same default location.
    // Default ON; client can pass auto_match: false to skip. Skipped per-order when override given.
    const autoMatch = body.auto_match !== false;
    const matchInfo: { order_id: number; matched: boolean; city?: string; zone?: string; area?: string; override?: boolean }[] = [];
    const payloads = await Promise.all(validOrders.map(async (o) => {
      const base = buildPathaoPayload(o);
      const ov = overrides[String(o.id)];
      if (ov && ov.recipient_city && ov.recipient_zone) {
        matchInfo.push({ order_id: o.id, matched: true, override: true });
        return { ...base, ...ov, merchant_order_id: base.merchant_order_id };
      }
      if (!autoMatch) {
        matchInfo.push({ order_id: o.id, matched: false });
        return base;
      }
      const parsed = await parsePathaoAddress(base.recipient_address, base.recipient_phone);
      if (parsed?.district_id && parsed?.zone_id) {
        matchInfo.push({
          order_id: o.id,
          matched: true,
          city: parsed.district_name,
          zone: parsed.zone_name,
          area: parsed.area_name || undefined,
        });
        return {
          ...base,
          recipient_city: parsed.district_id,
          recipient_zone: parsed.zone_id,
          ...(parsed.area_id ? { recipient_area: parsed.area_id } : {}),
        };
      }
      matchInfo.push({ order_id: o.id, matched: false });
      return base; // falls back to defaults inside sendBulkToPathao
    }));
    const results: { order_id: number; status: string; consignment_id?: string; error?: string; matched?: boolean }[] = [];

    try {
      const res = await sendBulkToPathao(payloads);
      const dataItems = res.data || [];
      // Pathao may not return in same order — match by merchant_order_id
      for (const order of validOrders) {
        const mid = generatePathaoMerchantOrderId(order.id);
        const item = dataItems.find(d => d.merchant_order_id === mid);
        if (item?.consignment_id) {
          await prisma.order.update({
            where: { id: order.id },
            data: { courierSent: true, courierType: "pathao", consignmentId: String(item.consignment_id), courierStatus: item.order_status || "pending" },
          });
          const m = matchInfo.find(x => x.order_id === order.id);
          results.push({ order_id: order.id, status: "success", consignment_id: String(item.consignment_id), matched: m?.matched });
        } else {
          const err = item?.errors ? Object.values(item.errors).flat().join(", ") : "Failed";
          const m = matchInfo.find(x => x.order_id === order.id);
          results.push({ order_id: order.id, status: "error", error: err, matched: m?.matched });
        }
      }
    } catch (err) {
      // Bulk endpoint failed — fall back to per-order send
      let firstFb = true;
      for (const order of validOrders) {
        if (!firstFb) await sleep(COURIER_REQ_GAP_MS);
        firstFb = false;
        try {
          const r = await sendToPathao(buildPathaoPayload(order));
          if (r.data?.consignment_id) {
            await prisma.order.update({
              where: { id: order.id },
              data: { courierSent: true, courierType: "pathao", consignmentId: String(r.data.consignment_id), courierStatus: r.data.order_status || "pending" },
            });
            results.push({ order_id: order.id, status: "success", consignment_id: String(r.data.consignment_id) });
          } else {
            const errMsg = r.errors ? Object.values(r.errors).flat().join(", ") : r.message || "Failed";
            results.push({ order_id: order.id, status: "error", error: errMsg });
          }
        } catch {
          results.push({ order_id: order.id, status: "error", error: "Request failed" });
        }
      }
    }

    const auto_matched = matchInfo.filter(m => m.matched).length;
    const fallback = matchInfo.length - auto_matched;
    return jsonResponse({
      results,
      total: validOrders.length,
      sent: results.filter(r => r.status === "success").length,
      auto_matched,
      fallback,
      match_info: matchInfo,
    });
  }

  // Multiple order_ids — sequential send
  if (Array.isArray(body.order_ids)) {
    const results: { order_id: number; status: string; consignment_id?: string; error?: string }[] = [];
    let firstSeq = true;
    for (const orderId of body.order_ids) {
      if (!firstSeq) await sleep(COURIER_REQ_GAP_MS);
      firstSeq = false;
      const order = await prisma.order.findUnique({ where: { id: Number(orderId) }, include: { items: true } });
      if (!order) { results.push({ order_id: orderId, status: "not_found" }); continue; }
      if (order.courierSent) { results.push({ order_id: orderId, status: "already_sent", consignment_id: order.consignmentId || undefined }); continue; }
      if (!isValidBDPhone(order.customerPhone)) { results.push({ order_id: orderId, status: "error", error: `Invalid phone: ${order.customerPhone}` }); continue; }
      try {
        const r = await sendToPathao(buildPathaoPayload(order));
        if (r.data?.consignment_id) {
          await prisma.order.update({
            where: { id: order.id },
            data: { courierSent: true, courierType: "pathao", consignmentId: String(r.data.consignment_id), courierStatus: r.data.order_status || "pending" },
          });
          results.push({ order_id: orderId, status: "success", consignment_id: String(r.data.consignment_id) });
        } else {
          const errMsg = r.errors ? Object.values(r.errors).flat().join(", ") : r.message || "Failed";
          results.push({ order_id: orderId, status: "error", error: errMsg });
        }
      } catch { results.push({ order_id: orderId, status: "error", error: "Request failed" }); }
    }
    return jsonResponse({ results });
  }

  // Single send
  if (body.order_id) {
    const order = await prisma.order.findUnique({ where: { id: Number(body.order_id) }, include: { items: true } });
    if (!order) return notFound("Order not found");
    if (order.courierSent) {
      return jsonResponse({ message: "Already sent to courier", consignment_id: order.consignmentId });
    }
    if (!isValidBDPhone(order.customerPhone)) {
      return errorResponse(`Invalid phone: ${order.customerPhone}. Must be valid BD number (01XXXXXXXXX)`, 422);
    }
    try {
      // Allow caller to override the auto-built payload (e.g. user picked city/zone/area in prefill modal).
      const basePayload = buildPathaoPayload(order);
      const finalPayload = body.payload ? { ...basePayload, ...body.payload, merchant_order_id: basePayload.merchant_order_id } : basePayload;
      const r = await sendToPathao(finalPayload);
      if (r.data?.consignment_id) {
        const updated = await prisma.order.update({
          where: { id: order.id },
          data: { courierSent: true, courierType: "pathao", consignmentId: String(r.data.consignment_id), courierStatus: r.data.order_status || "pending" },
          include: { items: true },
        });
        return jsonResponse({
          message: "Order sent to Pathao courier",
          consignment_id: r.data.consignment_id,
          order: serialize(updated),
        });
      }
      const errMsg = r.errors ? Object.values(r.errors).flat().join(", ") : r.message || "Failed to send";
      return errorResponse(errMsg, 400);
    } catch (err) {
      console.error("Pathao send error:", err);
      return errorResponse("Failed to send order to Pathao: " + (err instanceof Error ? err.message : "Unknown"), 500);
    }
  }

  return errorResponse("Provide order_id or order_ids", 400);
}
