import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ESLint is run as a separate CI step (`npm run lint`).
  // Warnings in pre-existing hooks/components should not block production builds.
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "utfs.io",
      },
      {
        protocol: "https",
        hostname: "*.ufs.sh",
      },
    ],
  },
};

export default nextConfig;
