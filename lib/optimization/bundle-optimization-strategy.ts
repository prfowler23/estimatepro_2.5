// Bundle Size and Code Splitting Optimization Strategy
// Comprehensive analysis and solutions for reducing bundle size and improving load times

import React, { lazy, ComponentType } from "react";

// Bundle Analysis Results
export interface BundleAnalysis {
  totalSize: number;
  gzippedSize: number;
  largestChunks: ChunkInfo[];
  duplicatedPackages: DuplicatePackage[];
  treeShakingOpportunities: TreeShakeOpportunity[];
  dynamicImportCandidates: ImportCandidate[];
}

export interface ChunkInfo {
  name: string;
  size: number;
  gzippedSize: number;
  modules: string[];
  dependencies: string[];
}

export interface DuplicatePackage {
  name: string;
  versions: string[];
  totalSize: number;
  locations: string[];
}

export interface TreeShakeOpportunity {
  package: string;
  unusedExports: string[];
  potentialSavings: number;
}

export interface ImportCandidate {
  component: string;
  estimatedSize: number;
  loadFrequency: "high" | "medium" | "low";
  splitPriority: "immediate" | "route" | "interaction";
}

// Current Bundle Issues Identified
export const CURRENT_BUNDLE_ISSUES = {
  // Heavy Third-Party Dependencies
  heavyDependencies: [
    {
      name: "@react-pdf/renderer",
      size: "~2.5MB",
      usage: "PDF generation - lazy loadable",
    },
    {
      name: "recharts",
      size: "~800KB",
      usage: "Charts - already partially lazy loaded",
    },
    {
      name: "@react-three/fiber",
      size: "~600KB",
      usage: "3D visualization - lazy loadable",
    },
    {
      name: "@react-three/drei",
      size: "~400KB",
      usage: "3D helpers - lazy loadable",
    },
    { name: "three", size: "~1.2MB", usage: "3D graphics - lazy loadable" },
    {
      name: "html2canvas",
      size: "~300KB",
      usage: "Screenshot capture - lazy loadable",
    },
    { name: "tesseract.js", size: "~1.8MB", usage: "OCR - lazy loadable" },
  ],

  // Over-eager Imports
  eagerImports: [
    "All 17 Radix UI components loaded regardless of page usage",
    "Complete analytics dashboard loaded on app init",
    "AI components pre-loaded before user interaction",
    "All calculator forms loaded instead of dynamic loading",
    "Complete collaboration system loaded for all users",
  ],

  // Bundle Splitting Issues
  splittingIssues: [
    "No route-based code splitting implemented",
    "Feature modules not properly separated",
    "Shared utilities bundled with main chunk",
    "Third-party dependencies not optimally chunked",
  ],
} as const;

// Dynamic Import Factory with Error Handling
export class OptimizedLazyLoader {
  private static loadingCache = new Map<string, Promise<any>>();
  private static retryAttempts = new Map<string, number>();
  private static maxRetries = 3;

  static createLazyComponent<T extends ComponentType<any>>(
    importFn: () => Promise<{ default: T }>,
    fallback?: ComponentType,
    componentName?: string,
  ): ComponentType<React.ComponentProps<T>> {
    const cacheKey = componentName || importFn.toString();

    const LazyComponent = lazy(() => {
      // Check if already loading
      if (this.loadingCache.has(cacheKey)) {
        return this.loadingCache.get(cacheKey)!;
      }

      const loadPromise = importFn()
        .catch((error) => {
          const attempts = this.retryAttempts.get(cacheKey) || 0;

          if (attempts < this.maxRetries) {
            this.retryAttempts.set(cacheKey, attempts + 1);
            console.warn(
              `Retry ${attempts + 1}/${this.maxRetries} for ${componentName}:`,
              error,
            );

            // Exponential backoff
            return new Promise((resolve) => {
              setTimeout(
                () => {
                  resolve(importFn());
                },
                Math.pow(2, attempts) * 1000,
              );
            });
          }

          console.error(
            `Failed to load ${componentName} after ${this.maxRetries} attempts:`,
            error,
          );

          // Return fallback component
          return {
            default: (fallback ||
              ((props: any) => {
                return React.createElement(
                  "div",
                  {
                    className: "p-4 border border-red-200 bg-red-50 rounded-md",
                  },
                  [
                    React.createElement(
                      "p",
                      {
                        key: "error-message",
                        className: "text-red-800 text-sm",
                      },
                      `Failed to load ${componentName || "component"}`,
                    ),
                    React.createElement(
                      "button",
                      {
                        key: "retry-button",
                        onClick: () => {
                          this.loadingCache.delete(cacheKey);
                          this.retryAttempts.delete(cacheKey);
                          window.location.reload();
                        },
                        className:
                          "mt-2 px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700",
                      },
                      "Retry",
                    ),
                  ],
                );
              })) as T,
          };
        })
        .finally(() => {
          this.loadingCache.delete(cacheKey);
          this.retryAttempts.delete(cacheKey);
        });

      this.loadingCache.set(cacheKey, loadPromise);
      return loadPromise;
    });

    return LazyComponent;
  }

  static preloadComponent(importFn: () => Promise<any>): void {
    // Preload during idle time
    if ("requestIdleCallback" in window) {
      requestIdleCallback(() => {
        importFn().catch(() => {
          // Silent failure for preloading
        });
      });
    } else {
      setTimeout(() => {
        importFn().catch(() => {
          // Silent failure for preloading
        });
      }, 0);
    }
  }
}

// Route-Based Code Splitting Strategy
export const ROUTE_SPLITTING_CONFIG = {
  // Immediate Load (Critical Path)
  immediate: [
    "/dashboard",
    "/estimates",
    "/", // Home page
  ],

  // Route-Based Splitting
  routes: [
    {
      path: "/estimates/new/guided",
      chunk: "guided-estimation",
      preload: "hover", // Preload on navigation hover
      components: [
        "GuidedEstimationFlow",
        "StepIndicator",
        "ProgressiveValidation",
        "RealTimeCostBreakdown",
      ],
    },
    {
      path: "/analytics",
      chunk: "analytics-dashboard",
      preload: "idle",
      components: [
        "AnalyticsOverview",
        "EnhancedAnalyticsDashboard",
        "WorkflowChart",
        "TimeSeriesChart",
        "ExportDialog",
      ],
    },
    {
      path: "/3d-demo",
      chunk: "3d-visualization",
      preload: "interaction",
      components: ["Building3D", "EnhancedBuilding3D", "ThreeJS dependencies"],
    },
    {
      path: "/calculator",
      chunk: "service-calculators",
      preload: "hover",
      components: [
        "All calculator forms (11 total)",
        "ServiceCalculator",
        "LazyForms",
      ],
    },
  ],

  // Feature-Based Splitting
  features: [
    {
      name: "ai-components",
      trigger: "user-interaction",
      components: [
        "AIAssistant",
        "SmartField",
        "IntelligentServiceSuggestions",
        "PhotoAnalysis",
        "DocumentExtraction",
      ],
    },
    {
      name: "collaboration",
      trigger: "feature-flag",
      components: [
        "CollaborationProvider",
        "CollaborativeField",
        "ConflictResolutionDialog",
        "RealTimeChangeIndicator",
      ],
    },
    {
      name: "pdf-generation",
      trigger: "user-action",
      components: ["@react-pdf/renderer", "PDFGenerator", "EstimateTemplate"],
    },
  ],
} as const;

// Optimized Component Lazy Loading
export const createOptimizedLazyComponents = () => {
  // Heavy Third-Party Components
  const LazyPDFRenderer = OptimizedLazyLoader.createLazyComponent(
    () =>
      import("@react-pdf/renderer").then((mod) => ({ default: mod.Document })),
    undefined,
    "PDFRenderer",
  );

  const Lazy3DVisualization = OptimizedLazyLoader.createLazyComponent(
    () => import("@/components/visualizer/enhanced-building-3d"),
    undefined,
    "3DVisualization",
  );

  const LazyAnalyticsDashboard = OptimizedLazyLoader.createLazyComponent(
    () => import("@/components/analytics/enhanced-analytics-dashboard"),
    undefined,
    "AnalyticsDashboard",
  );

  const LazyTesseractOCR = OptimizedLazyLoader.createLazyComponent(
    () => import("tesseract.js").then((mod) => ({ default: mod.default })),
    undefined,
    "TesseractOCR",
  );

  // Calculator Forms (Dynamic Loading)
  const createLazyCalculatorForm = (formName: string) =>
    OptimizedLazyLoader.createLazyComponent(
      () => import(`@/components/calculator/forms/${formName}`),
      undefined,
      `Calculator-${formName}`,
    );

  const calculatorForms = {
    WindowCleaning: createLazyCalculatorForm("window-cleaning-form"),
    PressureWashing: createLazyCalculatorForm("pressure-washing-form"),
    SoftWashing: createLazyCalculatorForm("soft-washing-form"),
    BiofilmRemoval: createLazyCalculatorForm("biofilm-removal-form"),
    GlassRestoration: createLazyCalculatorForm("glass-restoration-form"),
    FrameRestoration: createLazyCalculatorForm("frame-restoration-form"),
    HighDusting: createLazyCalculatorForm("high-dusting-form"),
    FinalClean: createLazyCalculatorForm("final-clean-form"),
    GraniteReconditioning: createLazyCalculatorForm(
      "granite-reconditioning-form",
    ),
    PressureWashSeal: createLazyCalculatorForm("pressure-wash-seal-form"),
    ParkingDeck: createLazyCalculatorForm("parking-deck-form"),
  };

  // Feature Components
  const LazyCollaboration = OptimizedLazyLoader.createLazyComponent(
    () => import("@/components/collaboration/CollaborationProvider"),
    undefined,
    "Collaboration",
  );

  const LazyAIAssistant = OptimizedLazyLoader.createLazyComponent(
    () => import("@/components/ai/ai-assistant"),
    undefined,
    "AIAssistant",
  );

  return {
    LazyPDFRenderer,
    Lazy3DVisualization,
    LazyAnalyticsDashboard,
    LazyTesseractOCR,
    calculatorForms,
    LazyCollaboration,
    LazyAIAssistant,
  };
};

// Bundle Optimization Recommendations
export const OPTIMIZATION_RECOMMENDATIONS = {
  immediate: [
    {
      priority: "critical",
      action: "Implement route-based code splitting",
      impact: "~40% initial bundle size reduction",
      implementation:
        "Use Next.js dynamic imports with ssr: false for client-only components",
    },
    {
      priority: "critical",
      action: "Lazy load heavy third-party dependencies",
      impact: "~60% reduction in unused code loading",
      implementation: "Dynamic imports for PDF, 3D, OCR, and chart libraries",
    },
    {
      priority: "high",
      action: "Split calculator forms into separate chunks",
      impact: "~200KB reduction per unused form",
      implementation: "Dynamic import based on selected service type",
    },
  ],

  mediumTerm: [
    {
      priority: "medium",
      action: "Implement vendor chunk optimization",
      impact: "~15% better caching efficiency",
      implementation:
        "Configure webpack splitChunks for better vendor separation",
    },
    {
      priority: "medium",
      action: "Tree shake unused Radix UI components",
      impact: "~100KB bundle reduction",
      implementation: "Import only used components, configure babel plugin",
    },
    {
      priority: "low",
      action: "Optimize CSS bundle splitting",
      impact: "~30KB reduction + better caching",
      implementation: "Split CSS by routes and features",
    },
  ],

  advanced: [
    {
      priority: "enhancement",
      action: "Implement micro-frontends for major features",
      impact: "Better team scalability + lazy loading",
      implementation:
        "Module federation for analytics, collaboration, AI features",
    },
    {
      priority: "enhancement",
      action: "Add service worker for asset caching",
      impact: "Improved perceived performance",
      implementation: "Cache splitting strategies with workbox",
    },
  ],
} as const;

// webpack Configuration for Bundle Optimization
export const getOptimizedWebpackConfig = (
  config: any,
  { dev, isServer }: any,
) => {
  if (!dev && !isServer) {
    // Production client-side optimizations
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: "all",
        cacheGroups: {
          // Vendor chunks
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: "vendors",
            priority: 10,
            chunks: "all",
          },
          // Heavy third-party libraries
          heavy: {
            test: /[\\/]node_modules[\\/](@react-pdf|three|tesseract|recharts)[\\/]/,
            name: "heavy-libs",
            priority: 20,
            chunks: "async",
          },
          // Radix UI components
          radix: {
            test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
            name: "radix-ui",
            priority: 15,
            chunks: "all",
          },
          // Common components
          common: {
            name: "common",
            minChunks: 2,
            priority: 5,
            chunks: "all",
            enforce: true,
          },
        },
      },
    };

    // Bundle analyzer in development
    if (process.env.ANALYZE_BUNDLE === "true") {
      const BundleAnalyzerPlugin =
        require("webpack-bundle-analyzer").BundleAnalyzerPlugin;
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: "static",
          openAnalyzer: false,
          reportFilename: "bundle-analysis.html",
        }),
      );
    }
  }

  return config;
};

// Performance Monitoring
export class BundlePerformanceMonitor {
  private static metrics = {
    loadTimes: new Map<string, number>(),
    chunkSizes: new Map<string, number>(),
    failedLoads: new Set<string>(),
  };

  static recordLoadTime(chunkName: string, startTime: number): void {
    const loadTime = performance.now() - startTime;
    this.metrics.loadTimes.set(chunkName, loadTime);

    // Report slow loading chunks
    if (loadTime > 3000) {
      console.warn(
        `Slow chunk load detected: ${chunkName} took ${loadTime.toFixed(2)}ms`,
      );
    }
  }

  static recordChunkSize(chunkName: string, size: number): void {
    this.metrics.chunkSizes.set(chunkName, size);
  }

  static recordFailedLoad(chunkName: string): void {
    this.metrics.failedLoads.add(chunkName);
    console.error(`Chunk load failed: ${chunkName}`);
  }

  static getMetrics() {
    return {
      averageLoadTime:
        Array.from(this.metrics.loadTimes.values()).reduce(
          (sum, time) => sum + time,
          0,
        ) / this.metrics.loadTimes.size,
      totalChunkSize: Array.from(this.metrics.chunkSizes.values()).reduce(
        (sum, size) => sum + size,
        0,
      ),
      failureRate:
        this.metrics.failedLoads.size /
        (this.metrics.loadTimes.size + this.metrics.failedLoads.size),
      slowChunks: Array.from(this.metrics.loadTimes.entries())
        .filter(([, time]) => time > 2000)
        .map(([name, time]) => ({ name, time })),
    };
  }
}

// Usage Instructions
export const IMPLEMENTATION_GUIDE = `
# Bundle Optimization Implementation Guide

## Phase 1: Immediate Optimizations (1-2 days)

1. **Route-Based Splitting**
   - Update Next.js pages to use dynamic imports
   - Implement loading states for each major route
   - Configure webpack splitChunks for better separation

2. **Heavy Library Lazy Loading**
   - Convert PDF generation to lazy loading
   - Lazy load 3D visualization components
   - Dynamic import OCR functionality

3. **Calculator Form Optimization**
   - Implement dynamic form loading based on service selection
   - Add loading states for calculator forms

## Phase 2: Advanced Optimizations (3-5 days)

1. **Vendor Chunk Optimization**
   - Configure optimal vendor splitting
   - Separate heavy third-party libraries
   - Optimize Radix UI component bundling

2. **Feature-Based Splitting**
   - Split AI components into separate chunks
   - Separate collaboration features
   - Optimize analytics dashboard loading

## Phase 3: Performance Monitoring (ongoing)

1. **Bundle Analysis**
   - Set up automated bundle size monitoring
   - Track loading performance metrics
   - Monitor chunk load failures

2. **Continuous Optimization**
   - Regular bundle analysis reviews
   - Performance regression detection
   - User experience monitoring

## Expected Results:
- 40-60% reduction in initial bundle size
- 50-70% improvement in First Contentful Paint
- Better caching efficiency
- Improved perceived performance
`;

export default {
  OptimizedLazyLoader,
  createOptimizedLazyComponents,
  getOptimizedWebpackConfig,
  BundlePerformanceMonitor,
  CURRENT_BUNDLE_ISSUES,
  ROUTE_SPLITTING_CONFIG,
  OPTIMIZATION_RECOMMENDATIONS,
  IMPLEMENTATION_GUIDE,
};
