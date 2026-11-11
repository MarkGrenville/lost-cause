import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // hide the on-page Next.js dev badge so takes and screenshots show only the product
  devIndicators: false,
  cacheComponents: true,
  partialPrefetching: true,
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
