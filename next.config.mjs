import { withSentryConfig } from "@sentry/nextjs";

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: false, // Enable ESLint during builds
  },
  typescript: {
    ignoreBuildErrors: false, // Enable TypeScript checking during builds
  },
  // Webpack configuration for better module handling
  webpack: (config, { isServer, dev, webpack }) => {
    // Improve module resolution for lazy loading
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };

    // Add better error handling for failed chunk loading
    config.plugins.push(
      new webpack.DefinePlugin({
        "process.env.WEBPACK_DEV": JSON.stringify(dev),
      }),
    );

    // Handle dynamic imports better – apply splitChunks only on the client bundle
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization.splitChunks,
          chunks: "all",
          cacheGroups: {
            ...config.optimization.splitChunks?.cacheGroups,
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: "vendors",
              chunks: "all",
              minChunks: 1,
              priority: 10,
            },
            common: {
              minChunks: 2,
              chunks: "all",
              name: "common",
              priority: 5,
            },
          },
        },
        // Add runtime chunk for better module loading (client-only)
        runtimeChunk: "single",
      };
    }

    // Reduce chunk size warnings in development
    if (dev) {
      config.performance = {
        hints: false,
      };

      // Add better error handling for development
      config.stats = {
        ...config.stats,
        errorDetails: true,
        errors: true,
        warnings: true,
      };
    }

    return config;
  },
  // Experimental features for better error handling
  experimental: {
    // Removed optimizePackageImports due to dev-time factory errors
    serverComponentsExternalPackages: ["@react-pdf/renderer"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.openai.com https://*.sentry.io;",
          },
        ],
      },
    ];
  },
};

// Only apply Sentry config in production or when explicitly enabled
const useSentry =
  process.env.NODE_ENV === "production" || process.env.ENABLE_SENTRY === "true";

let finalConfig = nextConfig;

if (useSentry) {
  const sentryWebpackPluginOptions = {
    org: "estimatepro",
    project: "frontend",
    silent: true,
    widenClientFileUpload: true,
    hideSourceMaps: true,
    disableLogger: true,
  };

  finalConfig = withSentryConfig(nextConfig, sentryWebpackPluginOptions);
}

export default finalConfig;
