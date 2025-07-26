import { withSentryConfig } from "@sentry/nextjs";
import bundleAnalyzer from "@next/bundle-analyzer";
import { performanceConfig } from "./next.config.performance.mjs";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig = {
  ...performanceConfig,
  eslint: {
    ignoreDuringBuilds: false, // Enable ESLint during builds
  },
  typescript: {
    ignoreBuildErrors: false, // Enable TypeScript checking during builds
  },
  // Simplified webpack configuration for better performance
  webpack: (config, { isServer, dev, webpack }) => {
    // Essential module resolution fallbacks only
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };

    // Add webpack define plugin for environment detection
    config.plugins.push(
      new webpack.DefinePlugin({
        "process.env.WEBPACK_DEV": JSON.stringify(dev),
      }),
    );

    // Simplified development configuration
    if (dev) {
      config.performance = {
        hints: false,
      };
      // Disable complex optimizations in development for faster builds
      config.optimization = {
        ...config.optimization,
        splitChunks: false,
        runtimeChunk: false,
      };
    }

    return config;
  },
  // Experimental features for better error handling
  serverExternalPackages: ["@react-pdf/renderer"],
  async headers() {
    // Relax security headers in development
    if (process.env.NODE_ENV === "development") {
      return [
        {
          source: "/(.*)",
          headers: [
            {
              key: "X-Content-Type-Options",
              value: "nosniff",
            },
          ],
        },
      ];
    }

    // Full security headers in production
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

// Apply bundle analyzer
finalConfig = withBundleAnalyzer(finalConfig);

if (useSentry) {
  const sentryWebpackPluginOptions = {
    org: "estimatepro",
    project: "frontend",
    silent: true,
    widenClientFileUpload: true,
    hideSourceMaps: true,
    disableLogger: true,
  };

  finalConfig = withSentryConfig(finalConfig, sentryWebpackPluginOptions);
}

export default finalConfig;
