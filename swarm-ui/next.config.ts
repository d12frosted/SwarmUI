import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Proxy API calls to the ASP.NET backend
  async rewrites() {
    return [
      {
        source: "/API/:path*",
        destination: "http://localhost:7801/API/:path*",
      },
    ];
  },

  // Allow images from the backend
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "7801",
      },
    ],
  },
};

export default nextConfig;
