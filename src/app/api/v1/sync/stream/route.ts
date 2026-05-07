/**
 * GET /api/v1/sync/stream
 *
 * Server-Sent Events feed. One long-lived connection per client; the server
 * pushes events when any `bumpVersion(channel)` call fires from a write
 * route. Idle traffic ≈ 1 Redis command per 25s per connected client.
 *
 * Wire format (SSE):
 *   data: {"channel":"orders","version":42,"ts":1700000000000,"notify":{...}}\n\n
 *
 * Heartbeat (`: ping\n\n`) every 25s keeps proxies (Cloudflare default 100s
 * idle close, Nginx default 60s) from killing the connection. Clients
 * auto-reconnect on close, so a dropped link self-heals.
 *
 * Backed by `eventStream()` in `lib/sync.ts`, which is Redis-backed when
 * `UPSTASH_REDIS_REST_*` env vars are present and EventEmitter-backed
 * otherwise. Same code, three deploy targets:
 *   - Coolify / Hostinger / VPS: long-lived Node process — connection lives
 *     for hours, EventEmitter fans out instantly when Redis is absent.
 *   - Vercel Pro / Edge platforms: serverless caps the function lifetime,
 *     but the client's watchdog auto-reconnects so users notice nothing.
 *
 * Runtime is `nodejs` (works on every host). No `maxDuration` is set here
 * — that's a Vercel-only directive; on Coolify/Hostinger the connection
 * runs as long as the client holds it open.
 */
import { NextRequest } from "next/server";
import { eventStream, getVersion, TRACKED_CHANNELS } from "@/lib/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Use the same channel list as the polling reader so we never seed a
// channel the reader won't watch (or vice versa).
const SEEDED_CHANNELS = TRACKED_CHANNELS;

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  const filter = request.nextUrl.searchParams.get("channel");

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const safeEnqueue = (chunk: string) => {
        if (closed) return;
        try { controller.enqueue(encoder.encode(chunk)); }
        catch { closed = true; }
      };

      // Snapshot current versions so a fresh client syncs without waiting
      // for the next bump. Parallel reads — Redis pipelines under the hood.
      const channels = SEEDED_CHANNELS.filter((c) => !filter || c === filter);
      const initial = await Promise.all(
        channels.map(async (c) => ({ channel: c, version: await getVersion(c) }))
      );
      for (const e of initial) safeEnqueue(`data: ${JSON.stringify(e)}\n\n`);

      // Heartbeat — keeps idle proxies from closing the connection.
      const heartbeat = setInterval(() => safeEnqueue(`: ping\n\n`), 25_000);

      // Wire client abort to our local AbortController so the iterator stops.
      const ac = new AbortController();
      const onAbort = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        ac.abort();
        try { controller.close(); } catch {}
      };
      request.signal.addEventListener("abort", onAbort);

      // Drain the event iterator. This loop runs for the lifetime of the
      // connection. `eventStream()` blocks on Redis XREAD (25s) or the
      // EventEmitter, so we don't busy-loop.
      try {
        for await (const evt of eventStream({ signal: ac.signal })) {
          if (closed) break;
          if (filter && evt.channel !== filter) continue;
          safeEnqueue(`data: ${JSON.stringify(evt)}\n\n`);
        }
      } catch (e) {
        console.error("[sync/stream] iterator error:", e);
      } finally {
        onAbort();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      // no-store covers proxies that ignore no-cache; no-transform stops
      // Cloudflare Brotli/gzip from buffering the stream into chunks.
      "Cache-Control": "no-store, no-cache, no-transform",
      "Connection": "keep-alive",
      // Disable buffering on Nginx, LiteSpeed, and Cloudflare layers that
      // honour the hint — without it, a proxy may hold events for seconds
      // before flushing to the client.
      "X-Accel-Buffering": "no",
    },
  });
}
