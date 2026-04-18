import type { NextConfig } from "next";

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
  // Redirect old Laravel storage paths to new uploads location
  async rewrites() {
    return [
      {
        source: "/storage/uploads/:path*",
        destination: "/uploads/:path*",
      },
      {
        source: "/storage/:path*",
        destination: "/uploads/:path*",
      },
    ];
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
