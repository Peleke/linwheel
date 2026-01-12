import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.fal.media",
      },
      {
        protocol: "https",
        hostname: "fal.media",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      // LinkedIn profile pictures
      {
        protocol: "https",
        hostname: "media.licdn.com",
      },
      {
        protocol: "https",
        hostname: "*.licdn.com",
      },
    ],
  },
  // Include font files in serverless function bundles for Satori text overlay
  outputFileTracingIncludes: {
    "/api/articles/[articleId]/carousel": ["./public/fonts/**/*"],
    "/api/posts/image-intents/[intentId]": ["./public/fonts/**/*"],
    "/api/articles/image-intents/[intentId]": ["./public/fonts/**/*"],
  },
};

export default nextConfig;
