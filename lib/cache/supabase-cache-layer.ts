/**
 * Intelligent Supabase Cache Layer
 *
 * Multi-tiered caching system with automatic invalidation and optimization
 * for EstimatePro Supabase operations
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";
import { DatabaseError } from "@/lib/utils/database-transactions";

// Cache configuration
export interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  maxSize: number; // Maximum entries per layer
  enableMetrics: boolean;
  compressionThreshold: number; // Compress entries larger than this size (bytes)
}

// Cache entry structure
interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  hitCount: number;
  size: number;
  compressed: boolean;
  tags: string[];
  dependencies: string[];
}

// Cache metrics
interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  evictions: number;
  compressions: number;
  totalSize: number;
  averageResponseTime: number;
}

// Query signature for cache keys
interface QuerySignature {
  table: string;
  operation: "select" | "insert" | "update" | "delete" | "rpc";
  filters?: Record<string, any>;
  columns?: string[];
  orderBy?: string[];
  limit?: number;
  offset?: number;
}

/**
 * Intelligent multi-tier caching system for Supabase operations
 */
export class SupabaseCacheLayer {
  private memory: Map<string, CacheEntry> = new Map();
  private localStorage?: Storage;
  private sessionStorage?: Storage;
  private config: CacheConfig;
  private metrics: CacheMetrics;
  private invalidationQueue: Set<string> = new Set();
  private compressionWorker?: Worker;

  // Table dependency mapping for intelligent invalidation
  private readonly tableDependencies: Record<string, string[]> = {
    estimates: ["estimate_services", "measurements", "facade_analyses"],
    estimate_services: ["estimates"],
    facade_analyses: ["facade_analysis_images", "estimates"],
    profiles: ["estimates", "facade_analyses"],
    analytics_events: [], // No dependencies
  };

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      ttl: 300000, // 5 minutes default
      maxSize: 1000,
      enableMetrics: true,
      compressionThreshold: 10240, // 10KB
      ...config,
    };

    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0,
      compressions: 0,
      totalSize: 0,
      averageResponseTime: 0,
    };

    // Initialize storage if available
    if (typeof window !== "undefined") {
      this.localStorage = window.localStorage;
      this.sessionStorage = window.sessionStorage;
    }

    // Start cleanup interval
    this.startCleanupInterval();
  }

  /**
   * Generate consistent cache key from query signature
   */
  private generateCacheKey(signature: QuerySignature): string {
    const normalized = {
      ...signature,
      filters: signature.filters
        ? this.normalizeFilters(signature.filters)
        : undefined,
      columns: signature.columns?.sort(),
      orderBy: signature.orderBy?.sort(),
    };

    return `sb_${btoa(JSON.stringify(normalized)).replace(/[+/=]/g, "")}`;
  }

  /**
   * Normalize filters for consistent cache keys
   */
  private normalizeFilters(filters: Record<string, any>): Record<string, any> {
    const normalized: Record<string, any> = {};

    Object.keys(filters)
      .sort()
      .forEach((key) => {
        const value = filters[key];
        if (Array.isArray(value)) {
          normalized[key] = [...value].sort();
        } else if (typeof value === "object" && value !== null) {
          normalized[key] = this.normalizeFilters(value);
        } else {
          normalized[key] = value;
        }
      });

    return normalized;
  }

  /**
   * Get from multi-tier cache
   */
  async get<T>(key: string): Promise<T | null> {
    const startTime = Date.now();

    try {
      // 1. Check memory cache first (fastest)
      const memoryEntry = this.memory.get(key);
      if (memoryEntry && !this.isExpired(memoryEntry)) {
        memoryEntry.hitCount++;
        this.updateMetrics("hit", Date.now() - startTime);
        return this.deserializeData<T>(
          memoryEntry.data,
          memoryEntry.compressed,
        );
      }

      // 2. Check session storage (browser session)
      if (this.sessionStorage) {
        const sessionData = this.sessionStorage.getItem(`sb_cache_${key}`);
        if (sessionData) {
          const entry: CacheEntry = JSON.parse(sessionData);
          if (!this.isExpired(entry)) {
            // Promote to memory cache
            this.memory.set(key, entry);
            this.updateMetrics("hit", Date.now() - startTime);
            return this.deserializeData<T>(entry.data, entry.compressed);
          } else {
            this.sessionStorage.removeItem(`sb_cache_${key}`);
          }
        }
      }

      // 3. Check local storage (persistent)
      if (this.localStorage) {
        const localData = this.localStorage.getItem(`sb_cache_${key}`);
        if (localData) {
          const entry: CacheEntry = JSON.parse(localData);
          if (!this.isExpired(entry)) {
            // Promote to higher tiers
            this.memory.set(key, entry);
            if (this.sessionStorage) {
              this.sessionStorage.setItem(`sb_cache_${key}`, localData);
            }
            this.updateMetrics("hit", Date.now() - startTime);
            return this.deserializeData<T>(entry.data, entry.compressed);
          } else {
            this.localStorage.removeItem(`sb_cache_${key}`);
          }
        }
      }

      this.updateMetrics("miss", Date.now() - startTime);
      return null;
    } catch (error) {
      console.warn("Cache get error:", error);
      this.updateMetrics("miss", Date.now() - startTime);
      return null;
    }
  }

  /**
   * Set to multi-tier cache with intelligent storage
   */
  async set<T>(
    key: string,
    data: T,
    options: {
      ttl?: number;
      tags?: string[];
      dependencies?: string[];
    } = {},
  ): Promise<void> {
    const ttl = options.ttl || this.config.ttl;
    const serializedData = JSON.stringify(data);
    const size = new Blob([serializedData]).size;
    const shouldCompress = size > this.config.compressionThreshold;

    let finalData = serializedData;
    let compressed = false;

    // Compress large entries
    if (shouldCompress) {
      try {
        finalData = await this.compressData(serializedData);
        compressed = true;
        if (this.config.enableMetrics) {
          this.metrics.compressions++;
        }
      } catch (error) {
        console.warn("Compression failed:", error);
      }
    }

    const entry: CacheEntry<string> = {
      data: finalData,
      timestamp: Date.now(),
      ttl,
      hitCount: 0,
      size,
      compressed,
      tags: options.tags || [],
      dependencies: options.dependencies || [],
    };

    // Store in memory (always)
    this.memory.set(key, entry);

    // Store in appropriate tiers based on size and usage patterns
    const serializedEntry = JSON.stringify(entry);

    try {
      // Session storage for medium-term data
      if (this.sessionStorage && size < 1024 * 100) {
        // < 100KB
        this.sessionStorage.setItem(`sb_cache_${key}`, serializedEntry);
      }

      // Local storage for long-term cacheable data
      if (this.localStorage && ttl > 60000 && size < 1024 * 50) {
        // > 1min TTL and < 50KB
        this.localStorage.setItem(`sb_cache_${key}`, serializedEntry);
      }
    } catch (error) {
      // Storage quota exceeded - implement LRU eviction
      this.handleStorageQuotaExceeded(key, serializedEntry);
    }

    // Enforce memory cache size limit
    this.enforceMemoryCacheLimit();

    if (this.config.enableMetrics) {
      this.metrics.sets++;
      this.metrics.totalSize += size;
    }
  }

  /**
   * Cached Supabase query wrapper
   */
  async cachedQuery<T>(
    client: SupabaseClient<Database>,
    signature: QuerySignature,
    options: {
      ttl?: number;
      tags?: string[];
      bypassCache?: boolean;
    } = {},
  ): Promise<T> {
    if (options.bypassCache) {
      return this.executeQuery<T>(client, signature);
    }

    const cacheKey = this.generateCacheKey(signature);

    // Try cache first
    const cachedResult = await this.get<T>(cacheKey);
    if (cachedResult !== null) {
      return cachedResult;
    }

    // Execute query
    const result = await this.executeQuery<T>(client, signature);

    // Cache result with table-based dependencies
    const dependencies = this.getDependenciesForTable(signature.table);
    await this.set(cacheKey, result, {
      ttl: options.ttl,
      tags: options.tags,
      dependencies,
    });

    return result;
  }

  /**
   * Execute the actual Supabase query
   */
  private async executeQuery<T>(
    client: SupabaseClient<Database>,
    signature: QuerySignature,
  ): Promise<T> {
    const { table, operation, filters, columns, orderBy, limit, offset } =
      signature;

    try {
      let query: any;

      switch (operation) {
        case "select":
          query = client.from(table).select(columns?.join(",") || "*");

          // Apply filters
          if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
              if (Array.isArray(value)) {
                query = query.in(key, value);
              } else if (typeof value === "object" && value.operator) {
                // Support for complex operators: { operator: 'gte', value: 100 }
                query = query[value.operator](key, value.value);
              } else {
                query = query.eq(key, value);
              }
            });
          }

          // Apply ordering
          if (orderBy) {
            orderBy.forEach((order) => {
              const [column, direction] = order.split(":");
              query = query.order(column, { ascending: direction !== "desc" });
            });
          }

          // Apply pagination
          if (limit) query = query.limit(limit);
          if (offset) query = query.range(offset, offset + (limit || 50) - 1);

          break;

        case "rpc":
          query = client.rpc(table, filters || {});
          break;

        default:
          throw new DatabaseError(`Unsupported cache operation: ${operation}`);
      }

      const { data, error } = await query;

      if (error) {
        throw new DatabaseError(
          `Query failed: ${error.message}`,
          operation,
          table as any,
        );
      }

      return data as T;
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError(
        `Query execution failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        operation,
        table as any,
      );
    }
  }

  /**
   * Invalidate cache entries by table or tags
   */
  async invalidate(options: {
    table?: string;
    tags?: string[];
    pattern?: string;
  }): Promise<void> {
    const keysToInvalidate: string[] = [];

    // Find keys to invalidate
    for (const [key, entry] of this.memory.entries()) {
      let shouldInvalidate = false;

      // Invalidate by table dependencies
      if (options.table && entry.dependencies.includes(options.table)) {
        shouldInvalidate = true;
      }

      // Invalidate by tags
      if (
        options.tags &&
        entry.tags.some((tag) => options.tags!.includes(tag))
      ) {
        shouldInvalidate = true;
      }

      // Invalidate by pattern
      if (options.pattern && key.includes(options.pattern)) {
        shouldInvalidate = true;
      }

      if (shouldInvalidate) {
        keysToInvalidate.push(key);
      }
    }

    // Remove from all cache tiers
    keysToInvalidate.forEach((key) => {
      this.memory.delete(key);
      if (this.sessionStorage) {
        this.sessionStorage.removeItem(`sb_cache_${key}`);
      }
      if (this.localStorage) {
        this.localStorage.removeItem(`sb_cache_${key}`);
      }
    });

    console.log(`Invalidated ${keysToInvalidate.length} cache entries`);
  }

  /**
   * Get cache metrics
   */
  getMetrics(): CacheMetrics & {
    hitRate: number;
    memoryUsage: number;
    entryCount: number;
  } {
    const totalRequests = this.metrics.hits + this.metrics.misses;
    const hitRate =
      totalRequests > 0 ? (this.metrics.hits / totalRequests) * 100 : 0;

    return {
      ...this.metrics,
      hitRate: Math.round(hitRate * 100) / 100,
      memoryUsage: this.memory.size,
      entryCount: this.memory.size,
    };
  }

  /**
   * Clear all cache data
   */
  async clear(): Promise<void> {
    this.memory.clear();

    if (this.sessionStorage) {
      Object.keys(this.sessionStorage)
        .filter((key) => key.startsWith("sb_cache_"))
        .forEach((key) => this.sessionStorage!.removeItem(key));
    }

    if (this.localStorage) {
      Object.keys(this.localStorage)
        .filter((key) => key.startsWith("sb_cache_"))
        .forEach((key) => this.localStorage!.removeItem(key));
    }

    this.resetMetrics();
  }

  // Private helper methods
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() > entry.timestamp + entry.ttl;
  }

  private getDependenciesForTable(table: string): string[] {
    return [table, ...(this.tableDependencies[table] || [])];
  }

  private updateMetrics(type: "hit" | "miss", responseTime: number): void {
    if (!this.config.enableMetrics) return;

    if (type === "hit") {
      this.metrics.hits++;
    } else {
      this.metrics.misses++;
    }

    // Update average response time (exponential moving average)
    const alpha = 0.1;
    this.metrics.averageResponseTime =
      this.metrics.averageResponseTime * (1 - alpha) + responseTime * alpha;
  }

  private enforceMemoryCacheLimit(): void {
    if (this.memory.size <= this.config.maxSize) return;

    // LRU eviction - remove least recently used entries
    const entries = Array.from(this.memory.entries())
      .sort((a, b) => a[1].hitCount - b[1].hitCount)
      .slice(0, Math.floor(this.config.maxSize * 0.1)); // Remove 10% of entries

    entries.forEach(([key]) => {
      this.memory.delete(key);
      if (this.config.enableMetrics) {
        this.metrics.evictions++;
      }
    });
  }

  private handleStorageQuotaExceeded(key: string, data: string): void {
    // Try to free space by removing old entries
    const storage = this.localStorage || this.sessionStorage;
    if (!storage) return;

    const entries: Array<[string, CacheEntry]> = [];

    for (let i = 0; i < storage.length; i++) {
      const storageKey = storage.key(i);
      if (storageKey?.startsWith("sb_cache_")) {
        try {
          const entry = JSON.parse(storage.getItem(storageKey)!);
          entries.push([storageKey, entry]);
        } catch {
          storage.removeItem(storageKey);
        }
      }
    }

    // Remove expired and least used entries
    entries
      .filter(([_, entry]) => this.isExpired(entry) || entry.hitCount === 0)
      .slice(0, 10) // Remove up to 10 entries
      .forEach(([storageKey]) => storage.removeItem(storageKey));

    // Retry storing
    try {
      storage.setItem(`sb_cache_${key}`, data);
    } catch {
      console.warn("Failed to store in cache after cleanup");
    }
  }

  private async compressData(data: string): Promise<string> {
    // Simple compression using built-in compression
    if (typeof CompressionStream !== "undefined") {
      const stream = new CompressionStream("gzip");
      const writer = stream.writable.getWriter();
      const reader = stream.readable.getReader();

      writer.write(new TextEncoder().encode(data));
      writer.close();

      const chunks: Uint8Array[] = [];
      let result;

      while (!(result = await reader.read()).done) {
        chunks.push(result.value);
      }

      const compressed = new Uint8Array(
        chunks.reduce((acc, chunk) => acc + chunk.length, 0),
      );
      let offset = 0;
      for (const chunk of chunks) {
        compressed.set(chunk, offset);
        offset += chunk.length;
      }

      return btoa(String.fromCharCode(...compressed));
    }

    // Fallback: no compression
    return data;
  }

  private async deserializeData<T>(
    data: string,
    compressed: boolean,
  ): Promise<T> {
    let finalData = data;

    if (compressed && typeof DecompressionStream !== "undefined") {
      try {
        const compressed_data = Uint8Array.from(atob(data), (c) =>
          c.charCodeAt(0),
        );
        const stream = new DecompressionStream("gzip");
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();

        writer.write(compressed_data);
        writer.close();

        const chunks: Uint8Array[] = [];
        let result;

        while (!(result = await reader.read()).done) {
          chunks.push(result.value);
        }

        const decompressed = new Uint8Array(
          chunks.reduce((acc, chunk) => acc + chunk.length, 0),
        );
        let offset = 0;
        for (const chunk of chunks) {
          decompressed.set(chunk, offset);
          offset += chunk.length;
        }

        finalData = new TextDecoder().decode(decompressed);
      } catch (error) {
        console.warn("Decompression failed:", error);
      }
    }

    return JSON.parse(finalData);
  }

  private startCleanupInterval(): void {
    // Run cleanup every 5 minutes
    setInterval(() => {
      const now = Date.now();
      const expiredKeys: string[] = [];

      for (const [key, entry] of this.memory.entries()) {
        if (this.isExpired(entry)) {
          expiredKeys.push(key);
        }
      }

      expiredKeys.forEach((key) => this.memory.delete(key));

      if (expiredKeys.length > 0) {
        console.log(`Cleaned up ${expiredKeys.length} expired cache entries`);
      }
    }, 300000); // 5 minutes
  }

  private resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0,
      compressions: 0,
      totalSize: 0,
      averageResponseTime: 0,
    };
  }
}

// Singleton instance
let cacheLayerInstance: SupabaseCacheLayer | null = null;

/**
 * Get singleton cache layer instance
 */
export function getSupabaseCacheLayer(
  config?: Partial<CacheConfig>,
): SupabaseCacheLayer {
  if (!cacheLayerInstance) {
    cacheLayerInstance = new SupabaseCacheLayer(config);
  }
  return cacheLayerInstance;
}

/**
 * Convenient wrapper for cached Supabase operations
 */
export async function withCache<T>(
  client: SupabaseClient<Database>,
  table: keyof Database["public"]["Tables"],
  operation: "select",
  options: {
    filters?: Record<string, any>;
    columns?: string[];
    orderBy?: string[];
    limit?: number;
    offset?: number;
    ttl?: number;
    tags?: string[];
    bypassCache?: boolean;
  } = {},
): Promise<T> {
  const cache = getSupabaseCacheLayer();

  const signature: QuerySignature = {
    table,
    operation,
    filters: options.filters,
    columns: options.columns,
    orderBy: options.orderBy,
    limit: options.limit,
    offset: options.offset,
  };

  return cache.cachedQuery<T>(client, signature, {
    ttl: options.ttl,
    tags: options.tags,
    bypassCache: options.bypassCache,
  });
}

export default SupabaseCacheLayer;
