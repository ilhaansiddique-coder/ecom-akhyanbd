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

const STREAM_KEY = "sync:events";
const STREAM_MAXLEN = 1000; // cap the stream so it never grows unbounded
const VERSION_KEY = (channel: string) => `sync:v:${channel}`;

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
  // XADD with MAXLEN ~ trims the stream lazily so memory stays bounded.
  // Field name "d" stores the JSON-encoded event; readers parse it back out.
  await r.xadd(STREAM_KEY, "*", { d: JSON.stringify(evt) }, { trim: { type: "MAXLEN", threshold: STREAM_MAXLEN, comparison: "~" } });
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

/** Polling interval for the Redis stream reader. 1.5s is a reasonable
 * balance: ≤1.5s perceived latency for a new order to appear in the
 * Flutter app, and ~57.6K commands/day per connected admin client, well
 * within Upstash paid tiers (~$0.12/admin/day at $0.20/100K). Increase to
 * 2-3s if cost is a concern; drop to 750ms for snappier UX. */
const POLL_INTERVAL_MS = 1500;

/** Redis Streams reader: XREAD without BLOCK + sleep loop.
 *
 * Why not BLOCK: Upstash REST does not support `XREAD BLOCK` (their docs
 * flag it as "not yet supported"). A standard Redis TCP client would, but
 * TCP connections from Vercel serverless instances burn the connection
 * pool fast and don't reuse across invocations. REST polling is the
 * pragmatic shape for Vercel + Upstash. */
async function* redisEventStream(signal?: AbortSignal): AsyncGenerator<SyncEvent> {
  const r = redis();
  // Start by reading the latest entry's ID so we don't replay old events
  // on connect. Empty stream → start from "0" (no entries match anyway).
  let lastId: string;
  try {
    const tail = (await r.xrevrange(STREAM_KEY, "+", "-", 1)) as Record<string, Record<string, string>> | unknown;
    // xrevrange returns an object keyed by entry id when there's data, {} when empty.
    const ids = tail && typeof tail === "object" ? Object.keys(tail as Record<string, unknown>) : [];
    lastId = ids[0] || "0";
  } catch {
    lastId = "0";
  }

  while (!signal?.aborted) {
    try {
      // Read everything after lastId. Returns `null` if nothing new.
      const res = await r.xread(STREAM_KEY, lastId);
      if (res && Array.isArray(res)) {
        // Upstash returns: [[streamName, [[id, [field, value, ...]], ...]], ...]
        for (const stream of res as Array<[string, Array<[string, string[]]>]>) {
          const entries = stream[1] || [];
          for (const [id, fields] of entries) {
            lastId = id;
            // Flatten ["d", "<json>"] → { d: "<json>" }
            const obj: Record<string, string> = {};
            for (let i = 0; i < fields.length; i += 2) obj[fields[i]] = fields[i + 1];
            const raw = obj.d;
            if (!raw) continue;
            try {
              yield JSON.parse(raw) as SyncEvent;
            } catch {
              // Malformed entry — skip rather than tear down the stream.
            }
          }
        }
      }
    } catch (e) {
      console.error("[sync] xread error:", e);
    }
    // Wait before next poll. Use an abortable sleep so client disconnects
    // exit immediately instead of waiting up to POLL_INTERVAL_MS.
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
