import { NextRequest, NextResponse } from 'next/server';

/**
 * Two responsibilities:
 *
 *  1. CORS for /api/v1/* — wildcard origin so the Flutter app and other
 *     cross-origin clients can hit the public API.
 *
 *  2. Forward the request pathname as `x-pathname` to the server-rendered
 *     root layout. The layout uses it to pick the correct UI language
 *     (dashboard vs storefront) on first paint — without it, the server
 *     always falls back to the storefront language, then the client
 *     hydration corrects to the dashboard language, and the mismatch
 *     throws React error #418 which silently kills `<Link>` click
 *     handlers across the dashboard sidebar.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Forward pathname to RSC via a request header. NextResponse.next() with
  // `request.headers` rewrites the headers visible to downstream server
  // components, including the root layout's `headers()` call.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);
  const response = NextResponse.next({ request: { headers: requestHeaders } });

  if (pathname.startsWith('/api/v1')) {
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Max-Age', '86400');

    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 200, headers: response.headers });
    }
  }

  return response;
}

// Run for everything except Next internals + static files. The `x-pathname`
// header needs to be set on EVERY request, not just /api/*, so the root
// layout can detect dashboard vs storefront paths.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
