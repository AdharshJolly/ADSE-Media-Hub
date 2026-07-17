import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,
  
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
  },

  // Experimental features for better performance
  experimental: {
    // Optimize package imports to reduce bundle size
    optimizePackageImports: ['date-fns', 'react-hot-toast', 'googleapis'],
  },

  // Compression
  compress: true,

  // Power by header
  poweredByHeader: false,

  // Output standalone for smaller Docker images
  output: 'standalone',
};

export default nextConfig;
