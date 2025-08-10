/**
 * Client-side caching utilities for better performance
 * Provides type-safe caching with automatic cleanup and memory management
 */

// Cache configuration constants
export const CACHE_CONFIG = {
  DEFAULT_TTL: 5 * 60 * 1000, // 5 minutes
  CLEANUP_INTERVAL: 5 * 60 * 1000, // 5 minutes
  MAX_CACHE_SIZE: 1000, // Maximum number of entries per cache
  MEMORY_THRESHOLD: 0.8, // Memory usage threshold for cleanup
} as const;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

interface CacheStats {
  size: number;
  hitRate: number;
  missRate: number;
  memoryUsage: number;
}

type CacheKey = string | number | symbol;
type CacheValue = unknown;

/**
 * Type-safe cache implementation with LRU eviction and memory management
 */
class SimpleCache<T = CacheValue> {
  private cache = new Map<string, CacheEntry<T>>();
  private defaultTTL: number;
  private maxSize: number;
  private hits = 0;
  private misses = 0;

  constructor(
    defaultTTL = CACHE_CONFIG.DEFAULT_TTL,
    maxSize = CACHE_CONFIG.MAX_CACHE_SIZE,
  ) {
    this.defaultTTL = defaultTTL;
    this.maxSize = maxSize;
  }

  /**
   * Set a value in the cache with optional TTL
   * Implements LRU eviction when cache is full
   */
  set(key: string, data: T, ttl?: number): void {
    const now = Date.now();

    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      ttl: ttl ?? this.defaultTTL,
      accessCount: 0,
      lastAccessed: now,
    };

    this.cache.set(key, entry);
  }

  /**
   * Get a value from the cache, returns null if not found or expired
   * Updates access statistics for LRU tracking
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }

    const now = Date.now();

    // Check if expired
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // Update access statistics for LRU
    entry.accessCount++;
    entry.lastAccessed = now;
    this.hits++;

    return entry.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get all keys in the cache (non-expired only)
   */
  keys(): string[] {
    this.cleanup(); // Clean expired entries first
    return Array.from(this.cache.keys());
  }

  /**
   * Evict least recently used item to make space
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.hits + this.misses;
    return {
      size: this.cache.size,
      hitRate: totalRequests > 0 ? this.hits / totalRequests : 0,
      missRate: totalRequests > 0 ? this.misses / totalRequests : 0,
      memoryUsage: this.estimateMemoryUsage(),
    };
  }

  /**
   * Estimate memory usage (rough approximation)
   */
  private estimateMemoryUsage(): number {
    // Rough estimation: each entry ~100 bytes + data size
    return this.cache.size * 100;
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
  }
}

// Type-safe cache instances for different data types
export interface EstimateData {
  id: string;
  customer_name: string;
  total_amount: number;
  status: string;
  created_at: string;
  [key: string]: unknown;
}

export interface ServiceData {
  id: string;
  name: string;
  type: string;
  price: number;
  [key: string]: unknown;
}

export interface CalculationResult {
  service_type: string;
  total_cost: number;
  labor_cost: number;
  material_cost: number;
  [key: string]: unknown;
}

export interface AnalyticsData {
  timestamp: string;
  event: string;
  value: number;
  metadata?: Record<string, unknown>;
}

export interface SearchResult {
  results: unknown[];
  total: number;
  query: string;
}

// Typed cache instances
export const estimatesCache = new SimpleCache<EstimateData>(10 * 60 * 1000); // 10 minutes
export const servicesCache = new SimpleCache<ServiceData>(30 * 60 * 1000); // 30 minutes
export const calculationsCache = new SimpleCache<CalculationResult>(
  60 * 60 * 1000,
); // 1 hour
export const analyticsCache = new SimpleCache<AnalyticsData>(5 * 60 * 1000); // 5 minutes
export const searchCache = new SimpleCache<SearchResult>(2 * 60 * 1000); // 2 minutes

// Cache keys generator
export const getCacheKey = {
  estimate: (id: string) => `estimate:${id}`,
  estimatesList: (limit: number, offset: number, userId?: string) =>
    `estimates:${userId || "all"}:${limit}:${offset}`,
  estimateStats: (userId?: string) => `stats:${userId || "all"}`,
  search: (query: string, userId?: string) =>
    `search:${userId || "all"}:${query}`,
  service: (serviceId: string) => `service:${serviceId}`,
  calculation: (serviceType: string, params: string) =>
    `calc:${serviceType}:${params}`,
  analytics: (type: string, params?: string) =>
    `analytics:${type}:${params || ""}`,
};

/**
 * Cache wrapper for async functions with improved type safety
 */
export function cached<TArgs extends readonly unknown[], TReturn>(
  cache: SimpleCache<TReturn>,
  keyFn: (...args: TArgs) => string,
  ttl?: number,
) {
  return function <TFunc extends (...args: TArgs) => Promise<TReturn>>(
    fn: TFunc,
  ): TFunc {
    return (async (...args: TArgs): Promise<TReturn> => {
      const key = keyFn(...args);

      // Check cache first
      const cachedResult = cache.get(key);
      if (cachedResult !== null) {
        return cachedResult;
      }

      // Execute function and cache result
      try {
        const result = await fn(...args);
        cache.set(key, result, ttl);
        return result;
      } catch (error) {
        // Don't cache errors
        throw error;
      }
    }) as TFunc;
  };
}

/**
 * Browser storage cache for persistence with type safety
 */
export class PersistentCache<T = CacheValue> {
  private storageKey: string;
  private ttl: number;
  private isAvailable: boolean;

  constructor(storageKey: string, ttl = 24 * 60 * 60 * 1000) {
    this.storageKey = storageKey;
    this.ttl = ttl;
    this.isAvailable = this.checkStorageAvailability();
  }

  /**
   * Check if localStorage is available
   */
  private checkStorageAvailability(): boolean {
    try {
      const test = "__storage_test__";
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Set a value in persistent cache
   */
  set(key: string, data: T): boolean {
    if (!this.isAvailable) {
      return false;
    }

    try {
      const entry = {
        data,
        timestamp: Date.now(),
        ttl: this.ttl,
      };

      const stored = this.getStoredData();
      stored[key] = entry;

      localStorage.setItem(this.storageKey, JSON.stringify(stored));
      return true;
    } catch (error) {
      console.warn("Failed to store in localStorage:", error);
      return false;
    }
  }

  /**
   * Get a value from persistent cache
   */
  get(key: string): T | null {
    if (!this.isAvailable) {
      return null;
    }

    try {
      const stored = this.getStoredData();
      const entry = stored[key];

      if (!entry) return null;

      // Check if expired
      if (Date.now() - entry.timestamp > entry.ttl) {
        delete stored[key];
        localStorage.setItem(this.storageKey, JSON.stringify(stored));
        return null;
      }

      return entry.data as T;
    } catch (error) {
      console.warn("Failed to read from localStorage:", error);
      return null;
    }
  }

  private getStoredData(): Record<string, any> {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  /**
   * Clear all data from persistent cache
   */
  clear(): boolean {
    if (!this.isAvailable) {
      return false;
    }

    try {
      localStorage.removeItem(this.storageKey);
      return true;
    } catch (error) {
      console.warn("Failed to clear localStorage:", error);
      return false;
    }
  }

  /**
   * Check if storage is available
   */
  isStorageAvailable(): boolean {
    return this.isAvailable;
  }
}

// Type-safe persistent cache instances
export interface UserSettings {
  theme: "light" | "dark" | "system";
  language: string;
  notifications: boolean;
  [key: string]: unknown;
}

export const userSettingsCache = new PersistentCache<UserSettings>(
  "user-settings",
);
export const recentEstimatesCache = new PersistentCache<EstimateData>(
  "recent-estimates",
  60 * 60 * 1000,
);

// Cache invalidation utilities
export const invalidateCache = {
  estimate: (id: string) => {
    estimatesCache.delete(getCacheKey.estimate(id));
    // Also invalidate related caches
    const keys = estimatesCache.keys();
    keys.forEach((key) => {
      if (key.startsWith("estimates:")) {
        estimatesCache.delete(key);
      }
    });
  },

  estimationFlow: (id: string) => {
    // Invalidate estimation flow cache
    estimatesCache.delete(`flow:${id}`);
    // Also invalidate related estimate cache
    estimatesCache.delete(getCacheKey.estimate(id));
  },

  allEstimates: () => {
    const keys = estimatesCache.keys();
    keys.forEach((key) => {
      if (key.startsWith("estimates:") || key.startsWith("stats:")) {
        estimatesCache.delete(key);
      }
    });
  },

  search: () => {
    searchCache.clear();
  },

  analytics: () => {
    analyticsCache.clear();
  },

  all: () => {
    estimatesCache.clear();
    servicesCache.clear();
    calculationsCache.clear();
    analyticsCache.clear();
    searchCache.clear();
  },
};

// Cleanup function to run periodically
export function cleanupCaches(): void {
  estimatesCache.cleanup();
  servicesCache.cleanup();
  calculationsCache.cleanup();
  analyticsCache.cleanup();
  searchCache.cleanup();
}

// Auto-cleanup every 5 minutes
if (typeof window !== "undefined") {
  setInterval(cleanupCaches, 5 * 60 * 1000);
}

// Request deduplication for identical requests
const pendingRequests = new Map<string, Promise<any>>();

export function deduplicate<T>(key: string, fn: () => Promise<T>): Promise<T> {
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key)!;
  }

  const promise = fn().finally(() => {
    pendingRequests.delete(key);
  });

  pendingRequests.set(key, promise);
  return promise;
}
