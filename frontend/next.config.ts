import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {

    optimizePackageImports: ["motion", "framer-motion"],
  },
  async headers() {
    return [{ source: "/sw.js", headers: [
      { key: "Cache-Control", value: "no-store, max-age=0" },
      { key: "Service-Worker-Allowed", value: "/" },
    ] }];
  },

  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
