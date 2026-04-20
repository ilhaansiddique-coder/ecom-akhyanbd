import type { NextConfig } from "next";

// Cloudflare R2 public base URL (e.g. https://pub-xxx.r2.dev). When set, legacy
// `/uploads/*` URLs stored in the DB are rewritten to R2 so we never hit local
// disk in production. Empty string means "fall back to local API handler".
const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL || "").replace(/\/$/, "");
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
  // When R2 is configured, rewrite all legacy /uploads/* + /storage/* URLs
  // directly to the Cloudflare R2 public bucket. No DB migration needed —
  // the URL format stays `/uploads/<name>` and the browser is transparently
  // served from R2's CDN. When R2 is not set, fall back to the local API
  // handler that streams from UPLOAD_DIR (dev default).
  async rewrites() {
    const destUploads = R2_PUBLIC_URL ? `${R2_PUBLIC_URL}/:path*` : "/api/uploads/:path*";
    return {
      beforeFiles: [
        { source: "/storage/uploads/:path*", destination: destUploads },
        { source: "/storage/:path*", destination: destUploads },
        { source: "/uploads/:path*", destination: destUploads },
      ],
    };
  },
  async headers() {
    return [
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
