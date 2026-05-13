/**
 * Real-time sync — version store + pub/sub.
 *
 * Two layered concerns ride on a single transport:
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
 * Backend selection (auto):
 *   - When `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` are set,
 *     state lives in Upstash Redis (versions = INCR'd keys, events = a
 *     capped Redis Stream). Works across Vercel serverless instances.
 *   - Otherwise, falls back to in-process EventEmitter — fine for local dev
 *     and single-process self-hosted (Hostinger). Same API either way.
 *
 * The Redis path is the production target: Vercel runs each function in
 * its own isolated process, so the in-memory EventEmitter cannot fan
 * events out across instances. Without a shared bus, an order POST on
 * instance A would never reach an SSE listener on instance B.
 */
import { EventEmitter } from "events";
import { Redis } from "@upstash/redis";

const VERSION_KEY = (channel: string) => `sync:v:${channel}`;
const LAST_EVENT_KEY = (channel: string) => `sync:last:${channel}`;

/** Channels the SSE handler watches. Adding a new channel? List it here
 * AND wire bumpVersion("<name>") in the relevant write route. Keep in
 * sync with SEEDED_CHANNELS in app/api/v1/sync/stream/route.ts. */
export const TRACKED_CHANNELS = [
  "orders", "products", "categories", "brands", "reviews",
  "theme", "settings", "banners", "menus", "flash-sales",
  // Admin / operational channels — added with the host-agnostic audit.
  "staff", "customers", "coupons", "shortlinks", "blog",
  "shipping", "fraud", "media", "form-submissions",
  // Mobile editor surfaces.
  "landing-pages", "feeds",
];

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const useRedis = !!(REDIS_URL && REDIS_TOKEN);

// Lazy singleton — only instantiated when Redis env vars are present.
let _redis: Redis | null = null;
function redis(): Redis {
  if (!_redis) {
    _redis = new Redis({ url: REDIS_URL!, token: REDIS_TOKEN! });
  }
  return _redis;
}

// In-process fallback state (used only when Redis env vars are missing).
const localVersions: Record<string, number> = {};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g = globalThis as any;
const localEmitter: EventEmitter =
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
  /** Stable machine identifier, e.g. "order.created", "product.low_stock". */
  kind: string;
  title: string;
  body: string;
  /** Optional deep link the notification opens on tap, e.g. "/orders/1042". */
  href?: string;
  /** Optional Material icon name; Flutter picks a default per `kind` if omitted. */
  icon?: string;
  /** info | warn | alert — drives the card's accent colour. */
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
 * placed, a product is added) should pass one.
 */
export function bumpVersion(channel: string, notify?: SyncNotify): void {
  // Best-effort fire — never throw inside an admin write path.
  if (useRedis) {
    void publishRedis(channel, notify).catch((e) => {
      console.error("[sync] redis publish failed:", e);
    });
  } else {
    localVersions[channel] = (localVersions[channel] || 0) + 1;
    try {
      const evt: SyncEvent = {
        channel,
        version: localVersions[channel],
        ts: Date.now(),
        ...(notify ? { notify } : {}),
      };
      localEmitter.emit("bump", evt);
    } catch {}
  }
}

async function publishRedis(channel: string, notify?: SyncNotify): Promise<void> {
  const r = redis();
  // INCR returns the new value atomically — no race even when two writes
  // hit the same channel from different Vercel instances at once.
  const version = (await r.incr(VERSION_KEY(channel))) as number;
  const evt: SyncEvent = {
    channel,
    version,
    ts: Date.now(),
    ...(notify ? { notify } : {}),
  };
  // Store the FULL event under a per-channel "last" key. Subscribers poll
  // these keys with MGET, compare versions, and emit events when they see
  // a newer one. We previously used Redis Streams (XADD/XREAD) but the
  // @upstash/redis response shape for XREAD turned out to be fragile to
  // parse and was silently dropping events. SET + MGET is bulletproof.
  // 1-hour TTL is plenty — readers reconnect at least every 5 minutes
  // (Vercel function lifetime) and re-snapshot version state on connect.
  await r.set(LAST_EVENT_KEY(channel), JSON.stringify(evt), { ex: 3600 });
}

export async function getVersion(channel: string): Promise<number> {
  if (useRedis) {
    const v = (await redis().get(VERSION_KEY(channel))) as number | string | null;
    return typeof v === "string" ? parseInt(v, 10) || 0 : (v as number) || 0;
  }
  return localVersions[channel] || 0;
}

/**
 * Async iterator of new events. SSE handler calls this once on connect and
 * iterates indefinitely; the iterator backpressures itself on Redis
 * `XREAD BLOCK` (25s) or EventEmitter listener (in-memory mode).
 *
 * Pass `signal` from the request to cleanly abort on client disconnect.
 */
export async function* eventStream(opts: { signal?: AbortSignal } = {}): AsyncGenerator<SyncEvent> {
  if (useRedis) {
    yield* redisEventStream(opts.signal);
  } else {
    yield* localEventStream(opts.signal);
  }
}

/** Polling interval for the Redis stream reader. Set to 500ms for
 * sub-second cross-admin latency — what an admin app needs to feel
 * "live" rather than "polled". Cost trade-off: at 500ms a connected
 * admin uses ~172.8K Redis commands/day (~$0.35/admin/day on Upstash
 * pay-as-you-go at $0.20/100K commands). Upstash free tier (10K/day)
 * is not viable at this rate — must be on a paid plan, or raise the
 * interval back to 1500ms / 5000ms.
 *
 * In dev mode without Redis configured (`useRedis === false`), this
 * value is unused — events fan out instantly via the in-process
 * EventEmitter, so local dev already feels real-time. */
const POLL_INTERVAL_MS = 500;

/** MGET-based polling reader.
 *
 * On each tick, fetch all `sync:last:<channel>` keys with one MGET call,
 * compare the embedded version to what we last emitted for that channel,
 * and yield any with a newer version. This is one Redis command per poll
 * regardless of how many channels we watch — much cheaper than per-channel
 * polling, and the response shape (an array of nullable strings) is
 * trivial to parse, unlike Upstash's quirky XREAD shape. */
async function* redisEventStream(signal?: AbortSignal): AsyncGenerator<SyncEvent> {
  const r = redis();

  // Seed lastSeen with the current state so we don't replay every event
  // on reconnect. The SSE handler also sends a snapshot of versions on
  // connect, so the client already knows where it stands.
  const lastSeen: Record<string, number> = {};
  try {
    const keys = TRACKED_CHANNELS.map(VERSION_KEY);
    const versions = (await r.mget(...keys)) as Array<string | number | null>;
    TRACKED_CHANNELS.forEach((c, i) => {
      const v = versions[i];
      lastSeen[c] = typeof v === "string" ? parseInt(v, 10) || 0 : (v as number) || 0;
    });
  } catch {
    TRACKED_CHANNELS.forEach((c) => { lastSeen[c] = 0; });
  }

  while (!signal?.aborted) {
    try {
      const keys = TRACKED_CHANNELS.map(LAST_EVENT_KEY);
      const payloads = (await r.mget(...keys)) as Array<string | Record<string, unknown> | null>;
      for (let i = 0; i < TRACKED_CHANNELS.length; i++) {
        const channel = TRACKED_CHANNELS[i];
        const raw = payloads[i];
        if (raw == null) continue;
        // @upstash/redis auto-parses JSON when it can. Handle both shapes.
        let evt: SyncEvent;
        try {
          evt = (typeof raw === "string" ? JSON.parse(raw) : raw) as SyncEvent;
        } catch {
          continue;
        }
        if (typeof evt?.version !== "number") continue;
        if (evt.version <= (lastSeen[channel] || 0)) continue;
        lastSeen[channel] = evt.version;
        yield evt;
      }
    } catch (e) {
      console.error("[sync] mget poll error:", e);
    }
    await abortableSleep(POLL_INTERVAL_MS, signal);
  }
}

function abortableSleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve) => {
    if (signal?.aborted) return resolve();
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => { clearTimeout(t); resolve(); }, { once: true });
  });
}

/** In-memory fallback: subscribe to EventEmitter and yield events as they arrive. */
async function* localEventStream(signal?: AbortSignal): AsyncGenerator<SyncEvent> {
  const queue: SyncEvent[] = [];
  let resolve: (() => void) | null = null;
  const onBump = (e: SyncEvent) => {
    queue.push(e);
    resolve?.();
    resolve = null;
  };
  localEmitter.on("bump", onBump);
  signal?.addEventListener("abort", () => resolve?.());
  try {
    while (!signal?.aborted) {
      if (queue.length === 0) {
        await new Promise<void>((r) => { resolve = r; });
        if (signal?.aborted) break;
      }
      while (queue.length) yield queue.shift()!;
    }
  } finally {
    localEmitter.off("bump", onBump);
  }
}
