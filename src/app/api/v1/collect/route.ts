import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse } from "@/lib/api-response";
import { buildHashedUserData, sendToFacebookCAPI, getClientIp } from "@/lib/fbcapi";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event_name, event_id, event_source_url, custom_data, user_data, order_id } = body;

    if (!event_name || !event_id) {
      return jsonResponse({ success: false, error: "Missing event_name or event_id" }, 400);
    }

    // Read pixel config + deferred setting from DB
    const settingsRows = await prisma.siteSetting.findMany({
      where: { key: { in: ["fb_pixel_id", "fb_capi_access_token", "fb_test_event_code", "fb_deferred_purchase"] } },
    });
    const settings: Record<string, string> = {};
    for (const s of settingsRows) {
      if (s.value) settings[s.key] = s.value;
    }

    const pixelId = settings.fb_pixel_id;
    const accessToken = settings.fb_capi_access_token;
    const isDeferred = settings.fb_deferred_purchase === "true";

    if (!pixelId || !accessToken) {
      return jsonResponse({ success: false, error: "Pixel not configured" }, 200);
    }

    // Build hashed user_data
    const clientIp = getClientIp(request);
    const clientUa = request.headers.get("user-agent") || undefined;
    const hashedUserData = buildHashedUserData(user_data, clientIp, clientUa);

    // Build event payload
    const eventData: Record<string, unknown> = {
      event_name,
      event_time: Math.floor(Date.now() / 1000),
      event_id,
      action_source: "website",
      user_data: hashedUserData,
    };
    if (event_source_url) eventData.event_source_url = event_source_url;
    if (custom_data && Object.keys(custom_data).length > 0) {
      eventData.custom_data = custom_data;
    }

    // For Purchase events with an order_id, behavior splits on defer setting:
    //   Deferred ON  → store payload to order.trackingData, do NOT fire CAPI
    //                  yet. Admin confirm route fires it later.
    //   Deferred OFF → fire CAPI now, do NOT store. Storing would cause the
    //                  admin confirm route to re-fire the same Purchase
    //                  (same event_id; FB dedupes within ~7d but not after,
    //                  and it pollutes the test events panel either way).
    if (event_name === "Purchase" && order_id) {
      if (isDeferred) {
        try {
          await prisma.order.update({
            where: { id: Number(order_id) },
            data: {
              trackingData: JSON.stringify({
                eventData,
                pixelId,
                testEventCode: settings.fb_test_event_code || null,
              }),
            },
          });
        } catch {
          // Order not found — silently ignore
        }
        return jsonResponse({ success: true, deferred: true });
      }

      // Deferred OFF: fire-and-forget so we return 200 to the browser before
      // the FB call finishes. Never store — confirm route would refire it.
      sendToFacebookCAPI(pixelId, accessToken, eventData, settings.fb_test_event_code).catch((err) => {
        console.error("[FB CAPI] Purchase send failed:", err);
      });
      return jsonResponse({ success: true, deferred: false });
    }

    // All other events: fire immediately to Facebook CAPI (fire-and-forget).
    sendToFacebookCAPI(pixelId, accessToken, eventData, settings.fb_test_event_code).catch((err) => {
      console.error(`[FB CAPI] ${event_name} send failed:`, err);
    });
    return jsonResponse({ success: true });
  } catch (error) {
    console.error("[FB CAPI] Server error:", error);
    return jsonResponse({ success: true });
  }
}
