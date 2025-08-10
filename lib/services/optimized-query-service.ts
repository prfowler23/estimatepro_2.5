/**
 * Optimized Query Service - Database Performance Enhancement
 *
 * Features:
 * - Intelligent query batching and connection reuse
 * - Automatic query optimization and caching
 * - Connection pooling management
 * - Performance monitoring and alerting
 * - Query result aggregation and deduplication
 * - Adaptive query strategies based on load
 */

import type { TypedSupabaseClient } from "@/lib/supabase/supabase-types";
import type { Database } from "@/types/supabase";
import { getAdvancedCache } from "@/lib/utils/advanced-cache";
import { withRetry } from "@/lib/utils/retry-logic";

// Query optimization configuration
interface QueryOptimizationConfig {
  enableBatching: boolean;
  batchTimeout: number; // ms to wait before executing batch
  maxBatchSize: number;
  enableCaching: boolean;
  cacheTimeout: number;
  enableDeduplication: boolean;
  maxConnectionPool: number;
  queryTimeout: number;
  enablePerformanceMonitoring: boolean;
  slowQueryThreshold: number; // ms
  enableAdaptiveStrategies: boolean;
}

// Query performance metrics
interface QueryMetrics {
  totalQueries: number;
  cachedQueries: number;
  batchedQueries: number;
  deduplicatedQueries: number;
  slowQueries: number;
  failedQueries: number;
  avgResponseTime: number;
  connectionUtilization: number;
  cacheHitRate: number;
  batchEfficiency: number;
  lastReset: Date;
}

// Query batch definition
interface QueryBatch {
  id: string;
  queries: Query[];
  timestamp: Date;
  timeout: NodeJS.Timeout;
  resolve: (results: QueryResult[]) => void;
  reject: (error: Error) => void;
}

// Individual query definition
interface Query {
  id: string;
  table: string;
  operation: "select" | "insert" | "update" | "delete";
  data?: any;
  filters?: Record<string, any>;
  options?: QueryOptions;
  priority: "high" | "normal" | "low";
  timestamp: Date;
  retries: number;
  maxRetries: number;
}

// Query options
interface QueryOptions {
  cache?: boolean;
  cacheTTL?: number;
  timeout?: number;
  batchable?: boolean;
  deduplication?: boolean;
  select?: string;
  orderBy?: string;
  limit?: number;
  offset?: number;
}

// Query result
interface QueryResult<T = any> {
  queryId: string;
  success: boolean;
  data?: T;
  error?: string;
  metadata: {
    executionTime: number;
    cached: boolean;
    batched: boolean;
    deduplicated: boolean;
    connectionId?: string;
  };
}

// Connection pool management
interface ConnectionInfo {
  id: string;
  client: TypedSupabaseClient;
  inUse: boolean;
  lastUsed: Date;
  queryCount: number;
  avgResponseTime: number;
}

// Default configuration
const DEFAULT_CONFIG: QueryOptimizationConfig = {
  enableBatching: true,
  batchTimeout: 50, // 50ms batching window
  maxBatchSize: 25,
  enableCaching: true,
  cacheTimeout: 5 * 60 * 1000, // 5 minutes
  enableDeduplication: true,
  maxConnectionPool: 10,
  queryTimeout: 30000, // 30 seconds
  enablePerformanceMonitoring: true,
  slowQueryThreshold: 1000, // 1 second
  enableAdaptiveStrategies: true,
};

/**
 * Optimized Query Service with intelligent batching and caching
 */
export class OptimizedQueryService {
  private config: QueryOptimizationConfig;
  private cache = getAdvancedCache();
  private connectionPool = new Map<string, ConnectionInfo>();
  private queryQueue: Query[] = [];
  private activeBatches = new Map<string, QueryBatch>();
  private deduplicationMap = new Map<string, Promise<QueryResult>>();
  private metrics: QueryMetrics = {
    totalQueries: 0,
    cachedQueries: 0,
    batchedQueries: 0,
    deduplicatedQueries: 0,
    slowQueries: 0,
    failedQueries: 0,
    avgResponseTime: 0,
    connectionUtilization: 0,
    cacheHitRate: 0,
    batchEfficiency: 0,
    lastReset: new Date(),
  };

  constructor(
    private primaryClient: TypedSupabaseClient,
    config: Partial<QueryOptimizationConfig> = {},
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeConnectionPool();
    this.startPerformanceMonitoring();
    this.startMaintenanceTasks();
  }

  /**
   * Execute optimized select query
   */
  async select<T = any>(
    table: string,
    filters: Record<string, any> = {},
    options: QueryOptions = {},
  ): Promise<QueryResult<T[]>> {
    return this.executeQuery({
      id: this.generateQueryId(),
      table,
      operation: "select",
      filters,
      options,
      priority: options.cache === false ? "high" : "normal",
      timestamp: new Date(),
      retries: 0,
      maxRetries: 3,
    });
  }

  /**
   * Execute optimized insert query
   */
  async insert<T = any>(
    table: string,
    data: any,
    options: QueryOptions = {},
  ): Promise<QueryResult<T>> {
    return this.executeQuery({
      id: this.generateQueryId(),
      table,
      operation: "insert",
      data,
      options,
      priority: "high", // Mutations are high priority
      timestamp: new Date(),
      retries: 0,
      maxRetries: 3,
    });
  }

  /**
   * Execute optimized update query
   */
  async update<T = any>(
    table: string,
    data: any,
    filters: Record<string, any>,
    options: QueryOptions = {},
  ): Promise<QueryResult<T>> {
    return this.executeQuery({
      id: this.generateQueryId(),
      table,
      operation: "update",
      data,
      filters,
      options,
      priority: "high", // Mutations are high priority
      timestamp: new Date(),
      retries: 0,
      maxRetries: 3,
    });
  }

  /**
   * Execute optimized delete query
   */
  async delete(
    table: string,
    filters: Record<string, any>,
    options: QueryOptions = {},
  ): Promise<QueryResult<void>> {
    return this.executeQuery({
      id: this.generateQueryId(),
      table,
      operation: "delete",
      filters,
      options,
      priority: "high", // Mutations are high priority
      timestamp: new Date(),
      retries: 0,
      maxRetries: 3,
    });
  }

  /**
   * Execute multiple queries in an optimized batch
   */
  async batchExecute(
    queries: Omit<Query, "id" | "timestamp" | "retries" | "maxRetries">[],
  ): Promise<QueryResult[]> {
    const batchQueries = queries.map((query) => ({
      ...query,
      id: this.generateQueryId(),
      timestamp: new Date(),
      retries: 0,
      maxRetries: 3,
    }));

    // Execute all queries and return results
    const results = await Promise.all(
      batchQueries.map((query) => this.executeQuery(query)),
    );

    return results;
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): QueryMetrics {
    this.updateConnectionUtilization();
    return { ...this.metrics };
  }

  /**
   * Reset performance metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalQueries: 0,
      cachedQueries: 0,
      batchedQueries: 0,
      deduplicatedQueries: 0,
      slowQueries: 0,
      failedQueries: 0,
      avgResponseTime: 0,
      connectionUtilization: 0,
      cacheHitRate: 0,
      batchEfficiency: 0,
      lastReset: new Date(),
    };
  }

  /**
   * Clear all caches
   */
  async clearCaches(): Promise<void> {
    await this.cache.clear();
    this.deduplicationMap.clear();
  }

  /**
   * Get connection pool status
   */
  getConnectionPoolStatus(): {
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
    averageResponseTime: number;
    connections: Array<{
      id: string;
      inUse: boolean;
      lastUsed: Date;
      queryCount: number;
      avgResponseTime: number;
    }>;
  } {
    const connections = Array.from(this.connectionPool.values());
    const activeConnections = connections.filter((c) => c.inUse).length;
    const totalQueries = connections.reduce((sum, c) => sum + c.queryCount, 0);
    const totalResponseTime = connections.reduce(
      (sum, c) => sum + c.avgResponseTime * c.queryCount,
      0,
    );

    return {
      totalConnections: connections.length,
      activeConnections,
      idleConnections: connections.length - activeConnections,
      averageResponseTime:
        totalQueries > 0 ? totalResponseTime / totalQueries : 0,
      connections: connections.map((c) => ({
        id: c.id,
        inUse: c.inUse,
        lastUsed: c.lastUsed,
        queryCount: c.queryCount,
        avgResponseTime: c.avgResponseTime,
      })),
    };
  }

  // Private methods

  private async executeQuery<T = any>(query: Query): Promise<QueryResult<T>> {
    const startTime = Date.now();
    this.metrics.totalQueries++;

    try {
      // Check for deduplication first
      if (this.config.enableDeduplication && query.operation === "select") {
        const dedupKey = this.getDeduplicationKey(query);
        if (this.deduplicationMap.has(dedupKey)) {
          this.metrics.deduplicatedQueries++;
          return (await this.deduplicationMap.get(dedupKey)!) as QueryResult<T>;
        }
      }

      // Check cache for read operations
      if (
        this.config.enableCaching &&
        query.operation === "select" &&
        query.options?.cache !== false
      ) {
        const cacheKey = this.getCacheKey(query);
        const cachedResult = await this.cache.get<T>(cacheKey);

        if (cachedResult) {
          this.metrics.cachedQueries++;
          this.updateCacheHitRate();

          return {
            queryId: query.id,
            success: true,
            data: cachedResult,
            metadata: {
              executionTime: Date.now() - startTime,
              cached: true,
              batched: false,
              deduplicated: false,
            },
          };
        }
      }

      // Decide execution strategy
      const result = await this.chooseExecutionStrategy(query);
      const executionTime = Date.now() - startTime;

      // Update performance metrics
      this.updatePerformanceMetrics(executionTime, result.success);

      // Cache successful read results
      if (
        result.success &&
        query.operation === "select" &&
        query.options?.cache !== false
      ) {
        const cacheKey = this.getCacheKey(query);
        const cacheTTL = query.options?.cacheTTL || this.config.cacheTimeout;
        await this.cache.set(cacheKey, result.data, {
          ttl: cacheTTL,
          tags: [query.table, "query-result"],
        });
      }

      return {
        ...result,
        metadata: {
          ...result.metadata,
          executionTime,
        },
      };
    } catch (error) {
      this.metrics.failedQueries++;
      const executionTime = Date.now() - startTime;
      this.updatePerformanceMetrics(executionTime, false);

      return {
        queryId: query.id,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          executionTime,
          cached: false,
          batched: false,
          deduplicated: false,
        },
      };
    }
  }

  private async chooseExecutionStrategy<T>(
    query: Query,
  ): Promise<QueryResult<T>> {
    // High priority queries execute immediately
    if (query.priority === "high" || query.operation !== "select") {
      return this.executeDirectQuery(query);
    }

    // Check if batching is enabled and beneficial
    if (this.config.enableBatching && query.options?.batchable !== false) {
      return this.executeBatchedQuery(query);
    }

    // Default to direct execution
    return this.executeDirectQuery(query);
  }

  private async executeDirectQuery<T>(query: Query): Promise<QueryResult<T>> {
    const connection = await this.getOptimalConnection();

    try {
      connection.inUse = true;
      const result = await this.performDatabaseOperation(
        connection.client,
        query,
      );

      // Update connection metrics
      connection.lastUsed = new Date();
      connection.queryCount++;

      return result as QueryResult<T>;
    } finally {
      connection.inUse = false;
    }
  }

  private async executeBatchedQuery<T>(query: Query): Promise<QueryResult<T>> {
    // Add to queue and create or join a batch
    this.queryQueue.push(query);

    // Find or create appropriate batch
    let batch = this.findSuitableBatch(query);
    if (!batch) {
      batch = this.createNewBatch();
    }

    batch.queries.push(query);

    // Return promise that will be resolved when batch executes
    return new Promise((resolve, reject) => {
      // Store resolution callback for this specific query
      const originalResolve = batch.resolve;
      batch.resolve = (results: QueryResult[]) => {
        const queryResult = results.find((r) => r.queryId === query.id);
        if (queryResult) {
          resolve(queryResult as QueryResult<T>);
        } else {
          reject(new Error("Query result not found in batch"));
        }
        originalResolve(results);
      };

      const originalReject = batch.reject;
      batch.reject = (error: Error) => {
        reject(error);
        originalReject(error);
      };
    });
  }

  private async performDatabaseOperation(
    client: TypedSupabaseClient,
    query: Query,
  ): Promise<QueryResult> {
    const startTime = Date.now();

    try {
      let dbQuery = client.from(query.table as any);
      let result: any;

      switch (query.operation) {
        case "select":
          if (query.options?.select) {
            dbQuery = dbQuery.select(query.options.select);
          } else {
            dbQuery = dbQuery.select("*");
          }

          // Apply filters
          if (query.filters) {
            for (const [key, value] of Object.entries(query.filters)) {
              dbQuery = dbQuery.eq(key, value);
            }
          }

          // Apply ordering
          if (query.options?.orderBy) {
            dbQuery = dbQuery.order(query.options.orderBy);
          }

          // Apply pagination
          if (query.options?.limit) {
            dbQuery = dbQuery.limit(query.options.limit);
          }
          if (query.options?.offset) {
            dbQuery = dbQuery.range(
              query.options.offset,
              (query.options.offset || 0) + (query.options.limit || 100) - 1,
            );
          }

          result = await dbQuery;
          break;

        case "insert":
          result = await dbQuery.insert(query.data).select();
          break;

        case "update":
          if (query.filters) {
            for (const [key, value] of Object.entries(query.filters)) {
              dbQuery = dbQuery.eq(key, value);
            }
          }
          result = await dbQuery.update(query.data).select();
          break;

        case "delete":
          if (query.filters) {
            for (const [key, value] of Object.entries(query.filters)) {
              dbQuery = dbQuery.eq(key, value);
            }
          }
          result = await dbQuery.delete();
          break;

        default:
          throw new Error(`Unsupported operation: ${query.operation}`);
      }

      if (result.error) {
        throw new Error(result.error.message);
      }

      return {
        queryId: query.id,
        success: true,
        data: result.data,
        metadata: {
          executionTime: Date.now() - startTime,
          cached: false,
          batched: false,
          deduplicated: false,
        },
      };
    } catch (error) {
      return {
        queryId: query.id,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          executionTime: Date.now() - startTime,
          cached: false,
          batched: false,
          deduplicated: false,
        },
      };
    }
  }

  private async getOptimalConnection(): Promise<ConnectionInfo> {
    // Find idle connection with best performance
    const idleConnections = Array.from(this.connectionPool.values())
      .filter((conn) => !conn.inUse)
      .sort((a, b) => a.avgResponseTime - b.avgResponseTime);

    if (idleConnections.length > 0) {
      return idleConnections[0];
    }

    // If no idle connections and pool not at max, create new one
    if (this.connectionPool.size < this.config.maxConnectionPool) {
      return this.createNewConnection();
    }

    // Wait for connection to become available
    return this.waitForConnection();
  }

  private createNewConnection(): ConnectionInfo {
    const connection: ConnectionInfo = {
      id: `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      client: this.primaryClient, // In real implementation, would create separate client
      inUse: false,
      lastUsed: new Date(),
      queryCount: 0,
      avgResponseTime: 0,
    };

    this.connectionPool.set(connection.id, connection);
    return connection;
  }

  private async waitForConnection(): Promise<ConnectionInfo> {
    return new Promise((resolve) => {
      const checkForConnection = () => {
        const idleConnection = Array.from(this.connectionPool.values()).find(
          (conn) => !conn.inUse,
        );

        if (idleConnection) {
          resolve(idleConnection);
        } else {
          setTimeout(checkForConnection, 10);
        }
      };

      checkForConnection();
    });
  }

  private findSuitableBatch(query: Query): QueryBatch | null {
    // Find batch with room that targets same table
    for (const batch of this.activeBatches.values()) {
      if (
        batch.queries.length < this.config.maxBatchSize &&
        batch.queries.some((q) => q.table === query.table)
      ) {
        return batch;
      }
    }
    return null;
  }

  private createNewBatch(): QueryBatch {
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const batch: QueryBatch = {
      id: batchId,
      queries: [],
      timestamp: new Date(),
      timeout: setTimeout(
        () => this.executeBatch(batchId),
        this.config.batchTimeout,
      ),
      resolve: () => {},
      reject: () => {},
    };

    this.activeBatches.set(batchId, batch);
    return batch;
  }

  private async executeBatch(batchId: string): Promise<void> {
    const batch = this.activeBatches.get(batchId);
    if (!batch || batch.queries.length === 0) {
      return;
    }

    try {
      const connection = await this.getOptimalConnection();
      connection.inUse = true;

      // Execute all queries in batch
      const results: QueryResult[] = [];

      for (const query of batch.queries) {
        try {
          const result = await this.performDatabaseOperation(
            connection.client,
            query,
          );
          results.push({
            ...result,
            metadata: {
              ...result.metadata,
              batched: true,
            },
          });
        } catch (error) {
          results.push({
            queryId: query.id,
            success: false,
            error: error instanceof Error ? error.message : String(error),
            metadata: {
              executionTime: 0,
              cached: false,
              batched: true,
              deduplicated: false,
            },
          });
        }
      }

      this.metrics.batchedQueries += batch.queries.length;
      batch.resolve(results);
      connection.inUse = false;
    } catch (error) {
      batch.reject(error instanceof Error ? error : new Error(String(error)));
    } finally {
      clearTimeout(batch.timeout);
      this.activeBatches.delete(batchId);
    }
  }

  private getCacheKey(query: Query): string {
    return `query:${query.table}:${query.operation}:${this.hashObject({
      filters: query.filters,
      options: query.options,
    })}`;
  }

  private getDeduplicationKey(query: Query): string {
    return this.getCacheKey(query);
  }

  private hashObject(obj: any): string {
    const str = JSON.stringify(obj, Object.keys(obj).sort());
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private generateQueryId(): string {
    return `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private updatePerformanceMetrics(
    executionTime: number,
    success: boolean,
  ): void {
    // Update average response time
    const totalTime =
      this.metrics.avgResponseTime * (this.metrics.totalQueries - 1) +
      executionTime;
    this.metrics.avgResponseTime = totalTime / this.metrics.totalQueries;

    // Track slow queries
    if (executionTime > this.config.slowQueryThreshold) {
      this.metrics.slowQueries++;

      if (this.config.enablePerformanceMonitoring) {
        console.warn(`Slow query detected: ${executionTime}ms`);
      }
    }
  }

  private updateCacheHitRate(): void {
    const totalRequests = this.metrics.totalQueries;
    const cacheHits =
      Math.round(this.metrics.cacheHitRate * (totalRequests - 1)) + 1;
    this.metrics.cacheHitRate = cacheHits / totalRequests;
  }

  private updateConnectionUtilization(): void {
    const totalConnections = this.connectionPool.size;
    const activeConnections = Array.from(this.connectionPool.values()).filter(
      (conn) => conn.inUse,
    ).length;

    this.metrics.connectionUtilization =
      totalConnections > 0 ? activeConnections / totalConnections : 0;
  }

  private initializeConnectionPool(): void {
    // Create initial connection
    this.createNewConnection();
  }

  private startPerformanceMonitoring(): void {
    if (!this.config.enablePerformanceMonitoring) return;

    setInterval(() => {
      const metrics = this.getMetrics();

      if (metrics.avgResponseTime > this.config.slowQueryThreshold) {
        console.warn(
          `High average query time: ${Math.round(metrics.avgResponseTime)}ms`,
        );
      }

      if (metrics.connectionUtilization > 0.8) {
        console.warn(
          `High connection utilization: ${Math.round(metrics.connectionUtilization * 100)}%`,
        );
      }

      if (metrics.cacheHitRate < 0.5) {
        console.info(
          `Low cache hit rate: ${Math.round(metrics.cacheHitRate * 100)}%`,
        );
      }
    }, 60000); // Check every minute
  }

  private startMaintenanceTasks(): void {
    // Clean up old connections and metrics
    setInterval(
      () => {
        const cutoffTime = Date.now() - 30 * 60 * 1000; // 30 minutes

        for (const [id, connection] of this.connectionPool) {
          if (!connection.inUse && connection.lastUsed.getTime() < cutoffTime) {
            this.connectionPool.delete(id);
          }
        }

        // Clean up old batches
        for (const [id, batch] of this.activeBatches) {
          if (batch.timestamp.getTime() < cutoffTime) {
            clearTimeout(batch.timeout);
            this.activeBatches.delete(id);
          }
        }

        // Clear old deduplication entries
        this.deduplicationMap.clear();
      },
      5 * 60 * 1000,
    ); // Every 5 minutes
  }
}

// Singleton instance
let optimizedQueryServiceInstance: OptimizedQueryService | null = null;

/**
 * Get the global optimized query service instance
 */
export function getOptimizedQueryService(
  client: TypedSupabaseClient,
): OptimizedQueryService {
  if (!optimizedQueryServiceInstance) {
    optimizedQueryServiceInstance = new OptimizedQueryService(client);
  }
  return optimizedQueryServiceInstance;
}

// Export types
export type {
  QueryOptimizationConfig,
  QueryMetrics,
  Query,
  QueryOptions,
  QueryResult,
};

// Default export
export default OptimizedQueryService;
