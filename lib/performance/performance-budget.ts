// Performance Budget Enforcement System
// Defines and enforces performance budgets for various metrics

import { performanceMonitor, PerformanceMetrics } from "./performance-monitor";
import { cacheManager } from "@/lib/cache/cache-manager";
import { queryOptimizer } from "./query-optimization";

// Budget categories
export interface PerformanceBudget {
  name: string;
  category: "timing" | "size" | "count" | "rate";
  metric: string;
  threshold: number;
  critical?: number;
  unit: string;
  description?: string;
  enabled: boolean;
}

// Budget violation
export interface BudgetViolation {
  budget: PerformanceBudget;
  actual: number;
  severity: "warning" | "critical";
  timestamp: number;
  message: string;
  suggestions?: string[];
}

// Budget configuration
export interface BudgetConfig {
  enabled: boolean;
  enforceStrict: boolean;
  alertOnViolation: boolean;
  blockOnCritical: boolean;
  checkInterval: number;
  historySize: number;
}

// Default budgets based on web vitals and best practices
export const DEFAULT_BUDGETS: PerformanceBudget[] = [
  // Timing budgets
  {
    name: "First Contentful Paint",
    category: "timing",
    metric: "fcp",
    threshold: 1800,
    critical: 3000,
    unit: "ms",
    description: "Time to first content render",
    enabled: true,
  },
  {
    name: "Time to Interactive",
    category: "timing",
    metric: "tti",
    threshold: 3800,
    critical: 7300,
    unit: "ms",
    description: "Time until page is fully interactive",
    enabled: true,
  },
  {
    name: "API Response Time",
    category: "timing",
    metric: "api_response",
    threshold: 1000,
    critical: 5000,
    unit: "ms",
    description: "Average API response time",
    enabled: true,
  },
  {
    name: "Database Query Time",
    category: "timing",
    metric: "db_query",
    threshold: 500,
    critical: 2000,
    unit: "ms",
    description: "Average database query time",
    enabled: true,
  },

  // Size budgets
  {
    name: "JavaScript Bundle Size",
    category: "size",
    metric: "js_bundle",
    threshold: 300000,
    critical: 500000,
    unit: "bytes",
    description: "Total JavaScript bundle size",
    enabled: true,
  },
  {
    name: "CSS Bundle Size",
    category: "size",
    metric: "css_bundle",
    threshold: 60000,
    critical: 100000,
    unit: "bytes",
    description: "Total CSS bundle size",
    enabled: true,
  },
  {
    name: "Image Assets Size",
    category: "size",
    metric: "images",
    threshold: 1000000,
    critical: 2000000,
    unit: "bytes",
    description: "Total image assets size",
    enabled: true,
  },

  // Count budgets
  {
    name: "HTTP Requests",
    category: "count",
    metric: "http_requests",
    threshold: 50,
    critical: 100,
    unit: "requests",
    description: "Number of HTTP requests",
    enabled: true,
  },
  {
    name: "DOM Elements",
    category: "count",
    metric: "dom_elements",
    threshold: 1500,
    critical: 3000,
    unit: "elements",
    description: "Number of DOM elements",
    enabled: true,
  },

  // Rate budgets
  {
    name: "Error Rate",
    category: "rate",
    metric: "error_rate",
    threshold: 0.01,
    critical: 0.05,
    unit: "%",
    description: "Percentage of requests with errors",
    enabled: true,
  },
  {
    name: "Cache Hit Rate",
    category: "rate",
    metric: "cache_hit_rate",
    threshold: 0.7,
    critical: 0.5,
    unit: "%",
    description: "Cache hit rate (lower is critical)",
    enabled: true,
  },
];

// Default configuration
const DEFAULT_CONFIG: BudgetConfig = {
  enabled: true,
  enforceStrict: false,
  alertOnViolation: true,
  blockOnCritical: false,
  checkInterval: 60000, // 1 minute
  historySize: 100,
};

export class PerformanceBudgetManager {
  private static instance: PerformanceBudgetManager;
  private config: BudgetConfig;
  private budgets: Map<string, PerformanceBudget> = new Map();
  private violations: BudgetViolation[] = [];
  private checkInterval?: NodeJS.Timeout;
  private subscribers: Set<(violation: BudgetViolation) => void> = new Set();
  private metricsCache: Map<string, number> = new Map();

  private constructor(config: BudgetConfig = DEFAULT_CONFIG) {
    this.config = config;
    this.initializeBudgets();

    if (this.config.enabled) {
      this.startMonitoring();
    }
  }

  static getInstance(config?: BudgetConfig): PerformanceBudgetManager {
    if (!PerformanceBudgetManager.instance) {
      PerformanceBudgetManager.instance = new PerformanceBudgetManager(config);
    }
    return PerformanceBudgetManager.instance;
  }

  private initializeBudgets(): void {
    DEFAULT_BUDGETS.forEach((budget) => {
      this.budgets.set(budget.metric, budget);
    });
  }

  private startMonitoring(): void {
    this.checkInterval = setInterval(() => {
      this.checkBudgets();
    }, this.config.checkInterval);

    // Initial check
    this.checkBudgets();
  }

  private async checkBudgets(): Promise<void> {
    // Collect current metrics
    await this.collectMetrics();

    // Check each budget
    for (const [metric, budget] of this.budgets) {
      if (!budget.enabled) continue;

      const actual = this.metricsCache.get(metric);
      if (actual === undefined) continue;

      this.evaluateBudget(budget, actual);
    }

    // Clean old violations
    this.cleanViolationHistory();
  }

  private async collectMetrics(): Promise<void> {
    // Collect from performance monitor
    const perfMetrics = performanceMonitor.getMetrics();
    this.metricsCache.set("api_response", perfMetrics.avgResponseTime);
    this.metricsCache.set("error_rate", perfMetrics.errorRate);

    // Collect from cache manager
    const cacheMetrics = cacheManager.getMetrics();
    this.metricsCache.set("cache_hit_rate", cacheMetrics.hitRate);

    // Collect from query optimizer
    const queryStats = queryOptimizer.getQueryStats();
    const avgQueryTime = this.calculateAverageQueryTime(queryStats);
    this.metricsCache.set("db_query", avgQueryTime);

    // Collect browser metrics if available
    if (typeof window !== "undefined" && window.performance) {
      this.collectBrowserMetrics();
    }

    // Collect bundle sizes (would need webpack stats in real implementation)
    this.collectBundleSizes();
  }

  private collectBrowserMetrics(): void {
    if (typeof window === "undefined") return;

    const navigation = window.performance.getEntriesByType(
      "navigation",
    )[0] as any;
    if (navigation) {
      // First Contentful Paint
      const fcp = window.performance.getEntriesByName(
        "first-contentful-paint",
      )[0];
      if (fcp) {
        this.metricsCache.set("fcp", fcp.startTime);
      }

      // Time to Interactive (approximation)
      const tti = navigation.loadEventEnd - navigation.fetchStart;
      this.metricsCache.set("tti", tti);

      // DOM elements count
      if (document) {
        this.metricsCache.set(
          "dom_elements",
          document.getElementsByTagName("*").length,
        );
      }
    }

    // HTTP requests count
    const resources = window.performance.getEntriesByType("resource");
    this.metricsCache.set("http_requests", resources.length);
  }

  private collectBundleSizes(): void {
    // In a real implementation, this would read from webpack stats
    // For now, using placeholder values
    if (typeof window !== "undefined" && window.performance) {
      const resources = window.performance.getEntriesByType(
        "resource",
      ) as any[];

      let jsSize = 0;
      let cssSize = 0;
      let imageSize = 0;

      resources.forEach((resource) => {
        const size = resource.transferSize || resource.encodedBodySize || 0;

        if (resource.name.endsWith(".js")) {
          jsSize += size;
        } else if (resource.name.endsWith(".css")) {
          cssSize += size;
        } else if (resource.name.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i)) {
          imageSize += size;
        }
      });

      this.metricsCache.set("js_bundle", jsSize);
      this.metricsCache.set("css_bundle", cssSize);
      this.metricsCache.set("images", imageSize);
    }
  }

  private calculateAverageQueryTime(queryStats: any): number {
    let totalTime = 0;
    let totalQueries = 0;

    Object.values(queryStats).forEach((stats: any) => {
      if (Array.isArray(stats)) {
        stats.forEach((stat: any) => {
          totalTime += stat.queryTime || 0;
          totalQueries++;
        });
      }
    });

    return totalQueries > 0 ? totalTime / totalQueries : 0;
  }

  private evaluateBudget(budget: PerformanceBudget, actual: number): void {
    let violated = false;
    let severity: "warning" | "critical" = "warning";

    // Check for violations based on budget type
    if (budget.category === "rate" && budget.metric === "cache_hit_rate") {
      // Cache hit rate: lower is worse
      if (actual < budget.threshold) {
        violated = true;
        severity =
          budget.critical && actual < budget.critical ? "critical" : "warning";
      }
    } else {
      // Most metrics: higher is worse
      if (actual > budget.threshold) {
        violated = true;
        severity =
          budget.critical && actual > budget.critical ? "critical" : "warning";
      }
    }

    if (violated) {
      this.recordViolation(budget, actual, severity);
    }
  }

  private recordViolation(
    budget: PerformanceBudget,
    actual: number,
    severity: "warning" | "critical",
  ): void {
    const violation: BudgetViolation = {
      budget,
      actual,
      severity,
      timestamp: Date.now(),
      message: this.generateViolationMessage(budget, actual, severity),
      suggestions: this.generateSuggestions(budget, actual),
    };

    this.violations.push(violation);

    // Alert subscribers
    if (this.config.alertOnViolation) {
      this.notifySubscribers(violation);
    }

    // Block if critical and configured to do so
    if (this.config.blockOnCritical && severity === "critical") {
      this.handleCriticalViolation(violation);
    }

    // Log violation
    console.warn(`[Performance Budget] ${violation.message}`);
  }

  private generateViolationMessage(
    budget: PerformanceBudget,
    actual: number,
    severity: "warning" | "critical",
  ): string {
    const percentage = (
      ((actual - budget.threshold) / budget.threshold) *
      100
    ).toFixed(1);
    return `${severity.toUpperCase()}: ${budget.name} exceeded budget by ${percentage}% (${actual}${budget.unit} vs ${budget.threshold}${budget.unit})`;
  }

  private generateSuggestions(
    budget: PerformanceBudget,
    actual: number,
  ): string[] {
    const suggestions: string[] = [];

    switch (budget.metric) {
      case "js_bundle":
        suggestions.push("Enable code splitting and lazy loading");
        suggestions.push("Remove unused dependencies");
        suggestions.push("Minify and compress JavaScript files");
        break;
      case "api_response":
        suggestions.push("Optimize database queries");
        suggestions.push("Implement caching strategies");
        suggestions.push("Use pagination for large datasets");
        break;
      case "cache_hit_rate":
        suggestions.push("Review cache invalidation strategies");
        suggestions.push("Increase cache TTL for stable data");
        suggestions.push("Pre-warm cache for common queries");
        break;
      case "error_rate":
        suggestions.push("Review error logs and fix root causes");
        suggestions.push("Implement retry logic for transient failures");
        suggestions.push("Add better error handling and validation");
        break;
      case "dom_elements":
        suggestions.push("Use virtualization for long lists");
        suggestions.push("Remove unnecessary DOM elements");
        suggestions.push("Implement pagination or infinite scroll");
        break;
    }

    return suggestions;
  }

  private handleCriticalViolation(violation: BudgetViolation): void {
    // In production, this could trigger alerts, block deployments, etc.
    console.error(
      `[CRITICAL] Performance budget violation: ${violation.message}`,
    );

    // Could integrate with monitoring services
    // sendAlert(violation);

    // Could block deployment
    // if (process.env.CI) {
    //   process.exit(1);
    // }
  }

  private notifySubscribers(violation: BudgetViolation): void {
    this.subscribers.forEach((callback) => {
      try {
        callback(violation);
      } catch (error) {
        console.error("Error notifying budget violation subscriber:", error);
      }
    });
  }

  private cleanViolationHistory(): void {
    if (this.violations.length > this.config.historySize) {
      this.violations = this.violations.slice(-this.config.historySize);
    }
  }

  // Public API

  /**
   * Add or update a budget
   */
  setBudget(budget: PerformanceBudget): void {
    this.budgets.set(budget.metric, budget);
  }

  /**
   * Remove a budget
   */
  removeBudget(metric: string): void {
    this.budgets.delete(metric);
  }

  /**
   * Get all budgets
   */
  getBudgets(): PerformanceBudget[] {
    return Array.from(this.budgets.values());
  }

  /**
   * Get violations
   */
  getViolations(since?: number): BudgetViolation[] {
    if (since) {
      return this.violations.filter((v) => v.timestamp >= since);
    }
    return [...this.violations];
  }

  /**
   * Subscribe to violations
   */
  subscribe(callback: (violation: BudgetViolation) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  /**
   * Check if a specific metric is within budget
   */
  isWithinBudget(metric: string): boolean {
    const budget = this.budgets.get(metric);
    if (!budget || !budget.enabled) return true;

    const actual = this.metricsCache.get(metric);
    if (actual === undefined) return true;

    if (budget.metric === "cache_hit_rate") {
      return actual >= budget.threshold;
    }
    return actual <= budget.threshold;
  }

  /**
   * Get budget status report
   */
  getStatusReport(): {
    budgets: Array<{
      budget: PerformanceBudget;
      actual: number | undefined;
      status: "ok" | "warning" | "critical" | "unknown";
      percentage: number;
    }>;
    summary: {
      total: number;
      ok: number;
      warning: number;
      critical: number;
      unknown: number;
    };
  } {
    const budgets = Array.from(this.budgets.values()).map((budget) => {
      const actual = this.metricsCache.get(budget.metric);
      let status: "ok" | "warning" | "critical" | "unknown" = "unknown";
      let percentage = 0;

      if (actual !== undefined) {
        if (budget.metric === "cache_hit_rate") {
          percentage = (actual / budget.threshold) * 100;
          if (actual >= budget.threshold) {
            status = "ok";
          } else if (budget.critical && actual < budget.critical) {
            status = "critical";
          } else {
            status = "warning";
          }
        } else {
          percentage = (actual / budget.threshold) * 100;
          if (actual <= budget.threshold) {
            status = "ok";
          } else if (budget.critical && actual > budget.critical) {
            status = "critical";
          } else {
            status = "warning";
          }
        }
      }

      return { budget, actual, status, percentage };
    });

    const summary = {
      total: budgets.length,
      ok: budgets.filter((b) => b.status === "ok").length,
      warning: budgets.filter((b) => b.status === "warning").length,
      critical: budgets.filter((b) => b.status === "critical").length,
      unknown: budgets.filter((b) => b.status === "unknown").length,
    };

    return { budgets, summary };
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
    }
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.violations = [];
    this.metricsCache.clear();
  }
}

// Global instance
export const performanceBudget = PerformanceBudgetManager.getInstance();

// Helper function to check budgets before critical operations
export async function checkBudgetBeforeOperation(
  operation: string,
  metrics: string[],
): Promise<{ allowed: boolean; violations: BudgetViolation[] }> {
  const violations: BudgetViolation[] = [];
  let allowed = true;

  for (const metric of metrics) {
    if (!performanceBudget.isWithinBudget(metric)) {
      const budget = performanceBudget
        .getBudgets()
        .find((b) => b.metric === metric);
      if (budget) {
        const actual = (performanceBudget as any).metricsCache.get(metric);
        const severity =
          budget.critical && actual > budget.critical ? "critical" : "warning";

        violations.push({
          budget,
          actual,
          severity,
          timestamp: Date.now(),
          message: `Budget violation would occur for ${operation}`,
        });

        if (severity === "critical") {
          allowed = false;
        }
      }
    }
  }

  return { allowed, violations };
}

export default performanceBudget;
