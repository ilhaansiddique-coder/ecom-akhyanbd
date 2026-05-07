/**
 * POST /api/v1/admin/orders/[id]/block
 *
 * One-click ban: blocks the customer's phone, IP, and device fingerprint
 * tied to this order in a single call. Used by the order detail "Block
 * customer" button.
 *
 * Body:
 *   { reason?: string }
 *
 * Response:
 *   { phone: { blocked, value }, ip: { blocked, value }, fp: { blocked, value } }
 */
import { NextRequest } from "next/server";
import { jsonResponse, errorResponse, notFound, validationError } from "@/lib/api-response";
import { withStaff } from "@/lib/auth-helpers";
import { blockCustomerFromOrder } from "@/lib/spamGuard";
import { blockFromOrderSchema } from "@/lib/validation";
import { bumpVersion } from "@/lib/sync";

export const POST = withStaff<{ params: Promise<{ id: string }> }>(async (request, { params }, admin) => {
  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isFinite(orderId) || orderId <= 0) return errorResponse("Invalid order id", 400);

  let body: unknown = {};
  try { body = await request.json(); } catch {}
  const parsed = blockFromOrderSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }
  const reason = (parsed.data.reason && parsed.data.reason.trim()) || "fake_order";

  try {
    const result = await blockCustomerFromOrder(orderId, reason, admin.id);
    // Three signals from one click: a fraud-list change AND the order is
    // now linked to a blocked entity, so the orders list refetches too.
    bumpVersion("fraud", { kind: "fraud.block_added", title: "Customer blocked", body: `Order #${orderId} — ${reason}`, severity: "alert" });
    bumpVersion("orders");
    return jsonResponse(result);
  } catch (e) {
    if (e instanceof Error && e.message === "Order not found") return notFound("Order not found");
    console.error("[block-from-order]", e);
    return errorResponse("Failed to block customer", 500);
  }
});
