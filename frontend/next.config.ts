import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: "standalone",

  // Optimize for production
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
