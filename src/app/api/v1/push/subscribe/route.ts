import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-response";
import { requireStaff } from "@/lib/auth-helpers";

/**
 * POST /api/v1/push/subscribe
 * Body (Android/iOS via Capacitor):
 *   { platform: "android" | "ios", token: "<FCM device token>" }
 * Body (Web / PWA):
 *   { platform: "web", endpoint, p256dh, auth }
 *
 * Idempotent via upsert on `token` (FCM token or web-push endpoint).
 */
export async function POST(request: NextRequest) {
  let user;
  try {
    user = await requireStaff();
  } catch (e) {
    return e as Response;
  }

  try {
    const body = await request.json();
    const platform = String(body.platform || "").trim();
    if (!["android", "ios", "web"].includes(platform)) {
      return errorResponse("Invalid platform", 400);
    }

    const token = String(
      platform === "web" ? body.endpoint : body.token
    ).trim();
    if (!token) return errorResponse("Missing token", 400);

    const p256dh = platform === "web" ? String(body.p256dh || "") : null;
    const auth = platform === "web" ? String(body.auth || "") : null;

    const sub = await prisma.pushSubscription.upsert({
      where: { token },
      update: {
        userId: user.id,
        platform,
        p256dh,
        auth,
      },
      create: {
        userId: user.id,
        platform,
        token,
        p256dh,
        auth,
      },
    });

    return jsonResponse({ success: true, id: sub.id });
  } catch (err) {
    console.error("[push/subscribe]", err);
    return errorResponse("Failed to register subscription", 500);
  }
}
