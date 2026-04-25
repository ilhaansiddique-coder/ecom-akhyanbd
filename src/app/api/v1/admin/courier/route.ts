import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse, errorResponse, notFound } from "@/lib/api-response";
import { requireStaff } from "@/lib/auth-helpers";
import {
  sendToSteadfast,
  sendBulkToSteadfast,
  checkDeliveryStatus,
  checkBalance,
  checkCourierScore,
  formatPhone,
  generateInvoice,
  isSteadfastConfigured,
  clearKeyCache,
  isValidBDPhone,
} from "@/lib/steadfast";
import { checkPathaoStatus, hasPathaoAuth, clearPathaoCache } from "@/lib/pathao";
import { mapCourierStatusToOrderStatus } from "@/lib/courierStatusMap";

// Build the data payload for `prisma.order.update` when a courier-status
// poll returns a new value. Always sets `courierStatus`; conditionally sets
// `status` to "delivered" / "cancelled" if the courier marks the parcel as
// such — but never overrides a "trashed" order (those are deliberately
// removed by admin and shouldn't resurrect via courier sync).
function buildStatusUpdate(currentOrderStatus: string, courierStatus: string) {
  const derived = mapCourierStatusToOrderStatus(courierStatus);
  if (!derived || currentOrderStatus === "trashed" || currentOrderStatus === derived) {
    return { courierStatus };
  }
  return { courierStatus, status: derived };
}

// Spacing between sequential courier API hits inside bulk loops so we don't
// trip Steadfast/Pathao rate limits. ~500ms keeps a 50-order bulk send under
// 30s while staying well under any reasonable per-second cap.
const COURIER_REQ_GAP_MS = 500;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * GET /api/v1/admin/courier?action=balance
 * GET /api/v1/admin/courier?action=status&consignment_id=XXX
 * GET /api/v1/admin/courier?action=score&phone=01XXXXXXXXX
 */
export async function GET(request: NextRequest) {
  let admin;
  try { admin = await requireStaff(); } catch (e) { return e as Response; }

  const action = request.nextUrl.searchParams.get("action");

  // Test action — must run before configured check (it clears cache to re-read from DB)
  if (action === "test") {
    clearKeyCache();
    try {
      const configured = await isSteadfastConfigured();
      if (!configured) return jsonResponse({ success: false, message: "API keys not set. Go to Settings to add them." });
      const result = await checkBalance();
      if (result.status === 200) {
        return jsonResponse({ success: true, balance: result.current_balance });
      }
      return jsonResponse({ success: false, message: "Unauthorized — check API keys" });
    } catch {
      return jsonResponse({ success: false, message: "Connection failed" });
    }
  }

  if (!(await isSteadfastConfigured())) {
    return errorResponse("Steadfast API keys not configured. Go to Settings → Courier to add them.", 400);
  }

  // Check balance (also clears cache to get fresh keys)
  if (action === "balance") {
    clearKeyCache();
    try {
      const result = await checkBalance();
      if (result.status === 200) {
        return jsonResponse({ balance: result.current_balance });
      }
      return errorResponse("Unauthorized — check API keys", 401);
    } catch {
      return errorResponse("Failed to check balance", 500);
    }
  }

  // Check delivery status
  if (action === "status") {
    const consignmentId = request.nextUrl.searchParams.get("consignment_id");
    if (!consignmentId) return errorResponse("consignment_id required", 400);

    try {
      const result = await checkDeliveryStatus(consignmentId);
      if (result.status === 200) {
        return jsonResponse({
          delivery_status: result.delivery_status,
          consignment: result.consignment,
        });
      }
      return errorResponse("Failed to get status", 400);
    } catch {
      return errorResponse("Failed to check status", 500);
    }
  }

  // Check courier score
  if (action === "score") {
    const phone = request.nextUrl.searchParams.get("phone");
    if (!phone) return errorResponse("phone required", 400);

    try {
      const result = await checkCourierScore(phone);
      return jsonResponse(result);
    } catch {
      return errorResponse("Failed to check score", 500);
    }
  }

  return errorResponse("Invalid action. Use: balance, status, score, test", 400);
}

// Helper: build clean Steadfast payload from order
function buildSteadfastPayload(order: any) {
  // Address: customer-typed address only. `order.city` is the shipping zone
  // label (e.g. "ঢাকার ভিতরে" / "ঢাকার বাহিরে") not a real city — appending
  // it muddies the courier address.
  const address = order.customerAddress || "";

  // Item description sent to courier. Format: "Name – Variant x Qty",
  // simple products skip the variant part. Multiple items joined with " / ".
  // Price intentionally omitted — riders only need name + variant + qty.
  const items = (order.items || []).map((i: any) => {
    const name = i.productName || i.product_name;
    const variant = i.variantLabel || i.variant_label;
    const label = variant ? `${name} – ${variant}` : name;
    return `${label} * ${i.quantity}`;
  });
  const itemsDescription = items.join(" / ");
  // Strip internal "Landing page: <slug>" marker — irrelevant to riders.
  const cleanNotes = (order.notes || "").replace(/^Landing page:.*$/i, "").trim();
  const note = [itemsDescription, cleanNotes].filter(Boolean).join(" | ");

  return {
    invoice: generateInvoice(order.id),
    recipient_name: order.customerName,
    recipient_phone: formatPhone(order.customerPhone),
    recipient_address: address,
    cod_amount: Math.round(Number(order.total)),
    note,
    item_description: itemsDescription,
  };
}

/**
 * POST /api/v1/admin/courier
 * Body: { order_id: number } — Send order to Steadfast
 * Body: { order_ids: number[] } — Bulk send orders
 * Body: { action: "bulk_send", order_ids: number[] } — Bulk send via Steadfast bulk API
 * Body: { action: "check_status", order_id: number } — Check & update status
 */
export async function POST(request: NextRequest) {
  let admin;
  try { admin = await requireStaff(); } catch (e) { return e as Response; }

  const body = await request.json();

  // Clear cache so we always read the latest keys from DB — admin may have
  // just saved new credentials via Settings → Courier and the old 5-min
  // cache would otherwise still report "not configured" even though keys
  // are present. Cheap; only runs on courier actions.
  clearKeyCache();

  // Per-action configured gate: status/score only need keys to exist to hit
  // Steadfast's read endpoints. Send/bulk_send need them too, and we check
  // below. Pure-read status checks on old orders still work even if admin
  // later disables Steadfast.
  const needsConfigured = !(body.action === "check_status" || body.action === "check_score");
  if (needsConfigured && !(await isSteadfastConfigured())) {
    return errorResponse("Steadfast API keys not configured", 400);
  }

  // Check & update delivery status for an order
  if (body.action === "check_status" && body.order_id) {
    const order = await prisma.order.findUnique({ where: { id: Number(body.order_id) } });
    if (!order) return notFound("Order not found");
    if (!order.consignmentId) return errorResponse("No consignment ID for this order", 400);

    // Auto-delegate to the right provider based on order.courierType so the
    // client doesn't need to know. Callers have been getting confused when
    // their local activeCourier doesn't match an order's actual provider.
    if (order.courierType === "pathao") {
      clearPathaoCache();
      if (!(await hasPathaoAuth())) {
        return errorResponse("Pathao credentials missing — cannot check status for this Pathao order. Re-add in Settings → Courier.", 400);
      }
      try {
        const r = await checkPathaoStatus(order.consignmentId);
        if (r.data?.order_status) {
          await prisma.order.update({
            where: { id: order.id },
            data: buildStatusUpdate(order.status, r.data.order_status),
          });
          return jsonResponse({ delivery_status: r.data.order_status, consignment: r.data });
        }
        console.error("[courier status] Pathao (delegated) returned:", r);
        return errorResponse(r.message || `Pathao code=${r.code ?? "?"}, no order_status`, 400);
      } catch (err) {
        console.error("[courier status] Pathao (delegated) fetch failed:", err);
        return errorResponse("Failed to check status: " + (err instanceof Error ? err.message : "Unknown"), 500);
      }
    }

    // Steadfast path (courierType === "steadfast" or legacy null)
    if (!(await isSteadfastConfigured())) {
      return errorResponse("Steadfast API keys not configured — cannot check status for this Steadfast order. Re-add keys in Settings → Courier.", 400);
    }

    try {
      const result = await checkDeliveryStatus(order.consignmentId);
      if (result.status === 200 && result.delivery_status) {
        await prisma.order.update({
          where: { id: order.id },
          data: buildStatusUpdate(order.status, result.delivery_status),
        });
        return jsonResponse({
          delivery_status: result.delivery_status,
          consignment: result.consignment,
        });
      }
      // Surface real upstream response for debugging instead of generic 400
      console.error("[courier status] Steadfast returned:", result);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg = (result as any)?.message || `Steadfast status=${result.status}, no delivery_status in response`;
      return errorResponse(msg, 400);
    } catch (err) {
      console.error("[courier status] Steadfast fetch failed:", err);
      return errorResponse("Failed to check status: " + (err instanceof Error ? err.message : "Unknown"), 500);
    }
  }

  // Check courier score for an order
  if (body.action === "check_score" && body.order_id) {
    const order = await prisma.order.findUnique({ where: { id: Number(body.order_id) } });
    if (!order) return notFound("Order not found");

    try {
      const result = await checkCourierScore(order.customerPhone);
      if (result.success_ratio) {
        await prisma.order.update({
          where: { id: order.id },
          data: { courierScore: result.success_ratio },
        });
      }
      return jsonResponse(result);
    } catch {
      return errorResponse("Failed to check score", 500);
    }
  }

  // Bulk send — sends each order one by one (reliable)
  if (body.action === "bulk_send" && body.order_ids && Array.isArray(body.order_ids)) {
    const orders = await prisma.order.findMany({
      where: { id: { in: body.order_ids.map(Number) }, courierSent: false },
      include: { items: true },
    });

    const validOrders = orders.filter(o => isValidBDPhone(o.customerPhone));
    if (validOrders.length === 0) return errorResponse("No valid orders to send", 400);

    const results: { order_id: number; status: string; consignment_id?: string; error?: string }[] = [];

    let first = true;
    for (const order of validOrders) {
      if (!first) await sleep(COURIER_REQ_GAP_MS);
      first = false;
      try {
        const payload = buildSteadfastPayload(order);
        const res = await sendToSteadfast(payload);

        if (res.status === 200 && res.consignment) {
          await prisma.order.update({
            where: { id: order.id },
            data: { courierSent: true, courierType: "steadfast", consignmentId: String(res.consignment.consignment_id), courierStatus: "pending" },
          });
          results.push({ order_id: order.id, status: "success", consignment_id: String(res.consignment.consignment_id) });
        } else {
          const errMsg = res.errors ? Object.values(res.errors).flat().join(", ") : res.message || "Failed";
          results.push({ order_id: order.id, status: "error", error: errMsg });
        }
      } catch (err) {
        results.push({ order_id: order.id, status: "error", error: "Request failed" });
      }
    }

    return jsonResponse({ results, total: validOrders.length, sent: results.filter(r => r.status === "success").length });
  }

  // Bulk send orders (one by one fallback)
  if (body.order_ids && Array.isArray(body.order_ids)) {
    const results: { order_id: number; status: string; consignment_id?: string; error?: string }[] = [];

    let firstSeq = true;
    for (const orderId of body.order_ids) {
      if (!firstSeq) await sleep(COURIER_REQ_GAP_MS);
      firstSeq = false;
      const order = await prisma.order.findUnique({
        where: { id: Number(orderId) },
        include: { items: true },
      });

      if (!order) {
        results.push({ order_id: orderId, status: "not_found" });
        continue;
      }

      if (order.courierSent) {
        results.push({ order_id: orderId, status: "already_sent", consignment_id: order.consignmentId || undefined });
        continue;
      }

      if (!isValidBDPhone(order.customerPhone)) {
        results.push({ order_id: orderId, status: "error", error: `Invalid phone: ${order.customerPhone}` });
        continue;
      }

      try {
        const res = await sendToSteadfast(buildSteadfastPayload(order));

        if (res.status === 200 && res.consignment) {
          await prisma.order.update({
            where: { id: order.id },
            data: {
              courierSent: true,
              consignmentId: String(res.consignment.consignment_id),
              courierStatus: "pending",
            },
          });
          results.push({ order_id: orderId, status: "success", consignment_id: res.consignment.consignment_id });
        } else {
          const errMsg = res.errors
            ? Object.values(res.errors).flat().join(", ")
            : res.message || "Failed";
          results.push({ order_id: orderId, status: "error", error: errMsg });
        }
      } catch (err) {
        results.push({ order_id: orderId, status: "error", error: "Request failed" });
      }
    }

    return jsonResponse({ results });
  }

  // Single order send
  if (body.order_id) {
    const order = await prisma.order.findUnique({
      where: { id: Number(body.order_id) },
      include: { items: true },
    });

    if (!order) return notFound("Order not found");
    if (order.courierSent) {
      return jsonResponse({
        message: "Already sent to courier",
        consignment_id: order.consignmentId,
      });
    }

    // Validate phone
    if (!isValidBDPhone(order.customerPhone)) {
      return errorResponse(`Invalid phone number: ${order.customerPhone}. Must be a valid BD number (01XXXXXXXXX)`, 422);
    }

    try {
      const payload = buildSteadfastPayload(order);
      const res = await sendToSteadfast(payload);

      if (res.status === 200 && res.consignment) {
        const updated = await prisma.order.update({
          where: { id: order.id },
          data: {
            courierSent: true,
            consignmentId: String(res.consignment.consignment_id),
            courierStatus: "pending",
          },
          include: { items: true },
        });

        return jsonResponse({
          message: "Order sent to Steadfast courier",
          consignment_id: res.consignment.consignment_id,
          order: serialize(updated),
        });
      }

      const errMsg = res.errors
        ? Object.values(res.errors).flat().join(", ")
        : res.message || "Failed to send";
      return errorResponse(errMsg, 400);
    } catch (err) {
      console.error("Steadfast send error:", err);
      return errorResponse("Failed to send order to courier: " + (err instanceof Error ? err.message : "Unknown error"), 500);
    }
  }

  return errorResponse("Provide order_id or order_ids", 400);
}
