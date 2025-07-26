/**
 * Performance Optimization Service
 * Tracks and manages performance improvements
 */

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  context?: Record<string, any>;
}

export class PerformanceOptimizationService {
  private static metrics: PerformanceMetric[] = [];
  private static baselineMetrics: Record<string, number> = {};

  /**
   * Record a performance metric
   */
  static recordMetric(
    name: string,
    value: number,
    context?: Record<string, any>,
  ) {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      context,
    };

    this.metrics.push(metric);

    // Log in development
    if (process.env.NODE_ENV === "development") {
      console.log(`[Performance] ${name}: ${value}ms`, context);
    }
  }

  /**
   * Set baseline metrics for comparison
   */
  static setBaseline(metrics: Record<string, number>) {
    this.baselineMetrics = { ...this.baselineMetrics, ...metrics };
  }

  /**
   * Compare current metrics to baseline
   */
  static compareToBaseline(metricName: string, currentValue: number): number {
    const baseline = this.baselineMetrics[metricName];
    if (!baseline) return 0;

    const improvement = baseline - currentValue;
    const percentImprovement = (improvement / baseline) * 100;

    return percentImprovement;
  }

  /**
   * Get all recorded metrics
   */
  static getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Clear all metrics
   */
  static clearMetrics() {
    this.metrics = [];
  }

  /**
   * Generate performance report
   */
  static generateReport(): {
    metrics: PerformanceMetric[];
    improvements: Record<string, number>;
    summary: string;
  } {
    const improvements: Record<string, number> = {};

    // Calculate improvements for each metric type
    const metricTypes = [...new Set(this.metrics.map((m) => m.name))];

    metricTypes.forEach((type) => {
      const latestMetric = this.metrics
        .filter((m) => m.name === type)
        .sort((a, b) => b.timestamp - a.timestamp)[0];

      if (latestMetric) {
        improvements[type] = this.compareToBaseline(type, latestMetric.value);
      }
    });

    // Generate summary
    const avgImprovement =
      Object.values(improvements).reduce((sum, val) => sum + val, 0) /
      Object.values(improvements).length;

    const summary = `Average performance improvement: ${avgImprovement.toFixed(1)}%`;

    return {
      metrics: this.metrics,
      improvements,
      summary,
    };
  }

  /**
   * Performance monitoring utilities
   */
  static measureTime<T>(fn: () => T, metricName: string): T;
  static measureTime<T>(fn: () => Promise<T>, metricName: string): Promise<T>;
  static measureTime<T>(
    fn: () => T | Promise<T>,
    metricName: string,
  ): T | Promise<T> {
    const start = performance.now();

    try {
      const result = fn();

      if (result instanceof Promise) {
        return result.finally(() => {
          const duration = performance.now() - start;
          this.recordMetric(metricName, duration);
        });
      } else {
        const duration = performance.now() - start;
        this.recordMetric(metricName, duration);
        return result;
      }
    } catch (error) {
      const duration = performance.now() - start;
      this.recordMetric(metricName, duration, { error: true });
      throw error;
    }
  }
}
