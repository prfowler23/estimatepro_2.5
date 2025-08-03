import { withSentryConfig } from "@sentry/nextjs";
import withBundleAnalyzer from "@next/bundle-analyzer";

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  // Enable error reporting to catch TypeScript and ESLint errors
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  // Performance optimizations
  experimental: {
    optimizeCss: false,
    nextScriptWorkers: false,
  },
  // Enable build performance tracking
  productionBrowserSourceMaps: false,
  generateBuildId: async () => {
    // Use date-based build ID for tracking
    return new Date().toISOString().split("T")[0].replace(/-/g, "");
  },
  // Webpack configuration for bundle optimization
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Add build time tracking
    if (!dev && !isServer) {
      config.plugins.push(
        new webpack.DefinePlugin({
          "process.env.BUILD_ID": JSON.stringify(buildId),
          "process.env.BUILD_TIME": JSON.stringify(new Date().toISOString()),
        }),
      );
    }

    return config;
  },
  // Skip validation for faster builds
  skipTrailingSlashRedirect: true,
  skipMiddlewareUrlNormalize: true,
};

// Wrap with bundle analyzer
const configWithAnalyzer = bundleAnalyzer(nextConfig);

// Export with or without Sentry based on environment
export default process.env.SENTRY_DSN
  ? withSentryConfig(configWithAnalyzer, {
      silent: true,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
    })
  : configWithAnalyzer;
