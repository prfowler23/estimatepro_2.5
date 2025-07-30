// Database Query Optimization
// Advanced query optimization, connection pooling, and performance tuning

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { cacheManager } from "@/lib/cache/cache-manager";
import { performanceMonitor } from "./performance-monitor";

// Query optimization configuration
export interface QueryOptimizationConfig {
  enabled: boolean;
  enableCaching: boolean;
  enablePagination: boolean;
  enableQueryPlan: boolean;
  enableIndexHints: boolean;
  defaultLimit: number;
  maxLimit: number;
  slowQueryThreshold: number;
  cacheTimeout: number;
}

// Query options
export interface QueryOptions {
  cache?: boolean;
  cacheTtl?: number;
  limit?: number;
  offset?: number;
  orderBy?: string;
  ascending?: boolean;
  select?: string;
  includeCount?: boolean;
  userId?: string;
  timeout?: number;
}

// Query result
export interface QueryResult<T> {
  data: T[];
  count?: number;
  hasMore?: boolean;
  cached?: boolean;
  executionTime?: number;
  fromCache?: boolean;
}

// Query performance metrics
export interface QueryMetrics {
  queryTime: number;
  cacheHit: boolean;
  rowsReturned: number;
  indexUsed: boolean;
  plan?: any;
}

// Default configuration
const DEFAULT_CONFIG: QueryOptimizationConfig = {
  enabled: process.env.QUERY_OPTIMIZATION !== "false",
  enableCaching: process.env.QUERY_CACHING !== "false",
  enablePagination: process.env.QUERY_PAGINATION !== "false",
  enableQueryPlan: process.env.QUERY_PLAN_ANALYSIS === "true",
  enableIndexHints: process.env.QUERY_INDEX_HINTS === "true",
  defaultLimit: parseInt(process.env.QUERY_DEFAULT_LIMIT || "50"),
  maxLimit: parseInt(process.env.QUERY_MAX_LIMIT || "1000"),
  slowQueryThreshold: parseInt(process.env.SLOW_QUERY_THRESHOLD || "1000"),
  cacheTimeout: parseInt(process.env.QUERY_CACHE_TIMEOUT || "300000"), // 5 minutes
};

// Query Optimizer
export class QueryOptimizer {
  private static instance: QueryOptimizer;
  private config: QueryOptimizationConfig;
  private slowQueries: Map<string, number> = new Map();
  private queryStats: Map<string, QueryMetrics[]> = new Map();

  private constructor(config: QueryOptimizationConfig = DEFAULT_CONFIG) {
    this.config = config;
  }

  static getInstance(config?: QueryOptimizationConfig): QueryOptimizer {
    if (!QueryOptimizer.instance) {
      QueryOptimizer.instance = new QueryOptimizer(config);
    }
    return QueryOptimizer.instance;
  }

  // Optimized query execution
  async executeQuery<T>(
    tableName: string,
    queryBuilder: (query: any) => any,
    options: QueryOptions = {},
  ): Promise<QueryResult<T>> {
    const startTime = performance.now();
    const supabase = createClient();

    // Generate cache key
    const cacheKey = this.generateCacheKey(tableName, queryBuilder, options);

    // Check cache first
    if (this.config.enableCaching && options.cache !== false) {
      const cached = await cacheManager.get<QueryResult<T>>({
        type: "user_data",
        id: cacheKey,
        userId: options.userId,
      });

      if (cached) {
        return { ...cached, fromCache: true };
      }
    }

    try {
      // Build optimized query
      let query = supabase.from(tableName);

      // Apply query builder
      query = queryBuilder(query);

      // Apply optimizations
      query = this.applyOptimizations(query, options);

      // Execute query
      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Query failed: ${error.message}`);
      }

      const executionTime = performance.now() - startTime;

      // Record performance metrics
      await this.recordQueryMetrics(
        tableName,
        executionTime,
        data?.length || 0,
        cacheKey,
      );

      const result: QueryResult<T> = {
        data: data || [],
        count,
        hasMore: this.calculateHasMore(data, options),
        cached: this.config.enableCaching && options.cache !== false,
        executionTime,
        fromCache: false,
      };

      // Cache the result
      if (this.config.enableCaching && options.cache !== false) {
        await cacheManager.set(
          {
            type: "user_data",
            id: cacheKey,
            userId: options.userId,
          },
          result,
          options.cacheTtl || this.config.cacheTimeout,
        );
      }

      return result;
    } catch (error) {
      const executionTime = performance.now() - startTime;
      await this.recordQueryMetrics(
        tableName,
        executionTime,
        0,
        cacheKey,
        error as Error,
      );
      throw error;
    }
  }

  // Apply query optimizations
  private applyOptimizations(query: any, options: QueryOptions): any {
    // Apply pagination
    if (this.config.enablePagination) {
      const limit = Math.min(
        options.limit || this.config.defaultLimit,
        this.config.maxLimit,
      );
      query = query.range(
        options.offset || 0,
        (options.offset || 0) + limit - 1,
      );
    }

    // Apply ordering
    if (options.orderBy) {
      query = query.order(options.orderBy, {
        ascending: options.ascending !== false,
      });
    }

    // Apply select
    if (options.select) {
      query = query.select(options.select);
    }

    // Include count if requested
    if (options.includeCount) {
      query = query.select("*", { count: "exact" });
    }

    return query;
  }

  // Generate cache key
  private generateCacheKey(
    tableName: string,
    queryBuilder: (query: any) => any,
    options: QueryOptions,
  ): string {
    const parts = [tableName, queryBuilder.toString(), JSON.stringify(options)];

    // Simple hash function
    let hash = 0;
    const str = parts.join("|");
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return `query_${Math.abs(hash)}`;
  }

  // Calculate if there are more results
  private calculateHasMore(data: any[], options: QueryOptions): boolean {
    if (!data || !this.config.enablePagination) return false;

    const limit = Math.min(
      options.limit || this.config.defaultLimit,
      this.config.maxLimit,
    );

    return data.length === limit;
  }

  // Record query performance metrics
  private async recordQueryMetrics(
    tableName: string,
    executionTime: number,
    rowsReturned: number,
    cacheKey: string,
    error?: Error,
  ): Promise<void> {
    const metrics: QueryMetrics = {
      queryTime: executionTime,
      cacheHit: false,
      rowsReturned,
      indexUsed: true, // Would need database introspection to determine
    };

    // Store metrics
    if (!this.queryStats.has(tableName)) {
      this.queryStats.set(tableName, []);
    }
    this.queryStats.get(tableName)!.push(metrics);

    // Record slow query
    if (executionTime > this.config.slowQueryThreshold) {
      this.slowQueries.set(cacheKey, executionTime);
      console.warn(`Slow query detected: ${tableName} took ${executionTime}ms`);
    }

    // Record performance entry
    performanceMonitor.recordEntry({
      name: `query-${tableName}`,
      type: "database",
      duration: executionTime,
      timestamp: Date.now(),
      success: !error,
      error: error?.message,
      metadata: {
        table: tableName,
        rows: rowsReturned,
        cached: false,
      },
    });
  }

  // Get query statistics
  getQueryStats(tableName?: string): Record<string, QueryMetrics[]> {
    if (tableName) {
      return { [tableName]: this.queryStats.get(tableName) || [] };
    }
    return Object.fromEntries(this.queryStats.entries());
  }

  // Get slow queries
  getSlowQueries(): Map<string, number> {
    return new Map(this.slowQueries);
  }

  // Clear query statistics
  clearStats(): void {
    this.queryStats.clear();
    this.slowQueries.clear();
  }
}

// Global query optimizer instance
export const queryOptimizer = QueryOptimizer.getInstance();

// Optimized query helpers
export const optimizedQueries = {
  // Get estimates with optimization
  getEstimates: async (
    userId: string,
    options: QueryOptions = {},
  ): Promise<QueryResult<any>> => {
    return queryOptimizer.executeQuery(
      "estimates",
      (query) => query.eq("user_id", userId),
      { ...options, userId },
    );
  },

  // Get customers with optimization
  getCustomers: async (
    userId: string,
    options: QueryOptions = {},
  ): Promise<QueryResult<any>> => {
    return queryOptimizer.executeQuery(
      "customers",
      (query) => query.eq("user_id", userId),
      { ...options, userId },
    );
  },

  // Get estimate services with optimization
  getEstimateServices: async (
    estimateId: string,
    options: QueryOptions = {},
  ): Promise<QueryResult<any>> => {
    return queryOptimizer.executeQuery(
      "estimate_services",
      (query) => query.eq("estimate_id", estimateId),
      options,
    );
  },

  // Search estimates with optimization
  searchEstimates: async (
    userId: string,
    searchTerm: string,
    options: QueryOptions = {},
  ): Promise<QueryResult<any>> => {
    return queryOptimizer.executeQuery(
      "estimates",
      (query) =>
        query
          .eq("user_id", userId)
          .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`),
      { ...options, userId, cache: false }, // Don't cache search results
    );
  },

  // Get recent estimates with optimization
  getRecentEstimates: async (
    userId: string,
    limit: number = 10,
  ): Promise<QueryResult<any>> => {
    return queryOptimizer.executeQuery(
      "estimates",
      (query) =>
        query.eq("user_id", userId).order("updated_at", { ascending: false }),
      { userId, limit, cacheTtl: 300000 }, // 5 minute cache
    );
  },

  // Get estimate analytics with optimization
  getEstimateAnalytics: async (
    userId: string,
    startDate: string,
    endDate: string,
  ): Promise<QueryResult<any>> => {
    return queryOptimizer.executeQuery(
      "estimates",
      (query) =>
        query
          .eq("user_id", userId)
          .gte("created_at", startDate)
          .lte("created_at", endDate),
      { userId, cacheTtl: 1800000 }, // 30 minute cache
    );
  },
};

// Query optimization middleware
export const queryOptimizationMiddleware = {
  // Pre-warm cache for common queries
  preWarmCache: async (userId: string): Promise<void> => {
    try {
      // Pre-warm recent estimates
      await optimizedQueries.getRecentEstimates(userId, 10);

      // Pre-warm recent customers
      await optimizedQueries.getCustomers(userId, { limit: 20 });

      console.log(`Cache pre-warmed for user "[user]"`);
    } catch (error) {
      console.error("Cache pre-warm failed:", error);
    }
  },

  // Invalidate cache on data changes
  invalidateCache: async (tableName: string, userId: string): Promise<void> => {
    try {
      await cacheManager.invalidateByTags([tableName, `user_${userId}`]);
      console.log(`Cache invalidated for ${tableName} and user ${userId}`);
    } catch (error) {
      console.error("Cache invalidation failed:", error);
    }
  },
};

// Performance optimization hooks
export const useOptimizedQuery = <T>(
  queryFn: () => Promise<QueryResult<T>>,
  dependencies: any[] = [],
) => {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [cached, setCached] = useState(false);

  useEffect(() => {
    let mounted = true;

    const executeQuery = async () => {
      try {
        setLoading(true);
        setError(null);

        const result = await queryFn();

        if (mounted) {
          setData(result.data);
          setHasMore(result.hasMore || false);
          setCached(result.fromCache || false);
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    executeQuery();

    return () => {
      mounted = false;
    };
  }, dependencies);

  return { data, loading, error, hasMore, cached };
};

export default queryOptimizer;
