import type { NextConfig } from "next";
import path from "path";

// Must match Turbopack's root. Vercel sets outputFileTracingRoot to the git
// root (/vercel/path0); if these differ, Next ignores turbopack.root and
// resolution breaks for paths under website/.
const monorepoRoot = path.resolve(__dirname, "..");

const nextConfig: NextConfig = {
  outputFileTracingRoot: monorepoRoot,
  turbopack: {
    root: monorepoRoot,
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
