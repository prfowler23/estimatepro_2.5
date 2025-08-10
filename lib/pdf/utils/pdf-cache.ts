import { PDFProcessingResult, PDFMetadata, PDFMeasurement } from "../types";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  size: number;
  hits: number;
}

interface CacheOptions {
  maxSize?: number; // Maximum cache size in bytes
  maxAge?: number; // Maximum age in milliseconds
  maxEntries?: number; // Maximum number of entries
}

/**
 * PDFCache - Intelligent caching system for PDF processing results
 * Implements LRU eviction with size and time-based expiration
 */
export class PDFCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private readonly maxSize: number;
  private readonly maxAge: number;
  private readonly maxEntries: number;
  private currentSize = 0;
  private hits = 0;
  private misses = 0;

  constructor(options: CacheOptions = {}) {
    this.maxSize = options.maxSize || 50 * 1024 * 1024; // 50MB default
    this.maxAge = options.maxAge || 3600 * 1000; // 1 hour default
    this.maxEntries = options.maxEntries || 100;
  }

  /**
   * Generate cache key from PDF metadata
   */
  static generateKey(
    fileHash: string,
    operation: string,
    params?: Record<string, any>,
  ): string {
    const paramStr = params ? JSON.stringify(params) : "";
    return `${fileHash}:${operation}:${paramStr}`;
  }

  /**
   * Calculate size of data in bytes
   */
  private calculateSize(data: T): number {
    try {
      return JSON.stringify(data).length * 2; // Approximate size in bytes
    } catch {
      return 1024; // Default size if serialization fails
    }
  }

  /**
   * Get item from cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.remove(key);
      this.misses++;
      return null;
    }

    // Update hit count and move to end (LRU)
    entry.hits++;
    this.cache.delete(key);
    this.cache.set(key, entry);

    this.hits++;
    return entry.data;
  }

  /**
   * Set item in cache
   */
  set(key: string, data: T): void {
    // Remove existing entry if present
    if (this.cache.has(key)) {
      this.remove(key);
    }

    const size = this.calculateSize(data);

    // Check if item is too large
    if (size > this.maxSize) {
      return; // Don't cache items larger than max size
    }

    // Evict items if necessary
    while (
      this.currentSize + size > this.maxSize ||
      this.cache.size >= this.maxEntries
    ) {
      this.evictOldest();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      size,
      hits: 0,
    };

    this.cache.set(key, entry);
    this.currentSize += size;
  }

  /**
   * Remove item from cache
   */
  remove(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    this.cache.delete(key);
    this.currentSize -= entry.size;
    return true;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.currentSize = 0;
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Evict oldest entry (LRU)
   */
  private evictOldest(): void {
    const firstKey = this.cache.keys().next().value;
    if (firstKey) {
      this.remove(firstKey);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    entries: number;
    size: number;
    hits: number;
    misses: number;
    hitRate: number;
  } {
    const total = this.hits + this.misses;
    return {
      entries: this.cache.size,
      size: this.currentSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }

  /**
   * Prune expired entries
   */
  prune(): number {
    const now = Date.now();
    let pruned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.maxAge) {
        this.remove(key);
        pruned++;
      }
    }

    return pruned;
  }

  /**
   * Get all keys in cache
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check if expired
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.remove(key);
      return false;
    }

    return true;
  }
}

/**
 * Specialized cache for PDF processing results
 */
export class PDFResultCache extends PDFCache<PDFProcessingResult> {
  /**
   * Cache PDF processing result with smart key generation
   */
  cacheResult(
    fileHash: string,
    result: PDFProcessingResult,
    options?: {
      extractImages?: boolean;
      performOCR?: boolean;
      detectMeasurements?: boolean;
    },
  ): void {
    const key = PDFCache.generateKey(fileHash, "process", options);
    this.set(key, result);
  }

  /**
   * Get cached PDF processing result
   */
  getCachedResult(
    fileHash: string,
    options?: {
      extractImages?: boolean;
      performOCR?: boolean;
      detectMeasurements?: boolean;
    },
  ): PDFProcessingResult | null {
    const key = PDFCache.generateKey(fileHash, "process", options);
    return this.get(key);
  }
}

/**
 * Cache for PDF text extraction
 */
export class PDFTextCache extends PDFCache<string> {
  /**
   * Cache extracted text
   */
  cacheText(
    fileHash: string,
    pageRange: { start: number; end: number },
    text: string,
  ): void {
    const key = PDFCache.generateKey(fileHash, "text", pageRange);
    this.set(key, text);
  }

  /**
   * Get cached text
   */
  getCachedText(
    fileHash: string,
    pageRange: { start: number; end: number },
  ): string | null {
    const key = PDFCache.generateKey(fileHash, "text", pageRange);
    return this.get(key);
  }
}

/**
 * Cache for PDF measurements
 */
export class PDFMeasurementCache extends PDFCache<PDFMeasurement[]> {
  /**
   * Cache measurements
   */
  cacheMeasurements(fileHash: string, measurements: PDFMeasurement[]): void {
    const key = PDFCache.generateKey(fileHash, "measurements");
    this.set(key, measurements);
  }

  /**
   * Get cached measurements
   */
  getCachedMeasurements(fileHash: string): PDFMeasurement[] | null {
    const key = PDFCache.generateKey(fileHash, "measurements");
    return this.get(key);
  }
}

/**
 * Global cache manager
 */
export class PDFCacheManager {
  private static instance: PDFCacheManager;
  private resultCache: PDFResultCache;
  private textCache: PDFTextCache;
  private measurementCache: PDFMeasurementCache;
  private pruneInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.resultCache = new PDFResultCache({ maxSize: 30 * 1024 * 1024 });
    this.textCache = new PDFTextCache({ maxSize: 10 * 1024 * 1024 });
    this.measurementCache = new PDFMeasurementCache({
      maxSize: 5 * 1024 * 1024,
    });

    // Start periodic pruning
    this.startPruning();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): PDFCacheManager {
    if (!PDFCacheManager.instance) {
      PDFCacheManager.instance = new PDFCacheManager();
    }
    return PDFCacheManager.instance;
  }

  /**
   * Get result cache
   */
  getResultCache(): PDFResultCache {
    return this.resultCache;
  }

  /**
   * Get text cache
   */
  getTextCache(): PDFTextCache {
    return this.textCache;
  }

  /**
   * Get measurement cache
   */
  getMeasurementCache(): PDFMeasurementCache {
    return this.measurementCache;
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    this.resultCache.clear();
    this.textCache.clear();
    this.measurementCache.clear();
  }

  /**
   * Get combined statistics
   */
  getStats(): {
    result: ReturnType<PDFCache["getStats"]>;
    text: ReturnType<PDFCache["getStats"]>;
    measurement: ReturnType<PDFCache["getStats"]>;
    total: {
      entries: number;
      size: number;
      hitRate: number;
    };
  } {
    const resultStats = this.resultCache.getStats();
    const textStats = this.textCache.getStats();
    const measurementStats = this.measurementCache.getStats();

    const totalHits = resultStats.hits + textStats.hits + measurementStats.hits;
    const totalMisses =
      resultStats.misses + textStats.misses + measurementStats.misses;
    const total = totalHits + totalMisses;

    return {
      result: resultStats,
      text: textStats,
      measurement: measurementStats,
      total: {
        entries:
          resultStats.entries + textStats.entries + measurementStats.entries,
        size: resultStats.size + textStats.size + measurementStats.size,
        hitRate: total > 0 ? totalHits / total : 0,
      },
    };
  }

  /**
   * Start periodic cache pruning
   */
  private startPruning(): void {
    // Prune every 5 minutes
    this.pruneInterval = setInterval(
      () => {
        this.resultCache.prune();
        this.textCache.prune();
        this.measurementCache.prune();
      },
      5 * 60 * 1000,
    );
  }

  /**
   * Stop periodic pruning
   */
  stopPruning(): void {
    if (this.pruneInterval) {
      clearInterval(this.pruneInterval);
      this.pruneInterval = null;
    }
  }

  /**
   * Calculate file hash for cache key
   */
  static async calculateFileHash(buffer: ArrayBuffer): Promise<string> {
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
}
