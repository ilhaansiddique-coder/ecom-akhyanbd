/**
 * GET /api/v1/sync/debug
 *
 * One-shot diagnostic for the live-sync stack. Reports:
 *   - which backend is active (redis vs in-memory)
 *   - whether the Upstash credentials actually work (round-trip a SET/GET)
 *   - current version numbers for the standard channels
 *
 * Hit this from a browser to confirm production is correctly wired before
 * burning time hunting Flutter-side bugs. Public on purpose — no secrets
 * are returned, just feature flags and counters.
 */
import { NextResponse } from "next/server";
import { getVersion, TRACKED_CHANNELS } from "@/lib/sync";
import { Redis } from "@upstash/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  const backend = url && token ? "redis" : "in-memory";

  let redisRoundTrip: { ok: boolean; error?: string; latencyMs?: number } = { ok: false };
  if (url && token) {
    const start = Date.now();
    try {
      const r = new Redis({ url, token });
      const probeKey = `sync:debug:${Date.now()}`;
      await r.set(probeKey, "ok", { ex: 10 });
      const v = await r.get(probeKey);
      redisRoundTrip = { ok: v === "ok", latencyMs: Date.now() - start };
    } catch (e) {
      redisRoundTrip = {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
        latencyMs: Date.now() - start,
      };
    }
  }

  // Use TRACKED_CHANNELS (the canonical list in lib/sync.ts) so any new
  // channel added there shows up here automatically. The presence of
  // channels like "staff" or "coupons" in the response also doubles as
  // proof that the latest build is deployed.
  const versions: Record<string, number> = {};
  for (const c of TRACKED_CHANNELS) versions[c] = await getVersion(c);

  return NextResponse.json({
    backend,
    upstashUrlPresent: !!url,
    upstashTokenPresent: !!token,
    redisRoundTrip,
    versions,
    instanceId: process.env.VERCEL_REGION || "local",
    builtAt: process.env.VERCEL_GIT_COMMIT_SHA || "dev",
  });
}
