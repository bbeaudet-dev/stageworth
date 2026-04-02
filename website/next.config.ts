import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow importing from outside the website/ directory (e.g. ../convex/_generated/).
  // Without this, the bundler can't resolve "convex/server" from api.js which lives
  // at the repo root.
  experimental: {
    externalDir: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "s1.ticketm.net" },
      { protocol: "https", hostname: "**.convex.cloud" },
    ],
  },
};

export default nextConfig;
