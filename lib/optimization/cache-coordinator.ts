/**
 * Unified Cache Coordinator
 *
 * Orchestrates multi-layer caching across the application to improve performance
 * and reduce redundant operations. Integrates with existing caching infrastructure.
 */

import { simpleCache, createCache } from "@/lib/utils/cache";
import { OptimizedQueryService } from "./database-query-optimization";

interface CacheLayer {
  name: string;
  ttl: number;
  maxSize: number;
  priority: number;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  layer: string;
  dependencies: string[];
}

export class UnifiedCacheCoordinator {
  private static instance: UnifiedCacheCoordinator | null = null;

  // Cache layers ordered by priority (fastest to slowest)
  private cacheLayers: Map<string, any> = new Map();
  private dependencyGraph: Map<string, Set<string>> = new Map();
  private invalidationQueue: Set<string> = new Set();

  private constructor() {
    this.initializeCacheLayers();
    this.startInvalidationProcessor();
  }

  static getInstance(): UnifiedCacheCoordinator {
    if (!UnifiedCacheCoordinator.instance) {
      UnifiedCacheCoordinator.instance = new UnifiedCacheCoordinator();
    }
    return UnifiedCacheCoordinator.instance;
  }

  private initializeCacheLayers(): void {
    // Memory cache - fastest, smallest capacity
    this.cacheLayers.set(
      "memory",
      createCache<any>({
        ttl: 5 * 60 * 1000, // 5 minutes
        maxSize: 500,
      }),
    );

    // Component cache - for UI state and computed values
    this.cacheLayers.set(
      "component",
      createCache<any>({
        ttl: 15 * 60 * 1000, // 15 minutes
        maxSize: 1000,
      }),
    );

    // API cache - for API responses
    this.cacheLayers.set(
      "api",
      createCache<any>({
        ttl: 30 * 60 * 1000, // 30 minutes
        maxSize: 2000,
      }),
    );

    // Database cache - for expensive queries
    this.cacheLayers.set(
      "database",
      createCache<any>({
        ttl: 60 * 60 * 1000, // 1 hour
        maxSize: 5000,
      }),
    );
  }

  /**
   * Get data from cache with cascade fallback
   */
  async get<T>(
    key: string,
    layers: string[] = ["memory", "component", "api"],
  ): Promise<T | null> {
    for (const layerName of layers) {
      const layer = this.cacheLayers.get(layerName);
      if (layer) {
        const result = layer.get(key);
        if (result !== null) {
          // Promote to higher priority layers
          this.promoteToFasterLayers(key, result, layers, layerName);
          return result;
        }
      }
    }
    return null;
  }

  /**
   * Set data in specified cache layers
   */
  async set<T>(
    key: string,
    data: T,
    options: {
      layers?: string[];
      ttl?: number;
      dependencies?: string[];
    } = {},
  ): Promise<void> {
    const { layers = ["memory"], ttl, dependencies = [] } = options;

    for (const layerName of layers) {
      const layer = this.cacheLayers.get(layerName);
      if (layer) {
        layer.set(key, data, ttl);
      }
    }

    // Track dependencies for invalidation
    if (dependencies.length > 0) {
      this.dependencyGraph.set(key, new Set(dependencies));
    }
  }

  /**
   * Intelligent cache invalidation with dependency tracking
   */
  async invalidate(pattern: string | string[]): Promise<void> {
    const patterns = Array.isArray(pattern) ? pattern : [pattern];

    for (const pat of patterns) {
      this.invalidationQueue.add(pat);

      // Find dependent keys
      for (const [key, deps] of this.dependencyGraph.entries()) {
        if (deps.has(pat) || this.matchesPattern(key, pat)) {
          this.invalidationQueue.add(key);
        }
      }
    }
  }

  /**
   * Warm cache with frequently accessed data
   */
  async warmCache(
    keys: Array<{
      key: string;
      fetcher: () => Promise<any>;
      layers: string[];
      dependencies?: string[];
    }>,
  ): Promise<void> {
    const warmingPromises = keys.map(
      async ({ key, fetcher, layers, dependencies }) => {
        try {
          const data = await fetcher();
          await this.set(key, data, { layers, dependencies });
        } catch (error) {
          console.warn(`Failed to warm cache for key: ${key}`, error);
        }
      },
    );

    await Promise.allSettled(warmingPromises);
  }

  /**
   * Get cache statistics across all layers
   */
  getStats(): Record<string, any> {
    const stats: Record<string, any> = {};

    for (const [layerName, layer] of this.cacheLayers.entries()) {
      if (layer.getStats) {
        stats[layerName] = layer.getStats();
      }
    }

    return {
      layers: stats,
      dependencyGraphSize: this.dependencyGraph.size,
      pendingInvalidations: this.invalidationQueue.size,
    };
  }

  /**
   * Cleanup expired entries and optimize memory usage
   */
  async cleanup(): Promise<void> {
    for (const [layerName, layer] of this.cacheLayers.entries()) {
      if (layer.cleanup) {
        layer.cleanup();
      }
    }

    // Clean up dependency graph
    const now = Date.now();
    for (const [key, deps] of this.dependencyGraph.entries()) {
      let keyExists = false;
      for (const layer of this.cacheLayers.values()) {
        if (layer.has && layer.has(key)) {
          keyExists = true;
          break;
        }
      }

      if (!keyExists) {
        this.dependencyGraph.delete(key);
      }
    }
  }

  // Private helper methods

  private promoteToFasterLayers<T>(
    key: string,
    data: T,
    requestedLayers: string[],
    foundInLayer: string,
  ): void {
    const layerPriorities = { memory: 0, component: 1, api: 2, database: 3 };
    const foundPriority =
      layerPriorities[foundInLayer as keyof typeof layerPriorities] ?? 999;

    for (const layerName of requestedLayers) {
      const priority =
        layerPriorities[layerName as keyof typeof layerPriorities] ?? 999;
      if (priority < foundPriority) {
        const layer = this.cacheLayers.get(layerName);
        if (layer) {
          layer.set(key, data);
        }
      }
    }
  }

  private matchesPattern(key: string, pattern: string): boolean {
    // Simple wildcard matching
    const regexPattern = pattern.replace(/\*/g, ".*").replace(/\?/g, ".");
    return new RegExp(`^${regexPattern}$`).test(key);
  }

  private startInvalidationProcessor(): void {
    setInterval(() => {
      if (this.invalidationQueue.size > 0) {
        const keysToInvalidate = Array.from(this.invalidationQueue);
        this.invalidationQueue.clear();

        for (const key of keysToInvalidate) {
          for (const layer of this.cacheLayers.values()) {
            if (layer.delete) {
              layer.delete(key);
            }
          }
          this.dependencyGraph.delete(key);
        }
      }
    }, 1000); // Process every second
  }
}

// Convenience functions for common caching patterns
export const unifiedCache = UnifiedCacheCoordinator.getInstance();

/**
 * Cached function wrapper with automatic invalidation
 */
export function withCache<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  options: {
    keyGenerator?: (...args: T) => string;
    ttl?: number;
    layers?: string[];
    dependencies?: string[];
  } = {},
) {
  const {
    keyGenerator = (...args) => `fn:${JSON.stringify(args)}`,
    ttl = 5 * 60 * 1000,
    layers = ["memory"],
    dependencies = [],
  } = options;

  return async (...args: T): Promise<R> => {
    const key = keyGenerator(...args);

    // Try to get from cache first
    const cached = await unifiedCache.get<R>(key, layers);
    if (cached !== null) {
      return cached;
    }

    // Execute function and cache result
    const result = await fn(...args);
    await unifiedCache.set(key, result, { ttl, layers, dependencies });

    return result;
  };
}

/**
 * Service-specific caching utilities
 */
export const CachingUtils = {
  // Estimate-related caching
  estimates: {
    get: (id: string) => unifiedCache.get(`estimate:${id}`, ["memory", "api"]),
    set: (id: string, data: any) =>
      unifiedCache.set(`estimate:${id}`, data, {
        layers: ["memory", "api"],
        dependencies: [`user:estimates`, `estimate:*`],
      }),
    invalidate: (id?: string) =>
      unifiedCache.invalidate(id ? `estimate:${id}` : "estimate:*"),
  },

  // Analytics caching
  analytics: {
    get: (key: string) =>
      unifiedCache.get(`analytics:${key}`, ["memory", "database"]),
    set: (key: string, data: any, ttl = 30 * 60 * 1000) =>
      unifiedCache.set(`analytics:${key}`, data, {
        layers: ["memory", "database"],
        ttl,
      }),
    invalidate: () => unifiedCache.invalidate("analytics:*"),
  },

  // UI component state caching
  components: {
    get: (componentId: string, key: string) =>
      unifiedCache.get(`component:${componentId}:${key}`, [
        "memory",
        "component",
      ]),
    set: (componentId: string, key: string, data: any) =>
      unifiedCache.set(`component:${componentId}:${key}`, data, {
        layers: ["memory", "component"],
      }),
    invalidate: (componentId: string) =>
      unifiedCache.invalidate(`component:${componentId}:*`),
  },
};
