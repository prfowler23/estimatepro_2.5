// Server-side caching utilities for API endpoints
// Provides memory-based and Redis-compatible caching for improved performance

interface ServerCacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
}

class ServerCache<T> {
  private cache = new Map<string, ServerCacheEntry<T>>();
  private defaultTTL: number;
  private maxSize: number;

  constructor(defaultTTL = 10 * 60 * 1000, maxSize = 1000) {
    // 10 minutes default TTL, max 1000 entries
    this.defaultTTL = defaultTTL;
    this.maxSize = maxSize;
  }

  set(key: string, data: T, ttl?: number): void {
    // Enforce cache size limit
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    const entry: ServerCacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
      key,
    };
    this.cache.set(key, entry);
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

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

  // Evict oldest entries when cache is full
  private evictOldest(): void {
    let oldest: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldest = key;
      }
    }

    if (oldest) {
      this.cache.delete(oldest);
    }
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

  // Get cache statistics
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    entries: Array<{ key: string; age: number; ttl: number }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: now - entry.timestamp,
      ttl: entry.ttl,
    }));

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 0, // Could be tracked with hit/miss counters
      entries,
    };
  }
}

// Cache instances for different API endpoints
export const helpAnalyticsCache = new ServerCache<any>(15 * 60 * 1000, 500); // 15 minutes
export const costBreakdownCache = new ServerCache<any>(30 * 60 * 1000, 200); // 30 minutes
export const issueReportCache = new ServerCache<any>(60 * 60 * 1000, 100); // 1 hour
export const collaborationCache = new ServerCache<any>(10 * 60 * 1000, 300); // 10 minutes
export const analyticsEventCache = new ServerCache<any>(5 * 60 * 1000, 1000); // 5 minutes
export const sqlExecutionCache = new ServerCache<any>(30 * 60 * 1000, 50); // 30 minutes

// Cache key generators for new APIs
export const getServerCacheKey = {
  helpAnalytics: (workflowId: string, period?: string) =>
    `help:analytics:${workflowId}:${period || "all"}`,

  costBreakdown: (estimateId: string, format: string, options?: string) =>
    `cost:breakdown:${estimateId}:${format}:${options || "default"}`,

  issueReport: (userId: string, type?: string, status?: string) =>
    `issue:report:${userId}:${type || "all"}:${status || "all"}`,

  collaboration: (workflowId: string, days: number) =>
    `collaboration:history:${workflowId}:${days}d`,

  analyticsEvent: (userId: string, eventName?: string, days: number = 30) =>
    `analytics:event:${userId}:${eventName || "all"}:${days}d`,

  sqlExecution: (userId: string, operationType?: string, limit: number = 20) =>
    `sql:execution:${userId}:${operationType || "all"}:${limit}`,
};

// Server-side cache wrapper for API functions
export function serverCached<T extends any[], R>(
  cache: ServerCache<R>,
  keyFn: (...args: T) => string,
  ttl?: number,
) {
  return function (fn: (...args: T) => Promise<R>) {
    return async function (...args: T): Promise<R> {
      const key = keyFn(...args);

      // Check cache first
      const cached = cache.get(key);
      if (cached) {
        return cached;
      }

      // Execute function and cache result
      const result = await fn(...args);
      cache.set(key, result, ttl);
      return result;
    };
  };
}

// Cache invalidation utilities for server-side caches
export const invalidateServerCache = {
  helpAnalytics: (workflowId?: string) => {
    if (workflowId) {
      // Invalidate specific workflow
      const keys = helpAnalyticsCache.getStats().entries.map((e) => e.key);
      keys.forEach((key) => {
        if (key.includes(`help:analytics:${workflowId}`)) {
          helpAnalyticsCache.delete(key);
        }
      });
    } else {
      helpAnalyticsCache.clear();
    }
  },

  costBreakdown: (estimateId?: string) => {
    if (estimateId) {
      const keys = costBreakdownCache.getStats().entries.map((e) => e.key);
      keys.forEach((key) => {
        if (key.includes(`cost:breakdown:${estimateId}`)) {
          costBreakdownCache.delete(key);
        }
      });
    } else {
      costBreakdownCache.clear();
    }
  },

  issueReport: (userId?: string) => {
    if (userId) {
      const keys = issueReportCache.getStats().entries.map((e) => e.key);
      keys.forEach((key) => {
        if (key.includes(`issue:report:${userId}`)) {
          issueReportCache.delete(key);
        }
      });
    } else {
      issueReportCache.clear();
    }
  },

  collaboration: (workflowId?: string) => {
    if (workflowId) {
      const keys = collaborationCache.getStats().entries.map((e) => e.key);
      keys.forEach((key) => {
        if (key.includes(`collaboration:history:${workflowId}`)) {
          collaborationCache.delete(key);
        }
      });
    } else {
      collaborationCache.clear();
    }
  },

  analyticsEvent: (userId?: string) => {
    if (userId) {
      const keys = analyticsEventCache.getStats().entries.map((e) => e.key);
      keys.forEach((key) => {
        if (key.includes(`analytics:event:${userId}`)) {
          analyticsEventCache.delete(key);
        }
      });
    } else {
      analyticsEventCache.clear();
    }
  },

  sqlExecution: () => {
    sqlExecutionCache.clear();
  },

  all: () => {
    helpAnalyticsCache.clear();
    costBreakdownCache.clear();
    issueReportCache.clear();
    collaborationCache.clear();
    analyticsEventCache.clear();
    sqlExecutionCache.clear();
  },
};

// Cleanup function to run periodically on server
export function cleanupServerCaches(): void {
  helpAnalyticsCache.cleanup();
  costBreakdownCache.cleanup();
  issueReportCache.cleanup();
  collaborationCache.cleanup();
  analyticsEventCache.cleanup();
  sqlExecutionCache.cleanup();
}

// Cache warming functions
export const warmCache = {
  helpAnalytics: async (supabase: any, workflowIds: string[]) => {
    for (const workflowId of workflowIds) {
      try {
        const key = getServerCacheKey.helpAnalytics(workflowId);
        if (!helpAnalyticsCache.has(key)) {
          // Warm cache with basic analytics data
          const { data } = await supabase
            .from("help_analytics")
            .select("*")
            .eq("workflow_id", workflowId)
            .limit(100);

          helpAnalyticsCache.set(key, data || [], 15 * 60 * 1000);
        }
      } catch (error) {
        console.warn(
          `Failed to warm help analytics cache for ${workflowId}:`,
          error,
        );
      }
    }
  },

  analyticsEvents: async (supabase: any, userIds: string[]) => {
    for (const userId of userIds) {
      try {
        const key = getServerCacheKey.analyticsEvent(userId);
        if (!analyticsEventCache.has(key)) {
          // Warm cache with recent events
          const { data } = await supabase
            .from("analytics_events")
            .select("*")
            .eq("user_id", userId)
            .gte(
              "timestamp",
              new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            )
            .limit(200);

          analyticsEventCache.set(key, data || [], 5 * 60 * 1000);
        }
      } catch (error) {
        console.warn(
          `Failed to warm analytics events cache for ${userId}:`,
          error,
        );
      }
    }
  },
};

// Rate limiting support
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private limits = new Map<string, RateLimitEntry>();
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs = 60 * 1000, maxRequests = 100) {
    // Default: 100 requests per minute
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const entry = this.limits.get(identifier);

    if (!entry || now > entry.resetTime) {
      // New window or expired window
      this.limits.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return true;
    }

    if (entry.count >= this.maxRequests) {
      return false;
    }

    entry.count++;
    return true;
  }

  getRemainingRequests(identifier: string): number {
    const entry = this.limits.get(identifier);
    if (!entry || Date.now() > entry.resetTime) {
      return this.maxRequests;
    }
    return Math.max(0, this.maxRequests - entry.count);
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetTime) {
        this.limits.delete(key);
      }
    }
  }
}

// Rate limiters for different endpoints
export const rateLimiters = {
  helpAnalytics: new RateLimiter(60 * 1000, 60), // 60 requests per minute
  costBreakdown: new RateLimiter(60 * 1000, 20), // 20 requests per minute
  issueReport: new RateLimiter(60 * 1000, 10), // 10 requests per minute
  collaboration: new RateLimiter(60 * 1000, 30), // 30 requests per minute
  analyticsEvent: new RateLimiter(60 * 1000, 200), // 200 requests per minute
  sqlExecution: new RateLimiter(60 * 1000, 5), // 5 requests per minute
};

// Cleanup interval for server-side caches and rate limiters
if (typeof global !== "undefined") {
  // Server-side cleanup every 5 minutes
  setInterval(
    () => {
      cleanupServerCaches();
      Object.values(rateLimiters).forEach((limiter) => limiter.cleanup());
    },
    5 * 60 * 1000,
  );
}
