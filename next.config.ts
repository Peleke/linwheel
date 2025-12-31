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
    ],
  },
  // Include font files in serverless function bundle for text overlay
  outputFileTracingIncludes: {
    "/api/articles/[articleId]/carousel": ["./public/fonts/**/*"],
  },
};

export default nextConfig;
