"use client";

import { useEffect, useRef } from "react";

/**
 * Subscribe to a public Reverb channel and listen for events.
 * Falls back gracefully if WebSocket is unavailable.
 */
export function useChannel(
  channelName: string,
  eventName: string,
  callback: (data: Record<string, unknown>) => void,
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    let cancelled = false;
    let channel: { stopListening: (event: string) => void } | null = null;

    // Defer WebSocket subscription until the browser is idle so it
    // doesn't compete with initial page load and rendering.
    const connect = () => {
      import("@/lib/echo").then(({ getEcho }) => {
        if (cancelled) return;
        try {
          const echo = getEcho();
          channel = echo.channel(channelName);
          channel.stopListening(eventName); // clear any prior listener on same event
          (channel as ReturnType<typeof echo.channel>).listen(eventName, (data: Record<string, unknown>) => {
            callbackRef.current(data);
          });
        } catch (err) {
          console.warn(`[useChannel] Failed to subscribe to ${channelName}:`, err);
        }
      }).catch(() => {
        // Echo module failed to load — WebSocket unavailable
      });
    };

    // Use requestIdleCallback when available, fall back to setTimeout
    let cleanupTimer: (() => void) | null = null;
    if (typeof requestIdleCallback !== "undefined") {
      const id = requestIdleCallback(connect);
      cleanupTimer = () => cancelIdleCallback(id);
    } else {
      const id = setTimeout(connect, 2000);
      cleanupTimer = () => clearTimeout(id);
    }

    return () => {
      cancelled = true;
      cleanupTimer?.();
      if (channel) {
        try { channel.stopListening(eventName); } catch {}
      }
    };
  }, [channelName, eventName]);
}
