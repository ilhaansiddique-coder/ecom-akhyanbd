import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // ── Spam block check (cookie-based, no DB hit) ──
  // The /api/v1/fingerprint endpoint sets this cookie when a device is blocked
  const blocked = request.cookies.get("blocked")?.value === "1";
  if (blocked) {
    // Skip blocking for admin routes, auth, and fingerprint API (so it can clear the cookie)
    const skipBlock = path.startsWith("/dashboard") || path.startsWith("/api/v1/admin") ||
      path.startsWith("/api/v1/auth") || path.startsWith("/api/v1/fingerprint") ||
      path.startsWith("/cdlogin") || path.startsWith("/_next") || path.startsWith("/api/");
    if (!skipBlock) {
      // Return 404 with a tiny hidden script that checks if the block was lifted
      // This runs every 30s so when admin unblocks, user auto-recovers
      const html = `<!DOCTYPE html><html><head><title>404</title><style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;color:#666}h1{font-size:72px;color:#ddd;margin-right:20px}p{font-size:18px}</style></head><body><h1>404</h1><p>Page not found</p><script>(function check(){fetch("/api/v1/fingerprint",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({fpHash:document.cookie.match(/fpHash=([^;]*)/)?.[1]||""}),credentials:"include"}).then(r=>r.json()).then(d=>{if(!d.blocked){document.cookie="blocked=;Path=/;Max-Age=0";location.reload()}else{setTimeout(check,30000)}}).catch(()=>setTimeout(check,30000))})()</script></body></html>`;
      return new NextResponse(html, { status: 404, headers: { "Content-Type": "text/html" } });
    }
  }

  // ── Existing middleware logic ──
  const response = NextResponse.next();

  // Add aggressive caching for image requests
  if (path.startsWith("/_next/image")) {
    response.headers.set("Cache-Control", "public, max-age=31536000, immutable");
    response.headers.set("X-Content-Type-Options", "nosniff");
  }

  // Add caching for static uploads
  if (path.startsWith("/uploads/")) {
    response.headers.set("Cache-Control", "public, max-age=31536000, immutable");
  }

  // Prefetch hints for navigation
  if (path === "/") {
    response.headers.set("Link", '</shop>; rel="prefetch", </products>; rel="prefetch"');
  }

  return response;
}

export const config = {
  matcher: [
    "/_next/image/:path*",
    "/uploads/:path*",
    "/",
    "/shop/:path*",
    "/checkout/:path*",
    "/product/:path*",
    "/contact/:path*",
  ],
};
