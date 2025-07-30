// Simplified Next.js configuration for debugging
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // Temporarily ignore ESLint
  },
  typescript: {
    ignoreBuildErrors: true, // Temporarily ignore TypeScript errors
  },
  webpack: (config, { isServer, dev }) => {
    // Minimal webpack config
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };

    if (dev) {
      // Disable optimizations in dev for faster builds
      config.optimization = {
        minimize: false,
        splitChunks: false,
        runtimeChunk: false,
      };
    }

    return config;
  },
  // Skip experimental features temporarily
  experimental: {},
  // Skip Sentry temporarily
  sentry: {
    disableServerWebpackPlugin: true,
    disableClientWebpackPlugin: true,
  },
};

export default nextConfig;
