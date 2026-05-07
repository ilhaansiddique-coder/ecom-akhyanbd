"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";

/**
 * Mount once in the dashboard layout. Holds a single EventSource open to
 * /api/v1/sync/stream and calls `router.refresh()` whenever a bump arrives,
 * so the active server-rendered page re-fetches its data without the user
 * touching anything.
 *
 * Why direct EventSource instead of `useChannel` (the existing hook):
 * - useChannel is per-channel; subscribing to all 19 channels via a hook
 *   loop violates React's rules-of-hooks even with stable lengths and made
 *   the listener flaky in practice.
 * - With one EventSource we get one connection, one onmessage handler, and
 *   trivially clear behaviour: every event triggers the same debounced
 *   refresh.
 *
 * The first event for each channel is the snapshot fired on connect — we
 * skip those by remembering the seeded versions, then only refresh on a
 * version change. Without this, the dashboard would refresh once per
 * channel on every page load (19 router.refresh calls) for nothing.
 */
export default function GlobalSyncListener() {
  const router = useRouter();
  const pathname = usePathname();
  const isCustomizerRoute = pathname?.startsWith("/dashboard/customizer");
  const customizerRouteRef = useRef(isCustomizerRoute);
  customizerRouteRef.current = isCustomizerRoute;

  useEffect(() => {
    if (typeof window === "undefined" || typeof EventSource === "undefined") return;

    const seenVersions: Record<string, number> = {};
    let pending: ReturnType<typeof setTimeout> | null = null;
    let closed = false;
    let es: EventSource | null = null;

    const scheduleRefresh = (channel: string, version: number) => {
      if (customizerRouteRef.current) return;
      // 1) Re-run server components — picks up unstable_cache invalidations
      //    fired by the matching write route's revalidateAll() call.
      if (pending) clearTimeout(pending);
      pending = setTimeout(() => {
        pending = null;
        if (!closed) router.refresh();
      }, 250);
      // 2) Notify any client component that fetches its own data so it can
      //    refetch. Server-component-only pages don't need this and ignore
      //    the event; client-state pages (UsersClient, OrdersClient, etc.)
      //    listen and call their own refresh function. Single source of
      //    truth: subscribe to "sync:bump" and inspect `event.detail`.
      try {
        window.dispatchEvent(new CustomEvent("sync:bump", { detail: { channel, version } }));
      } catch {}
    };

    const open = () => {
      if (closed) return;
      try {
        es = new EventSource("/api/v1/sync/stream", { withCredentials: true });
      } catch (err) {
        console.error("[sync] EventSource construct failed:", err);
        return;
      }
      es.onmessage = (e) => {
        try {
          const evt = JSON.parse(e.data) as { channel?: string; version?: number };
          if (typeof evt.channel !== "string" || typeof evt.version !== "number") return;
          const prev = seenVersions[evt.channel];
          seenVersions[evt.channel] = evt.version;
          // Skip the connect-time snapshot (no prior version known) — only
          // emit refreshes when a version actually advances. This is the
          // single most important guard; without it the dashboard refreshes
          // 19 times every page load.
          if (prev === undefined) return;
          if (evt.version <= prev) return;
          scheduleRefresh(evt.channel, evt.version);
        } catch {
          // Bad JSON — ignore individual frame, keep the connection alive.
        }
      };
      es.onerror = () => {
        // Browser auto-reconnects on its own; nothing to do here.
      };
    };

    open();

    return () => {
      closed = true;
      if (pending) clearTimeout(pending);
      try { es?.close(); } catch {}
      es = null;
    };
    // router is referentially stable from next/navigation; pathname is read
    // through a ref so changing routes doesn't tear down the connection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
