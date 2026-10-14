import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
  webpack(config) {
    // Assignment exports strip images. Disable the DOCX converter's optional
    // native image converter, which cannot execute inside Cloudflare Workers.
    config.resolve.alias = { ...config.resolve.alias, sharp: false };
    return config;
  },
};

export default nextConfig;
