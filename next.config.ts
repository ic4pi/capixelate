import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
  // When UPLOAD_DIR points to a persistent disk (Render), proxy /uploads/*
  // through a small API route so files are served from outside public/.
  // In local dev, UPLOAD_DIR is unset and Next.js serves public/uploads directly.
  async rewrites() {
    if (process.env.UPLOAD_DIR) {
      return [
        {
          source: "/uploads/:path*",
          destination: "/api/serve-upload/:path*",
        },
      ];
    }
    return [];
  },
};

export default nextConfig;
