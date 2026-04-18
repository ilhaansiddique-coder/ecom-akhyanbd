"use client";

/**
 * Thin top progress bar shown during route transitions.
 *
 * Why: we removed all `loading.tsx` skeletons to keep the previous page
 * visible during navigation (instant-feel). But with no skeleton AND no dev
 * indicator, slow renders look like the click did nothing. A 2px bar at the
 * top of the viewport gives the user immediate "I heard you" feedback
 * without flashing a full-page skeleton.
 *
 * Implementation:
 *   - Capture-phase click listener on document. Any in-app <a> click → start.
 *   - usePathname() change → finish.
 *   - Pure DOM, no nprogress dep. ~1KB.
 */

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const BAR_ID = "nav-progress-bar";

function ensureBar(): HTMLDivElement {
  let bar = document.getElementById(BAR_ID) as HTMLDivElement | null;
  if (bar) return bar;
  bar = document.createElement("div");
  bar.id = BAR_ID;
  bar.style.cssText = [
    "position:fixed",
    "top:0",
    "left:0",
    "height:2px",
    "width:0%",
    "background:var(--primary,#0f5931)",
    "z-index:2147483647",
    "transition:width 200ms ease-out, opacity 200ms ease-out",
    "opacity:0",
    "pointer-events:none",
    "box-shadow:0 0 8px var(--primary,#0f5931)",
  ].join(";");
  document.body.appendChild(bar);
  return bar;
}

function start(bar: HTMLDivElement) {
  bar.style.opacity = "1";
  bar.style.width = "0%";
  // Force reflow so the next width transition runs.
  void bar.offsetWidth;
  bar.style.width = "70%";
}

function finish(bar: HTMLDivElement) {
  bar.style.width = "100%";
  window.setTimeout(() => {
    bar.style.opacity = "0";
    window.setTimeout(() => { bar.style.width = "0%"; }, 220);
  }, 120);
}

export default function NavigationProgress() {
  const pathname = usePathname();
  const activeRef = useRef(false);

  // Click listener — start the bar when the user clicks an in-app link.
  useEffect(() => {
    function isInternalNav(target: EventTarget | null): boolean {
      if (!(target instanceof Element)) return false;
      const a = target.closest("a");
      if (!a) return false;
      const href = a.getAttribute("href");
      if (!href) return false;
      // Skip external, hash-only, mailto/tel, downloads, target=_blank,
      // and modifier-clicks (they open in a new tab).
      if (href.startsWith("http") && !href.startsWith(window.location.origin)) return false;
      if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return false;
      if (a.target === "_blank" || a.hasAttribute("download")) return false;
      // Same path — no navigation will fire, so no bar.
      try {
        const url = new URL(href, window.location.origin);
        if (url.pathname === window.location.pathname && url.search === window.location.search) return false;
      } catch { return false; }
      return true;
    }

    function onClick(e: MouseEvent) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      if (!isInternalNav(e.target)) return;
      activeRef.current = true;
      start(ensureBar());
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // Pathname change → navigation completed. Finish the bar.
  useEffect(() => {
    if (!activeRef.current) return;
    activeRef.current = false;
    const bar = document.getElementById(BAR_ID) as HTMLDivElement | null;
    if (bar) finish(bar);
  }, [pathname]);

  return null;
}
