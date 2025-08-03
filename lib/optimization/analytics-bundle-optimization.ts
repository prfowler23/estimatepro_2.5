// Analytics Bundle Optimization Configuration
// Provides optimized webpack configurations for analytics components

import React from "react";

interface BundleOptimizationConfig {
  chunkSize: {
    minSize: number;
    maxSize: number;
    maxAsyncRequests: number;
    maxInitialRequests: number;
  };
  cacheGroups: Record<string, any>;
  preloadChunks: string[];
  lazyLoadThreshold: number;
}

export const analyticsOptimizationConfig: BundleOptimizationConfig = {
  chunkSize: {
    minSize: 20000, // 20KB minimum chunk size
    maxSize: 250000, // 250KB maximum chunk size
    maxAsyncRequests: 30, // Maximum async chunks per route
    maxInitialRequests: 10, // Maximum initial chunks
  },
  cacheGroups: {
    // Analytics vendor bundle - separate Recharts and analytics libraries
    analyticsVendor: {
      test: /[\\/]node_modules[\\/](recharts|d3|lodash)[\\/]/,
      name: "analytics-vendor",
      chunks: "all",
      priority: 15,
      reuseExistingChunk: true,
      enforce: true,
    },
    // Analytics UI components
    analyticsComponents: {
      test: /[\\/]components[\\/]analytics[\\/]/,
      name: "analytics-components",
      chunks: "all",
      priority: 10,
      minChunks: 1,
      reuseExistingChunk: true,
    },
    // Analytics services
    analyticsServices: {
      test: /[\\/]lib[\\/]services[\\/].*analytics/,
      name: "analytics-services",
      chunks: "all",
      priority: 12,
      minChunks: 1,
      reuseExistingChunk: true,
    },
    // Common UI components used by analytics
    commonUI: {
      test: /[\\/]components[\\/]ui[\\/]/,
      name: "common-ui",
      chunks: "all",
      priority: 8,
      minChunks: 2,
      reuseExistingChunk: true,
    },
  },
  preloadChunks: ["analytics-vendor", "analytics-components", "common-ui"],
  lazyLoadThreshold: 50000, // 50KB threshold for lazy loading
};

// Component-level optimization utilities
export class ComponentOptimizer {
  private static loadedChunks = new Set<string>();
  private static chunkCache = new Map<string, Promise<any>>();

  /**
   * Preload analytics chunks based on user interaction
   */
  static async preloadAnalyticsChunks(): Promise<void> {
    const chunks = [
      "analytics-vendor",
      "analytics-components",
      "analytics-services",
    ];

    for (const chunk of chunks) {
      if (!this.loadedChunks.has(chunk)) {
        try {
          // Preload chunk with low priority
          await this.loadChunkWithPriority(chunk, "low");
          this.loadedChunks.add(chunk);
        } catch (error) {
          console.warn(`Failed to preload chunk ${chunk}:`, error);
        }
      }
    }
  }

  /**
   * Load chunk with specified priority
   */
  private static async loadChunkWithPriority(
    chunkName: string,
    priority: "high" | "low" = "high",
  ): Promise<any> {
    if (this.chunkCache.has(chunkName)) {
      return this.chunkCache.get(chunkName);
    }

    const chunkPromise = new Promise((resolve, reject) => {
      // Use requestIdleCallback for low priority loads
      if (priority === "low" && "requestIdleCallback" in window) {
        (window as any).requestIdleCallback(() => {
          this.loadChunk(chunkName).then(resolve).catch(reject);
        });
      } else {
        this.loadChunk(chunkName).then(resolve).catch(reject);
      }
    });

    this.chunkCache.set(chunkName, chunkPromise);
    return chunkPromise;
  }

  /**
   * Load specific chunk
   */
  private static async loadChunk(chunkName: string): Promise<any> {
    // This would typically be handled by webpack's dynamic imports
    // For now, return a resolved promise
    return Promise.resolve();
  }

  /**
   * Monitor and optimize component rendering performance
   */
  static monitorComponentPerformance(componentName: string): {
    startTiming: () => void;
    endTiming: () => number;
  } {
    let startTime: number;

    return {
      startTiming: () => {
        startTime = performance.now();
      },
      endTiming: (): number => {
        const endTime = performance.now();
        const duration = endTime - startTime;

        // Log performance metrics
        if (process.env.NODE_ENV === "development") {
          console.log(`${componentName} render time: ${duration.toFixed(2)}ms`);
        }

        // Report to analytics if duration is concerning
        if (duration > 100) {
          this.reportSlowComponent(componentName, duration);
        }

        return duration;
      },
    };
  }

  /**
   * Report slow component rendering
   */
  private static reportSlowComponent(
    componentName: string,
    duration: number,
  ): void {
    // In a real implementation, you would send this to your analytics service
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `Slow component detected: ${componentName} took ${duration}ms to render`,
      );
    }
  }

  /**
   * Optimize large datasets for rendering
   */
  static optimizeDataForRendering<T>(
    data: T[],
    maxPoints: number = 1000,
    strategy: "sample" | "aggregate" | "window" = "sample",
  ): T[] {
    if (data.length <= maxPoints) {
      return data;
    }

    switch (strategy) {
      case "sample":
        // Sample data points evenly
        const step = Math.ceil(data.length / maxPoints);
        return data.filter((_, index) => index % step === 0);

      case "aggregate":
        // Aggregate data points (simplified)
        const chunkSize = Math.ceil(data.length / maxPoints);
        const aggregated: T[] = [];

        for (let i = 0; i < data.length; i += chunkSize) {
          const chunk = data.slice(i, i + chunkSize);
          // Take the first item of each chunk as representative
          if (chunk.length > 0) {
            aggregated.push(chunk[0]);
          }
        }
        return aggregated;

      case "window":
        // Sliding window approach
        return data.slice(-maxPoints);

      default:
        return data.slice(0, maxPoints);
    }
  }

  /**
   * Debounce chart updates for better performance
   */
  static debounceChartUpdate<T extends any[]>(
    updateFunction: (...args: T) => void,
    delay: number = 300,
  ): (...args: T) => void {
    let timeoutId: NodeJS.Timeout;

    return (...args: T) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => updateFunction(...args), delay);
    };
  }

  /**
   * Memory optimization for chart data
   */
  static optimizeChartMemory(data: any[]): {
    data: any[];
    cleanup: () => void;
  } {
    // Create optimized data structure
    const optimizedData = data.map((item) => {
      if (typeof item === "object" && item !== null) {
        // Remove unnecessary properties for rendering
        const { id, createdAt, updatedAt, metadata, ...renderData } = item;
        return renderData;
      }
      return item;
    });

    // Provide cleanup function
    const cleanup = () => {
      // Clear references to help garbage collection
      optimizedData.length = 0;
    };

    return {
      data: optimizedData,
      cleanup,
    };
  }
}

// React Hook for component optimization
export function useComponentOptimization(componentName: string) {
  const performanceMonitor =
    ComponentOptimizer.monitorComponentPerformance(componentName);

  React.useEffect(() => {
    performanceMonitor.startTiming();

    return () => {
      performanceMonitor.endTiming();
    };
  }, []);

  const optimizeData = React.useCallback(
    <T>(
      data: T[],
      maxPoints?: number,
      strategy?: "sample" | "aggregate" | "window",
    ) => {
      return ComponentOptimizer.optimizeDataForRendering(
        data,
        maxPoints,
        strategy,
      );
    },
    [],
  );

  const debounceUpdate = React.useCallback(
    <T extends any[]>(fn: (...args: T) => void, delay?: number) => {
      return ComponentOptimizer.debounceChartUpdate(fn, delay);
    },
    [],
  );

  return {
    optimizeData,
    debounceUpdate,
    preloadChunks: ComponentOptimizer.preloadAnalyticsChunks,
  };
}

// Webpack configuration helper
export function getAnalyticsWebpackConfig() {
  return {
    optimization: {
      splitChunks: {
        chunks: "all",
        ...analyticsOptimizationConfig.chunkSize,
        cacheGroups: analyticsOptimizationConfig.cacheGroups,
      },
      // Enable module concatenation for better tree shaking
      concatenateModules: true,
      // Minimize analytics bundles in production
      minimize: process.env.NODE_ENV === "production",
    },
    resolve: {
      // Optimize module resolution
      alias: {
        "@analytics": "./components/analytics",
        "@analytics-services": "./lib/services/analytics",
      },
    },
  };
}

export default {
  analyticsOptimizationConfig,
  ComponentOptimizer,
  useComponentOptimization,
  getAnalyticsWebpackConfig,
};
