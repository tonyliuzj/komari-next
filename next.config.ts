import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: 'dist',
  output: 'export',
  productionBrowserSourceMaps: true,
  images: {
    unoptimized: true,
  },
  // API rewrites for development
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_TARGET || 'http://127.0.0.1:25774'}/api/:path*`,
      },
      {
        source: '/themes/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_TARGET || 'http://127.0.0.1:25774'}/themes/:path*`,
      },
    ];
  },
};

export default nextConfig;
