/**
 * Enhanced webpack optimization configuration
 */
module.exports = {
  splitChunks: {
    chunks: "all",
    maxAsyncRequests: 30,
    maxInitialRequests: 30,
    minSize: 20000,
    cacheGroups: {
      // Framework and core dependencies
      framework: {
        test: /[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
        name: "framework",
        priority: 40,
        reuseExistingChunk: true,
      },

      // Three.js and 3D libraries
      three: {
        test: /[\\/]node_modules[\\/](three|@react-three)[\\/]/,
        name: "three",
        priority: 35,
        enforce: true,
      },

      // PDF libraries
      pdf: {
        test: /[\\/]node_modules[\\/](jspdf|pdfjs-dist)[\\/]/,
        name: "pdf",
        priority: 30,
        enforce: true,
      },

      // Chart libraries
      charts: {
        test: /[\\/]node_modules[\\/](recharts|d3|victory)[\\/]/,
        name: "charts",
        priority: 25,
        enforce: true,
      },

      // UI libraries (Radix UI, Framer Motion)
      ui: {
        test: /[\\/]node_modules[\\/](@radix-ui|framer-motion|@floating-ui)[\\/]/,
        name: "ui",
        priority: 20,
      },

      // Form libraries
      forms: {
        test: /[\\/]node_modules[\\/](react-hook-form|zod|@hookform|yup)[\\/]/,
        name: "forms",
        priority: 18,
      },

      // State management
      state: {
        test: /[\\/]node_modules[\\/](zustand|immer|react-query|@tanstack)[\\/]/,
        name: "state",
        priority: 15,
      },

      // Utility libraries
      utils: {
        test: /[\\/]node_modules[\\/](lodash|date-fns|class-variance-authority|clsx|tailwind-merge)[\\/]/,
        name: "utils",
        priority: 10,
      },

      // Supabase and API clients
      api: {
        test: /[\\/]node_modules[\\/](@supabase|axios|swr)[\\/]/,
        name: "api",
        priority: 12,
      },

      // AI and processing libraries
      ai: {
        test: /[\\/]node_modules[\\/](openai|tesseract|exceljs|xlsx)[\\/]/,
        name: "ai-processing",
        priority: 8,
      },

      // Everything else from node_modules
      vendor: {
        test: /[\\/]node_modules[\\/]/,
        name(module) {
          // Extract package name
          const packageName = module.context.match(
            /[\\/]node_modules[\\/](.*?)([\\/]|$)/,
          )?.[1];

          // Group small packages together
          if (!packageName) return "vendor";

          // Keep large packages separate
          const largePackages = ["@sentry", "lucide-react", "@aws-sdk"];
          if (largePackages.some((pkg) => packageName.includes(pkg))) {
            return `vendor-${packageName.replace("/", "-")}`;
          }

          return "vendor";
        },
        priority: 5,
      },

      // Common app code
      common: {
        test: /[\\/]src[\\/]|[\\/]app[\\/]|[\\/]components[\\/]|[\\/]lib[\\/]/,
        minChunks: 2,
        name: "common",
        priority: 0,
        reuseExistingChunk: true,
      },
    },
  },

  // Create a runtime chunk for webpack runtime code
  runtimeChunk: {
    name: "runtime",
  },

  // Use deterministic module IDs for better caching
  moduleIds: "deterministic",

  // Minimize main bundle
  minimize: true,

  // Tree shake unused exports
  usedExports: true,

  // Enable side effects optimization
  sideEffects: true,
};
