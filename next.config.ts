import type { NextConfig } from "next";

// Cloudflare R2 public base URL (e.g. https://pub-xxx.r2.dev). When set, legacy
// `/uploads/*` URLs stored in the DB are rewritten to R2 so we never hit local
// disk in production. Empty string means "fall back to local API handler".
// Auto-prepends https:// if the env var was set without a protocol — Next's
// rewrite validator rejects bare hostnames and kills the build otherwise.
const R2_PUBLIC_URL = (() => {
  const raw = (process.env.R2_PUBLIC_URL || "").trim().replace(/\/$/, "");
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
})();
let R2_HOSTNAME = "";
try { R2_HOSTNAME = R2_PUBLIC_URL ? new URL(R2_PUBLIC_URL).hostname : ""; } catch { R2_HOSTNAME = ""; }

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["172.16.0.2"],
  // Skip TypeScript check on production build (already checked locally)
  typescript: { ignoreBuildErrors: true },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "mavesoj.com",
        pathname: "/**",
      },
      // Allow next/image to optimize R2-hosted assets
      ...(R2_HOSTNAME ? [{ protocol: "https" as const, hostname: R2_HOSTNAME, pathname: "/**" }] : []),
      // Cloudinary fallback CDN. Always allow res.cloudinary.com — covers any
      // CLOUDINARY_CLOUD_NAME setup without needing an env-derived hostname.
      { protocol: "https" as const, hostname: "res.cloudinary.com", pathname: "/**" },
    ],
    formats: ["image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days cache
    deviceSizes: [384, 640, 750, 828, 1024, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    qualities: [75],
  },
  experimental: {
    optimizePackageImports: [
      "react-icons",
      "framer-motion",
      "swiper",
    ],
    staleTimes: {
      dynamic: 30,
      static: 300,
    },
  },
  // When R2 is configured, REDIRECT legacy /uploads/* + /storage/* URLs to
  // the Cloudflare CDN (308 permanent). Rewrites would proxy every image
  // through Next (browser → Next server → R2 → Next → browser) which kills
  // CDN caching and adds a hop per image. A 308 redirect is cached by the
  // browser, so subsequent loads hit cdn.akhiyanbd.com directly.
  // When R2 is NOT set, fall back to the local API handler via rewrite.
  async redirects() {
    if (!R2_PUBLIC_URL) return [];
    return [
      { source: "/storage/uploads/:path*", destination: `${R2_PUBLIC_URL}/:path*`, permanent: true },
      { source: "/storage/:path*", destination: `${R2_PUBLIC_URL}/:path*`, permanent: true },
      { source: "/uploads/:path*", destination: `${R2_PUBLIC_URL}/:path*`, permanent: true },
    ];
  },
  async rewrites() {
    if (R2_PUBLIC_URL) return { beforeFiles: [] };
    return {
      beforeFiles: [
        { source: "/storage/uploads/:path*", destination: "/api/uploads/:path*" },
        { source: "/storage/:path*", destination: "/api/uploads/:path*" },
        { source: "/uploads/:path*", destination: "/api/uploads/:path*" },
      ],
    };
  },
  async headers() {
    // Global security headers applied to every route. Designed to be safe —
    // no CSP yet (CSP needs careful tuning for Next + FB pixel + R2 + the
    // dashboard customizer iframe; that's a separate later pass in
    // Report-Only mode first).
    //
    //  HSTS                    — force HTTPS for 2 years incl. subdomains.
    //                            Browser remembers; never falls back to HTTP.
    //  X-Frame-Options         — SAMEORIGIN so the dashboard /customizer
    //                            iframe of own preview pages still works.
    //                            Blocks clickjacking from external domains.
    //  X-Content-Type-Options  — nosniff, blocks MIME-type confusion attacks.
    //  Referrer-Policy         — strict-origin-when-cross-origin: same-site
    //                            sees full URL, cross-site sees only origin,
    //                            cross-protocol sees nothing.
    //  Permissions-Policy      — disable APIs we never use (geolocation,
    //                            camera, microphone, etc) so any future
    //                            embedded ad/tracker can't request them.
    //  X-DNS-Prefetch-Control  — speed up navigations to known third parties.
    const securityHeaders = [
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()" },
      { key: "X-DNS-Prefetch-Control", value: "on" },
    ];
    return [
      {
        // Global — applies to every path. Per-path rules below merge
        // additional headers (Cache-Control etc.) on top.
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/uploads/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
      {
        // Next.js optimized images - AGGRESSIVE CACHING
        source: "/_next/image",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
      {
        // Static assets
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
  compress: true,
  poweredByHeader: false,
  // Hide the floating Next.js dev badge / route-rendering spinner. The
  // prewarmer + ISR already make navigations feel instant; the indicator just
  // adds visual noise during dev. (No effect on production builds.)
  devIndicators: false,
};

export default nextConfig;
