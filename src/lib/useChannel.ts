"use client";

import { useEffect, useRef } from "react";

/**
 * Real-time sync via SSE (Server-Sent Events).
 *
 * Opens ONE long-lived connection per tab to /api/v1/sync/stream and routes
 * push events to all `useChannel` hooks listening on the named channel.
 * Idle traffic = 0 — the previous implementation polled every 5s.
 *
 * Behavior:
 *   - First `useChannel` mount opens the EventSource (singleton across hooks).
 *   - Last unmount closes it.
 *   - On EventSource error/disconnect, browser auto-reconnects.
 *   - Hard fallback: if 3 consecutive opens fail (no SSE support / proxy strips
 *     it / firewall), drop to slow polling at 30s instead.
 *
 * Public API unchanged: `useChannel(channel, eventName, callback)`.
 */

type Listener = (data: { channel: string; version: number }) => void;
type ChannelListeners = Set<Listener>;

const listeners: Record<string, ChannelListeners> = {};
const versions: Record<string, number> = {};

let eventSource: EventSource | null = null;
let openCount = 0;          // how many useChannel hooks are mounted
let consecutiveErrors = 0;  // SSE failure counter
let pollFallbackTimer: ReturnType<typeof setInterval> | null = null;

function notifyChange(channel: string, version: number) {
  const prev = versions[channel];
  versions[channel] = version;
  if (prev === undefined || prev === version) return;
  const ls = listeners[channel];
  if (!ls) return;
  for (const cb of ls) {
    try { cb({ channel, version }); } catch (err) { console.error("[useChannel] handler error:", err); }
  }
}

function startSSE() {
  if (typeof window === "undefined") return;
  if (eventSource || pollFallbackTimer) return;

  try {
    const es = new EventSource("/api/v1/sync/stream");
    eventSource = es;
    es.onmessage = (e) => {
      try {
        const evt = JSON.parse(e.data) as { channel: string; version: number };
        if (typeof evt.channel === "string" && typeof evt.version === "number") {
          notifyChange(evt.channel, evt.version);
          consecutiveErrors = 0;
        }
      } catch {}
    };
    es.onerror = () => {
      consecutiveErrors++;
      if (consecutiveErrors >= 3) {
        // Stop SSE and fall back to slow polling — last resort, not the hot path.
        try { es.close(); } catch {}
        eventSource = null;
        startPollFallback();
      }
      // Otherwise: browser will auto-reconnect.
    };
  } catch {
    startPollFallback();
  }
}

function startPollFallback() {
  if (pollFallbackTimer) return;
  const POLL_MS = 30_000;
  const channels = Object.keys(listeners);

  pollFallbackTimer = setInterval(async () => {
    for (const ch of channels) {
      try {
        const res = await fetch(`/api/v1/sync?channel=${ch}`, { credentials: "include" });
        if (!res.ok) continue;
        const data = await res.json() as { version?: number };
        if (typeof data.version === "number") notifyChange(ch, data.version);
      } catch {}
    }
  }, POLL_MS);
}

function stopAll() {
  if (eventSource) { try { eventSource.close(); } catch {} eventSource = null; }
  if (pollFallbackTimer) { clearInterval(pollFallbackTimer); pollFallbackTimer = null; }
  consecutiveErrors = 0;
}

export function useChannel(
  channelName: string,
  _eventName: string,
  callback: (data: Record<string, unknown>) => void,
) {
  const callbackRef = useRef(callback);
  // Update the ref outside render via effect — keeps callback fresh without
  // resubscribing on every parent re-render.
  useEffect(() => { callbackRef.current = callback; });

  useEffect(() => {
    const wrapped: Listener = (e) => callbackRef.current({ channel: e.channel, version: e.version });
    if (!listeners[channelName]) listeners[channelName] = new Set();
    listeners[channelName].add(wrapped);
    openCount++;

    if (openCount === 1) startSSE();

    return () => {
      listeners[channelName]?.delete(wrapped);
      if (listeners[channelName] && listeners[channelName].size === 0) delete listeners[channelName];
      openCount--;
      if (openCount <= 0) {
        openCount = 0;
        stopAll();
      }
    };
  }, [channelName]);
}
