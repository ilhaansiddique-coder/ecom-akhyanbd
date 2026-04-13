import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Add aggressive caching for image requests
  if (request.nextUrl.pathname.startsWith("/_next/image")) {
    response.headers.set(
      "Cache-Control",
      "public, max-age=31536000, immutable"
    );
    response.headers.set("X-Content-Type-Options", "nosniff");
  }

  // Add caching for static uploads
  if (request.nextUrl.pathname.startsWith("/uploads/")) {
    response.headers.set(
      "Cache-Control",
      "public, max-age=31536000, immutable"
    );
  }

  // Prefetch hints for navigation
  if (request.nextUrl.pathname === "/") {
    response.headers.set(
      "Link",
      '</shop>; rel="prefetch", </products>; rel="prefetch"'
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/_next/image/:path*",
    "/uploads/:path*",
    "/",
  ],
};
