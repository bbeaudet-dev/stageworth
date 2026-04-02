import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "s1.ticketm.net" },
      { protocol: "https", hostname: "**.convex.cloud" },
    ],
  },
};

export default nextConfig;
