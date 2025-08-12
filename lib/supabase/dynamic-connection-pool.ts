/**
 * Dynamic Supabase Connection Pool - Phase 2 Performance Optimization
 *
 * Advanced connection pool with dynamic scaling, load-based optimization,
 * and intelligent health monitoring.
 *
 * Features:
 * - Dynamic pool sizing based on utilization patterns
 * - Load-based connection scaling (5-50 connections)
 * - Connection health monitoring with automatic recovery
 * - Performance-based auto-scaling
 * - Zero-downtime scaling operations
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";
import {
  getSupabaseConfig,
  hasServiceRoleKey,
  ADMIN_CLIENT_CONFIG,
} from "./supabase-config";
import {
  SupabaseConfigError,
  SupabasePoolError,
  SupabaseTimeoutError,
} from "./supabase-errors";
import { ConnectionState, type TypedSupabaseClient } from "./supabase-types";

// Enhanced pool configuration for dynamic scaling
interface DynamicPoolConfig {
  minConnections: number;
  maxConnections: number;
  targetUtilization: number; // Target utilization percentage (0-100)
  scaleUpThreshold: number; // Scale up when utilization exceeds this
  scaleDownThreshold: number; // Scale down when utilization falls below this
  scaleUpCooldown: number; // Cooldown period after scaling up (ms)
  scaleDownCooldown: number; // Cooldown period after scaling down (ms)
  healthCheckInterval: number; // Health check frequency (ms)
  connectionTimeout: number; // Connection acquisition timeout (ms)
  idleTimeout: number; // Idle connection timeout (ms)
  performanceWindowSize: number; // Performance metrics window size
  enableAutoScaling: boolean;
  enablePerformanceOptimization: boolean;
}

// Enhanced connection with performance metrics
interface DynamicPooledConnection {
  id: string;
  client: TypedSupabaseClient;
  state: ConnectionState;
  created: Date;
  lastUsed: Date;
  lastHealthCheck: Date;
  useCount: number;
  errors: number;
  inUse: boolean;
  avgResponseTime: number;
  totalResponseTime: number;
  successRate: number;
  healthScore: number; // 0-100 health score
}

// Pool performance metrics
interface PoolPerformanceMetrics {
  timestamp: Date;
  totalConnections: number;
  activeConnections: number;
  utilization: number; // Percentage
  avgResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
  queueLength: number;
  scalingDecision?: "scale_up" | "scale_down" | "maintain";
  scalingReason?: string;
}

// Scaling decision context
interface ScalingContext {
  currentUtilization: number;
  avgResponseTime: number;
  queueLength: number;
  errorRate: number;
  recentMetrics: PoolPerformanceMetrics[];
  timeSinceLastScale: number;
}

/**
 * Dynamic Connection Pool with Intelligent Scaling
 */
export class DynamicSupabaseConnectionPool {
  private static instance: DynamicSupabaseConnectionPool | null = null;

  private readonly connections: Map<string, DynamicPooledConnection> =
    new Map();
  private readonly connectionQueue: Array<{
    resolve: (client: TypedSupabaseClient) => void;
    reject: (error: Error) => void;
    startTime: number;
  }> = [];

  private readonly performanceMetrics: PoolPerformanceMetrics[] = [];
  private readonly config: DynamicPoolConfig;

  private isShuttingDown = false;
  private connectionIdCounter = 0;
  private lastScaleUp = 0;
  private lastScaleDown = 0;

  // Monitoring intervals
  private healthCheckInterval?: NodeJS.Timeout;
  private scalingInterval?: NodeJS.Timeout;
  private metricsInterval?: NodeJS.Timeout;
  private cleanupInterval?: NodeJS.Timeout;

  // Performance tracking
  private requestCount = 0;
  private requestStartTime = Date.now();

  private constructor(config?: Partial<DynamicPoolConfig>) {
    this.config = {
      minConnections: 5,
      maxConnections: 50,
      targetUtilization: 70,
      scaleUpThreshold: 80,
      scaleDownThreshold: 30,
      scaleUpCooldown: 60000, // 1 minute
      scaleDownCooldown: 300000, // 5 minutes
      healthCheckInterval: 30000, // 30 seconds
      connectionTimeout: 15000, // 15 seconds
      idleTimeout: 600000, // 10 minutes
      performanceWindowSize: 100, // Keep last 100 metrics
      enableAutoScaling: true,
      enablePerformanceOptimization: true,
      ...config,
    };

    this.initializePool();
    this.startMonitoring();
    this.setupProcessHandlers();
  }

  /**
   * Get singleton instance with dynamic scaling
   */
  static getInstance(
    config?: Partial<DynamicPoolConfig>,
  ): DynamicSupabaseConnectionPool {
    if (!DynamicSupabaseConnectionPool.instance) {
      DynamicSupabaseConnectionPool.instance =
        new DynamicSupabaseConnectionPool(config);
    }
    return DynamicSupabaseConnectionPool.instance;
  }

  /**
   * Reset singleton (for testing)
   */
  static reset(): void {
    if (DynamicSupabaseConnectionPool.instance) {
      DynamicSupabaseConnectionPool.instance.shutdown();
      DynamicSupabaseConnectionPool.instance = null;
    }
  }

  /**
   * Acquire connection with dynamic scaling
   */
  async acquire(): Promise<TypedSupabaseClient> {
    if (this.isShuttingDown) {
      throw new SupabasePoolError("Connection pool is shutting down");
    }

    const startTime = Date.now();
    this.requestCount++;

    try {
      // Try to find healthy idle connection
      const connection = this.findBestIdleConnection();
      if (connection) {
        this.markConnectionInUse(connection, startTime);
        return connection.client;
      }

      // Try to create new connection if under max limit
      if (this.connections.size < this.config.maxConnections) {
        const newConnection = await this.createConnection();
        this.markConnectionInUse(newConnection, startTime);
        return newConnection.client;
      }

      // Queue the request and trigger scaling if needed
      return this.queueConnectionRequest(startTime);
    } catch (error) {
      console.error("Connection acquisition failed:", error);
      throw error;
    }
  }

  /**
   * Release connection back to pool with enhanced health scoring
   */
  release(client: TypedSupabaseClient, success: boolean = true): void {
    const connection = this.findConnectionByClient(client);
    if (!connection) {
      console.warn("Attempted to release unknown client");
      return;
    }

    // Update connection metrics and health score
    const responseTime = Date.now() - connection.lastUsed.getTime();
    connection.totalResponseTime += responseTime;
    connection.avgResponseTime =
      connection.totalResponseTime / connection.useCount;

    // Enhanced health score calculation based on operation success and performance
    if (success) {
      connection.healthScore = Math.min(100, connection.healthScore + 1);
      connection.successRate =
        (connection.successRate * (connection.useCount - 1) + 100) /
        connection.useCount;
    } else {
      connection.errors++;
      connection.healthScore = Math.max(0, connection.healthScore - 10);
      connection.successRate =
        (connection.successRate * (connection.useCount - 1) + 0) /
        connection.useCount;
    }

    // Performance-based health adjustments
    if (responseTime > 2000) {
      connection.healthScore = Math.max(0, connection.healthScore - 5);
    } else if (responseTime < 100) {
      connection.healthScore = Math.min(100, connection.healthScore + 2);
    }

    connection.inUse = false;
    connection.lastUsed = new Date();
    connection.state = ConnectionState.IDLE;

    // Process queued requests
    this.processConnectionQueue();
  }

  /**
   * Get comprehensive pool statistics
   */
  getStatistics() {
    const connections = Array.from(this.connections.values());
    const now = Date.now();

    const utilization = this.calculateUtilization();
    const avgResponseTime = this.calculateAverageResponseTime();
    const requestsPerSecond = this.calculateRequestsPerSecond();

    return {
      // Basic stats
      totalConnections: connections.length,
      activeConnections: connections.filter((c) => c.inUse).length,
      idleConnections: connections.filter(
        (c) => !c.inUse && c.state === ConnectionState.IDLE,
      ).length,
      errorConnections: connections.filter(
        (c) => c.state === ConnectionState.ERROR,
      ).length,
      queueLength: this.connectionQueue.length,

      // Configuration
      minConnections: this.config.minConnections,
      maxConnections: this.config.maxConnections,
      targetUtilization: this.config.targetUtilization,

      // Performance metrics
      utilization: Math.round(utilization * 100) / 100,
      avgResponseTime: Math.round(avgResponseTime),
      requestsPerSecond: Math.round(requestsPerSecond * 100) / 100,
      errorRate: this.calculateErrorRate(),

      // Health metrics
      healthScore: this.calculateOverallHealthScore(),
      lastScaleAction: {
        scaleUp: this.lastScaleUp ? new Date(this.lastScaleUp) : null,
        scaleDown: this.lastScaleDown ? new Date(this.lastScaleDown) : null,
      },

      // Scaling status
      canScaleUp: this.canScaleUp(),
      canScaleDown: this.canScaleDown(),
      autoScalingEnabled: this.config.enableAutoScaling,

      // Recent metrics
      recentMetrics: this.performanceMetrics.slice(-10),
    };
  }

  /**
   * Perform comprehensive health check
   */
  async healthCheck() {
    const startTime = Date.now();
    const errors: string[] = [];
    const healthTests: Array<{
      name: string;
      success: boolean;
      latency?: number;
    }> = [];

    try {
      // Test database connectivity
      const testConnection = await this.createConnection();
      const dbTestStart = Date.now();

      try {
        const { error } = await testConnection.client
          .from("profiles")
          .select("id")
          .limit(1)
          .single();

        const dbLatency = Date.now() - dbTestStart;
        healthTests.push({
          name: "database_connectivity",
          success: !error,
          latency: dbLatency,
        });

        if (error) {
          errors.push(`Database connectivity test failed: ${error.message}`);
        }
      } finally {
        // Clean up test connection
        this.connections.delete(testConnection.id);
      }

      // Test pool capacity
      const stats = this.getStatistics();
      const capacityHealthy = stats.utilization < 95;
      healthTests.push({
        name: "pool_capacity",
        success: capacityHealthy,
      });

      if (!capacityHealthy) {
        errors.push(
          `Pool capacity critical: ${stats.utilization}% utilization`,
        );
      }

      // Test connection health
      const unhealthyConnections = Array.from(this.connections.values()).filter(
        (c) => c.healthScore < 50,
      ).length;
      const connectionHealthy =
        unhealthyConnections < stats.totalConnections * 0.2;

      healthTests.push({
        name: "connection_health",
        success: connectionHealthy,
      });

      if (!connectionHealthy) {
        errors.push(`${unhealthyConnections} unhealthy connections detected`);
      }

      const overallHealth =
        errors.length === 0
          ? "healthy"
          : errors.length <= 1
            ? "degraded"
            : "unhealthy";

      return {
        status: overallHealth,
        timestamp: new Date(),
        latency: Date.now() - startTime,
        tests: healthTests,
        errors: errors.length > 0 ? errors : undefined,
        recommendations: this.getHealthRecommendations(stats),
      };
    } catch (error) {
      return {
        status: "unhealthy" as const,
        timestamp: new Date(),
        latency: Date.now() - startTime,
        tests: healthTests,
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  /**
   * Manually trigger scaling decision
   */
  async triggerScaling(): Promise<void> {
    if (!this.config.enableAutoScaling) {
      throw new Error("Auto-scaling is disabled");
    }

    const context = this.buildScalingContext();
    const decision = this.makeScalingDecision(context);

    if (decision) {
      await this.executeScalingDecision(decision, context);
    }
  }

  /**
   * Graceful shutdown with connection draining
   */
  async shutdown(): Promise<void> {
    console.log("Initiating dynamic pool shutdown...");
    this.isShuttingDown = true;

    // Clear all intervals
    [
      this.healthCheckInterval,
      this.scalingInterval,
      this.metricsInterval,
      this.cleanupInterval,
    ].forEach((interval) => {
      if (interval) clearInterval(interval);
    });

    // Reject all queued requests
    this.connectionQueue.forEach(({ reject }) => {
      reject(new SupabasePoolError("Connection pool is shutting down"));
    });
    this.connectionQueue.length = 0;

    // Wait for active connections to complete with timeout
    const timeout = Date.now() + 30000; // 30 second timeout

    while (this.hasActiveConnections() && Date.now() < timeout) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Force close remaining connections
    this.connections.clear();
    console.log("Dynamic pool shutdown completed");
  }

  // Private implementation methods

  private async initializePool(): Promise<void> {
    console.log(
      `Initializing dynamic pool with ${this.config.minConnections} minimum connections`,
    );

    // Create minimum connections
    const connectionPromises = Array.from(
      { length: this.config.minConnections },
      () =>
        this.createConnection().catch((error) => {
          console.error("Failed to create initial connection:", error);
          return null;
        }),
    );

    const connections = await Promise.all(connectionPromises);
    const successfulConnections = connections.filter(Boolean).length;

    console.log(
      `Dynamic pool initialized with ${successfulConnections}/${this.config.minConnections} connections`,
    );
  }

  private async createConnection(): Promise<DynamicPooledConnection> {
    const config = getSupabaseConfig();

    if (!hasServiceRoleKey()) {
      throw new SupabaseConfigError(
        "Service role key required for pooled connections",
      );
    }

    const id = `dynpool_${++this.connectionIdCounter}_${Date.now()}`;
    const now = new Date();

    const client = createClient<Database>(
      config.url,
      config.serviceRoleKey!,
      ADMIN_CLIENT_CONFIG,
    ) as TypedSupabaseClient;

    const connection: DynamicPooledConnection = {
      id,
      client,
      state: ConnectionState.CONNECTED,
      created: now,
      lastUsed: now,
      lastHealthCheck: now,
      useCount: 0,
      errors: 0,
      inUse: false,
      avgResponseTime: 0,
      totalResponseTime: 0,
      successRate: 100,
      healthScore: 100,
    };

    this.connections.set(id, connection);
    return connection;
  }

  private findBestIdleConnection(): DynamicPooledConnection | undefined {
    const idleConnections = Array.from(this.connections.values())
      .filter(
        (c) =>
          !c.inUse && c.state === ConnectionState.IDLE && c.healthScore > 70,
      )
      .sort((a, b) => {
        // Prioritize by health score and recent usage
        const healthDiff = b.healthScore - a.healthScore;
        if (Math.abs(healthDiff) > 10) return healthDiff;

        return b.lastUsed.getTime() - a.lastUsed.getTime();
      });

    return idleConnections[0];
  }

  private findConnectionByClient(
    client: TypedSupabaseClient,
  ): DynamicPooledConnection | undefined {
    return Array.from(this.connections.values()).find(
      (c) => c.client === client,
    );
  }

  private markConnectionInUse(
    connection: DynamicPooledConnection,
    startTime: number,
  ): void {
    connection.inUse = true;
    connection.lastUsed = new Date(startTime);
    connection.useCount++;
    connection.state = ConnectionState.CONNECTED;
  }

  private async queueConnectionRequest(
    startTime: number,
  ): Promise<TypedSupabaseClient> {
    return new Promise<TypedSupabaseClient>((resolve, reject) => {
      // Check if we should trigger scaling
      if (this.config.enableAutoScaling) {
        this.considerScaling();
      }

      const timeoutId = setTimeout(() => {
        const index = this.connectionQueue.findIndex(
          (req) => req.resolve === resolve,
        );
        if (index !== -1) {
          this.connectionQueue.splice(index, 1);
          reject(
            new SupabaseTimeoutError(
              "Connection request timeout",
              this.config.connectionTimeout,
              { queueLength: this.connectionQueue.length },
            ),
          );
        }
      }, this.config.connectionTimeout);

      this.connectionQueue.push({
        resolve: (client) => {
          clearTimeout(timeoutId);
          resolve(client);
        },
        reject: (error) => {
          clearTimeout(timeoutId);
          reject(error);
        },
        startTime,
      });
    });
  }

  private processConnectionQueue(): void {
    while (this.connectionQueue.length > 0) {
      const connection = this.findBestIdleConnection();
      if (!connection) break;

      const request = this.connectionQueue.shift();
      if (request) {
        this.markConnectionInUse(connection, request.startTime);
        request.resolve(connection.client);
      }
    }
  }

  private buildScalingContext(): ScalingContext {
    const utilization = this.calculateUtilization();
    const avgResponseTime = this.calculateAverageResponseTime();
    const errorRate = this.calculateErrorRate();

    return {
      currentUtilization: utilization,
      avgResponseTime,
      queueLength: this.connectionQueue.length,
      errorRate,
      recentMetrics: this.performanceMetrics.slice(-20),
      timeSinceLastScale: Math.min(
        Date.now() - this.lastScaleUp,
        Date.now() - this.lastScaleDown,
      ),
    };
  }

  private makeScalingDecision(
    context: ScalingContext,
  ): "scale_up" | "scale_down" | null {
    const { currentUtilization, avgResponseTime, queueLength, errorRate } =
      context;

    // Scale up conditions
    const shouldScaleUp =
      (currentUtilization > this.config.scaleUpThreshold ||
        queueLength > 5 ||
        avgResponseTime > 1000 ||
        errorRate > 5) &&
      this.canScaleUp();

    // Scale down conditions
    const shouldScaleDown =
      currentUtilization < this.config.scaleDownThreshold &&
      queueLength === 0 &&
      avgResponseTime < 200 &&
      errorRate < 1 &&
      this.canScaleDown();

    if (shouldScaleUp) return "scale_up";
    if (shouldScaleDown) return "scale_down";
    return null;
  }

  private async executeScalingDecision(
    decision: "scale_up" | "scale_down",
    context: ScalingContext,
  ): Promise<void> {
    const currentSize = this.connections.size;

    try {
      if (decision === "scale_up") {
        const targetIncrease = Math.min(
          Math.ceil(currentSize * 0.5), // Increase by 50%
          this.config.maxConnections - currentSize,
        );

        await this.scaleUp(targetIncrease);
        this.lastScaleUp = Date.now();

        console.log(
          `Scaled up: +${targetIncrease} connections (${currentSize} → ${this.connections.size})`,
        );
      } else {
        const targetDecrease = Math.floor(
          Math.min(currentSize * 0.3, currentSize - this.config.minConnections),
        );

        await this.scaleDown(targetDecrease);
        this.lastScaleDown = Date.now();

        console.log(
          `Scaled down: -${targetDecrease} connections (${currentSize} → ${this.connections.size})`,
        );
      }

      // Record scaling decision in metrics
      this.recordScalingMetric(decision, context);
    } catch (error) {
      console.error(`Scaling ${decision} failed:`, error);
    }
  }

  private async scaleUp(targetIncrease: number): Promise<void> {
    const connectionPromises = Array.from(
      { length: targetIncrease },
      async () => {
        try {
          return await this.createConnection();
        } catch (error) {
          console.error("Failed to create connection during scale-up:", error);
          return null;
        }
      },
    );

    await Promise.all(connectionPromises);
  }

  private async scaleDown(targetDecrease: number): Promise<void> {
    // Find idle connections to remove, prioritizing least healthy and oldest
    const idleConnections = Array.from(this.connections.values())
      .filter((c) => !c.inUse && c.state === ConnectionState.IDLE)
      .sort((a, b) => {
        const healthDiff = a.healthScore - b.healthScore;
        if (Math.abs(healthDiff) > 20) return healthDiff;
        return a.created.getTime() - b.created.getTime();
      });

    const connectionsToRemove = idleConnections.slice(0, targetDecrease);

    connectionsToRemove.forEach((connection) => {
      this.connections.delete(connection.id);
    });
  }

  private canScaleUp(): boolean {
    return (
      this.connections.size < this.config.maxConnections &&
      Date.now() - this.lastScaleUp > this.config.scaleUpCooldown
    );
  }

  private canScaleDown(): boolean {
    return (
      this.connections.size > this.config.minConnections &&
      Date.now() - this.lastScaleDown > this.config.scaleDownCooldown
    );
  }

  private calculateUtilization(): number {
    if (this.connections.size === 0) return 0;
    const activeCount = Array.from(this.connections.values()).filter(
      (c) => c.inUse,
    ).length;
    return (activeCount / this.connections.size) * 100;
  }

  private calculateAverageResponseTime(): number {
    const connections = Array.from(this.connections.values()).filter(
      (c) => c.useCount > 0,
    );
    if (connections.length === 0) return 0;

    const totalAvgTime = connections.reduce(
      (sum, c) => sum + c.avgResponseTime,
      0,
    );
    return totalAvgTime / connections.length;
  }

  private calculateRequestsPerSecond(): number {
    const timeWindow = Date.now() - this.requestStartTime;
    if (timeWindow === 0) return 0;
    return (this.requestCount / timeWindow) * 1000;
  }

  private calculateErrorRate(): number {
    const totalOperations = Array.from(this.connections.values()).reduce(
      (sum, c) => sum + c.useCount,
      0,
    );
    const totalErrors = Array.from(this.connections.values()).reduce(
      (sum, c) => sum + c.errors,
      0,
    );

    if (totalOperations === 0) return 0;
    return (totalErrors / totalOperations) * 100;
  }

  private calculateOverallHealthScore(): number {
    const connections = Array.from(this.connections.values());
    if (connections.length === 0) return 0;

    const totalScore = connections.reduce((sum, c) => sum + c.healthScore, 0);
    return totalScore / connections.length;
  }

  private hasActiveConnections(): boolean {
    return Array.from(this.connections.values()).some((c) => c.inUse);
  }

  private considerScaling(): void {
    const context = this.buildScalingContext();
    const decision = this.makeScalingDecision(context);

    if (decision) {
      // Execute scaling in background
      this.executeScalingDecision(decision, context).catch((error) => {
        console.error("Background scaling failed:", error);
      });
    }
  }

  private recordScalingMetric(
    decision: "scale_up" | "scale_down",
    context: ScalingContext,
  ): void {
    const metric: PoolPerformanceMetrics = {
      timestamp: new Date(),
      totalConnections: this.connections.size,
      activeConnections: Array.from(this.connections.values()).filter(
        (c) => c.inUse,
      ).length,
      utilization: context.currentUtilization,
      avgResponseTime: context.avgResponseTime,
      requestsPerSecond: this.calculateRequestsPerSecond(),
      errorRate: context.errorRate,
      queueLength: context.queueLength,
      scalingDecision: decision,
      scalingReason: this.getScalingReason(decision, context),
    };

    this.performanceMetrics.push(metric);

    // Keep only recent metrics
    if (this.performanceMetrics.length > this.config.performanceWindowSize) {
      this.performanceMetrics.splice(
        0,
        this.performanceMetrics.length - this.config.performanceWindowSize,
      );
    }
  }

  private getScalingReason(
    decision: "scale_up" | "scale_down",
    context: ScalingContext,
  ): string {
    if (decision === "scale_up") {
      if (context.currentUtilization > this.config.scaleUpThreshold) {
        return `High utilization: ${context.currentUtilization.toFixed(1)}%`;
      }
      if (context.queueLength > 5) {
        return `Queue backlog: ${context.queueLength} requests`;
      }
      if (context.avgResponseTime > 1000) {
        return `High response time: ${context.avgResponseTime.toFixed(0)}ms`;
      }
      if (context.errorRate > 5) {
        return `High error rate: ${context.errorRate.toFixed(1)}%`;
      }
    } else {
      return `Low utilization: ${context.currentUtilization.toFixed(1)}%`;
    }

    return "Unknown reason";
  }

  private getHealthRecommendations(stats: any): string[] {
    const recommendations: string[] = [];

    if (stats.utilization > 90) {
      recommendations.push(
        "Consider increasing max connections or optimizing query performance",
      );
    }

    if (stats.avgResponseTime > 500) {
      recommendations.push(
        "High response time detected - check for slow queries",
      );
    }

    if (stats.errorRate > 2) {
      recommendations.push(
        "Elevated error rate - investigate connection or query issues",
      );
    }

    if (stats.queueLength > 10) {
      recommendations.push("Persistent queue backlog - consider scaling up");
    }

    return recommendations;
  }

  private startMonitoring(): void {
    // Enhanced pool-wide health check monitoring
    this.healthCheckInterval = setInterval(async () => {
      try {
        const health = await this.healthCheck();
        if (health.status === "unhealthy") {
          console.error("Pool health check failed:", health.errors);
          await this.handleUnhealthyPool();
        } else if (health.status === "degraded") {
          console.warn("Pool performance degraded:", health.errors);
          await this.handleDegradedPool();
        }
      } catch (error) {
        console.error("Health check error:", error);
      }
    }, this.config.healthCheckInterval);

    // Individual connection health monitoring with adaptive frequency
    setInterval(async () => {
      await this.performBulkConnectionHealthChecks();
    }, this.config.healthCheckInterval * 2); // Less frequent than pool check

    // Scaling decision monitoring
    if (this.config.enableAutoScaling) {
      this.scalingInterval = setInterval(() => {
        this.considerScaling();
      }, 30000); // Check every 30 seconds
    }

    // Performance metrics collection
    this.metricsInterval = setInterval(() => {
      const metric: PoolPerformanceMetrics = {
        timestamp: new Date(),
        totalConnections: this.connections.size,
        activeConnections: Array.from(this.connections.values()).filter(
          (c) => c.inUse,
        ).length,
        utilization: this.calculateUtilization(),
        avgResponseTime: this.calculateAverageResponseTime(),
        requestsPerSecond: this.calculateRequestsPerSecond(),
        errorRate: this.calculateErrorRate(),
        queueLength: this.connectionQueue.length,
      };

      this.performanceMetrics.push(metric);

      if (this.performanceMetrics.length > this.config.performanceWindowSize) {
        this.performanceMetrics.shift();
      }
    }, 10000); // Every 10 seconds

    // Cleanup idle connections
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleConnections();
    }, 60000); // Every minute
  }

  private cleanupIdleConnections(): void {
    const now = Date.now();
    const connectionsToRemove: string[] = [];

    this.connections.forEach((connection, id) => {
      const idleTime = now - connection.lastUsed.getTime();

      if (
        !connection.inUse &&
        connection.state === ConnectionState.IDLE &&
        idleTime > this.config.idleTimeout &&
        this.connections.size > this.config.minConnections
      ) {
        connectionsToRemove.push(id);
      }
    });

    connectionsToRemove.forEach((id) => {
      this.connections.delete(id);
      console.log(`Removed idle connection ${id}`);
    });
  }

  /**
   * Perform health checks on multiple connections in parallel with adaptive frequency
   */
  private async performBulkConnectionHealthChecks(): Promise<void> {
    const connectionsToCheck = Array.from(this.connections.values())
      .filter((c) => !c.inUse && c.state !== ConnectionState.ERROR)
      .slice(0, 5); // Check max 5 connections at once to avoid overload

    const healthCheckPromises = connectionsToCheck.map(async (connection) => {
      try {
        const isHealthy = await this.performIndividualHealthCheck(connection);
        if (!isHealthy && connection.healthScore < 20) {
          console.log(
            `Connection ${connection.id} marked unhealthy (score: ${connection.healthScore})`,
          );
        }
      } catch (error) {
        console.error(
          `Health check failed for connection ${connection.id}:`,
          error,
        );
      }
    });

    await Promise.allSettled(healthCheckPromises);
  }

  /**
   * Perform comprehensive health check on individual connection
   */
  private async performIndividualHealthCheck(
    connection: DynamicPooledConnection,
  ): Promise<boolean> {
    const now = new Date();
    const timeSinceLastCheck =
      now.getTime() - connection.lastHealthCheck.getTime();

    // Adaptive health check frequency based on current health score
    const checkInterval =
      connection.healthScore > 80
        ? 300000 // 5 min for healthy
        : connection.healthScore > 50
          ? 120000 // 2 min for degraded
          : 60000; // 1 min for unhealthy

    if (timeSinceLastCheck < checkInterval) return connection.healthScore > 30;

    try {
      const checkStart = Date.now();

      // Multi-level health assessment
      const healthTests = await Promise.allSettled([
        // Basic connectivity test
        connection.client.from("profiles").select("id").limit(1),
        // Auth verification
        connection.client.auth.getSession(),
        // Simple database function test (using a known function)
        connection.client.rpc("get_app_version"),
      ]);

      const checkLatency = Date.now() - checkStart;
      connection.lastHealthCheck = now;

      const successfulTests = healthTests.filter(
        (result) => result.status === "fulfilled",
      ).length;
      const healthPercentage = (successfulTests / healthTests.length) * 100;

      // Update health score based on comprehensive test results
      if (healthPercentage === 100) {
        if (checkLatency < 100) {
          connection.healthScore = Math.min(100, connection.healthScore + 10);
        } else if (checkLatency < 500) {
          connection.healthScore = Math.min(100, connection.healthScore + 5);
        } else {
          connection.healthScore = Math.max(0, connection.healthScore - 2);
        }
      } else if (healthPercentage >= 66) {
        connection.healthScore = Math.max(30, connection.healthScore - 5);
      } else {
        connection.healthScore = Math.max(0, connection.healthScore - 20);
        connection.errors++;
      }

      // Mark as error state if critically unhealthy
      if (connection.healthScore < 20) {
        connection.state = ConnectionState.ERROR;
        return false;
      }

      return connection.healthScore > 30;
    } catch (error) {
      console.warn(
        `Health check failed for connection ${connection.id}:`,
        error,
      );
      connection.healthScore = Math.max(0, connection.healthScore - 30);
      connection.errors++;
      connection.state = ConnectionState.ERROR;
      return false;
    }
  }

  /**
   * Handle unhealthy pool state with proactive recovery
   */
  private async handleUnhealthyPool(): Promise<void> {
    console.warn("🚨 Pool unhealthy - initiating recovery procedures...");

    // Remove failed connections
    const failedConnections = Array.from(this.connections.values()).filter(
      (c) => c.state === ConnectionState.ERROR || c.healthScore < 20,
    );

    failedConnections.forEach((connection) => {
      this.connections.delete(connection.id);
      console.log(
        `Removed unhealthy connection: ${connection.id} (health: ${connection.healthScore})`,
      );
    });

    // Ensure we maintain minimum healthy connections
    const deficit = this.config.minConnections - this.connections.size;
    if (deficit > 0) {
      console.log(`Creating ${deficit} replacement connections...`);
      try {
        await this.scaleUp(deficit);
        console.log(`Successfully created ${deficit} replacement connections`);
      } catch (error) {
        console.error(`Failed to create replacement connections:`, error);
      }
    }
  }

  /**
   * Handle degraded pool state with performance optimization
   */
  private async handleDegradedPool(): Promise<void> {
    console.warn("⚠️ Pool degraded - optimizing performance...");

    // Identify and replace poorly performing connections
    const unhealthyConnections = Array.from(this.connections.values()).filter(
      (c) => !c.inUse && c.healthScore < 50,
    );

    const connectionsToReplace = Math.min(unhealthyConnections.length, 3); // Conservative replacement

    if (connectionsToReplace > 0) {
      // Remove worst performing connections
      const worstConnections = unhealthyConnections
        .sort((a, b) => a.healthScore - b.healthScore)
        .slice(0, connectionsToReplace);

      worstConnections.forEach((connection) => {
        this.connections.delete(connection.id);
        console.log(
          `Replaced degraded connection: ${connection.id} (health: ${connection.healthScore})`,
        );
      });

      // Replace with new healthy connections
      try {
        await this.scaleUp(connectionsToReplace);
      } catch (error) {
        console.error(`Failed to replace degraded connections:`, error);
      }
    }
  }

  private setupProcessHandlers(): void {
    const handleShutdown = () => {
      console.log("Received shutdown signal, gracefully shutting down pool...");
      this.shutdown().catch(console.error);
    };

    process.once("exit", handleShutdown);
    process.once("SIGINT", handleShutdown);
    process.once("SIGTERM", handleShutdown);
  }
}

// Singleton instance
let dynamicPoolInstance: DynamicSupabaseConnectionPool | null = null;

/**
 * Get dynamic pool instance
 */
export function getDynamicPool(
  config?: Partial<DynamicPoolConfig>,
): DynamicSupabaseConnectionPool {
  if (!dynamicPoolInstance) {
    dynamicPoolInstance = DynamicSupabaseConnectionPool.getInstance(config);
  }
  return dynamicPoolInstance;
}

/**
 * Create connection with dynamic pool
 */
export async function createDynamicPooledClient(
  config?: Partial<DynamicPoolConfig>,
): Promise<TypedSupabaseClient> {
  const pool = getDynamicPool(config);
  return pool.acquire();
}

/**
 * Release dynamic pooled client
 */
export function releaseDynamicPooledClient(client: TypedSupabaseClient): void {
  if (dynamicPoolInstance) {
    dynamicPoolInstance.release(client);
  }
}

/**
 * Execute operation with dynamic pool management
 */
export async function withDynamicPooledClient<T>(
  operation: (client: TypedSupabaseClient) => Promise<T>,
  config?: Partial<DynamicPoolConfig>,
): Promise<T> {
  const client = await createDynamicPooledClient(config);
  try {
    return await operation(client);
  } finally {
    releaseDynamicPooledClient(client);
  }
}

/**
 * Get dynamic pool statistics
 */
export function getDynamicPoolStats() {
  return dynamicPoolInstance?.getStatistics() || null;
}

/**
 * Perform dynamic pool health check
 */
export async function checkDynamicPoolHealth() {
  return dynamicPoolInstance?.healthCheck() || null;
}

/**
 * Trigger manual scaling
 */
export async function triggerDynamicPoolScaling(): Promise<void> {
  if (!dynamicPoolInstance) {
    throw new Error("Dynamic pool not initialized");
  }
  return dynamicPoolInstance.triggerScaling();
}

/**
 * Shutdown dynamic pool
 */
export async function shutdownDynamicPool(): Promise<void> {
  if (dynamicPoolInstance) {
    await dynamicPoolInstance.shutdown();
    dynamicPoolInstance = null;
  }
}

// Default export
export default DynamicSupabaseConnectionPool;
