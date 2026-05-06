import { NextRequest } from "next/server";

// Whitelist of hosts we'll proxy. Prevents this from being abused as an open
// HTTP proxy. Add new origins here as needed.
const ALLOWED_HOSTS = new Set([
  "cdn.akhiyanbd.com",
  "akhiyanbd.com",
  "www.akhiyanbd.com",
  "res.cloudinary.com",
]);

// 7 days — these images are content-addressed (filename includes a timestamp),
// so they're effectively immutable. Long cache is safe.
const CACHE_TTL_SECONDS = 60 * 60 * 24 * 7;

export async function GET(request: NextRequest) {
  const target = request.nextUrl.searchParams.get("url");
  if (!target) return new Response("Missing url param", { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return new Response("Invalid url", { status: 400 });
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return new Response("Only http(s) URLs allowed", { status: 400 });
  }
  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    return new Response(`Host not allowed: ${parsed.hostname}`, { status: 403 });
  }

  const upstream = await fetch(parsed.toString(), {
    // Don't forward client cookies/auth — this is a public proxy for public assets
    headers: { "User-Agent": "akhiyan-image-proxy/1.0" },
    cache: "force-cache",
  });

  if (!upstream.ok || !upstream.body) {
    return new Response(`Upstream ${upstream.status}`, { status: upstream.status });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
      "Cache-Control": `public, max-age=${CACHE_TTL_SECONDS}, immutable`,
      "Access-Control-Allow-Origin": "*",
      "Cross-Origin-Resource-Policy": "cross-origin",
    },
  });
}
