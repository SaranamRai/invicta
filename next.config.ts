import type { NextConfig } from "next";

const apiProxyTarget = process.env.API_PROXY_TARGET || "http://127.0.0.1:5000";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  devIndicators: false,
  allowedDevOrigins: ["192.168.56.1"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiProxyTarget}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
