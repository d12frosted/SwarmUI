import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Proxy API calls and assets to the ASP.NET backend
  async rewrites() {
    return [
      {
        source: "/API/:path*",
        destination: "http://localhost:7801/API/:path*",
      },
      {
        source: "/View/:path*",
        destination: "http://localhost:7801/View/:path*",
      },
      {
        source: "/ViewSpecial/:path*",
        destination: "http://localhost:7801/ViewSpecial/:path*",
      },
      {
        source: "/Output/:path*",
        destination: "http://localhost:7801/Output/:path*",
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
