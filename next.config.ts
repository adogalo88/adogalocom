import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: "/api/serve-upload?path=:path*",
      },
    ];
  },
};

export default nextConfig;

// Force restart - fix database URL - v2
