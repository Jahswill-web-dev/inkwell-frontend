import type { NextConfig } from "next";

const isolatedDistDir = process.env.NEXT_DIST_DIR;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  ...(isolatedDistDir ? { distDir: isolatedDistDir } : {}),
};

export default nextConfig;
