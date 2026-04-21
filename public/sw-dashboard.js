/**
 * Dashboard PWA service worker.
 *
 * Scope: /dashboard only — registered with { scope: '/dashboard' } from
 * PwaRegister.tsx. Never intercepts customer-facing routes (/, /shop,
 * /checkout, etc.) even if a logged-out browser still has the SW installed.
 *
 * Caching strategy:
 *  - HTML pages under /dashboard → network-first, fall back to cache (offline)
 *  - Static assets (/_next/static/*, /icon-*.png, etc.) referenced from
 *    dashboard pages → stale-while-revalidate
 *  - /api/* → ALWAYS network, never cache. Orders/sales/courier data must
 *    be fresh and respect role-based auth at the server.
 *
 * Auth handling: cookies attach automatically to fetch(). If a former
 * staff/admin loses access, the server returns a redirect to /login —
 * the SW just serves whatever the server returns. The PwaRegister client
 * also actively unregisters this SW on logout.
 */

const CACHE = "akhiyan-dashboard-v1";
const APP_SHELL = ["/dashboard"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("message", (event) => {
  // Allow the page to force-clear the cache (used on logout)
  if (event.data && event.data.type === "PURGE_CACHE") {
    caches.delete(CACHE);
  }
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Same-origin only
  if (url.origin !== self.location.origin) return;
  // Never touch APIs — auth + freshness critical
  if (url.pathname.startsWith("/api/")) return;
  // Only handle GETs
  if (req.method !== "GET") return;

  // Dashboard HTML navigations → network-first, cache fallback
  if (url.pathname === "/dashboard" || url.pathname.startsWith("/dashboard/")) {
    if (req.mode === "navigate" || req.headers.get("accept")?.includes("text/html")) {
      event.respondWith(
        fetch(req)
          .then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
            return res;
          })
          .catch(() => caches.match(req).then((hit) => hit || caches.match("/dashboard")))
      );
      return;
    }
  }

  // Static assets (Next chunks, icons, fonts) — stale-while-revalidate.
  // Only intercept when the request was likely triggered from a dashboard page,
  // judged by the referrer. Avoids polluting customer-page asset caches.
  const fromDashboard = (req.referrer || "").includes("/dashboard");
  const isStatic =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/fonts/") ||
    /\.(png|jpg|jpeg|webp|svg|ico|woff2?|css|js)$/i.test(url.pathname);

  if (fromDashboard && isStatic) {
    event.respondWith(
      caches.match(req).then((hit) => {
        const network = fetch(req)
          .then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
            return res;
          })
          .catch(() => hit);
        return hit || network;
      })
    );
  }
});
