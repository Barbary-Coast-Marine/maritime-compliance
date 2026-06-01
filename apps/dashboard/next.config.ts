import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Allow vessel-agent container as image source if needed
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
