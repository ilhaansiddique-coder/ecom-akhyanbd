"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useChannel } from "@/lib/useChannel";

/**
 * Mount once in the dashboard layout. Subscribes to every backend channel
 * and calls `router.refresh()` when a bump arrives — Next.js then re-runs
 * the active page's server components and swaps the rendered output in
 * place, no flash, no full reload.
 *
 * Why this lives at the layout level instead of each page using
 * `<LiveRefresh>`: one mount = one SSE connection per tab. Per-page
 * wrappers would each open one and the dashboard would need 10 wrappers
 * to cover every section. The hook itself singletons the EventSource
 * already, but consolidating subscriptions here keeps page code clean.
 *
 * Coalescing: many bumps in quick succession (bulk imports, courier
 * batches) trigger many `router.refresh()` calls. Next.js de-dupes
 * these internally, but we add a 250ms trailing debounce here as a
 * cheap extra layer — keeps the dashboard from re-rendering 50 times
 * during a 50-row bulk action.
 */
const TRACKED_CHANNELS = [
  "orders", "products", "categories", "brands", "reviews",
  "theme", "settings", "banners", "menus", "flash-sales",
  "staff", "customers", "coupons", "shortlinks", "blog",
  "shipping", "fraud", "media", "form-submissions",
];

export default function GlobalSyncListener() {
  const router = useRouter();
  const pathname = usePathname();
  const pendingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Don't refresh while on the customizer route — it has its own complex
  // local state and a router.refresh() while editing would clobber the
  // in-progress changes. Customizer saves call revalidate explicitly.
  const isCustomizerRoute = pathname?.startsWith("/dashboard/customizer");

  useEffect(() => {
    return () => {
      if (pendingTimer.current) clearTimeout(pendingTimer.current);
    };
  }, []);

  const scheduleRefresh = () => {
    if (isCustomizerRoute) return;
    if (pendingTimer.current) clearTimeout(pendingTimer.current);
    pendingTimer.current = setTimeout(() => router.refresh(), 250);
  };

  // Subscribe to every channel. The hook singletons the EventSource so
  // calling it 19 times costs one connection.
  for (const ch of TRACKED_CHANNELS) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useChannel(ch, "bump", scheduleRefresh);
  }

  return null;
}
