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

    // ── City override for Purchase events ──
    // The form `ct` (browser-supplied) is the shipping zone label, useless
    // for FB matching. The orders route fires a background Pathao parser
    // that writes a real district (Dhaka, Chittagong, etc.) to
    // order.parsedCity within ~1-2s. By the time this /collect call lands
    // (after sendBeacon survives the post-checkout redirect, ~100-300ms),
    // parsedCity is usually populated. Override `ct` with it when present.
    //
    // Wait briefly (max 2.5s) if the row exists but parsedCity hasn't
    // landed yet — most cases resolve in < 500ms and we get the better
    // signal. If still null after the wait, fall back to whatever the
    // browser sent (no regression vs today's behaviour).
    let userDataForHash = user_data;
    if (event_name === "Purchase" && order_id) {
      try {
        const parsedCity = await waitForParsedCity(Number(order_id), 2500);
        if (parsedCity) {
          userDataForHash = { ...(user_data || {}), ct: parsedCity };
        }
      } catch {
        // Lookup failed — fall through to original user_data.
      }
    }

    // Build hashed user_data
    const clientIp = getClientIp(request);
    const clientUa = request.headers.get("user-agent") || undefined;
    const hashedUserData = buildHashedUserData(userDataForHash, clientIp, clientUa);

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

/**
 * Poll order.parsedCity for up to `timeoutMs`. The orders route writes it
 * in a background task that usually finishes in 500-2000ms — well within
 * our 2.5s budget. Returns the parsed city string when found, or null on
 * timeout / row not found / parser failed entirely.
 *
 * Polls every 200ms which is short enough to catch fast Pathao responses
 * and infrequent enough not to hammer Postgres.
 */
async function waitForParsedCity(orderId: number, timeoutMs: number): Promise<string | null> {
  if (!Number.isFinite(orderId) || orderId <= 0) return null;
  const deadline = Date.now() + timeoutMs;
  let attempts = 0;
  while (Date.now() < deadline) {
    attempts++;
    try {
      const row = await prisma.order.findUnique({
        where: { id: orderId },
        select: { parsedCity: true },
      });
      if (row?.parsedCity?.trim()) return row.parsedCity.trim();
      // Row exists but parsedCity is still null — wait + retry.
    } catch {
      return null;
    }
    if (Date.now() + 200 > deadline) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log(`[FB CAPI] parsedCity poll timeout for order ${orderId} after ${attempts} attempts`);
  return null;
}
