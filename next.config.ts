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
      {
        protocol: "http",
        hostname: "localhost",
        port: "8001",
        pathname: "/storage/**",
        search: "",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8001",
        pathname: "/storage/**",
        search: "",
      },
      {
        protocol: "http",
        hostname: "mabheshoj-api.test",
        pathname: "/storage/**",
        search: "",
      },
      // Production API (HTTPS)
      ...(process.env.NEXT_PUBLIC_API_URL?.startsWith("https")
        ? [
            {
              protocol: "https" as const,
              hostname: new URL(process.env.NEXT_PUBLIC_API_URL).hostname,
              pathname: "/storage/**",
            },
          ]
        : []),
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
  compress: true,
  poweredByHeader: false,
};

export default nextConfig;
