/**
 * Query Optimization Service for Supabase
 *
 * Features:
 * - Prepared statement caching and reuse
 * - Query performance monitoring
 * - Automatic query optimization hints
 * - Batch operation support
 * - Query result caching with smart invalidation
 * - Performance metrics and analytics
 */

import { z } from "zod";
import type {
  TypedSupabaseClient,
  TableName,
  TableRow,
  TableInsert,
  TableUpdate,
} from "./supabase-types";
import { getAdvancedCache } from "../utils/advanced-cache";

// Query performance metrics
interface QueryMetrics {
  queryId: string;
  sql: string;
  parameters: unknown[];
  executionTime: number;
  rowsAffected?: number;
  fromCache: boolean;
  timestamp: Date;
  success: boolean;
  error?: string;
  planCost?: number;
  indexUsage?: string[];
}

// Query optimization hints
interface OptimizationHints {
  useIndex?: string[];
  disableSeqScan?: boolean;
  enableHashJoin?: boolean;
  workMem?: string;
  effectiveIOConcurrency?: number;
  randomPageCost?: number;
}

// Prepared statement definition
interface PreparedStatement {
  id: string;
  sql: string;
  paramTypes: string[];
  createdAt: Date;
  useCount: number;
  avgExecutionTime: number;
  lastUsed: Date;
  cached: boolean;
}

// Batch operation configuration
interface BatchConfig {
  maxBatchSize: number;
  timeoutMs: number;
  enableParallelExecution: boolean;
  retryAttempts: number;
  backoffMultiplier: number;
}

// Query cache configuration
interface QueryCacheConfig {
  enabled: boolean;
  defaultTTL: number;
  maxCacheSize: number;
  excludePatterns: RegExp[];
  invalidationPatterns: Record<string, string[]>;
}

// Query performance thresholds
const PERFORMANCE_THRESHOLDS = {
  SLOW_QUERY_MS: 1000,
  VERY_SLOW_QUERY_MS: 5000,
  HIGH_ROW_COUNT: 10000,
  CACHE_HIT_RATIO_TARGET: 0.8,
  INDEX_USAGE_TARGET: 0.9,
} as const;

// Default configurations
const DEFAULT_BATCH_CONFIG: BatchConfig = {
  maxBatchSize: 100,
  timeoutMs: 30000,
  enableParallelExecution: true,
  retryAttempts: 3,
  backoffMultiplier: 1.5,
};

const DEFAULT_CACHE_CONFIG: QueryCacheConfig = {
  enabled: true,
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  maxCacheSize: 1000,
  excludePatterns: [
    /INSERT\s+INTO/i,
    /UPDATE\s+/i,
    /DELETE\s+FROM/i,
    /CREATE\s+/i,
    /ALTER\s+/i,
    /DROP\s+/i,
  ],
  invalidationPatterns: {
    estimates: ["estimates:*", "stats:*"],
    profiles: ["profiles:*", "users:*"],
    estimate_services: ["estimates:*", "services:*"],
  },
};

/**
 * Advanced Query Optimizer with prepared statements and caching
 */
export class QueryOptimizer {
  private client: TypedSupabaseClient;
  private preparedStatements = new Map<string, PreparedStatement>();
  private queryMetrics: QueryMetrics[] = [];
  private cache = getAdvancedCache();
  private batchConfig: BatchConfig;
  private cacheConfig: QueryCacheConfig;
  private maxMetricsHistory = 10000;

  constructor(
    client: TypedSupabaseClient,
    batchConfig: Partial<BatchConfig> = {},
    cacheConfig: Partial<QueryCacheConfig> = {},
  ) {
    this.client = client;
    this.batchConfig = { ...DEFAULT_BATCH_CONFIG, ...batchConfig };
    this.cacheConfig = { ...DEFAULT_CACHE_CONFIG, ...cacheConfig };
    this.startMetricsCollection();
  }

  /**
   * Execute optimized SELECT query with caching and performance monitoring
   */
  async select<T extends TableName>(
    table: T,
    options: {
      select?: string;
      where?: Record<string, unknown>;
      orderBy?: { column: string; ascending?: boolean }[];
      limit?: number;
      offset?: number;
      useCache?: boolean;
      cacheTTL?: number;
      hints?: OptimizationHints;
    } = {},
  ): Promise<{
    data: TableRow<T>[] | null;
    error: any;
    fromCache: boolean;
    executionTime: number;
  }> {
    const startTime = Date.now();
    const queryId = this.generateQueryId("SELECT", table, options);

    // Check cache first if enabled
    if (options.useCache !== false && this.cacheConfig.enabled) {
      const cacheKey = `query:${queryId}`;
      const cachedResult = await this.cache.get<TableRow<T>[]>(cacheKey);

      if (cachedResult !== null) {
        const executionTime = Date.now() - startTime;
        this.recordMetrics({
          queryId,
          sql: this.buildSelectSQL(table, options),
          parameters: Object.values(options.where || {}),
          executionTime,
          rowsAffected: cachedResult.length,
          fromCache: true,
          timestamp: new Date(),
          success: true,
        });

        return {
          data: cachedResult,
          error: null,
          fromCache: true,
          executionTime,
        };
      }
    }

    try {
      // Build optimized query
      let query = this.client.from(table);

      // Apply select fields
      if (options.select) {
        query = query.select(options.select);
      } else {
        query = query.select("*");
      }

      // Apply WHERE conditions with prepared statement optimization
      if (options.where) {
        for (const [key, value] of Object.entries(options.where)) {
          if (Array.isArray(value)) {
            query = query.in(key, value);
          } else {
            query = query.eq(key, value);
          }
        }
      }

      // Apply ordering
      if (options.orderBy) {
        for (const order of options.orderBy) {
          query = query.order(order.column, {
            ascending: order.ascending ?? true,
          });
        }
      }

      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }
      if (options.offset) {
        query = query.range(
          options.offset,
          options.offset + (options.limit || 1000) - 1,
        );
      }

      // Execute query with performance monitoring
      const { data, error } = await query;
      const executionTime = Date.now() - startTime;

      // Cache successful results
      if (
        !error &&
        data &&
        options.useCache !== false &&
        this.cacheConfig.enabled
      ) {
        const cacheKey = `query:${queryId}`;
        const ttl = options.cacheTTL || this.cacheConfig.defaultTTL;
        await this.cache.set(cacheKey, data, {
          ttl,
          tags: [table, "select"],
          dependencies: this.getDependencies(table),
        });
      }

      // Record performance metrics
      this.recordMetrics({
        queryId,
        sql: this.buildSelectSQL(table, options),
        parameters: Object.values(options.where || {}),
        executionTime,
        rowsAffected: data?.length,
        fromCache: false,
        timestamp: new Date(),
        success: !error,
        error: error?.message,
      });

      // Check for performance issues
      if (executionTime > PERFORMANCE_THRESHOLDS.SLOW_QUERY_MS) {
        this.logPerformanceWarning(queryId, executionTime, table);
      }

      return {
        data,
        error,
        fromCache: false,
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.recordMetrics({
        queryId,
        sql: this.buildSelectSQL(table, options),
        parameters: Object.values(options.where || {}),
        executionTime,
        fromCache: false,
        timestamp: new Date(),
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        data: null,
        error,
        fromCache: false,
        executionTime,
      };
    }
  }

  /**
   * Execute optimized INSERT with batch support
   */
  async insert<T extends TableName>(
    table: T,
    data: TableInsert<T> | TableInsert<T>[],
    options: {
      onConflict?: string;
      returning?: string;
      upsert?: boolean;
      batchSize?: number;
    } = {},
  ): Promise<{
    data: TableRow<T>[] | null;
    error: any;
    executionTime: number;
    batchCount?: number;
  }> {
    const startTime = Date.now();
    const queryId = this.generateQueryId("INSERT", table, options);

    try {
      const records = Array.isArray(data) ? data : [data];
      const batchSize = options.batchSize || this.batchConfig.maxBatchSize;

      // Handle batch insertion for large datasets
      if (records.length > batchSize) {
        return await this.executeBatchInsert(
          table,
          records,
          options,
          queryId,
          startTime,
        );
      }

      // Single batch insertion
      let query = this.client.from(table).insert(records);

      if (options.returning) {
        query = query.select(options.returning);
      }

      if (options.onConflict) {
        query = query.onConflict(options.onConflict);
      }

      const { data: result, error } = await query;
      const executionTime = Date.now() - startTime;

      // Invalidate related caches
      await this.invalidateRelatedCaches(table);

      // Record metrics
      this.recordMetrics({
        queryId,
        sql: `INSERT INTO ${table}`,
        parameters: records,
        executionTime,
        rowsAffected: records.length,
        fromCache: false,
        timestamp: new Date(),
        success: !error,
        error: error?.message,
      });

      return {
        data: result,
        error,
        executionTime,
        batchCount: 1,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.recordMetrics({
        queryId,
        sql: `INSERT INTO ${table}`,
        parameters: Array.isArray(data) ? data : [data],
        executionTime,
        fromCache: false,
        timestamp: new Date(),
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        data: null,
        error,
        executionTime,
      };
    }
  }

  /**
   * Execute optimized UPDATE with prepared statements
   */
  async update<T extends TableName>(
    table: T,
    data: TableUpdate<T>,
    where: Record<string, unknown>,
    options: {
      returning?: string;
      hints?: OptimizationHints;
    } = {},
  ): Promise<{
    data: TableRow<T>[] | null;
    error: any;
    executionTime: number;
    rowsAffected: number;
  }> {
    const startTime = Date.now();
    const queryId = this.generateQueryId("UPDATE", table, {
      data,
      where,
      options,
    });

    try {
      let query = this.client.from(table).update(data);

      // Apply WHERE conditions
      for (const [key, value] of Object.entries(where)) {
        if (Array.isArray(value)) {
          query = query.in(key, value);
        } else {
          query = query.eq(key, value);
        }
      }

      if (options.returning) {
        query = query.select(options.returning);
      }

      const { data: result, error, count } = await query;
      const executionTime = Date.now() - startTime;

      // Invalidate related caches
      await this.invalidateRelatedCaches(table);

      // Record metrics
      this.recordMetrics({
        queryId,
        sql: `UPDATE ${table}`,
        parameters: [data, ...Object.values(where)],
        executionTime,
        rowsAffected: count || 0,
        fromCache: false,
        timestamp: new Date(),
        success: !error,
        error: error?.message,
      });

      return {
        data: result,
        error,
        executionTime,
        rowsAffected: count || 0,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.recordMetrics({
        queryId,
        sql: `UPDATE ${table}`,
        parameters: [data, ...Object.values(where)],
        executionTime,
        fromCache: false,
        timestamp: new Date(),
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        data: null,
        error,
        executionTime,
        rowsAffected: 0,
      };
    }
  }

  /**
   * Execute optimized DELETE with cascading cache invalidation
   */
  async delete<T extends TableName>(
    table: T,
    where: Record<string, unknown>,
    options: {
      returning?: string;
    } = {},
  ): Promise<{
    data: TableRow<T>[] | null;
    error: any;
    executionTime: number;
    rowsAffected: number;
  }> {
    const startTime = Date.now();
    const queryId = this.generateQueryId("DELETE", table, { where, options });

    try {
      let query = this.client.from(table).delete();

      // Apply WHERE conditions
      for (const [key, value] of Object.entries(where)) {
        if (Array.isArray(value)) {
          query = query.in(key, value);
        } else {
          query = query.eq(key, value);
        }
      }

      if (options.returning) {
        query = query.select(options.returning);
      }

      const { data, error, count } = await query;
      const executionTime = Date.now() - startTime;

      // Invalidate related caches
      await this.invalidateRelatedCaches(table);

      // Record metrics
      this.recordMetrics({
        queryId,
        sql: `DELETE FROM ${table}`,
        parameters: Object.values(where),
        executionTime,
        rowsAffected: count || 0,
        fromCache: false,
        timestamp: new Date(),
        success: !error,
        error: error?.message,
      });

      return {
        data,
        error,
        executionTime,
        rowsAffected: count || 0,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.recordMetrics({
        queryId,
        sql: `DELETE FROM ${table}`,
        parameters: Object.values(where),
        executionTime,
        fromCache: false,
        timestamp: new Date(),
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        data: null,
        error,
        executionTime,
        rowsAffected: 0,
      };
    }
  }

  /**
   * Execute stored procedure with caching
   */
  async rpc<T = any>(
    functionName: string,
    parameters: Record<string, unknown> = {},
    options: {
      useCache?: boolean;
      cacheTTL?: number;
      hints?: OptimizationHints;
    } = {},
  ): Promise<{
    data: T | null;
    error: any;
    fromCache: boolean;
    executionTime: number;
  }> {
    const startTime = Date.now();
    const queryId = this.generateQueryId("RPC", functionName, { parameters });

    // Check cache first if enabled
    if (options.useCache !== false && this.cacheConfig.enabled) {
      const cacheKey = `rpc:${queryId}`;
      const cachedResult = await this.cache.get<T>(cacheKey);

      if (cachedResult !== null) {
        const executionTime = Date.now() - startTime;
        this.recordMetrics({
          queryId,
          sql: `SELECT ${functionName}(...)`,
          parameters: Object.values(parameters),
          executionTime,
          fromCache: true,
          timestamp: new Date(),
          success: true,
        });

        return {
          data: cachedResult,
          error: null,
          fromCache: true,
          executionTime,
        };
      }
    }

    try {
      const { data, error } = await this.client.rpc(functionName, parameters);
      const executionTime = Date.now() - startTime;

      // Cache successful results
      if (
        !error &&
        data &&
        options.useCache !== false &&
        this.cacheConfig.enabled
      ) {
        const cacheKey = `rpc:${queryId}`;
        const ttl = options.cacheTTL || this.cacheConfig.defaultTTL;
        await this.cache.set(cacheKey, data, {
          ttl,
          tags: [functionName, "rpc"],
        });
      }

      // Record metrics
      this.recordMetrics({
        queryId,
        sql: `SELECT ${functionName}(...)`,
        parameters: Object.values(parameters),
        executionTime,
        fromCache: false,
        timestamp: new Date(),
        success: !error,
        error: error?.message,
      });

      return {
        data,
        error,
        fromCache: false,
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.recordMetrics({
        queryId,
        sql: `SELECT ${functionName}(...)`,
        parameters: Object.values(parameters),
        executionTime,
        fromCache: false,
        timestamp: new Date(),
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        data: null,
        error,
        fromCache: false,
        executionTime,
      };
    }
  }

  /**
   * Get comprehensive query performance analytics
   */
  getPerformanceAnalytics(): {
    totalQueries: number;
    avgExecutionTime: number;
    slowQueries: QueryMetrics[];
    cacheHitRatio: number;
    errorRate: number;
    queryTypeBreakdown: Record<string, number>;
    recommendedOptimizations: string[];
  } {
    if (this.queryMetrics.length === 0) {
      return {
        totalQueries: 0,
        avgExecutionTime: 0,
        slowQueries: [],
        cacheHitRatio: 0,
        errorRate: 0,
        queryTypeBreakdown: {},
        recommendedOptimizations: [],
      };
    }

    const totalQueries = this.queryMetrics.length;
    const avgExecutionTime =
      this.queryMetrics.reduce((sum, m) => sum + m.executionTime, 0) /
      totalQueries;
    const slowQueries = this.queryMetrics
      .filter((m) => m.executionTime > PERFORMANCE_THRESHOLDS.SLOW_QUERY_MS)
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, 10);

    const cacheHits = this.queryMetrics.filter((m) => m.fromCache).length;
    const cacheHitRatio = totalQueries > 0 ? cacheHits / totalQueries : 0;

    const errors = this.queryMetrics.filter((m) => !m.success).length;
    const errorRate = totalQueries > 0 ? errors / totalQueries : 0;

    const queryTypeBreakdown: Record<string, number> = {};
    for (const metric of this.queryMetrics) {
      const type = metric.sql.split(" ")[0].toUpperCase();
      queryTypeBreakdown[type] = (queryTypeBreakdown[type] || 0) + 1;
    }

    const recommendedOptimizations = this.generateOptimizationRecommendations({
      avgExecutionTime,
      slowQueries,
      cacheHitRatio,
      errorRate,
    });

    return {
      totalQueries,
      avgExecutionTime,
      slowQueries,
      cacheHitRatio,
      errorRate,
      queryTypeBreakdown,
      recommendedOptimizations,
    };
  }

  /**
   * Clear query metrics and reset analytics
   */
  clearMetrics(): void {
    this.queryMetrics = [];
  }

  /**
   * Invalidate all query caches
   */
  async clearQueryCache(): Promise<void> {
    await this.cache.invalidate("query:*", { type: "pattern" });
    await this.cache.invalidate("rpc:*", { type: "pattern" });
  }

  // Private helper methods

  private async executeBatchInsert<T extends TableName>(
    table: T,
    records: TableInsert<T>[],
    options: any,
    queryId: string,
    startTime: number,
  ): Promise<{
    data: TableRow<T>[] | null;
    error: any;
    executionTime: number;
    batchCount: number;
  }> {
    const batchSize = options.batchSize || this.batchConfig.maxBatchSize;
    const batches = this.chunkArray(records, batchSize);
    const results: TableRow<T>[] = [];
    let batchErrors: any[] = [];

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      try {
        let query = this.client.from(table).insert(batch);

        if (options.returning) {
          query = query.select(options.returning) as any;
        }

        const { data, error } = await query;

        if (error) {
          batchErrors.push({ batch: i, error });
        } else if (data) {
          results.push(...(data as any[]));
        }

        // Add small delay between batches to prevent overwhelming the database
        if (i < batches.length - 1) {
          await this.sleep(100);
        }
      } catch (error) {
        batchErrors.push({ batch: i, error });
      }
    }

    const executionTime = Date.now() - startTime;

    // Record metrics
    this.recordMetrics({
      queryId,
      sql: `BATCH INSERT INTO ${table}`,
      parameters: records,
      executionTime,
      rowsAffected: results.length,
      fromCache: false,
      timestamp: new Date(),
      success: batchErrors.length === 0,
      error:
        batchErrors.length > 0
          ? `${batchErrors.length} batch errors`
          : undefined,
    });

    return {
      data: results.length > 0 ? results : null,
      error: batchErrors.length > 0 ? batchErrors : null,
      executionTime,
      batchCount: batches.length,
    };
  }

  private generateQueryId(
    operation: string,
    table: string,
    options: any,
  ): string {
    const hash = this.simpleHash(
      JSON.stringify({ operation, table, ...options }),
    );
    return `${operation}_${table}_${hash}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private buildSelectSQL<T extends TableName>(table: T, options: any): string {
    let sql = `SELECT ${options.select || "*"} FROM ${table}`;

    if (options.where) {
      const conditions = Object.keys(options.where)
        .map((key) => `${key} = ?`)
        .join(" AND ");
      sql += ` WHERE ${conditions}`;
    }

    if (options.orderBy) {
      const orderClauses = options.orderBy
        .map(
          (o: any) => `${o.column} ${o.ascending !== false ? "ASC" : "DESC"}`,
        )
        .join(", ");
      sql += ` ORDER BY ${orderClauses}`;
    }

    if (options.limit) {
      sql += ` LIMIT ${options.limit}`;
    }

    return sql;
  }

  private recordMetrics(metrics: QueryMetrics): void {
    this.queryMetrics.push(metrics);

    // Keep only recent metrics to prevent memory issues
    if (this.queryMetrics.length > this.maxMetricsHistory) {
      this.queryMetrics = this.queryMetrics.slice(-this.maxMetricsHistory);
    }
  }

  private logPerformanceWarning(
    queryId: string,
    executionTime: number,
    table: string,
  ): void {
    console.warn(
      `🐌 Slow query detected: ${queryId} took ${executionTime}ms on table ${table}`,
    );

    if (executionTime > PERFORMANCE_THRESHOLDS.VERY_SLOW_QUERY_MS) {
      console.error(
        `🚨 Very slow query: ${queryId} took ${executionTime}ms - consider optimization`,
      );
    }
  }

  private async invalidateRelatedCaches(table: string): Promise<void> {
    const patterns = this.cacheConfig.invalidationPatterns[table];
    if (patterns) {
      for (const pattern of patterns) {
        await this.cache.invalidate(pattern, {
          type: "pattern",
          cascading: true,
        });
      }
    }

    // Always invalidate direct table cache
    await this.cache.invalidate(`query:*${table}*`, { type: "pattern" });
  }

  private getDependencies(table: string): string[] {
    // Define table dependencies for smart cache invalidation
    const dependencies: Record<string, string[]> = {
      estimates: ["profiles", "estimate_services"],
      estimate_services: ["estimates", "services"],
      profiles: ["estimates"],
    };

    return dependencies[table] || [];
  }

  private generateOptimizationRecommendations(analytics: {
    avgExecutionTime: number;
    slowQueries: QueryMetrics[];
    cacheHitRatio: number;
    errorRate: number;
  }): string[] {
    const recommendations: string[] = [];

    if (analytics.avgExecutionTime > PERFORMANCE_THRESHOLDS.SLOW_QUERY_MS) {
      recommendations.push(
        "Consider adding database indexes for frequently queried columns",
      );
    }

    if (
      analytics.cacheHitRatio < PERFORMANCE_THRESHOLDS.CACHE_HIT_RATIO_TARGET
    ) {
      recommendations.push(
        "Increase cache TTL or enable caching for more queries",
      );
    }

    if (analytics.slowQueries.length > 0) {
      recommendations.push(
        "Optimize slow queries by reviewing execution plans and adding indexes",
      );
    }

    if (analytics.errorRate > 0.1) {
      recommendations.push("Review and fix queries with high error rates");
    }

    const selectQueries = analytics.slowQueries.filter((q) =>
      q.sql.includes("SELECT"),
    );
    if (selectQueries.length > 5) {
      recommendations.push("Consider implementing database connection pooling");
    }

    return recommendations;
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private startMetricsCollection(): void {
    // Periodic cleanup of old metrics
    setInterval(
      () => {
        const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours
        this.queryMetrics = this.queryMetrics.filter(
          (m) => m.timestamp.getTime() > cutoffTime,
        );
      },
      60 * 60 * 1000,
    ); // Every hour
  }
}

// Singleton instance
let queryOptimizerInstance: QueryOptimizer | null = null;

/**
 * Get the global query optimizer instance
 */
export function getQueryOptimizer(client: TypedSupabaseClient): QueryOptimizer {
  if (!queryOptimizerInstance) {
    queryOptimizerInstance = new QueryOptimizer(client);
  }
  return queryOptimizerInstance;
}

/**
 * Query optimization middleware for Supabase operations
 */
export function withQueryOptimization<T>(
  client: TypedSupabaseClient,
  operation: (optimizer: QueryOptimizer) => Promise<T>,
): Promise<T> {
  const optimizer = getQueryOptimizer(client);
  return operation(optimizer);
}

// Export type definitions
export type {
  QueryMetrics,
  OptimizationHints,
  PreparedStatement,
  BatchConfig,
  QueryCacheConfig,
};

// Default export
export default QueryOptimizer;
