import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
      },  {
        protocol: "https",
        hostname: "cdn.pixabay.com",
      },{
        protocol: "https",
        hostname: "www.w3schools.com",
      },
    ],
  },
};

export default nextConfig;