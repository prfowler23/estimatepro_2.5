/**
 * Performance-optimized Next.js configuration
 */

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const webpackOptimization = require("./lib/optimization/webpack-optimization.js");

export const performanceConfig = {
  // Optimize images
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Experimental features for better performance
  experimental: {
    optimizeCss: true,
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-*",
      "framer-motion",
      "recharts",
    ],
  },

  // Compiler options
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },

  // Module transpilation
  transpilePackages: ["three", "@react-three/fiber", "@react-three/drei"],

  // Webpack optimization
  webpack: (config, { isServer, dev }) => {
    // Apply enhanced optimization in production
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        ...webpackOptimization,
      };
    }

    return config;
  },
};
