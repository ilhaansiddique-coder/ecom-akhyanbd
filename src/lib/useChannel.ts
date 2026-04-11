"use client";

import { useEffect, useRef } from "react";

/**
 * Real-time sync via polling.
 * Polls a lightweight endpoint to detect changes, then calls the callback.
 * Replaces WebSocket — works with SQLite, no extra server needed.
 *
 * Usage:
 *   useChannel("products", ".product.changed", () => refetchProducts());
 */

const POLL_INTERVAL = 5000; // 5 seconds

// Global version store — tracks last known version per channel
const versions: Record<string, number> = {};

export function useChannel(
  channelName: string,
  _eventName: string,
  callback: (data: Record<string, unknown>) => void,
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      if (cancelled) return;
      try {
        const res = await fetch(`/api/v1/sync?channel=${channelName}`, {
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        if (res.ok) {
          const data = await res.json();
          const newVersion = data.version || 0;
          const prevVersion = versions[channelName];

          if (prevVersion !== undefined && newVersion !== prevVersion) {
            // Version changed — trigger refresh
            callbackRef.current({ channel: channelName, version: newVersion });
          }
          versions[channelName] = newVersion;
        }
      } catch {
        // Silently fail — will retry next interval
      }
    };

    // Initial check after a short delay
    const initialTimeout = setTimeout(poll, 1000);

    // Then poll at interval
    const interval = setInterval(poll, POLL_INTERVAL);

    return () => {
      cancelled = true;
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [channelName]);
}
