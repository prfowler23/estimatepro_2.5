// System Monitor
// Comprehensive system health and performance monitoring

import { EventEmitter } from "events";
import { performanceMonitor } from "../performance/performance-monitor";
import { AlertManager } from "../alerts/alert-manager";

// System metrics interface
export interface SystemMetrics {
  timestamp: number;
  cpu: {
    usage: number;
    load: number[];
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    connectionsActive: number;
  };
  application: {
    uptime: number;
    responseTime: number;
    errorRate: number;
    activeUsers: number;
  };
  database: {
    connections: number;
    queryTime: number;
    transactionRate: number;
  };
}

// Health check interface
export interface HealthCheck {
  name: string;
  status: "healthy" | "warning" | "critical";
  lastCheck: number;
  message?: string;
  details?: any;
}

// Monitoring configuration
export interface MonitoringConfig {
  enabled: boolean;
  interval: number;
  retentionDays: number;
  healthChecks: {
    interval: number;
    timeout: number;
  };
  thresholds: {
    cpu: { warning: number; critical: number };
    memory: { warning: number; critical: number };
    disk: { warning: number; critical: number };
    responseTime: { warning: number; critical: number };
    errorRate: { warning: number; critical: number };
  };
}

// Default configuration
const defaultConfig: MonitoringConfig = {
  enabled: true,
  interval: 30000, // 30 seconds
  retentionDays: 30,
  healthChecks: {
    interval: 60000, // 1 minute
    timeout: 10000, // 10 seconds
  },
  thresholds: {
    cpu: { warning: 70, critical: 90 },
    memory: { warning: 80, critical: 95 },
    disk: { warning: 85, critical: 95 },
    responseTime: { warning: 2000, critical: 5000 },
    errorRate: { warning: 5, critical: 10 },
  },
};

export class SystemMonitor extends EventEmitter {
  private config: MonitoringConfig;
  private intervalId: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private metrics: SystemMetrics[] = [];
  private healthChecks: Map<string, HealthCheck> = new Map();
  private alertManager: AlertManager;
  private startTime: number;

  constructor(config: Partial<MonitoringConfig> = {}) {
    super();
    this.config = { ...defaultConfig, ...config };
    this.alertManager = new AlertManager();
    this.startTime = Date.now();
    this.setupHealthChecks();
  }

  // Start monitoring
  public start(): void {
    if (!this.config.enabled) return;

    this.stop(); // Stop existing monitoring

    console.log("System Monitor: Starting monitoring...");

    // Start metrics collection
    this.intervalId = setInterval(() => {
      this.collectMetrics();
    }, this.config.interval);

    // Start health checks
    this.healthCheckInterval = setInterval(() => {
      this.runHealthChecks();
    }, this.config.healthChecks.interval);

    // Run initial checks
    this.collectMetrics();
    this.runHealthChecks();
  }

  // Stop monitoring
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    console.log("System Monitor: Monitoring stopped");
  }

  // Collect system metrics
  private async collectMetrics(): Promise<void> {
    try {
      const timestamp = Date.now();
      const metrics: SystemMetrics = {
        timestamp,
        cpu: await this.getCPUMetrics(),
        memory: await this.getMemoryMetrics(),
        disk: await this.getDiskMetrics(),
        network: await this.getNetworkMetrics(),
        application: await this.getApplicationMetrics(),
        database: await this.getDatabaseMetrics(),
      };

      this.metrics.push(metrics);
      this.cleanupOldMetrics();
      this.checkThresholds(metrics);
      this.emit("metrics", metrics);
    } catch (error) {
      console.error("System Monitor: Error collecting metrics:", error);
      this.emit("error", error);
    }
  }

  // Get CPU metrics
  private async getCPUMetrics(): Promise<SystemMetrics["cpu"]> {
    // In a real implementation, this would use system APIs
    // For now, we'll simulate CPU metrics
    return {
      usage: Math.random() * 100,
      load: [Math.random(), Math.random(), Math.random()],
    };
  }

  // Get memory metrics
  private async getMemoryMetrics(): Promise<SystemMetrics["memory"]> {
    if (typeof process !== "undefined" && process.memoryUsage) {
      const usage = process.memoryUsage();
      const total = usage.heapTotal;
      const used = usage.heapUsed;
      return {
        used,
        total,
        percentage: (used / total) * 100,
      };
    }

    // Fallback for browser environment
    return {
      used: 0,
      total: 0,
      percentage: 0,
    };
  }

  // Get disk metrics
  private async getDiskMetrics(): Promise<SystemMetrics["disk"]> {
    // Simulate disk metrics
    const total = 1000000000; // 1GB
    const used = Math.random() * total;
    return {
      used,
      total,
      percentage: (used / total) * 100,
    };
  }

  // Get network metrics
  private async getNetworkMetrics(): Promise<SystemMetrics["network"]> {
    // Simulate network metrics
    return {
      bytesIn: Math.floor(Math.random() * 1000000),
      bytesOut: Math.floor(Math.random() * 1000000),
      connectionsActive: Math.floor(Math.random() * 100),
    };
  }

  // Get application metrics
  private async getApplicationMetrics(): Promise<SystemMetrics["application"]> {
    const uptime = Date.now() - this.startTime;
    const responseTime = performanceMonitor.getAverageResponseTime();
    const errorRate = performanceMonitor.getErrorRate();

    return {
      uptime,
      responseTime: responseTime || 0,
      errorRate: errorRate || 0,
      activeUsers: Math.floor(Math.random() * 1000),
    };
  }

  // Get database metrics
  private async getDatabaseMetrics(): Promise<SystemMetrics["database"]> {
    // Simulate database metrics
    return {
      connections: Math.floor(Math.random() * 20),
      queryTime: Math.random() * 100,
      transactionRate: Math.random() * 1000,
    };
  }

  // Setup health checks
  private setupHealthChecks(): void {
    // Database health check
    this.registerHealthCheck("database", async () => {
      try {
        // In a real implementation, this would check database connectivity
        await new Promise((resolve) => setTimeout(resolve, 10));
        return { status: "healthy", message: "Database connection active" };
      } catch (error) {
        return { status: "critical", message: "Database connection failed" };
      }
    });

    // API health check
    this.registerHealthCheck("api", async () => {
      try {
        const responseTime = performanceMonitor.getAverageResponseTime();
        if (responseTime > this.config.thresholds.responseTime.critical) {
          return { status: "critical", message: "API response time too high" };
        }
        if (responseTime > this.config.thresholds.responseTime.warning) {
          return { status: "warning", message: "API response time elevated" };
        }
        return { status: "healthy", message: "API responding normally" };
      } catch (error) {
        return { status: "critical", message: "API health check failed" };
      }
    });

    // External services health check
    this.registerHealthCheck("external-services", async () => {
      try {
        // Check external service availability
        const services = ["openai", "supabase", "resend"];
        const results = await Promise.all(
          services.map((service) => this.checkExternalService(service)),
        );

        const failedServices = results.filter(
          (result) => result.status !== "healthy",
        );

        if (failedServices.length > 0) {
          return {
            status: "warning",
            message: `External services degraded: ${failedServices.map((s) => s.name).join(", ")}`,
            details: failedServices,
          };
        }

        return {
          status: "healthy",
          message: "All external services operational",
        };
      } catch (error) {
        return {
          status: "critical",
          message: "External services health check failed",
        };
      }
    });
  }

  // Register a health check
  public registerHealthCheck(
    name: string,
    check: () => Promise<{
      status: "healthy" | "warning" | "critical";
      message: string;
      details?: any;
    }>,
  ): void {
    this.healthChecks.set(name, {
      name,
      status: "healthy",
      lastCheck: 0,
      message: "Not yet checked",
    });
  }

  // Run health checks
  private async runHealthChecks(): Promise<void> {
    const checkPromises = Array.from(this.healthChecks.keys()).map(
      async (name) => {
        try {
          const check = this.getHealthCheckFunction(name);
          if (!check) return;

          const result = await Promise.race([
            check(),
            new Promise<{ status: "critical"; message: string }>((_, reject) =>
              setTimeout(
                () => reject(new Error("Health check timeout")),
                this.config.healthChecks.timeout,
              ),
            ),
          ]);

          const healthCheck: HealthCheck = {
            name,
            status: result.status,
            lastCheck: Date.now(),
            message: result.message,
            details: result.details,
          };

          this.healthChecks.set(name, healthCheck);
          this.emit("healthCheck", healthCheck);

          // Send alert if status changed or is critical
          if (result.status !== "healthy") {
            this.alertManager.sendAlert({
              type: "health-check",
              severity: result.status === "critical" ? "critical" : "warning",
              message: `Health check failed: ${name}`,
              details: result,
              timestamp: Date.now(),
            });
          }
        } catch (error) {
          const healthCheck: HealthCheck = {
            name,
            status: "critical",
            lastCheck: Date.now(),
            message: `Health check failed: ${error.message}`,
          };

          this.healthChecks.set(name, healthCheck);
          this.emit("healthCheck", healthCheck);
        }
      },
    );

    await Promise.all(checkPromises);
  }

  // Get health check function
  private getHealthCheckFunction(name: string): (() => Promise<any>) | null {
    const healthCheckFunctions = {
      database: this.checkDatabase.bind(this),
      api: this.checkAPI.bind(this),
      "external-services": this.checkExternalServices.bind(this),
    };

    return healthCheckFunctions[name] || null;
  }

  // Database health check
  private async checkDatabase(): Promise<{
    status: "healthy" | "warning" | "critical";
    message: string;
  }> {
    // Simulate database check
    const isHealthy = Math.random() > 0.1;
    return {
      status: isHealthy ? "healthy" : "critical",
      message: isHealthy
        ? "Database connection active"
        : "Database connection failed",
    };
  }

  // API health check
  private async checkAPI(): Promise<{
    status: "healthy" | "warning" | "critical";
    message: string;
  }> {
    const responseTime = performanceMonitor.getAverageResponseTime();
    if (responseTime > this.config.thresholds.responseTime.critical) {
      return { status: "critical", message: "API response time too high" };
    }
    if (responseTime > this.config.thresholds.responseTime.warning) {
      return { status: "warning", message: "API response time elevated" };
    }
    return { status: "healthy", message: "API responding normally" };
  }

  // External services health check
  private async checkExternalServices(): Promise<{
    status: "healthy" | "warning" | "critical";
    message: string;
    details?: any;
  }> {
    const services = ["openai", "supabase", "resend"];
    const results = await Promise.all(
      services.map((service) => this.checkExternalService(service)),
    );

    const failedServices = results.filter(
      (result) => result.status !== "healthy",
    );

    if (failedServices.length > 0) {
      return {
        status: "warning",
        message: `External services degraded: ${failedServices.map((s) => s.name).join(", ")}`,
        details: failedServices,
      };
    }

    return { status: "healthy", message: "All external services operational" };
  }

  // Check external service
  private async checkExternalService(serviceName: string): Promise<{
    name: string;
    status: "healthy" | "warning" | "critical";
    message: string;
  }> {
    // Simulate external service check
    const isHealthy = Math.random() > 0.05;
    return {
      name: serviceName,
      status: isHealthy ? "healthy" : "warning",
      message: isHealthy
        ? "Service operational"
        : "Service experiencing issues",
    };
  }

  // Check thresholds and send alerts
  private checkThresholds(metrics: SystemMetrics): void {
    const alerts = [];

    // CPU threshold check
    if (metrics.cpu.usage > this.config.thresholds.cpu.critical) {
      alerts.push({
        type: "cpu-usage",
        severity: "critical" as const,
        message: `CPU usage critical: ${metrics.cpu.usage.toFixed(1)}%`,
        details: metrics.cpu,
      });
    } else if (metrics.cpu.usage > this.config.thresholds.cpu.warning) {
      alerts.push({
        type: "cpu-usage",
        severity: "warning" as const,
        message: `CPU usage high: ${metrics.cpu.usage.toFixed(1)}%`,
        details: metrics.cpu,
      });
    }

    // Memory threshold check
    if (metrics.memory.percentage > this.config.thresholds.memory.critical) {
      alerts.push({
        type: "memory-usage",
        severity: "critical" as const,
        message: `Memory usage critical: ${metrics.memory.percentage.toFixed(1)}%`,
        details: metrics.memory,
      });
    } else if (
      metrics.memory.percentage > this.config.thresholds.memory.warning
    ) {
      alerts.push({
        type: "memory-usage",
        severity: "warning" as const,
        message: `Memory usage high: ${metrics.memory.percentage.toFixed(1)}%`,
        details: metrics.memory,
      });
    }

    // Disk threshold check
    if (metrics.disk.percentage > this.config.thresholds.disk.critical) {
      alerts.push({
        type: "disk-usage",
        severity: "critical" as const,
        message: `Disk usage critical: ${metrics.disk.percentage.toFixed(1)}%`,
        details: metrics.disk,
      });
    } else if (metrics.disk.percentage > this.config.thresholds.disk.warning) {
      alerts.push({
        type: "disk-usage",
        severity: "warning" as const,
        message: `Disk usage high: ${metrics.disk.percentage.toFixed(1)}%`,
        details: metrics.disk,
      });
    }

    // Response time threshold check
    if (
      metrics.application.responseTime >
      this.config.thresholds.responseTime.critical
    ) {
      alerts.push({
        type: "response-time",
        severity: "critical" as const,
        message: `Response time critical: ${metrics.application.responseTime.toFixed(0)}ms`,
        details: metrics.application,
      });
    } else if (
      metrics.application.responseTime >
      this.config.thresholds.responseTime.warning
    ) {
      alerts.push({
        type: "response-time",
        severity: "warning" as const,
        message: `Response time high: ${metrics.application.responseTime.toFixed(0)}ms`,
        details: metrics.application,
      });
    }

    // Error rate threshold check
    if (
      metrics.application.errorRate > this.config.thresholds.errorRate.critical
    ) {
      alerts.push({
        type: "error-rate",
        severity: "critical" as const,
        message: `Error rate critical: ${metrics.application.errorRate.toFixed(1)}%`,
        details: metrics.application,
      });
    } else if (
      metrics.application.errorRate > this.config.thresholds.errorRate.warning
    ) {
      alerts.push({
        type: "error-rate",
        severity: "warning" as const,
        message: `Error rate high: ${metrics.application.errorRate.toFixed(1)}%`,
        details: metrics.application,
      });
    }

    // Send alerts
    alerts.forEach((alert) => {
      this.alertManager.sendAlert({
        ...alert,
        timestamp: Date.now(),
      });
    });
  }

  // Clean up old metrics
  private cleanupOldMetrics(): void {
    const cutoffTime =
      Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000;
    this.metrics = this.metrics.filter(
      (metric) => metric.timestamp > cutoffTime,
    );
  }

  // Get current metrics
  public getCurrentMetrics(): SystemMetrics | null {
    return this.metrics.length > 0
      ? this.metrics[this.metrics.length - 1]
      : null;
  }

  // Get metrics history
  public getMetricsHistory(hours: number = 24): SystemMetrics[] {
    const cutoffTime = Date.now() - hours * 60 * 60 * 1000;
    return this.metrics.filter((metric) => metric.timestamp > cutoffTime);
  }

  // Get health check status
  public getHealthCheckStatus(): Map<string, HealthCheck> {
    return new Map(this.healthChecks);
  }

  // Get system status
  public getSystemStatus(): {
    status: "healthy" | "warning" | "critical";
    checks: HealthCheck[];
    metrics: SystemMetrics | null;
  } {
    const checks = Array.from(this.healthChecks.values());
    const criticalChecks = checks.filter(
      (check) => check.status === "critical",
    );
    const warningChecks = checks.filter((check) => check.status === "warning");

    let status: "healthy" | "warning" | "critical" = "healthy";
    if (criticalChecks.length > 0) {
      status = "critical";
    } else if (warningChecks.length > 0) {
      status = "warning";
    }

    return {
      status,
      checks,
      metrics: this.getCurrentMetrics(),
    };
  }

  // Update configuration
  public updateConfig(config: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...config };

    if (this.config.enabled && !this.intervalId) {
      this.start();
    } else if (!this.config.enabled && this.intervalId) {
      this.stop();
    }
  }
}

// Global system monitor instance
export const systemMonitor = new SystemMonitor();
