import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {},
  webpack: (config) => {
    // Required for wagmi/viem in Next.js
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false, net: false, tls: false,
    };
    return config;
  },
};

export default nextConfig;
