/**
 * Pricing Cache Service
 * Implements intelligent caching for pricing calculations with TTL and dependency tracking
 */

import { PricingCacheEntry, RealTimePricingResult } from "./types";

export class PricingCache {
  private cache: Map<string, PricingCacheEntry>;
  private readonly maxSize: number;
  private readonly defaultTTL: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(
    maxSize: number = 100,
    defaultTTL: number = 300000, // 5 minutes
  ) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
    this.startCleanupInterval();
  }

  /**
   * Generate cache key from pricing inputs
   */
  generateKey(params: Record<string, unknown>): string {
    // Sort keys for consistent hashing
    const sortedKeys = Object.keys(params).sort();
    const keyData = sortedKeys
      .map((key) => `${key}:${JSON.stringify(params[key])}`)
      .join("|");

    // Simple hash function for shorter keys
    let hash = 0;
    for (let i = 0; i < keyData.length; i++) {
      const char = keyData.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return `pricing_${hash.toString(36)}`;
  }

  /**
   * Get cached pricing result
   */
  get(key: string): RealTimePricingResult | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if entry has expired
    const now = Date.now();
    const entryAge = now - entry.timestamp.getTime();

    if (entryAge > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Update hit count
    entry.hits++;

    return entry.result;
  }

  /**
   * Set cached pricing result
   */
  set(
    key: string,
    result: RealTimePricingResult,
    ttl?: number,
    dependencies?: string[],
  ): void {
    // Enforce max size with LRU eviction
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    const entry: PricingCacheEntry = {
      key,
      result,
      timestamp: new Date(),
      ttl: ttl || this.defaultTTL,
      hits: 0,
      dependencies,
    };

    this.cache.set(key, entry);
  }

  /**
   * Invalidate cache entry
   */
  invalidate(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Invalidate all entries with specific dependency
   */
  invalidateByDependency(dependency: string): number {
    let invalidated = 0;

    Array.from(this.cache.entries()).forEach(([key, entry]) => {
      if (entry.dependencies?.includes(dependency)) {
        this.cache.delete(key);
        invalidated++;
      }
    });

    return invalidated;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    avgAge: number;
    oldestEntry: Date | null;
  } {
    const entries = Array.from(this.cache.values());
    const now = Date.now();

    let totalHits = 0;
    let totalAge = 0;
    let oldestDate: Date | null = null;

    for (const entry of entries) {
      totalHits += entry.hits;
      const age = now - entry.timestamp.getTime();
      totalAge += age;

      if (!oldestDate || entry.timestamp < oldestDate) {
        oldestDate = entry.timestamp;
      }
    }

    const avgAge = entries.length > 0 ? totalAge / entries.length : 0;
    const hitRate = entries.length > 0 ? totalHits / entries.length : 0;

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate,
      avgAge,
      oldestEntry: oldestDate,
    };
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let lruKey: string | null = null;
    let minHits = Infinity;
    let oldestTime = Date.now();

    Array.from(this.cache.entries()).forEach(([key, entry]) => {
      // Score based on hits and age
      const age = Date.now() - entry.timestamp.getTime();
      const score = entry.hits / (age / 1000); // Hits per second

      if (
        score < minHits ||
        (score === minHits && entry.timestamp.getTime() < oldestTime)
      ) {
        minHits = score;
        oldestTime = entry.timestamp.getTime();
        lruKey = key;
      }
    });

    if (lruKey) {
      this.cache.delete(lruKey);
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    Array.from(this.cache.entries()).forEach(([key, entry]) => {
      const age = now - entry.timestamp.getTime();
      if (age > entry.ttl) {
        keysToDelete.push(key);
      }
    });

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }

  /**
   * Start periodic cleanup
   */
  private startCleanupInterval(): void {
    // Run cleanup every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  /**
   * Stop cleanup interval (for cleanup)
   */
  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }
}

/**
 * Memoization decorator for expensive calculations
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  options: {
    cache?: PricingCache;
    ttl?: number;
    keyGenerator?: (...args: Parameters<T>) => string;
  } = {},
): T {
  const cache = options.cache || new PricingCache();
  const ttl = options.ttl || 300000; // 5 minutes default
  const keyGenerator =
    options.keyGenerator || ((...args) => JSON.stringify(args));

  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = keyGenerator(...args);

    // Check cache
    const cached = cache.get(key);
    if (cached) {
      return cached as ReturnType<T>;
    }

    // Calculate result
    const result = fn(...args);

    // Cache result if it's a valid pricing result
    if (result && typeof result === "object" && "totalCost" in result) {
      cache.set(key, result as RealTimePricingResult, ttl);
    }

    return result;
  }) as T;
}

/**
 * Create a shared cache instance
 */
let sharedCache: PricingCache | null = null;

export function getSharedPricingCache(): PricingCache {
  if (!sharedCache) {
    sharedCache = new PricingCache(200, 600000); // 10 minutes TTL
  }
  return sharedCache;
}

/**
 * Clear shared cache (useful for testing)
 */
export function clearSharedPricingCache(): void {
  if (sharedCache) {
    sharedCache.clear();
  }
}
