/**
 * Real-time sync — version store + in-process pub/sub.
 *
 * Two layered concerns ride on a single EventEmitter:
 *
 *   1. Cache invalidation: every CRUD write calls `bumpVersion(channel)`,
 *      which increments a counter the SSE consumers use to invalidate
 *      their data caches. This is the "data changed, refetch" signal.
 *
 *   2. User-facing notifications: writes that should surface to the admin
 *      app as a notification (new order, low stock, fraud alert, …)
 *      pass an optional `notify` payload as the second argument. The SSE
 *      stream forwards it; the Flutter NotificationStore appends it to the
 *      in-app notification panel.
 *
 * Single-process: works fine for monolith Next.js. If the app ever scales
 * horizontally, swap the EventEmitter for Redis pub/sub here — call sites
 * stay the same (the `notify` field rides through Redis as JSON).
 *
 * Legacy poll endpoint (/api/v1/sync) still works as a fallback when SSE
 * is unavailable (proxy strips, browser too old, etc).
 */
import { EventEmitter } from "events";

const versions: Record<string, number> = {};

// Use globalThis so HMR in dev doesn't reset listeners + duplicate emitters.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g = globalThis as any;
const emitter: EventEmitter =
  g.__akhiyan_sync_emitter ||
  (g.__akhiyan_sync_emitter = new EventEmitter().setMaxListeners(0));

/**
 * Optional notification payload attached to a bump. When present, the
 * Flutter app appends it to the notification panel and bumps the unread
 * count on the bell icon. When absent, the bump is treated as a pure
 * cache-invalidation signal (e.g., theme/settings updates, internal sync).
 *
 * Keep payloads small (<300 bytes) — they're broadcast to every connected
 * client. For "the banner image was updated" you'd send a notify payload
 * pointing at the deep link, not the full image URL.
 */
export interface SyncNotify {
  /**
   * Stable machine identifier. Examples:
   *   - "order.created"
   *   - "order.status_changed"
   *   - "order.flagged"
   *   - "product.created"
   *   - "product.low_stock"
   *   - "banner.created"
   *   - "coupon.used"
   *
   * Flutter uses this to pick a default icon when `icon` is omitted.
   */
  kind: string;
  /** Headline shown in the notification card. */
  title: string;
  /** Secondary line shown beneath the title. */
  body: string;
  /**
   * Optional deep link the notification opens on tap, e.g. "/orders/1042".
   * Empty string or undefined renders a non-tappable card.
   */
  href?: string;
  /**
   * Optional Material icon name — `Icons.<name>_outlined` in Dart. When
   * omitted, Flutter picks a sensible default per `kind`.
   */
  icon?: string;
  /**
   * Visual emphasis level. Drives the card's accent colour:
   *   info  — neutral primary tint (default)
   *   warn  — amber tint (low stock, payment overdue)
   *   alert — red tint (fraud, failed delivery)
   */
  severity?: "info" | "warn" | "alert";
}

export interface SyncEvent {
  channel: string;
  version: number;
  /** Server timestamp in ms since epoch — used by Flutter to dedupe reconnect snapshots. */
  ts: number;
  notify?: SyncNotify;
}

/**
 * Increment the version counter for `channel` and broadcast to subscribers.
 *
 * The optional `notify` payload turns the bump into a user-visible
 * notification. Call sites that mutate user-visible state (an order is
 * placed, a product is added) should pass one. Internal cache-control
 * bumps (settings autosave, theme tweak, etc.) should leave it off so the
 * user isn't spammed with "settings changed" cards.
 */
export function bumpVersion(channel: string, notify?: SyncNotify) {
  versions[channel] = (versions[channel] || 0) + 1;
  // Best-effort fire — never throw inside an admin write path.
  try {
    const evt: SyncEvent = {
      channel,
      version: versions[channel],
      ts: Date.now(),
      ...(notify ? { notify } : {}),
    };
    emitter.emit("bump", evt);
  } catch {}
}

export function getVersion(channel: string): number {
  return versions[channel] || 0;
}

export function initVersion(channel: string, value: number) {
  if (versions[channel] === undefined) {
    versions[channel] = value;
  }
}

/** Subscribe an SSE handler. Returns an unsubscribe function. */
export function subscribe(handler: (e: SyncEvent) => void): () => void {
  emitter.on("bump", handler);
  return () => { emitter.off("bump", handler); };
}
