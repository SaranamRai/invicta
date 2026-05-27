import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  devIndicators: false,
  allowedDevOrigins: ["192.168.56.1"],
};

export default nextConfig;
