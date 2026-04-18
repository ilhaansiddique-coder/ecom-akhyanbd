"use client";

/**
 * Background route pre-warmer.
 *
 * 500ms after the current page paints, this kicks off `router.prefetch()` for
 * every common static route plus the top N product/landing slugs. The result:
 * once the user is past their first page, every subsequent navigation feels
 * local — no skeletons, no DB round-trip, no network delay — because the RSC
 * payload is already sitting in memory.
 *
 * Why 500ms? We deliberately avoid competing with the initial paint and
 * hydration of the page the user is actually looking at. After half a second
 * the main thread is usually idle.
 *
 * Why limited slugs? Prefetching is cheap but not free — each prefetch fetches
 * the RSC payload for that route. We cap product/LP slugs at 24 to balance
 * "everything feels instant" vs. wasting bandwidth on pages they may never
 * visit. If they navigate to one outside the cap, Next's per-Link viewport
 * prefetch picks up the slack.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

// Only routes a user is likely to click before they need them. Legal pages
// (/terms, /privacy, /refund-policy) and /login stay excluded — nobody
// navigates there speculatively. /checkout IS prewarmed because the JS chunk
// is large (~80KB w/ form libs) and we want it ready the second they tap
// "Order Now".
const STATIC_ROUTES = [
  "/",
  "/shop",
  "/cart",
  "/checkout",
  "/about",
  "/contact",
  "/blog",
];

// Tuned down — most sessions visit 3–5 products. 12 covers the long tail
// without burning bandwidth on the next 12 the user will never open.
const PRODUCT_CAP = 12;
const LP_CAP = 8;

/**
 * Returns true when we should skip prewarming entirely — slow connections or
 * the user has Data Saver on. On 2G/slow-2G the extra requests slow down what
 * the user is actually doing, which is the opposite of "fast".
 */
function shouldSkipForConnection(): boolean {
  if (typeof navigator === "undefined") return false;
  const conn = (navigator as unknown as {
    connection?: { saveData?: boolean; effectiveType?: string };
  }).connection;
  if (!conn) return false;
  if (conn.saveData) return true;
  if (conn.effectiveType === "2g" || conn.effectiveType === "slow-2g") return true;
  return false;
}

export default function RoutePrewarmer() {
  const router = useRouter();

  useEffect(() => {
    if (shouldSkipForConnection()) return;
    let cancelled = false;

    const idle =
      typeof window !== "undefined" && "requestIdleCallback" in window
        ? (window as unknown as { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number })
            .requestIdleCallback
        : (cb: () => void) => window.setTimeout(cb, 0);

    // Stage 1: static routes — fire immediately after a 500ms delay so we
    // don't fight the user's first paint / hydration.
    const t = window.setTimeout(() => {
      if (cancelled) return;
      for (const path of STATIC_ROUTES) {
        try { router.prefetch(path); } catch {}
      }

      // Stage 2: dynamic slugs — fetched in idle time, then prefetched.
      // We deliberately don't await the static prefetches; they're fire-and-forget.
      idle(async () => {
        if (cancelled) return;
        try {
          const products = await api.getProducts(`limit=${PRODUCT_CAP}`);
          const list = (products?.data ?? products?.products ?? products) as Array<{ slug?: string }>;
          if (Array.isArray(list)) {
            for (const p of list.slice(0, PRODUCT_CAP)) {
              if (cancelled) return;
              if (p?.slug) {
                try { router.prefetch(`/products/${p.slug}`); } catch {}
              }
            }
          }
        } catch {
          // Silent — prewarming is best-effort, never block the user.
        }

        // Landing pages — small list, cheap to prewarm if exposed.
        try {
          const lps = await fetch("/api/v1/landing-pages", { cache: "force-cache" }).then((r) => (r.ok ? r.json() : null));
          const list = (lps?.data ?? lps) as Array<{ slug?: string }> | null;
          if (Array.isArray(list)) {
            for (const lp of list.slice(0, LP_CAP)) {
              if (cancelled) return;
              if (lp?.slug) {
                try { router.prefetch(`/lp/${lp.slug}`); } catch {}
              }
            }
          }
        } catch {
          /* noop */
        }
      });
    }, 500);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [router]);

  return null;
}
