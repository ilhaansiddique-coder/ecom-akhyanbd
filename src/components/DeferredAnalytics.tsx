"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";

const FacebookPixel = dynamic(() => import("./FacebookPixel"), { ssr: false });
const GoogleTagManager = dynamic(() => import("./GoogleTagManager"), { ssr: false });
const MicrosoftClarity = dynamic(() => import("./MicrosoftClarity"), { ssr: false });

/**
 * Mounts FacebookPixel + GoogleTagManager, but defers them on non-conversion
 * pages so they don't fight LCP / TBT on first paint.
 *
 * Critical: on conversion pages we mount IMMEDIATELY so InitiateCheckout,
 * ViewContent (LP), and Purchase events still fire reliably. Server-side
 * CAPI is the source of truth for purchases (see /api/v1/collect), but the
 * browser pixel is what feeds Facebook's pixel-based audiences and conversion
 * windows. We never want it missing on these paths.
 *
 * Defer order on every other path:
 *   1. requestIdleCallback when the main thread is free, OR
 *   2. first user interaction (scroll/click/keydown), whichever comes first,
 *   3. hard fallback at 2.5s so users who never scroll still get tracked.
 *
 * Result: hero text + first product images get ~1-2s of uncontested main
 * thread before tracking scripts compete. Big TBT/INP win on mobile,
 * tracking accuracy unchanged in any meaningful way (PageView fires within
 * a few seconds; FB attribution windows are days).
 */

const CONVERSION_PATHS = [
  "/checkout",
  "/order/",
  "/lp/",
];

function isConversionPath(pathname: string): boolean {
  return CONVERSION_PATHS.some((p) => pathname === p || pathname.startsWith(p));
}

export default function DeferredAnalytics() {
  const pathname = usePathname() ?? "";
  const conversion = isConversionPath(pathname);
  const [ready, setReady] = useState(conversion);

  useEffect(() => {
    if (conversion) {
      // already ready — never defer on conversion pages
      setReady(true);
      return;
    }
    if (typeof window === "undefined") return;
    if (ready) return;

    let done = false;
    const fire = () => {
      if (done) return;
      done = true;
      setReady(true);
      cleanup();
    };

    const onInteract = () => fire();
    window.addEventListener("scroll", onInteract, { once: true, passive: true });
    window.addEventListener("click", onInteract, { once: true });
    window.addEventListener("keydown", onInteract, { once: true });

    // requestIdleCallback when browser has a free moment
    const ric =
      typeof (window as unknown as { requestIdleCallback?: unknown }).requestIdleCallback === "function"
        ? (window as unknown as { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback(fire, { timeout: 2500 })
        : 0;

    // Hard fallback for users who never interact
    const timeout = window.setTimeout(fire, 2500);

    function cleanup() {
      window.removeEventListener("scroll", onInteract);
      window.removeEventListener("click", onInteract);
      window.removeEventListener("keydown", onInteract);
      window.clearTimeout(timeout);
      if (ric && typeof (window as unknown as { cancelIdleCallback?: unknown }).cancelIdleCallback === "function") {
        (window as unknown as { cancelIdleCallback: (h: number) => void }).cancelIdleCallback(ric);
      }
    }

    return cleanup;
  }, [conversion, ready]);

  // Re-evaluate on route change: if we land on a conversion path mid-session,
  // make sure tracking is mounted immediately for that visit.
  useEffect(() => {
    if (conversion && !ready) setReady(true);
  }, [conversion, ready]);

  if (!ready) return null;

  return (
    <>
      <FacebookPixel />
      <GoogleTagManager />
      <MicrosoftClarity />
    </>
  );
}
