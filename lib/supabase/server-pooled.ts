/**
 * Connection pooling for server-side Supabase clients
 *
 * @module lib/supabase/server-pooled
 * @description Provides connection pooling for Supabase clients to optimize
 * database connections and improve performance in server environments
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";
import {
  getSupabaseConfig,
  getPoolConfig,
  hasServiceRoleKey,
  ADMIN_CLIENT_CONFIG,
} from "./supabase-config";
import {
  SupabaseConfigError,
  SupabasePoolError,
  SupabaseTimeoutError,
  withRetry,
} from "./supabase-errors";
import {
  ConnectionState,
  type TypedSupabaseClient,
  type PooledConnection,
  type PoolStatistics,
  type ConnectionMetrics,
  type HealthCheckResult,
} from "./supabase-types";

/**
 * Connection pool implementation with monitoring and health checks
 */
class SupabaseConnectionPool {
  private static instance: SupabaseConnectionPool | null = null;

  private readonly connections: Map<string, PooledConnection> = new Map();
  private readonly metrics: ConnectionMetrics[] = [];
  private readonly config = getPoolConfig();
  private isShuttingDown = false;
  private healthCheckInterval?: NodeJS.Timeout;
  private metricsCleanupInterval?: NodeJS.Timeout;
  private connectionIdCounter = 0;

  private constructor() {
    this.startHealthChecks();
    this.startMetricsCleanup();
    this.setupProcessHandlers();
  }

  /**
   * Get singleton instance of the connection pool
   */
  static getInstance(): SupabaseConnectionPool {
    if (!SupabaseConnectionPool.instance) {
      SupabaseConnectionPool.instance = new SupabaseConnectionPool();
    }
    return SupabaseConnectionPool.instance;
  }

  /**
   * Reset the singleton instance (for testing)
   */
  static reset(): void {
    if (SupabaseConnectionPool.instance) {
      SupabaseConnectionPool.instance.shutdown();
      SupabaseConnectionPool.instance = null;
    }
  }

  /**
   * Acquire a connection from the pool
   */
  async acquire(): Promise<TypedSupabaseClient> {
    if (this.isShuttingDown) {
      throw new SupabasePoolError("Connection pool is shutting down");
    }

    const startTime = Date.now();

    // Try to find an idle connection
    const idleConnection = this.findIdleConnection();
    if (idleConnection) {
      this.markConnectionInUse(idleConnection);
      this.recordMetric(idleConnection.id, startTime, true, "acquire");
      return idleConnection.client;
    }

    // Create new connection if under limit
    if (this.connections.size < this.config.maxConnections) {
      const connection = await this.createConnection();
      this.markConnectionInUse(connection);
      this.recordMetric(connection.id, startTime, true, "create");
      return connection.client;
    }

    // Wait for a connection to become available
    return this.waitForConnection(startTime);
  }

  /**
   * Release a connection back to the pool
   */
  release(client: TypedSupabaseClient): void {
    const connection = this.findConnectionByClient(client);

    if (!connection) {
      console.warn("Attempted to release unknown client");
      return;
    }

    connection.inUse = false;
    connection.lastUsed = new Date();
    connection.state = ConnectionState.IDLE;
  }

  /**
   * Get pool statistics
   */
  getStatistics(): PoolStatistics {
    const connections = Array.from(this.connections.values());
    const now = Date.now();

    const stats: PoolStatistics = {
      total: connections.length,
      inUse: connections.filter((c) => c.inUse).length,
      idle: connections.filter(
        (c) => !c.inUse && c.state === ConnectionState.IDLE,
      ).length,
      connecting: connections.filter(
        (c) => c.state === ConnectionState.CONNECTING,
      ).length,
      errors: connections.filter((c) => c.state === ConnectionState.ERROR)
        .length,
      maxConnections: this.config.maxConnections,
      minConnections: this.config.minConnections,
      avgWaitTime: this.calculateAverageWaitTime(),
      avgUseTime: this.calculateAverageUseTime(),
      totalRequests: this.metrics.length,
      totalErrors: this.metrics.filter((m) => !m.success).length,
      uptime: this.getUptime(),
      healthStatus: this.determineHealthStatus(),
    };

    return stats;
  }

  /**
   * Perform health check on the pool
   */
  async healthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    try {
      // Test database connectivity
      const testClient = await this.acquire();
      const { error } = await testClient
        .from("profiles")
        .select("id")
        .limit(1)
        .single();

      this.release(testClient);

      if (error) {
        errors.push(`Database check failed: ${error.message}`);
      }

      const latency = Date.now() - startTime;
      const stats = this.getStatistics();

      return {
        status: this.determineHealthStatus(),
        timestamp: new Date(),
        latency,
        details: {
          database: !error,
          auth: true, // Assume auth is working if we got this far
          storage: undefined,
          realtime: undefined,
        },
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      return {
        status: "unhealthy",
        timestamp: new Date(),
        latency: Date.now() - startTime,
        details: {
          database: false,
          auth: false,
        },
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  /**
   * Shutdown the connection pool
   */
  async shutdown(): Promise<void> {
    this.isShuttingDown = true;

    // Clear intervals
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.metricsCleanupInterval) {
      clearInterval(this.metricsCleanupInterval);
    }

    // Wait for all connections to be released
    const timeout = Date.now() + 10000; // 10 second timeout
    while (this.connections.size > 0 && Date.now() < timeout) {
      const inUse = Array.from(this.connections.values()).filter(
        (c) => c.inUse,
      );
      if (inUse.length === 0) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Clear all connections
    this.connections.clear();
    this.metrics.length = 0;
  }

  // Private helper methods

  private findIdleConnection(): PooledConnection | undefined {
    return Array.from(this.connections.values()).find(
      (conn) => !conn.inUse && conn.state === ConnectionState.IDLE,
    );
  }

  private findConnectionByClient(
    client: TypedSupabaseClient,
  ): PooledConnection | undefined {
    return Array.from(this.connections.values()).find(
      (conn) => conn.client === client,
    );
  }

  private async createConnection(): Promise<PooledConnection> {
    const config = getSupabaseConfig();

    if (!hasServiceRoleKey()) {
      throw new SupabaseConfigError(
        "Service role key is required for pooled connections",
      );
    }

    const id = `conn_${++this.connectionIdCounter}`;

    const client = createClient<Database>(
      config.url,
      config.serviceRoleKey!,
      ADMIN_CLIENT_CONFIG,
    ) as TypedSupabaseClient;

    const connection: PooledConnection = {
      id,
      client,
      state: ConnectionState.CONNECTED,
      created: new Date(),
      lastUsed: new Date(),
      useCount: 0,
      errors: 0,
      inUse: false,
    };

    this.connections.set(id, connection);
    return connection;
  }

  private markConnectionInUse(connection: PooledConnection): void {
    connection.inUse = true;
    connection.lastUsed = new Date();
    connection.useCount++;
    connection.state = ConnectionState.CONNECTED;
  }

  private async waitForConnection(
    startTime: number,
  ): Promise<TypedSupabaseClient> {
    const timeout = this.config.connectionTimeout;

    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        // Check if timeout exceeded
        if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          const stats = this.getStatistics();
          reject(
            new SupabaseTimeoutError(
              "Connection pool timeout - no connections available",
              timeout,
              { poolStats: stats },
            ),
          );
          return;
        }

        // Check for available connection
        const connection = this.findIdleConnection();
        if (connection) {
          clearInterval(checkInterval);
          this.markConnectionInUse(connection);
          this.recordMetric(connection.id, startTime, true, "wait");
          resolve(connection.client);
        }
      }, 50); // Check every 50ms
    });
  }

  private recordMetric(
    connectionId: string,
    startTime: number,
    success: boolean,
    operationType: string,
  ): void {
    this.metrics.push({
      connectionId,
      startTime: new Date(startTime),
      endTime: new Date(),
      duration: Date.now() - startTime,
      operationType,
      success,
    });
  }

  private calculateAverageWaitTime(): number {
    const waitMetrics = this.metrics.filter((m) => m.operationType === "wait");
    if (waitMetrics.length === 0) return 0;

    const total = waitMetrics.reduce((sum, m) => sum + (m.duration || 0), 0);
    return total / waitMetrics.length;
  }

  private calculateAverageUseTime(): number {
    const useMetrics = this.metrics.filter(
      (m) => m.operationType === "acquire",
    );
    if (useMetrics.length === 0) return 0;

    const total = useMetrics.reduce((sum, m) => sum + (m.duration || 0), 0);
    return total / useMetrics.length;
  }

  private getUptime(): number {
    if (this.connections.size === 0) return 0;

    const oldestConnection = Array.from(this.connections.values()).sort(
      (a, b) => a.created.getTime() - b.created.getTime(),
    )[0];

    return Date.now() - oldestConnection.created.getTime();
  }

  private determineHealthStatus(): "healthy" | "degraded" | "unhealthy" {
    const stats = {
      total: this.connections.size,
      inUse: Array.from(this.connections.values()).filter((c) => c.inUse)
        .length,
      errors: Array.from(this.connections.values()).filter(
        (c) => c.state === ConnectionState.ERROR,
      ).length,
    };

    // Unhealthy conditions
    if (stats.errors > stats.total * 0.5) return "unhealthy";
    if (stats.total === 0) return "unhealthy";

    // Degraded conditions
    if (stats.errors > stats.total * 0.2) return "degraded";
    if (
      stats.inUse === stats.total &&
      stats.total === this.config.maxConnections
    )
      return "degraded";

    return "healthy";
  }

  private startHealthChecks(): void {
    if (this.config.enableHealthChecks) {
      this.healthCheckInterval = setInterval(
        () => this.performBackgroundHealthCheck(),
        30000, // Every 30 seconds - increased frequency for better monitoring
      );
    }
  }

  private startMetricsCleanup(): void {
    this.metricsCleanupInterval = setInterval(
      () => this.cleanupOldMetrics(),
      300000, // Every 5 minutes
    );
  }

  private async performBackgroundHealthCheck(): Promise<void> {
    try {
      const result = await this.healthCheck();

      // Enhanced health monitoring with connection recovery
      if (result.status === "unhealthy") {
        console.error("Connection pool health check failed:", result.errors);
        await this.handleUnhealthyPool(result);
      } else if (result.status === "degraded") {
        console.warn("Connection pool performance degraded:", result.errors);
        await this.handleDegradedPool(result);
      }

      // Update connection health scores
      this.updateConnectionHealthScores(result);

      // Log health metrics periodically
      if (this.config.enableMonitoring) {
        this.logHealthMetrics(result);
      }
    } catch (error) {
      console.error("Background health check error:", error);
      await this.handleHealthCheckFailure(
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  private cleanupOldMetrics(): void {
    const cutoff = Date.now() - 3600000; // Keep last hour
    const cutoffDate = new Date(cutoff);

    const oldCount = this.metrics.length;
    this.metrics.splice(
      0,
      this.metrics.findIndex((m) => m.startTime > cutoffDate),
    );

    if (this.config.enableMonitoring && oldCount !== this.metrics.length) {
      console.log(`Cleaned up ${oldCount - this.metrics.length} old metrics`);
    }
  }

  private cleanupIdleConnections(): void {
    const now = Date.now();
    const minConnections = this.config.minConnections;

    Array.from(this.connections.entries()).forEach(([id, connection]) => {
      const idleTime = now - connection.lastUsed.getTime();
      const shouldRemove =
        !connection.inUse &&
        idleTime > this.config.idleTimeout &&
        this.connections.size > minConnections;

      if (shouldRemove) {
        this.connections.delete(id);
        if (this.config.enableMonitoring) {
          console.log(`Removed idle connection ${id}`);
        }
      }
    });
  }

  private setupProcessHandlers(): void {
    // Cleanup on process exit
    process.once("exit", () => this.shutdown());
    process.once("SIGINT", () => this.shutdown());
    process.once("SIGTERM", () => this.shutdown());
  }

  // Enhanced health monitoring methods

  private async handleUnhealthyPool(result: HealthCheckResult): Promise<void> {
    console.warn("🚨 Pool unhealthy - attempting recovery...");

    // Remove failed connections
    const failedConnections = Array.from(this.connections.values()).filter(
      (c) => c.state === ConnectionState.ERROR,
    );

    failedConnections.forEach((connection) => {
      this.connections.delete(connection.id);
      if (this.config.enableMonitoring) {
        console.log(`Removed failed connection: ${connection.id}`);
      }
    });

    // Try to create replacement connections if below minimum
    if (this.connections.size < this.config.minConnections) {
      const needed = this.config.minConnections - this.connections.size;
      console.log(`Creating ${needed} replacement connections...`);

      for (let i = 0; i < needed; i++) {
        try {
          await this.createConnection();
        } catch (error) {
          console.error("Failed to create replacement connection:", error);
          break; // Don't continue if creation fails
        }
      }
    }
  }

  private async handleDegradedPool(result: HealthCheckResult): Promise<void> {
    console.warn("⚠️ Pool degraded - optimizing performance...");

    // Clean up idle connections that might be causing issues
    this.cleanupIdleConnections();

    // If we're at max capacity and degraded, consider if some connections are unhealthy
    const stats = this.getStatistics();
    if (
      stats.inUse === stats.total &&
      stats.total === this.config.maxConnections
    ) {
      console.log("Pool at capacity - monitoring for stuck connections");
      // Note: In production, you might want to add logic to detect and recover stuck connections
    }
  }

  private updateConnectionHealthScores(result: HealthCheckResult): void {
    // For the basic pool, we don't have individual health scores like the dynamic pool
    // But we can update connection error counts based on test results
    if (result.errors && result.errors.length > 0) {
      // Mark connections as potentially problematic if database test failed
      this.connections.forEach((connection) => {
        if (result.details?.database === false) {
          connection.errors++;
        }
      });
    }
  }

  private logHealthMetrics(result: HealthCheckResult): void {
    const stats = this.getStatistics();
    const healthLog = {
      timestamp: new Date().toISOString(),
      status: result.status,
      latency: result.latency,
      poolStats: {
        total: stats.total,
        inUse: stats.inUse,
        idle: stats.idle,
        errors: stats.errors,
        utilization: Math.round((stats.inUse / Math.max(stats.total, 1)) * 100),
      },
      avgWaitTime: stats.avgWaitTime,
      avgUseTime: stats.avgUseTime,
      totalRequests: stats.totalRequests,
      errorRate:
        stats.totalErrors > 0
          ? Math.round((stats.totalErrors / stats.totalRequests) * 100)
          : 0,
    };

    // In production, you might want to send this to a monitoring service
    if (this.config.enableMonitoring) {
      console.log(
        "📊 Pool Health Metrics:",
        JSON.stringify(healthLog, null, 2),
      );
    }
  }

  private async handleHealthCheckFailure(error: Error): Promise<void> {
    console.error("🚨 Health check system failure:", error.message);

    // If health checks are consistently failing, we might have a systemic issue
    // For now, we'll just log it, but in production you might want to:
    // 1. Alert monitoring systems
    // 2. Attempt pool reset if failures persist
    // 3. Switch to a backup connection strategy

    const stats = this.getStatistics();
    console.log(
      `Current pool state: ${stats.total} total, ${stats.inUse} in use, ${stats.errors} errors`,
    );
  }
}

// Singleton pool instance
const pool = SupabaseConnectionPool.getInstance();

/**
 * Create a pooled Supabase client
 *
 * @description Gets a Supabase client from the connection pool for optimized
 * database operations. The client uses the service role key for admin operations.
 *
 * @returns {Promise<TypedSupabaseClient>} Pooled Supabase client
 * @throws {SupabasePoolError} If unable to acquire connection
 * @throws {SupabaseTimeoutError} If connection acquisition times out
 *
 * @example
 * ```typescript
 * const client = await createPooledClient();
 * try {
 *   const { data } = await client.from('users').select('*');
 *   // Use data
 * } finally {
 *   releasePooledClient(client);
 * }
 * ```
 */
export async function createPooledClient(): Promise<TypedSupabaseClient> {
  return pool.acquire();
}

/**
 * Release a pooled client back to the pool
 *
 * @param {TypedSupabaseClient} client - The client to release
 *
 * @example
 * ```typescript
 * const client = await createPooledClient();
 * try {
 *   // Use client
 * } finally {
 *   releasePooledClient(client);
 * }
 * ```
 */
export function releasePooledClient(client: TypedSupabaseClient): void {
  pool.release(client);
}

/**
 * Get connection pool statistics
 *
 * @returns {PoolStatistics} Current pool statistics
 *
 * @example
 * ```typescript
 * const stats = getPoolStats();
 * console.log(`Connections: ${stats.inUse}/${stats.total}`);
 * ```
 */
export function getPoolStats(): PoolStatistics {
  return pool.getStatistics();
}

/**
 * Perform health check on the connection pool
 *
 * @returns {Promise<HealthCheckResult>} Health check result
 *
 * @example
 * ```typescript
 * const health = await checkPoolHealth();
 * if (health.status === 'unhealthy') {
 *   console.error('Pool is unhealthy:', health.errors);
 * }
 * ```
 */
export async function checkPoolHealth(): Promise<HealthCheckResult> {
  return pool.healthCheck();
}

/**
 * Gracefully shut down the connection pool
 *
 * @returns {Promise<void>}
 *
 * @example
 * ```typescript
 * // In cleanup code
 * await closePool();
 * ```
 */
export async function closePool(): Promise<void> {
  return pool.shutdown();
}

/**
 * Execute an operation with automatic connection management
 *
 * @param {Function} operation - The operation to execute
 * @returns {Promise<T>} Result of the operation
 *
 * @example
 * ```typescript
 * const users = await withPooledClient(async (client) => {
 *   const { data } = await client.from('users').select('*');
 *   return data;
 * });
 * ```
 */
export async function withPooledClient<T>(
  operation: (client: TypedSupabaseClient) => Promise<T>,
): Promise<T> {
  const client = await createPooledClient();
  try {
    return await operation(client);
  } finally {
    releasePooledClient(client);
  }
}

/**
 * Create a pooled client with retry logic
 *
 * @returns {Promise<TypedSupabaseClient>} Pooled client
 *
 * @example
 * ```typescript
 * const client = await createPooledClientWithRetry();
 * ```
 */
export async function createPooledClientWithRetry(): Promise<TypedSupabaseClient> {
  return withRetry(() => createPooledClient(), {
    maxAttempts: 3,
    shouldRetry: (error, attempt) => {
      if (error instanceof SupabaseTimeoutError) {
        return attempt < 3;
      }
      if (error instanceof SupabasePoolError) {
        const message = error.message.toLowerCase();
        return !message.includes("shutting down") && attempt < 3;
      }
      return false;
    },
    getDelay: (attempt) => Math.min(1000 * Math.pow(2, attempt - 1), 5000),
  });
}

// Export for testing
export const __testing = {
  resetPool: () => SupabaseConnectionPool.reset(),
};
