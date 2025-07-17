import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Image optimization
  images: {
    domains: [], // Add any external image domains here if needed
  },

  // Webpack configuration for build optimization
  webpack: (config, { isServer }) => {
    // Ignore certain modules that might cause issues
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

export default nextConfig;
