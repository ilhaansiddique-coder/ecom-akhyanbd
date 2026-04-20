import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-response";
import { requireStaff } from "@/lib/auth-helpers";

/**
 * POST /api/v1/push/unsubscribe
 * Body: { token: "<FCM token or web-push endpoint>" }
 * Removes the subscription so further pushes stop for this device.
 */
export async function POST(request: NextRequest) {
  try {
    await requireStaff();
  } catch (e) {
    return e as Response;
  }

  try {
    const body = await request.json();
    const token = String(body.token || "").trim();
    if (!token) return errorResponse("Missing token", 400);

    await prisma.pushSubscription
      .delete({ where: { token } })
      .catch(() => {}); // already gone — fine.

    return jsonResponse({ success: true });
  } catch (err) {
    console.error("[push/unsubscribe]", err);
    return errorResponse("Failed to unsubscribe", 500);
  }
}
