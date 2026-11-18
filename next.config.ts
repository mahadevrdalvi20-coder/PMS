import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page in this app is personalised (it depends on who is signed in),
  // so we use classic dynamic rendering instead of Cache Components.
  cacheComponents: false,
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
