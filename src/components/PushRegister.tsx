"use client";

import { useEffect } from "react";

/**
 * Drop into the dashboard layout (or a settings page). On mount:
 *   - If running inside the Capacitor Android app → register for FCM push
 *     and POST the device token to /api/v1/push/subscribe.
 *   - Else (regular browser/PWA) → ask for Notification permission, subscribe
 *     via service worker + VAPID, POST the endpoint.
 *
 * Idempotent: the /subscribe endpoint upserts on token, so running this on
 * every dashboard load is fine.
 */
export default function PushRegister() {
  useEffect(() => {
    void init();
  }, []);

  return null;
}

async function init() {
  const isCapacitor =
    typeof window !== "undefined" &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    !!(window as any).Capacitor?.isNativePlatform?.();

  if (isCapacitor) {
    await registerCapacitor();
  } else {
    await registerWebPush();
  }
}

// ── Capacitor (Android/iOS native) ─────────────────────────────────────────
async function registerCapacitor() {
  try {
    // Inside the Capacitor WebView, plugins are injected on window.Capacitor.Plugins.
    // No bundler import needed — and we keep this lib out of the web build.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const PushNotifications = (window as any).Capacitor?.Plugins?.PushNotifications;
    if (!PushNotifications) return;

    const perm = await PushNotifications.requestPermissions();
    if (perm.receive !== "granted") return;

    // Listen BEFORE calling register() — the event fires during register.
    PushNotifications.addListener(
      "registration",
      async (token: { value: string }) => {
        await fetch("/api/v1/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ platform: "android", token: token.value }),
        });
      }
    );
    PushNotifications.addListener(
      "registrationError",
      (err: { error: string }) => {
        console.error("[push] Capacitor register error:", err.error);
      }
    );

    await PushNotifications.register();
  } catch (e) {
    console.error("[push] Capacitor init failed:", e);
  }
}

// ── Web Push (PWA / desktop) ───────────────────────────────────────────────
async function registerWebPush() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublic) return; // web push not configured — skip silently.

  try {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return;

    const reg = await navigator.serviceWorker.register("/push-sw.js");
    await navigator.serviceWorker.ready;

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublic),
      });
    }

    const json = sub.toJSON();
    await fetch("/api/v1/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platform: "web",
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh,
        auth: json.keys?.auth,
      }),
    });
  } catch (e) {
    console.error("[push] web init failed:", e);
  }
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
