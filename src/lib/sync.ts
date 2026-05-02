/**
 * Real-time sync — version store + in-process pub/sub.
 *
 * `bumpVersion(channel)` is called from server routes after CRUD writes;
 * it increments the channel counter AND notifies any open SSE connections
 * (see /api/v1/sync/stream). Browser tabs receive a push event and refetch.
 *
 * Single-process: works fine for monolith Next.js. If the app ever scales
 * horizontally, swap the EventEmitter for Redis pub/sub here — call sites
 * stay the same.
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

export function bumpVersion(channel: string) {
  versions[channel] = (versions[channel] || 0) + 1;
  // Best-effort fire — never throw inside an admin write path.
  try { emitter.emit("bump", { channel, version: versions[channel] }); } catch {}
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
export function subscribe(handler: (e: { channel: string; version: number }) => void): () => void {
  emitter.on("bump", handler);
  return () => { emitter.off("bump", handler); };
}
