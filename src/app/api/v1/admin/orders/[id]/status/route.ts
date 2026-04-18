import { NextRequest } from "next/server";
import { revalidateAll } from "@/lib/revalidate";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse, validationError, notFound, errorResponse } from "@/lib/api-response";
import { requireStaff } from "@/lib/auth-helpers";
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = { status: data.status };
    if (data.payment_status) updateData.paymentStatus = data.payment_status;

    // Handle Purchase / OrderCancelled event based on new status
    if (existing.trackingData) {
      // Get CAPI credentials once for both branches
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
          }
        } catch (e) {
          console.error("[FB CAPI] Failed to send deferred Purchase:", e);
        }
        // Clear tracking data after sending
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

    revalidateAll("orders");
    bumpVersion("orders");
    return jsonResponse(serialize(order));
  } catch (error) {
    return errorResponse("Failed to update order status", 500);
  }
}
