import { NextRequest } from "next/server";
import { revalidateAll } from "@/lib/revalidate";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse, validationError, notFound, errorResponse } from "@/lib/api-response";
import { requireStaff, requireAdmin } from "@/lib/auth-helpers";
import { orderStatusSchema } from "@/lib/validation";
import { bumpVersion } from "@/lib/sync";
import { sendToFacebookCAPI } from "@/lib/fbcapi";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let admin;
  try { admin = await requireStaff(); } catch (e) { return e as Response; }

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = { status: nextStatus };
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
      const credRows = await prisma.siteSetting.findMany({
        where: { key: { in: ["fb_pixel_id", "fb_capi_access_token", "fb_test_event_code"] } },
      });
      const creds: Record<string, string> = {};
      for (const r of credRows) if (r.value) creds[r.key] = r.value;
      const accessToken = creds.fb_capi_access_token;

      if (data.status === "confirmed") {
        // Fire the stored Purchase event to Facebook CAPI
        try {
          const stored = JSON.parse(existing.trackingData);
          const { eventData, pixelId, testEventCode } = stored;

          if (pixelId && accessToken && eventData) {
            // Update event_time to now (when confirmed, not when ordered)
            eventData.event_time = Math.floor(Date.now() / 1000);
            await sendToFacebookCAPI(pixelId, accessToken, eventData, testEventCode);
            console.log(`[FB CAPI] Purchase fired on confirm for order ${existing.id}`);
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
    bumpVersion("orders");
    return jsonResponse(serialize(order));
  } catch (error) {
    return errorResponse("Failed to update order status", 500);
  }
}
