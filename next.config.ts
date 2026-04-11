import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["172.16.0.2"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "mavesoj.com",
        pathname: "/**",
      },
    ],
    formats: ["image/avif", "image/webp"],
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
  compress: true,
  poweredByHeader: false,
};

export default nextConfig;
