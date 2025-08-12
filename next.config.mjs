import { withSentryConfig } from "@sentry/nextjs";
import withBundleAnalyzer from "@next/bundle-analyzer";
import { createRequire } from "module";

// Load CJS optimization config from our library
const require = createRequire(import.meta.url);
const webpackOptimization = require("./lib/optimization/webpack-optimization.js");

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // Supabase storage buckets (public assets)
      { protocol: "https", hostname: "**.supabase.co" },
      // Project CDN for optimized media
      { protocol: "https", hostname: "cdn.estimatepro.com" },
      // Local development
      { protocol: "http", hostname: "localhost" },
      { protocol: "http", hostname: "127.0.0.1" },
    ],
    // Prefer modern formats when available
    formats: ["image/avif", "image/webp"],
    // Device sizes for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    // Image sizes for different breakpoints
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Minimize layout shift
    minimumCacheTTL: 60, // 1 minute minimum cache
    // Disable static imports for better bundle optimization
    disableStaticImages: false,
    // Dangerously allow SVG (controlled usage only)
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // Enable error reporting to catch TypeScript and ESLint errors
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  // Compiler optimizations
  compiler: {
    // Strip console.* in production bundles
    removeConsole: process.env.NODE_ENV === "production",
  },
  // Help tree-shake libraries by rewriting imports
  modularizeImports: {
    "lucide-react": {
      transform: "lucide-react/icons/{{member}}",
    },
    "date-fns": {
      transform: "date-fns/{{member}}",
    },
    lodash: {
      transform: "lodash/{{member}}",
    },
    // "@headlessui/react": {
    //   transform: "@headlessui/react/{{member}}",
    // },
    // "framer-motion": {
    //   transform: "framer-motion/{{member}}",
    // },
    // "react-hook-form": {
    //   transform: "react-hook-form/{{member}}",
    // },
    // "@radix-ui/react-slot": {
    //   transform: "@radix-ui/react-slot/{{member}}",
    // },
  },
  // Transpile heavy 3D libs for better compatibility
  transpilePackages: ["three", "@react-three/fiber", "@react-three/drei"],
  // Performance optimizations
  experimental: {
    optimizeCss: false,
    nextScriptWorkers: false,
  },
  // Enable standalone output for containerization
  output: "standalone",
  // Enable build performance tracking
  productionBrowserSourceMaps: false,
  generateBuildId: async () => {
    // Use date-based build ID for tracking
    return new Date().toISOString().split("T")[0].replace(/-/g, "");
  },
  // Webpack configuration for bundle optimization
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Apply enhanced optimization in production builds
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        ...webpackOptimization,
      };
    }

    // Add build time tracking on client prod builds
    if (!dev && !isServer) {
      config.plugins.push(
        new webpack.DefinePlugin({
          "process.env.BUILD_ID": JSON.stringify(buildId),
          "process.env.BUILD_TIME": JSON.stringify(new Date().toISOString()),
        }),
      );
    }

    // Fix for packages that use `self` as a global
    if (isServer) {
      config.output.globalObject = "this";
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
