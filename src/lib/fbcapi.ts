import { createHash } from "crypto";
import { NextRequest } from "next/server";

/** SHA-256 hash for Facebook user_data fields */
export function sha256(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

/** Extract client IP from request headers */
export function getClientIp(request: NextRequest): string | undefined {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return request.headers.get("x-real-ip") || undefined;
}

/** Build hashed user_data object for Facebook CAPI */
export function buildHashedUserData(
  userData: Record<string, string | undefined> | undefined,
  clientIp?: string,
  clientUa?: string,
): Record<string, unknown> {
  const hashed: Record<string, unknown> = {};

  if (clientIp) hashed.client_ip_address = clientIp;
  if (clientUa) hashed.client_user_agent = clientUa;

  if (!userData) return hashed;

  if (userData.fbp) hashed.fbp = userData.fbp;
  if (userData.fbc) hashed.fbc = userData.fbc;
  if (userData.em) hashed.em = [sha256(userData.em)];
  if (userData.ph) {
    const phone = userData.ph.replace(/[^0-9]/g, "");
    if (phone) hashed.ph = [sha256(phone)];
  }
  if (userData.fn) hashed.fn = [sha256(userData.fn)];
  if (userData.ln) hashed.ln = [sha256(userData.ln)];
  if (userData.ct) hashed.ct = [sha256(userData.ct)];
  if (userData.st) hashed.st = [sha256(userData.st)];
  if (userData.zp) hashed.zp = [sha256(userData.zp)];
  if (userData.country) hashed.country = [sha256(userData.country)];
  if (userData.external_id) hashed.external_id = [sha256(String(userData.external_id))];

  return hashed;
}

/** Send event to Facebook Conversion API */
export async function sendToFacebookCAPI(
  pixelId: string,
  accessToken: string,
  eventData: Record<string, unknown>,
  testEventCode?: string | null,
): Promise<boolean> {
  try {
    const fbBody: Record<string, unknown> = {
      data: [eventData],
    };
    if (testEventCode) {
      fbBody.test_event_code = testEventCode;
    }

    const res = await fetch(
      `https://graph.facebook.com/v21.0/${pixelId}/events?access_token=${accessToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fbBody),
      }
    );

    if (!res.ok) {
      const err = await res.text().catch(() => "unknown");
      console.error("[FB CAPI] Error:", res.status, err);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[FB CAPI] Send error:", error);
    return false;
  }
}
