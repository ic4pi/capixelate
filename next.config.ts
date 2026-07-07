import type { NextConfig } from "next";

// When running in split-host mode (Vercel frontend + Render backend) set
// NEXT_PUBLIC_API_BASE_URL to the Render service URL on the Vercel deployment.
const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

const nextConfig: NextConfig = {
  turbopack: {},
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
      // Allow the Render backend to receive server-action requests from the
      // Vercel frontend domain. Extend this list as needed.
      allowedOrigins: apiBase ? [new URL(apiBase).hostname] : [],
    },
  },
};

export default nextConfig;
