// Client-side caching utilities for better performance

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class SimpleCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private defaultTTL: number;

  constructor(defaultTTL = 5 * 60 * 1000) { // 5 minutes default TTL
    this.defaultTTL = defaultTTL;
  }

  set(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
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

  // Clean expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// Different cache instances for different data types
export const estimatesCache = new SimpleCache<any>(10 * 60 * 1000); // 10 minutes
export const servicesCache = new SimpleCache<any>(30 * 60 * 1000); // 30 minutes
export const calculationsCache = new SimpleCache<any>(60 * 60 * 1000); // 1 hour
export const analyticsCache = new SimpleCache<any>(5 * 60 * 1000); // 5 minutes
export const searchCache = new SimpleCache<any>(2 * 60 * 1000); // 2 minutes

// Cache keys generator
export const getCacheKey = {
  estimate: (id: string) => `estimate:${id}`,
  estimatesList: (limit: number, offset: number, userId?: string) => 
    `estimates:${userId || 'all'}:${limit}:${offset}`,
  estimateStats: (userId?: string) => `stats:${userId || 'all'}`,
  search: (query: string, userId?: string) => `search:${userId || 'all'}:${query}`,
  service: (serviceId: string) => `service:${serviceId}`,
  calculation: (serviceType: string, params: string) => `calc:${serviceType}:${params}`,
  analytics: (type: string, params?: string) => `analytics:${type}:${params || ''}`,
};

// Cache wrapper for async functions
export function cached<T extends any[], R>(
  cache: SimpleCache<R>,
  keyFn: (...args: T) => string,
  ttl?: number
) {
  return function(fn: (...args: T) => Promise<R>) {
    return async function(...args: T): Promise<R> {
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

// Browser storage cache for persistence
export class PersistentCache<T> {
  private storageKey: string;
  private ttl: number;

  constructor(storageKey: string, ttl = 24 * 60 * 60 * 1000) { // 24 hours default
    this.storageKey = storageKey;
    this.ttl = ttl;
  }

  set(key: string, data: T): void {
    try {
      const entry = {
        data,
        timestamp: Date.now(),
        ttl: this.ttl
      };
      
      const stored = this.getStoredData();
      stored[key] = entry;
      
      localStorage.setItem(this.storageKey, JSON.stringify(stored));
    } catch (error) {
      console.warn('Failed to store in localStorage:', error);
    }
  }

  get(key: string): T | null {
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
      
      return entry.data;
    } catch (error) {
      console.warn('Failed to read from localStorage:', error);
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

  clear(): void {
    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
  }
}

// Persistent cache instances
export const userSettingsCache = new PersistentCache<any>('user-settings');
export const recentEstimatesCache = new PersistentCache<any>('recent-estimates', 60 * 60 * 1000);

// Cache invalidation utilities
export const invalidateCache = {
  estimate: (id: string) => {
    estimatesCache.delete(getCacheKey.estimate(id));
    // Also invalidate related caches
    const keys = Array.from((estimatesCache as any).cache.keys());
    keys.forEach(key => {
      if (key.startsWith('estimates:')) {
        estimatesCache.delete(key);
      }
    });
  },
  
  allEstimates: () => {
    const keys = Array.from((estimatesCache as any).cache.keys());
    keys.forEach(key => {
      if (key.startsWith('estimates:') || key.startsWith('stats:')) {
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
  }
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
if (typeof window !== 'undefined') {
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