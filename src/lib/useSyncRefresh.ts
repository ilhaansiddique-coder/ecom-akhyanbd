"use client";

import { useEffect, useRef } from "react";

/**
 * Subscribe a client component to backend sync bumps so it can refetch its
 * own data without a manual reload.
 *
 * `GlobalSyncListener` mounts once in the dashboard layout, holds the SSE
 * connection, and dispatches `sync:bump` window events for every channel
 * advance. Pages whose data lives in `useState` (server-rendered initial
 * data + client-side fetch on mutation, like UsersClient) won't update on
 * `router.refresh()` alone because their state is independent of props.
 * This hook lets them opt into the same signal and call their own refetch.
 *
 * Usage:
 *
 *   useSyncRefresh(["staff", "customers"], () => fetchAll(true));
 *
 * The callback is wrapped in a ref so referencing fresh closure variables
 * (page, search, filters) doesn't re-subscribe on every render.
 */
export function useSyncRefresh(channels: string[], callback: () => void) {
  const callbackRef = useRef(callback);
  // Always store the latest callback so the listener uses fresh state.
  useEffect(() => {
    callbackRef.current = callback;
  });

  // Re-subscribe only when the watched channel set changes — not on every
  // callback identity change.
  const channelsKey = channels.join(",");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const watch = new Set(channels);
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ channel: string; version: number }>).detail;
      if (!detail) return;
      if (!watch.has(detail.channel)) return;
      try { callbackRef.current(); }
      catch (err) { console.error("[useSyncRefresh] callback error:", err); }
    };
    window.addEventListener("sync:bump", handler);
    return () => window.removeEventListener("sync:bump", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelsKey]);
}
