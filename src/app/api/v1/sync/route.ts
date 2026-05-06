import { NextRequest } from "next/server";
import { jsonResponse } from "@/lib/api-response";
import { getVersion } from "@/lib/sync";

/**
 * GET /api/v1/sync?channel=products
 *
 * Legacy polling fallback for clients that can't hold an SSE connection
 * (very old browsers, restrictive proxies). Real-time clients should use
 * `/api/v1/sync/stream` instead.
 *
 * Returns the current version number for a channel. Versions are stored in
 * Redis (or in-memory in dev), so a fresh process returns 0 until the
 * first `bumpVersion(channel)` fires — that's fine because the SSE stream
 * also seeds clients from the same source.
 */
export async function GET(request: NextRequest) {
  const channel = request.nextUrl.searchParams.get("channel") || "all";
  const version = await getVersion(channel);
  return jsonResponse({ channel, version, timestamp: Date.now() });
}
