import crypto from "crypto";
import { getAIConfig } from "./ai-config";

// Cache entry interface
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  hits: number;
  compressed: boolean;
}

// Cache statistics interface
interface CacheStats {
  totalEntries: number;
  hitRate: number;
  totalHits: number;
  totalMisses: number;
  memoryUsage: number;
  oldestEntry: number;
  newestEntry: number;
}

// Simple in-memory cache implementation
export class AICache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private stats = {
    hits: 0,
    misses: 0,
  };

  constructor(
    private maxSize: number = 1000,
    private defaultTtl: number = 3600,
  ) {}

  // Generate cache key from input data
  private generateKey(prefix: string, data: unknown): string {
    const serialized = JSON.stringify(data, (key, value) => {
      if (typeof value === "object" && value !== null) {
        return Object.keys(value)
          .sort()
          .reduce((sorted: Record<string, unknown>, k) => {
            sorted[k] = (value as Record<string, unknown>)[k];
            return sorted;
          }, {});
      }
      return value;
    });
    const hash = crypto.createHash("sha256").update(serialized).digest("hex");
    return `${prefix}:${hash.substring(0, 16)}`;
  }

  // Compress data if enabled
  private compress(data: unknown): { data: unknown; compressed: boolean } {
    const cacheConfig = getAIConfig().getCacheConfig();

    if (!cacheConfig.compression) {
      return { data, compressed: false };
    }

    try {
      const serialized = JSON.stringify(data);
      // Simple compression simulation (in real implementation, use zlib)
      const compressed = Buffer.from(serialized).toString("base64");
      return { data: compressed, compressed: true };
    } catch {
      return { data, compressed: false };
    }
  }

  // Decompress data if needed
  private decompress(entry: CacheEntry<unknown>): unknown {
    if (!entry.compressed) {
      return entry.data;
    }

    try {
      const decompressed = Buffer.from(entry.data, "base64").toString("utf-8");
      return JSON.parse(decompressed);
    } catch {
      return entry.data;
    }
  }

  // Set cache entry
  set<T>(prefix: string, key: unknown, value: T, ttl?: number): void {
    const cacheConfig = getAIConfig().getCacheConfig();

    if (!cacheConfig.enabled) {
      return;
    }

    const cacheKey = this.generateKey(cacheConfig.keyPrefix + prefix, key);
    const now = Date.now();
    const timeToLive = (ttl || this.defaultTtl) * 1000;
    const { data, compressed } = this.compress(value);

    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(cacheKey, {
      data,
      timestamp: now,
      expiresAt: now + timeToLive,
      hits: 0,
      compressed,
    });
  }

  // Get cache entry
  get<T>(prefix: string, key: unknown): T | null {
    const cacheConfig = getAIConfig().getCacheConfig();

    if (!cacheConfig.enabled) {
      return null;
    }

    const cacheKey = this.generateKey(cacheConfig.keyPrefix + prefix, key);
    const entry = this.cache.get(cacheKey);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if entry has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(cacheKey);
      this.stats.misses++;
      return null;
    }

    // Update hit count and stats
    entry.hits++;
    this.stats.hits++;

    return this.decompress(entry);
  }

  // Check if key exists and is valid
  has(prefix: string, key: unknown): boolean {
    return this.get(prefix, key) !== null;
  }

  // Delete cache entry
  delete(prefix: string, key: unknown): boolean {
    const cacheConfig = getAIConfig().getCacheConfig();
    const cacheKey = this.generateKey(cacheConfig.keyPrefix + prefix, key);
    return this.cache.delete(cacheKey);
  }

  // Clear all cache entries
  clear(): void {
    this.cache.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;
  }

  // Clear expired entries
  clearExpired(): number {
    const now = Date.now();
    let cleared = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleared++;
      }
    }

    return cleared;
  }

  // Evict oldest entries
  private evictOldest(count: number = 1): void {
    const entries = Array.from(this.cache.entries()).sort(
      ([, a], [, b]) => a.timestamp - b.timestamp,
    );

    for (let i = 0; i < Math.min(count, entries.length); i++) {
      this.cache.delete(entries[i][0]);
    }
  }

  // Get cache statistics
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const totalRequests = this.stats.hits + this.stats.misses;

    return {
      totalEntries: this.cache.size,
      hitRate: totalRequests > 0 ? this.stats.hits / totalRequests : 0,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      memoryUsage: this.estimateMemoryUsage(),
      oldestEntry:
        entries.length > 0 ? Math.min(...entries.map((e) => e.timestamp)) : 0,
      newestEntry:
        entries.length > 0 ? Math.max(...entries.map((e) => e.timestamp)) : 0,
    };
  }

  // Estimate memory usage
  private estimateMemoryUsage(): number {
    let totalSize = 0;

    for (const [key, entry] of this.cache.entries()) {
      totalSize += key.length * 2; // UTF-16 characters
      totalSize += JSON.stringify(entry).length * 2;
    }

    return totalSize;
  }

  // Get entries by prefix
  getEntriesByPrefix(prefix: string): Array<{
    key: string;
    value: unknown;
    metadata: { timestamp: number; hits: number; expiresAt: number };
  }> {
    const cacheConfig = getAIConfig().getCacheConfig();
    const fullPrefix = cacheConfig.keyPrefix + prefix;
    const results: Array<{
      key: string;
      value: unknown;
      metadata: { timestamp: number; hits: number; expiresAt: number };
    }> = [];

    for (const [key, entry] of this.cache.entries()) {
      if (key.startsWith(fullPrefix)) {
        results.push({
          key: key.replace(fullPrefix + ":", ""),
          value: this.decompress(entry),
          metadata: {
            timestamp: entry.timestamp,
            expiresAt: entry.expiresAt,
            hits: entry.hits,
            compressed: entry.compressed,
          },
        });
      }
    }

    return results;
  }

  // Warm up cache with common operations
  async warmUp(
    operations: Array<{
      prefix: string;
      key: unknown;
      generator: () => Promise<unknown>;
    }>,
  ): Promise<void> {
    console.info(`Warming up cache with ${operations.length} operations...`);

    const promises = operations.map(async ({ prefix, key, generator }) => {
      try {
        if (!this.has(prefix, key)) {
          const result = await generator();
          this.set(prefix, key, result);
        }
      } catch (error) {
        console.warn(`Failed to warm up cache for ${prefix}:`, error);
      }
    });

    await Promise.allSettled(promises);
    console.info("Cache warm-up completed");
  }
}

// Cache wrapper for AI operations
export class AICacheWrapper {
  constructor(private cache: AICache) {}

  // Cached extraction operation
  async cachedExtraction<T>(
    extractionType: string,
    content: string,
    extractor: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    const cacheKey = {
      type: extractionType,
      content: content.substring(0, 1000),
    }; // Truncate for key

    let result = this.cache.get<T>("extraction", cacheKey);
    if (result !== null) {
      return result;
    }

    result = await extractor();
    this.cache.set("extraction", cacheKey, result, ttl);
    return result;
  }

  // Cached photo analysis
  async cachedPhotoAnalysis<T>(
    imageUrl: string,
    analysisType: string,
    analyzer: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    const cacheKey = { url: imageUrl, type: analysisType };

    let result = this.cache.get<T>("photo_analysis", cacheKey);
    if (result !== null) {
      return result;
    }

    result = await analyzer();
    this.cache.set("photo_analysis", cacheKey, result, ttl);
    return result;
  }

  // Cached quote generation
  async cachedQuoteGeneration<T>(
    extractedData: unknown,
    options: unknown,
    generator: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    const cacheKey = {
      services: extractedData.requirements?.services,
      buildingType: extractedData.requirements?.buildingType,
      buildingSize: extractedData.requirements?.buildingSize,
      options,
    };

    let result = this.cache.get<T>("quote_generation", cacheKey);
    if (result !== null) {
      return result;
    }

    result = await generator();
    this.cache.set("quote_generation", cacheKey, result, ttl);
    return result;
  }

  // Cached competitive analysis
  async cachedCompetitiveAnalysis<T>(
    content: string,
    analyzer: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    const contentHash = crypto
      .createHash("sha256")
      .update(content)
      .digest("hex")
      .substring(0, 16);
    const cacheKey = { contentHash };

    let result = this.cache.get<T>("competitive_analysis", cacheKey);
    if (result !== null) {
      return result;
    }

    result = await analyzer();
    this.cache.set("competitive_analysis", cacheKey, result, ttl);
    return result;
  }

  // Get cache instance for direct access
  getCache(): AICache {
    return this.cache;
  }
}

// Global cache instances
const cacheConfig = getAIConfig().getCacheConfig();
export const aiCache = new AICache(cacheConfig.maxSize, cacheConfig.ttl);
export const aiCacheWrapper = new AICacheWrapper(aiCache);

// Cache maintenance function
export async function maintainCache(): Promise<void> {
  const cleared = aiCache.clearExpired();
  const stats = aiCache.getStats();

  console.info(
    `Cache maintenance: cleared ${cleared} expired entries, ${stats.totalEntries} entries remaining`,
  );

  // Log cache statistics periodically
  if (stats.totalEntries > 0) {
    console.info(
      `Cache stats: ${(stats.hitRate * 100).toFixed(2)}% hit rate, ${stats.memoryUsage} bytes used`,
    );
  }
}

// Set up periodic cache maintenance (every 15 minutes)
if (typeof setInterval !== "undefined") {
  setInterval(maintainCache, 15 * 60 * 1000);
}
