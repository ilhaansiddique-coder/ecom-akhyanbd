/**
 * GET /api/v1/sync/stream
 *
 * Server-Sent Events feed. Replaces the 5-second `/api/v1/sync` polling.
 * One long-lived connection per browser tab; server pushes events when any
 * `bumpVersion(channel)` call fires from a write route. Idle traffic = 0.
 *
 * Wire format (SSE):
 *   data: {"channel":"orders","version":42}\n\n
 *
 * Heartbeat (`: ping\n\n`) every 25s keeps proxies (Cloudflare default 100s
 * idle close, Nginx default 60s) from killing the connection. EventSource
 * auto-reconnects on close, so a dropped link self-heals.
 *
 * Runtime:
 *   - Forced to `nodejs` because Edge has no EventEmitter access to the
 *     same module-singleton our writes mutate.
 *   - `dynamic = "force-dynamic"` prevents static optimization.
 */
import { NextRequest } from "next/server";
import { subscribe, getVersion } from "@/lib/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  // Optional channel filter — if provided, only push events for that channel.
  // Default = subscribe to all channels (clients filter in JS).
  const filter = request.nextUrl.searchParams.get("channel");

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      const safeEnqueue = (chunk: string) => {
        if (closed) return;
        try { controller.enqueue(encoder.encode(chunk)); }
        catch { closed = true; }
      };

      // Send a snapshot of current versions so a fresh tab can sync state
      // without having to wait for the next bump.
      const initial = ["orders", "products", "categories", "brands", "reviews"]
        .filter((c) => !filter || c === filter)
        .map((c) => ({ channel: c, version: getVersion(c) }));
      for (const e of initial) safeEnqueue(`data: ${JSON.stringify(e)}\n\n`);

      // Heartbeat — keeps idle proxies from closing the connection.
      const heartbeat = setInterval(() => safeEnqueue(`: ping\n\n`), 25_000);

      // Pub/sub subscription
      const unsubscribe = subscribe((evt) => {
        if (filter && evt.channel !== filter) return;
        safeEnqueue(`data: ${JSON.stringify(evt)}\n\n`);
      });

      // Cleanup on client disconnect
      const onAbort = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
        try { controller.close(); } catch {}
      };
      request.signal.addEventListener("abort", onAbort);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      // Disable buffering on Nginx / CF / Vercel layers that respect this hint.
      "X-Accel-Buffering": "no",
    },
  });
}
