import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_MODE: process.env.APP_MODE ?? process.env.NEXT_PUBLIC_APP_MODE ?? "",
    NEXT_PUBLIC_INSTITUTION_ID: process.env.INSTITUTION_ID ?? process.env.NEXT_PUBLIC_INSTITUTION_ID ?? "",
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "staging.edubird.in",
      },
      {
        protocol: "https",
        hostname: "edubird.in",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "media.143gb.com",
      },
      {
        protocol: "https",
        hostname: "cdn.pixabay.com",
      },
      {
        protocol: "https",
        hostname: "www.w3schools.com",
      },
    ],
  },
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "lodash",
      "radix-ui",
      "@tanstack/react-table",
      "@lexical/react",
      "@xyflow/react",
    ],
  },
};

export default nextConfig;
