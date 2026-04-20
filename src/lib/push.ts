/**
 * Unified push notification sender.
 *
 * Supports two transports transparently:
 *   - FCM (HTTP v1 API)  → Android (Capacitor) + iOS (future)
 *   - Web Push           → PWA / browser
 *
 * Consumers call `sendAdminPush({ title, body, data, url })` and don't care
 * which device type is on the receiving end — we fan out to every subscribed
 * admin device stored in the PushSubscription table.
 *
 * Dead tokens (FCM "UNREGISTERED" or web-push 410) are auto-purged.
 *
 * REQUIRED ENV VARS (set only the ones you use):
 *   - FCM_PROJECT_ID                 Firebase project ID
 *   - FCM_CLIENT_EMAIL               service-account email (from downloaded JSON)
 *   - FCM_PRIVATE_KEY                service-account private key (PEM, \n-escaped)
 *   - VAPID_PUBLIC_KEY               web-push public key
 *   - VAPID_PRIVATE_KEY              web-push private key
 *   - VAPID_SUBJECT                  mailto:admin@yourdomain.com
 */

import { prisma } from "@/lib/prisma";

type PushPayload = {
  title: string;
  body: string;
  /** optional deep-link path opened when the user taps the notification */
  url?: string;
  /** extra key/value data delivered to the app */
  data?: Record<string, string>;
};

// ---------- FCM (HTTP v1) ----------
// We mint a short-lived OAuth token from the service-account key, then POST
// to `https://fcm.googleapis.com/v1/projects/{PROJECT}/messages:send`.

async function getFcmAccessToken(): Promise<string | null> {
  const projectId = process.env.FCM_PROJECT_ID;
  const clientEmail = process.env.FCM_CLIENT_EMAIL;
  const privateKey = (process.env.FCM_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) return null;

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  // Lazy import so non-Node environments aren't forced to ship `crypto`.
  const { createSign } = await import("crypto");
  const b64url = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj)).toString("base64url");
  const signingInput = `${b64url(header)}.${b64url(claim)}`;
  const signer = createSign("RSA-SHA256");
  signer.update(signingInput);
  const signature = signer.sign(privateKey).toString("base64url");
  const jwt = `${signingInput}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) {
    console.error("[push] FCM token mint failed:", await res.text());
    return null;
  }
  const j = (await res.json()) as { access_token?: string };
  return j.access_token || null;
}

async function sendFcm(token: string, payload: PushPayload): Promise<boolean> {
  const projectId = process.env.FCM_PROJECT_ID;
  if (!projectId) return false;
  const accessToken = await getFcmAccessToken();
  if (!accessToken) return false;

  const message = {
    message: {
      token,
      notification: { title: payload.title, body: payload.body },
      data: {
        ...(payload.data || {}),
        ...(payload.url ? { url: payload.url } : {}),
      },
      android: {
        priority: "HIGH",
        notification: {
          sound: "default",
          channel_id: "sales",
          default_vibrate_timings: true,
        },
      },
    },
  };

  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    }
  );
  if (res.ok) return true;
  const text = await res.text();
  // 404 UNREGISTERED / 400 INVALID_ARGUMENT → token is dead, purge.
  if (res.status === 404 || /UNREGISTERED|INVALID_ARGUMENT/i.test(text)) {
    await prisma.pushSubscription
      .delete({ where: { token } })
      .catch(() => {});
  }
  console.error("[push] FCM send failed:", res.status, text);
  return false;
}

// ---------- Web Push (VAPID) ----------
// Minimal inline implementation so we don't pull in the `web-push` package.
// Encrypts payload with AES-128-GCM per RFC 8291 and signs the JWT manually.
// Kept short; falls back to no-op if keys aren't set.

async function sendWebPush(
  endpoint: string,
  p256dh: string,
  auth: string,
  payload: PushPayload
): Promise<boolean> {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@example.com";
  if (!pub || !priv) return false;

  try {
    // Dynamic import so web-push is only required when env keys are present.
    // npm i web-push  (add to deps when you enable PWA push)
    const webpush = (await import("web-push")).default;
    webpush.setVapidDetails(subject, pub, priv);
    await webpush.sendNotification(
      { endpoint, keys: { p256dh, auth } },
      JSON.stringify(payload)
    );
    return true;
  } catch (err: unknown) {
    const e = err as { statusCode?: number };
    if (e?.statusCode === 404 || e?.statusCode === 410) {
      // Subscription gone — purge.
      await prisma.pushSubscription
        .delete({ where: { token: endpoint } })
        .catch(() => {});
    }
    console.error("[push] Web push failed:", err);
    return false;
  }
}

// ---------- Public API ----------

export async function sendAdminPush(payload: PushPayload): Promise<void> {
  // All staff roles that should get sale alerts. Adjust as needed.
  const ADMIN_ROLES = ["admin", "manager", "staff"];
  const subs = await prisma.pushSubscription.findMany({
    where: { user: { role: { in: ADMIN_ROLES } } },
  });
  if (subs.length === 0) return;

  await Promise.allSettled(
    subs.map((s) => {
      if (s.platform === "android" || s.platform === "ios") {
        return sendFcm(s.token, payload);
      }
      if (s.platform === "web" && s.p256dh && s.auth) {
        return sendWebPush(s.token, s.p256dh, s.auth, payload);
      }
      return Promise.resolve(false);
    })
  );
}
