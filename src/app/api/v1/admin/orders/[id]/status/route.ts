import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { revalidateAll } from "@/lib/revalidate";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse, validationError, notFound, errorResponse } from "@/lib/api-response";
import { requireAdmin, withStaff } from "@/lib/auth-helpers";
import { orderStatusSchema } from "@/lib/validation";
import { bumpVersion } from "@/lib/sync";
import { sendToFacebookCAPI } from "@/lib/fbcapi";
import { getSettings } from "@/lib/settingsCache";

export const PUT = withStaff<{ params: Promise<{ id: string }> }>(async (request, { params }) => {
  const { id } = await params;
  const existing = await prisma.order.findUnique({ where: { id: Number(id) } });
  if (!existing) return notFound("Order not found");

  try {
    const body = await request.json();
    const parsed = orderStatusSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const data = parsed.data;

    // Trashing an order is treated as a delete — admin-only, even though the
    // rest of the status transitions (pending → confirmed → shipped, etc.)
    // are open to staff.
    if (data.status === "trashed") {
      try { await requireAdmin(); } catch (e) { return e as Response; }
    }

    // Guard: never let an already-dispatched order revert to a pre-courier
    // status. Once a parcel has a consignment + courierSent flag, status MUST
    // stay in {shipped, delivered, cancelled, trashed}. Any pending/confirmed/
    // processing PUT is silently coerced to "shipped" so accidental dropdown
    // clicks (or stale bulk-status forms) can't desync the orders grid from
    // the courier monitor. This was the root cause of the recurring
    // "courier sent but row says Confirmed" reports.
    const PRE_COURIER = new Set(["pending", "confirmed", "processing"]);
    let nextStatus = data.status;
    const dispatched = Boolean(existing.courierSent && existing.consignmentId);
    if (dispatched && PRE_COURIER.has(nextStatus)) {
      nextStatus = "shipped";
    }

    const updateData: Prisma.OrderUncheckedUpdateInput = { status: nextStatus };
    if (data.payment_status) updateData.paymentStatus = data.payment_status;

    // Handle Purchase / OrderCancelled event based on new status.
    //
    // Rule: presence of `trackingData` is the source of truth. /collect only
    // stores it when defer was ON at checkout time (defer-off branch fires
    // immediately and skips storage). So if trackingData exists here, it has
    // NEVER been fired and must be fired on confirm — regardless of the
    // CURRENT defer toggle. Previous version checked the live setting and
    // cleared trackingData without firing when admin had toggled defer OFF
    // between checkout and confirm — silently losing those Purchases.
    //
    // De-dup safety: trackingData is cleared right after we fire, so the
    // same event can never be re-fired. FB's event_id de-dup (~7d) is the
    // backstop for any pathological double-confirm.
    if (existing.trackingData) {
      // Cached settings (60s TTL, busted by admin save). 60s lag for a
      // rotated FB token is acceptable — admin can re-save to invalidate.
      const creds = await getSettings(["fb_pixel_id", "fb_capi_access_token", "fb_test_event_code"]);
      const accessToken = creds.fb_capi_access_token || "";

      if (data.status === "confirmed") {
        // Fire the stored Purchase event to Facebook CAPI.
        //
        // event_time: keep the ORIGINAL checkout timestamp the customer placed
        // the order at. Facebook attribution windows + audiences use this to
        // know when the actual purchase happened, not when admin verified it.
        //
        // Edge case: FB rejects events older than 7 days. If admin sat on a
        // pending order longer than that, clamp to 6.5 days ago so the fire
        // succeeds rather than silently failing — a slightly-shifted timestamp
        // is better than no event at all.
        try {
          const stored = JSON.parse(existing.trackingData);
          const { eventData, pixelId, testEventCode } = stored;

          if (pixelId && accessToken && eventData) {
            const nowSec = Math.floor(Date.now() / 1000);
            const sevenDaysAgo = nowSec - 7 * 24 * 60 * 60;
            const sixHalfDaysAgo = nowSec - 6.5 * 24 * 60 * 60;
            const originalTime = Number(eventData.event_time) || nowSec;
            // Use original unless too old; never use a future time either.
            eventData.event_time = (originalTime < sevenDaysAgo)
              ? Math.floor(sixHalfDaysAgo)
              : Math.min(originalTime, nowSec);
            await sendToFacebookCAPI(pixelId, accessToken, eventData, testEventCode);
          } else {
            console.warn(`[FB CAPI] Skipped Purchase fire for order ${existing.id}: pixelId=${!!pixelId} token=${!!accessToken} eventData=${!!eventData}`);
          }
        } catch (e) {
          console.error("[FB CAPI] Failed to send deferred Purchase:", e);
        }
        // Clear tracking data after sending so we never refire.
        updateData.trackingData = null;
      } else if (data.status === "cancelled" || data.status === "trashed") {
        // Fire a custom OrderCancelled event with the same custom_data so the
        // marketer can build retargeting/exclusion audiences. Never fires
        // Purchase. Pixel page-side has no equivalent — it's CAPI-only.
        try {
          const stored = JSON.parse(existing.trackingData);
          const { eventData, pixelId, testEventCode } = stored;
          if (pixelId && accessToken && eventData) {
            const cancelEvent = {
              ...eventData,
              event_name: "OrderCancelled",
              event_id: `cancel-${existing.id}-${Date.now()}`,
              event_time: Math.floor(Date.now() / 1000),
            };
            await sendToFacebookCAPI(pixelId, accessToken, cancelEvent, testEventCode);
          }
        } catch (e) {
          console.error("[FB CAPI] Failed to send OrderCancelled:", e);
        }
        // Discard the stored Purchase — never fire to Facebook
        updateData.trackingData = null;
      }
    }

    const order = await prisma.order.update({
      where: { id: Number(id) },
      data: updateData,
      include: { items: true },
    });

    // Include "products" so the dashboard products list re-aggregates sold counts
    // (e.g. cancellation should decrement the live Sales column).
    revalidateAll("orders", "products");
    // Notify other admin clients that the status moved. The triggering
    // admin will get the event too, but the Flutter store dedupes by
    // (kind+id+version) so it shows up once. Severity escalates for
    // cancelled/trashed since those are reversible-but-loud actions.
    const newStatus = String(nextStatus);
    const isLoud = newStatus === "cancelled" || newStatus === "trashed";
    bumpVersion("orders", {
      kind: "order.status_changed",
      title: `Order #${order.id} → ${newStatus}`,
      body: `${order.customerName} • ৳${Math.round(order.total)}`,
      href: `/orders/${order.id}`,
      icon: isLoud ? "report" : "local_shipping",
      severity: isLoud ? "warn" : "info",
    });
    return jsonResponse(serialize(order));
  } catch (error) {
    return errorResponse("Failed to update order status", 500);
  }
});
