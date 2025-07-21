// Advanced Cache Manager
// Multi-level caching system with intelligent invalidation and performance optimization

import { LRUCache } from "lru-cache";
// import { Redis } from 'ioredis'; // Optional Redis dependency - install with: npm install ioredis
import { createClient } from "@/lib/supabase/client";

// Cache configuration
export interface CacheConfig {
  enabled: boolean;
  maxSize: number;
  ttl: number;
  redisUrl?: string;
  enablePersistence: boolean;
  enableCompression: boolean;
  compressionThreshold: number;
  enableMetrics: boolean;
  metrics?: CacheMetrics;
}

// Cache metrics
export interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  size: number;
  memory: number;
  hitRate: number;
  avgResponseTime: number;
}

// Cache key patterns
export interface CacheKey {
  type:
    | "estimate"
    | "customer"
    | "ai_analysis"
    | "calculation"
    | "user_data"
    | "integration";
  id: string;
  version?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

// Cache entry
export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  version: string;
  tags: string[];
  compressed?: boolean;
  metadata?: Record<string, any>;
}

// Cache invalidation strategy
export interface InvalidationStrategy {
  pattern: string;
  tags: string[];
  dependency?: string[];
  ttl?: number;
}

// Default configuration
const DEFAULT_CONFIG: CacheConfig = {
  enabled: process.env.CACHE_ENABLED !== "false",
  maxSize: parseInt(process.env.CACHE_MAX_SIZE || "1000"),
  ttl: parseInt(process.env.CACHE_TTL || "3600") * 1000, // Convert to milliseconds
  redisUrl: process.env.REDIS_URL,
  enablePersistence: process.env.CACHE_PERSISTENCE === "true",
  enableCompression: process.env.CACHE_COMPRESSION === "true",
  compressionThreshold: parseInt(
    process.env.CACHE_COMPRESSION_THRESHOLD || "1024",
  ),
  enableMetrics: process.env.CACHE_METRICS === "true",
  metrics: {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    evictions: 0,
    size: 0,
    memory: 0,
    hitRate: 0,
    avgResponseTime: 0,
  },
};

// Advanced Cache Manager
export class CacheManager {
  private static instance: CacheManager;
  private config: CacheConfig;
  private memoryCache: LRUCache<string, CacheEntry>;
  private redisClient?: any; // Redis client (optional)
  private metrics: CacheMetrics;
  private invalidationStrategies: Map<string, InvalidationStrategy> = new Map();
  private compressionEnabled: boolean;

  private constructor(config: CacheConfig = DEFAULT_CONFIG) {
    this.config = config;
    this.metrics = { ...DEFAULT_CONFIG.metrics! };
    this.compressionEnabled = config.enableCompression;

    // Initialize memory cache
    this.memoryCache = new LRUCache<string, CacheEntry>({
      max: config.maxSize,
      ttl: config.ttl,
      dispose: (value, key) => {
        this.metrics.evictions++;
        this.updateMetrics();
      },
    });

    // Initialize Redis if configured
    if (config.redisUrl) {
      this.initializeRedis();
    }

    // Set up cache invalidation strategies
    this.setupInvalidationStrategies();
  }

  static getInstance(config?: CacheConfig): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager(config);
    }
    return CacheManager.instance;
  }

  private async initializeRedis(): Promise<void> {
    try {
      // Check if Redis is available
      try {
        const { Redis } = await import("ioredis");
        this.redisClient = new Redis(this.config.redisUrl!, {
          retryDelayOnFailover: 100,
          enableReadyCheck: true,
          maxRetriesPerRequest: 3,
        });

        this.redisClient.on("error", (error) => {
          console.error("Redis cache error:", error);
        });

        this.redisClient.on("connect", () => {
          console.log("Redis cache connected");
        });
      } catch (importError) {
        console.warn("Redis not available, falling back to memory cache only");
        this.redisClient = undefined;
      }
    } catch (error) {
      console.error("Failed to initialize Redis cache:", error);
      this.redisClient = undefined;
    }
  }

  private setupInvalidationStrategies(): void {
    // Estimate invalidation
    this.invalidationStrategies.set("estimate", {
      pattern: "estimate:*",
      tags: ["estimate", "calculation"],
      dependency: ["customer", "service"],
      ttl: 1800000, // 30 minutes
    });

    // Customer invalidation
    this.invalidationStrategies.set("customer", {
      pattern: "customer:*",
      tags: ["customer", "estimate"],
      ttl: 3600000, // 1 hour
    });

    // AI analysis invalidation
    this.invalidationStrategies.set("ai_analysis", {
      pattern: "ai:*",
      tags: ["ai", "analysis"],
      ttl: 7200000, // 2 hours
    });

    // Calculation invalidation
    this.invalidationStrategies.set("calculation", {
      pattern: "calc:*",
      tags: ["calculation", "estimate"],
      ttl: 600000, // 10 minutes
    });
  }

  // Generate cache key
  private generateKey(cacheKey: CacheKey): string {
    const parts = [cacheKey.type, cacheKey.id];
    if (cacheKey.userId) parts.push(cacheKey.userId);
    if (cacheKey.version) parts.push(cacheKey.version);
    return parts.join(":");
  }

  // Compress data if enabled
  private async compressData(data: any): Promise<string> {
    if (!this.compressionEnabled) return JSON.stringify(data);

    const jsonString = JSON.stringify(data);
    if (jsonString.length < this.config.compressionThreshold) {
      return jsonString;
    }

    // Use compression library (would need to install)
    // For now, return as-is
    return jsonString;
  }

  // Decompress data if needed
  private async decompressData(
    data: string,
    compressed: boolean = false,
  ): Promise<any> {
    if (!compressed) return JSON.parse(data);

    // Use decompression library (would need to install)
    // For now, parse as-is
    return JSON.parse(data);
  }

  // Get from cache
  async get<T>(cacheKey: CacheKey): Promise<T | null> {
    if (!this.config.enabled) return null;

    const startTime = Date.now();
    const key = this.generateKey(cacheKey);

    try {
      // Try memory cache first
      const memoryEntry = this.memoryCache.get(key);
      if (memoryEntry) {
        const data = await this.decompressData(
          typeof memoryEntry.data === "string"
            ? memoryEntry.data
            : JSON.stringify(memoryEntry.data),
          memoryEntry.compressed,
        );

        this.metrics.hits++;
        this.updateMetrics();
        this.recordResponseTime(Date.now() - startTime);
        return data;
      }

      // Try Redis cache
      if (this.redisClient) {
        const redisEntry = await this.redisClient.get(key);
        if (redisEntry) {
          const entry: CacheEntry = JSON.parse(redisEntry);
          const data = await this.decompressData(
            typeof entry.data === "string"
              ? entry.data
              : JSON.stringify(entry.data),
            entry.compressed,
          );

          // Store in memory cache for faster access
          this.memoryCache.set(key, entry);

          this.metrics.hits++;
          this.updateMetrics();
          this.recordResponseTime(Date.now() - startTime);
          return data;
        }
      }

      this.metrics.misses++;
      this.updateMetrics();
      return null;
    } catch (error) {
      console.error("Cache get error:", error);
      this.metrics.misses++;
      this.updateMetrics();
      return null;
    }
  }

  // Set in cache
  async set<T>(cacheKey: CacheKey, data: T, ttl?: number): Promise<void> {
    if (!this.config.enabled) return;

    const key = this.generateKey(cacheKey);
    const timestamp = Date.now();
    const cacheTtl = ttl || this.config.ttl;

    try {
      const compressedData = await this.compressData(data);
      const entry: CacheEntry = {
        data: compressedData,
        timestamp,
        ttl: cacheTtl,
        version: cacheKey.version || "1.0",
        tags: this.getTagsForKey(cacheKey),
        compressed:
          this.compressionEnabled &&
          compressedData.length >= this.config.compressionThreshold,
        metadata: cacheKey.metadata,
      };

      // Store in memory cache
      this.memoryCache.set(key, entry, { ttl: cacheTtl });

      // Store in Redis cache
      if (this.redisClient) {
        await this.redisClient.setex(
          key,
          Math.floor(cacheTtl / 1000),
          JSON.stringify(entry),
        );
      }

      this.metrics.sets++;
      this.updateMetrics();
    } catch (error) {
      console.error("Cache set error:", error);
    }
  }

  // Delete from cache
  async delete(cacheKey: CacheKey): Promise<void> {
    if (!this.config.enabled) return;

    const key = this.generateKey(cacheKey);

    try {
      // Delete from memory cache
      this.memoryCache.delete(key);

      // Delete from Redis cache
      if (this.redisClient) {
        await this.redisClient.del(key);
      }

      this.metrics.deletes++;
      this.updateMetrics();
    } catch (error) {
      console.error("Cache delete error:", error);
    }
  }

  // Invalidate by pattern
  async invalidateByPattern(pattern: string): Promise<void> {
    if (!this.config.enabled) return;

    try {
      // Clear matching keys from memory cache
      const memoryKeys = Array.from(this.memoryCache.keys());
      const matchingKeys = memoryKeys.filter((key) =>
        this.matchesPattern(key, pattern),
      );

      for (const key of matchingKeys) {
        this.memoryCache.delete(key);
      }

      // Clear matching keys from Redis cache
      if (this.redisClient) {
        const redisKeys = await this.redisClient.keys(pattern);
        if (redisKeys.length > 0) {
          await this.redisClient.del(...redisKeys);
        }
      }

      this.metrics.deletes += matchingKeys.length;
      this.updateMetrics();
    } catch (error) {
      console.error("Cache invalidate by pattern error:", error);
    }
  }

  // Invalidate by tags
  async invalidateByTags(tags: string[]): Promise<void> {
    if (!this.config.enabled) return;

    try {
      // Clear matching entries from memory cache
      const memoryKeys = Array.from(this.memoryCache.keys());
      const matchingKeys = memoryKeys.filter((key) => {
        const entry = this.memoryCache.get(key);
        return entry && entry.tags.some((tag) => tags.includes(tag));
      });

      for (const key of matchingKeys) {
        this.memoryCache.delete(key);
      }

      // Clear matching entries from Redis cache
      if (this.redisClient) {
        const redisKeys = await this.redisClient.keys("*");
        const matchingRedisKeys = [];

        for (const key of redisKeys) {
          const entryData = await this.redisClient.get(key);
          if (entryData) {
            const entry: CacheEntry = JSON.parse(entryData);
            if (entry.tags && entry.tags.some((tag) => tags.includes(tag))) {
              matchingRedisKeys.push(key);
            }
          }
        }

        if (matchingRedisKeys.length > 0) {
          await this.redisClient.del(...matchingRedisKeys);
        }
      }

      this.metrics.deletes += matchingKeys.length;
      this.updateMetrics();
    } catch (error) {
      console.error("Cache invalidate by tags error:", error);
    }
  }

  // Clear all cache
  async clear(): Promise<void> {
    if (!this.config.enabled) return;

    try {
      // Clear memory cache
      this.memoryCache.clear();

      // Clear Redis cache
      if (this.redisClient) {
        await this.redisClient.flushall();
      }

      this.metrics.deletes += this.metrics.size;
      this.updateMetrics();
    } catch (error) {
      console.error("Cache clear error:", error);
    }
  }

  // Get cache metrics
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  // Warm cache with frequently accessed data
  async warmCache(userId: string): Promise<void> {
    if (!this.config.enabled) return;

    try {
      const supabase = createClient();

      // Warm user estimates
      const { data: estimates } = await supabase
        .from("estimates")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(10);

      if (estimates) {
        for (const estimate of estimates) {
          await this.set(
            { type: "estimate", id: estimate.id, userId },
            estimate,
          );
        }
      }

      // Warm user customers
      const { data: customers } = await supabase
        .from("customers")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(20);

      if (customers) {
        for (const customer of customers) {
          await this.set(
            { type: "customer", id: customer.id, userId },
            customer,
          );
        }
      }
    } catch (error) {
      console.error("Cache warm error:", error);
    }
  }

  // Helper methods
  private matchesPattern(key: string, pattern: string): boolean {
    const regex = new RegExp(pattern.replace(/\*/g, ".*"));
    return regex.test(key);
  }

  private getTagsForKey(cacheKey: CacheKey): string[] {
    const strategy = this.invalidationStrategies.get(cacheKey.type);
    return strategy?.tags || [cacheKey.type];
  }

  private updateMetrics(): void {
    this.metrics.size = this.memoryCache.size;
    this.metrics.hitRate =
      this.metrics.hits / (this.metrics.hits + this.metrics.misses) || 0;
    this.metrics.memory = this.memoryCache.calculatedSize || 0;
  }

  private recordResponseTime(time: number): void {
    this.metrics.avgResponseTime = (this.metrics.avgResponseTime + time) / 2;
  }
}

// Global cache instance
export const cacheManager = CacheManager.getInstance();

// Cache decorators
export function cached<T>(
  keyGenerator: (args: any[]) => CacheKey,
  ttl?: number,
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheKey = keyGenerator(args);
      const cachedResult = await cacheManager.get<T>(cacheKey);

      if (cachedResult !== null) {
        return cachedResult;
      }

      const result = await originalMethod.apply(this, args);
      await cacheManager.set(cacheKey, result, ttl);
      return result;
    };

    return descriptor;
  };
}

// Cache-aware query helper
export async function cacheAwareQuery<T>(
  cacheKey: CacheKey,
  queryFn: () => Promise<T>,
  ttl?: number,
): Promise<T> {
  const cached = await cacheManager.get<T>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  const result = await queryFn();
  await cacheManager.set(cacheKey, result, ttl);
  return result;
}

// Cache invalidation hooks
export const cacheInvalidationHooks = {
  onEstimateChange: (estimateId: string, userId: string) => {
    cacheManager.invalidateByTags(["estimate", "calculation"]);
    cacheManager.delete({ type: "estimate", id: estimateId, userId });
  },

  onCustomerChange: (customerId: string, userId: string) => {
    cacheManager.invalidateByTags(["customer", "estimate"]);
    cacheManager.delete({ type: "customer", id: customerId, userId });
  },

  onUserDataChange: (userId: string) => {
    cacheManager.invalidateByPattern(`*:*:${userId}`);
  },
};

export default cacheManager;
