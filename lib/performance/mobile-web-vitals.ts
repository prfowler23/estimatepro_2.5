/**
 * Mobile Web Vitals Performance Monitoring
 *
 * Features:
 * - Real-time Core Web Vitals tracking for mobile devices
 * - Network-aware performance budgets and adaptive loading
 * - Mobile-specific performance alerts and optimization recommendations
 * - Progressive loading strategies based on device and connection
 * - Battery-aware performance adjustments
 */

import React from "react";
import { onCLS, onINP, onFCP, onLCP, onTTFB, Metric } from "web-vitals";

// Network conditions for adaptive loading
interface NetworkCondition {
  effectiveType: "4g" | "3g" | "2g" | "slow-2g";
  downlink: number;
  rtt: number;
  saveData: boolean;
}

// Device capabilities for performance adaptation
interface DeviceCapabilities {
  isMobile: boolean;
  isLowEnd: boolean;
  hardwareConcurrency: number;
  memory: number; // GB
  platform: string;
  maxTouchPoints: number;
}

// Performance metrics with mobile context
interface MobilePerformanceMetric extends Metric {
  deviceType: "mobile" | "tablet" | "desktop";
  networkCondition: NetworkCondition;
  deviceCapabilities: DeviceCapabilities;
  batteryLevel?: number;
  viewportSize: {
    width: number;
    height: number;
  };
  timestamp: number;
}

// Performance thresholds by device type and network
const PERFORMANCE_THRESHOLDS = {
  mobile: {
    "4g": {
      FCP: 1500, // First Contentful Paint
      LCP: 2500, // Largest Contentful Paint
      INP: 100, // First Input Delay
      CLS: 0.1, // Cumulative Layout Shift
      TTFB: 800, // Time to First Byte
    },
    "3g": {
      FCP: 2500,
      LCP: 4000,
      INP: 100,
      CLS: 0.1,
      TTFB: 1200,
    },
    "2g": {
      FCP: 4000,
      LCP: 6000,
      INP: 100,
      CLS: 0.1,
      TTFB: 2000,
    },
  },
  tablet: {
    "4g": {
      FCP: 1200,
      LCP: 2000,
      INP: 100,
      CLS: 0.1,
      TTFB: 600,
    },
    "3g": {
      FCP: 2000,
      LCP: 3500,
      INP: 100,
      CLS: 0.1,
      TTFB: 1000,
    },
  },
  desktop: {
    "4g": {
      FCP: 1000,
      LCP: 1500,
      INP: 100,
      CLS: 0.1,
      TTFB: 400,
    },
  },
};

// Performance budget configurations
interface PerformanceBudget {
  bundleSize: number; // KB
  imageSize: number; // KB per image
  fontSize: number; // KB total
  thirdPartySize: number; // KB total
  requestCount: number;
  cacheEfficiency: number; // percentage
}

const PERFORMANCE_BUDGETS: Record<string, PerformanceBudget> = {
  mobile: {
    bundleSize: 400,
    imageSize: 200,
    fontSize: 100,
    thirdPartySize: 300,
    requestCount: 50,
    cacheEfficiency: 80,
  },
  tablet: {
    bundleSize: 600,
    imageSize: 400,
    fontSize: 150,
    thirdPartySize: 500,
    requestCount: 75,
    cacheEfficiency: 75,
  },
  desktop: {
    bundleSize: 1000,
    imageSize: 800,
    fontSize: 200,
    thirdPartySize: 800,
    requestCount: 100,
    cacheEfficiency: 70,
  },
};

/**
 * Mobile Web Vitals Monitor
 */
export class MobileWebVitalsMonitor {
  private metrics: MobilePerformanceMetric[] = [];
  private observers: PerformanceObserver[] = [];
  private deviceCapabilities: DeviceCapabilities;
  private networkCondition: NetworkCondition;
  private performanceBudget: PerformanceBudget;
  private isMonitoring = false;
  private lastPerformanceInsights: any = null;
  private sessionId: string = Math.random().toString(36).substr(2, 9);

  constructor() {
    this.deviceCapabilities = this.detectDeviceCapabilities();
    this.networkCondition = this.detectNetworkCondition();
    this.performanceBudget = this.getPerformanceBudget();
  }

  /**
   * Start monitoring Web Vitals with mobile optimizations
   */
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) return;
    this.isMonitoring = true;

    // Core Web Vitals monitoring
    this.monitorCoreWebVitals();

    // Additional mobile-specific metrics
    this.monitorResourceLoading();
    this.monitorNetworkConditions();
    this.monitorBatteryStatus();
    this.monitorMemoryUsage();

    // Adaptive loading based on conditions
    this.enableAdaptiveLoading();

    console.log("🚀 Mobile Web Vitals monitoring started", {
      device: this.deviceCapabilities,
      network: this.networkCondition,
      budget: this.performanceBudget,
    });
  }

  /**
   * Stop monitoring and cleanup observers
   */
  stopMonitoring(): void {
    this.isMonitoring = false;
    this.observers.forEach((observer) => observer.disconnect());
    this.observers = [];
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): MobilePerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get performance score based on mobile thresholds
   */
  getPerformanceScore(): {
    overall: number;
    breakdown: Record<string, number>;
    recommendations: string[];
  } {
    const recentMetrics = this.metrics.slice(-10);
    if (recentMetrics.length === 0) {
      return { overall: 100, breakdown: {}, recommendations: [] };
    }

    const deviceType = this.deviceCapabilities.isMobile
      ? "mobile"
      : this.deviceCapabilities.maxTouchPoints > 0
        ? "tablet"
        : "desktop";
    const networkType = this.networkCondition.effectiveType;
    const thresholds =
      PERFORMANCE_THRESHOLDS[deviceType]?.[networkType] ||
      PERFORMANCE_THRESHOLDS.mobile["3g"];

    const scores = {
      FCP: this.calculateScore(recentMetrics, "FCP", thresholds.FCP),
      LCP: this.calculateScore(recentMetrics, "LCP", thresholds.LCP),
      INP: this.calculateScore(recentMetrics, "INP", thresholds.INP),
      CLS: this.calculateScore(recentMetrics, "CLS", thresholds.CLS, true),
      TTFB: this.calculateScore(recentMetrics, "TTFB", thresholds.TTFB),
    };

    const overall =
      Object.values(scores).reduce((sum, score) => sum + score, 0) /
      Object.keys(scores).length;
    const recommendations = this.generateRecommendations(scores, thresholds);

    return {
      overall: Math.round(overall),
      breakdown: scores,
      recommendations,
    };
  }

  /**
   * Enable adaptive loading based on device and network conditions
   */
  private enableAdaptiveLoading(): void {
    // Lazy load images based on network conditions
    if (
      this.networkCondition.effectiveType === "2g" ||
      this.networkCondition.saveData
    ) {
      this.enableDataSaverMode();
    }

    // Reduce animations on low-end devices
    if (this.deviceCapabilities.isLowEnd) {
      this.enableLowEndMode();
    }

    // Battery-aware optimizations
    this.monitorBatteryAndAdapt();
  }

  /**
   * Monitor Core Web Vitals with mobile context
   */
  private monitorCoreWebVitals(): void {
    const createMetricHandler = (metricType: string) => (metric: Metric) => {
      const mobileMetric: MobilePerformanceMetric = {
        ...metric,
        deviceType: this.getDeviceType(),
        networkCondition: this.networkCondition,
        deviceCapabilities: this.deviceCapabilities,
        batteryLevel: this.getBatteryLevel(),
        viewportSize: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        timestamp: Date.now(),
      };

      this.metrics.push(mobileMetric);
      this.evaluatePerformance(mobileMetric);

      // Send to analytics if configured
      this.sendToAnalytics(mobileMetric);
    };

    // Monitor all Core Web Vitals
    onCLS(createMetricHandler("CLS"));
    onINP(createMetricHandler("INP")); // INP replaces INP in newer Core Web Vitals
    onFCP(createMetricHandler("FCP"));
    onLCP(createMetricHandler("LCP"));
    onTTFB(createMetricHandler("TTFB"));
  }

  /**
   * Monitor resource loading performance
   */
  private monitorResourceLoading(): void {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.entryType === "resource") {
          this.analyzeResourcePerformance(entry as PerformanceResourceTiming);
        }
      });
    });

    observer.observe({ entryTypes: ["resource"] });
    this.observers.push(observer);
  }

  /**
   * Monitor network condition changes
   */
  private monitorNetworkConditions(): void {
    if ("connection" in navigator) {
      const connection = (navigator as any).connection;
      const updateNetworkInfo = () => {
        this.networkCondition = {
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
          saveData: connection.saveData,
        };
        this.adaptToNetworkChange();
      };

      connection.addEventListener("change", updateNetworkInfo);
      updateNetworkInfo();
    }
  }

  /**
   * Monitor battery status for performance adaptation
   */
  private monitorBatteryStatus(): void {
    if ("getBattery" in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        const updateBatteryStatus = () => {
          if (battery.level < 0.2) {
            this.enableBatterySaverMode();
          }
        };

        battery.addEventListener("levelchange", updateBatteryStatus);
        updateBatteryStatus();
      });
    }
  }

  /**
   * Monitor memory usage for mobile devices
   */
  private monitorMemoryUsage(): void {
    if ("memory" in (performance as any)) {
      const memoryInfo = (performance as any).memory;
      const checkMemoryUsage = () => {
        const usedMemory = memoryInfo.usedJSHeapSize / 1024 / 1024; // MB
        const memoryLimit = memoryInfo.jsHeapSizeLimit / 1024 / 1024; // MB
        const memoryUsage = (usedMemory / memoryLimit) * 100;

        if (memoryUsage > 80) {
          this.enableMemoryOptimization();
        }
      };

      setInterval(checkMemoryUsage, 30000); // Check every 30 seconds
    }
  }

  /**
   * Detect device capabilities for performance adaptation
   */
  private detectDeviceCapabilities(): DeviceCapabilities {
    // Return safe defaults for server-side rendering
    if (typeof window === "undefined") {
      return {
        isMobile: false,
        isLowEnd: false,
        hardwareConcurrency: 4,
        memory: 4,
        platform: "unknown",
        maxTouchPoints: 0,
      };
    }

    const isMobile = window.innerWidth < 768;
    const memory = (navigator as any).deviceMemory || 4; // Default 4GB
    const hardwareConcurrency = navigator.hardwareConcurrency || 4;

    // Heuristic for low-end device detection
    const isLowEnd = memory < 4 || hardwareConcurrency < 4 || isMobile;

    return {
      isMobile,
      isLowEnd,
      hardwareConcurrency,
      memory,
      platform: navigator.platform,
      maxTouchPoints: navigator.maxTouchPoints || 0,
    };
  }

  /**
   * Detect current network conditions
   */
  private detectNetworkCondition(): NetworkCondition {
    // Return safe defaults for server-side rendering
    if (typeof navigator === "undefined") {
      return {
        effectiveType: "4g",
        downlink: 10,
        rtt: 100,
        saveData: false,
      };
    }

    if ("connection" in navigator) {
      const connection = (navigator as any).connection;
      return {
        effectiveType: connection.effectiveType || "4g",
        downlink: connection.downlink || 10,
        rtt: connection.rtt || 100,
        saveData: connection.saveData || false,
      };
    }

    // Default values for unsupported browsers
    return {
      effectiveType: "4g",
      downlink: 10,
      rtt: 100,
      saveData: false,
    };
  }

  /**
   * Get performance budget based on device type
   */
  private getPerformanceBudget(): PerformanceBudget {
    const deviceType = this.getDeviceType();
    return PERFORMANCE_BUDGETS[deviceType];
  }

  /**
   * Get device type classification
   */
  private getDeviceType(): "mobile" | "tablet" | "desktop" {
    if (this.deviceCapabilities.isMobile) return "mobile";
    if (this.deviceCapabilities.maxTouchPoints > 0) return "tablet";
    return "desktop";
  }

  /**
   * Get current battery level
   */
  private getBatteryLevel(): number | undefined {
    // This would be implemented with Battery API when available
    return undefined;
  }

  /**
   * Calculate performance score for a metric
   */
  private calculateScore(
    metrics: MobilePerformanceMetric[],
    metricName: string,
    threshold: number,
    reverse = false,
  ): number {
    const relevantMetrics = metrics.filter((m) => m.name === metricName);
    if (relevantMetrics.length === 0) return 100;

    const avgValue =
      relevantMetrics.reduce((sum, m) => sum + m.value, 0) /
      relevantMetrics.length;
    const score = reverse
      ? Math.max(0, Math.min(100, ((threshold - avgValue) / threshold) * 100))
      : Math.max(0, Math.min(100, (threshold / avgValue) * 100));

    return Math.round(score);
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(
    scores: Record<string, number>,
    thresholds: any,
  ): string[] {
    const recommendations: string[] = [];

    if (scores.FCP < 70) {
      recommendations.push(
        "Optimize critical rendering path and reduce blocking resources",
      );
    }

    if (scores.LCP < 70) {
      recommendations.push(
        "Optimize largest contentful paint - consider image optimization and server response times",
      );
    }

    if (scores.INP < 70) {
      recommendations.push(
        "Reduce main thread blocking and optimize JavaScript execution",
      );
    }

    if (scores.CLS < 70) {
      recommendations.push(
        "Improve layout stability - specify image dimensions and avoid dynamic content insertion",
      );
    }

    if (scores.TTFB < 70) {
      recommendations.push(
        "Optimize server response time and consider CDN usage",
      );
    }

    // Device-specific recommendations
    if (this.deviceCapabilities.isLowEnd) {
      recommendations.push(
        "Consider reducing animations and visual effects for low-end devices",
      );
    }

    if (
      this.networkCondition.effectiveType === "3g" ||
      this.networkCondition.effectiveType === "2g"
    ) {
      recommendations.push(
        "Optimize for slow networks - reduce bundle size and enable compression",
      );
    }

    return recommendations;
  }

  /**
   * Evaluate performance against thresholds and trigger alerts
   */
  private evaluatePerformance(metric: MobilePerformanceMetric): void {
    const deviceType = this.getDeviceType();
    const networkType = this.networkCondition.effectiveType;
    const thresholds =
      PERFORMANCE_THRESHOLDS[deviceType]?.[networkType] ||
      PERFORMANCE_THRESHOLDS.mobile["3g"];

    const threshold = thresholds[metric.name as keyof typeof thresholds];
    if (threshold && metric.value > threshold) {
      console.warn(`⚠️ Mobile performance threshold exceeded:`, {
        metric: metric.name,
        value: metric.value,
        threshold,
        deviceType,
        networkType,
      });

      // Trigger performance alert
      this.triggerPerformanceAlert(metric, threshold);
    }
  }

  /**
   * Trigger performance alert for poor metrics
   */
  private triggerPerformanceAlert(
    metric: MobilePerformanceMetric,
    threshold: number,
  ): void {
    const alertData = {
      type: "performance_threshold_exceeded",
      metric: metric.name,
      value: metric.value,
      threshold,
      severity: metric.value > threshold * 2 ? "high" : "medium",
      context: {
        deviceType: this.getDeviceType(),
        networkCondition: this.networkCondition,
        timestamp: Date.now(),
      },
    };

    // Send to monitoring system
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "mobile_performance_alert", alertData);
    }

    // Local storage for debugging
    const alerts = JSON.parse(
      localStorage.getItem("mobile_performance_alerts") || "[]",
    );
    alerts.push(alertData);
    localStorage.setItem(
      "mobile_performance_alerts",
      JSON.stringify(alerts.slice(-50)),
    );
  }

  /**
   * Analyze resource loading performance
   */
  private analyzeResourcePerformance(entry: PerformanceResourceTiming): void {
    const resourceSize = entry.transferSize || 0;
    const loadTime = entry.responseEnd - entry.startTime;

    // Check against performance budget
    if (
      entry.initiatorType === "img" &&
      resourceSize > this.performanceBudget.imageSize * 1024
    ) {
      console.warn(`📱 Image exceeds mobile budget:`, {
        url: entry.name,
        size: resourceSize,
        budget: this.performanceBudget.imageSize * 1024,
      });
    }

    // Monitor slow resources
    if (loadTime > 3000) {
      console.warn(`🐌 Slow resource detected:`, {
        url: entry.name,
        loadTime,
        size: resourceSize,
        type: entry.initiatorType,
      });
    }
  }

  /**
   * Adapt to network condition changes
   */
  private adaptToNetworkChange(): void {
    const networkType = this.networkCondition.effectiveType;

    if (
      networkType === "2g" ||
      networkType === "slow-2g" ||
      this.networkCondition.saveData
    ) {
      this.enableDataSaverMode();
    } else {
      this.disableDataSaverMode();
    }

    // Update performance budget
    this.performanceBudget = this.getPerformanceBudget();
  }

  /**
   * Enable data saver mode for slow networks
   */
  private enableDataSaverMode(): void {
    document.documentElement.classList.add("data-saver-mode");

    // Dispatch custom event for components to react
    window.dispatchEvent(
      new CustomEvent("dataSaverModeChanged", {
        detail: { enabled: true },
      }),
    );
  }

  /**
   * Disable data saver mode
   */
  private disableDataSaverMode(): void {
    document.documentElement.classList.remove("data-saver-mode");

    window.dispatchEvent(
      new CustomEvent("dataSaverModeChanged", {
        detail: { enabled: false },
      }),
    );
  }

  /**
   * Enable low-end device optimizations
   */
  private enableLowEndMode(): void {
    document.documentElement.classList.add("low-end-device");

    window.dispatchEvent(
      new CustomEvent("lowEndModeChanged", {
        detail: { enabled: true },
      }),
    );
  }

  /**
   * Enable battery saver optimizations
   */
  private enableBatterySaverMode(): void {
    document.documentElement.classList.add("battery-saver-mode");

    window.dispatchEvent(
      new CustomEvent("batterySaverModeChanged", {
        detail: { enabled: true },
      }),
    );
  }

  /**
   * Enable memory optimization for high usage
   */
  private enableMemoryOptimization(): void {
    // Clear unused image caches
    window.dispatchEvent(
      new CustomEvent("memoryPressure", {
        detail: { level: "high" },
      }),
    );
  }

  /**
   * Monitor battery and adapt performance accordingly
   */
  private monitorBatteryAndAdapt(): void {
    if ("getBattery" in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        const adaptToBattery = () => {
          if (battery.level < 0.2 || !battery.charging) {
            this.enableBatterySaverMode();
          } else {
            document.documentElement.classList.remove("battery-saver-mode");
          }
        };

        battery.addEventListener("levelchange", adaptToBattery);
        battery.addEventListener("chargingchange", adaptToBattery);
        adaptToBattery();
      });
    }
  }

  /**
   * Send metrics to analytics service and performance API
   */
  private sendToAnalytics(metric: MobilePerformanceMetric): void {
    // Debounce analytics calls
    const analyticsKey = `${metric.name}_${Date.now()}`;

    // Send to Google Analytics if available
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "mobile_web_vital", {
        metric_name: metric.name,
        metric_value: metric.value,
        device_type: metric.deviceType,
        network_type: metric.networkCondition.effectiveType,
        custom_parameter: analyticsKey,
      });
    }

    // Send to our performance API
    this.sendToPerformanceAPI(metric);
  }

  /**
   * Send metrics to performance API endpoint
   */
  private async sendToPerformanceAPI(
    metric: MobilePerformanceMetric,
  ): Promise<void> {
    try {
      const payload = {
        metrics: [
          {
            name: metric.name,
            value: metric.value,
            rating: metric.rating,
            timestamp: metric.timestamp,
            url: metric.url,
            deviceInfo: metric.deviceInfo,
            connectionInfo: metric.connectionInfo,
            performanceProfile: {
              deviceTier: this.deviceCapabilities.tier,
              memoryPressure: this.deviceCapabilities.memoryPressure,
              batteryLevel: this.deviceCapabilities.batteryLevel,
              thermalState: this.deviceCapabilities.thermalState || "nominal",
            },
          },
        ],
        sessionId: this.sessionId,
        userId: null, // Will be set by API if user is authenticated
      };

      // Send to our mobile performance API with timeout
      const response = await fetch("/api/performance/mobile/vitals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        // Don't block the main thread if API is slow
        signal: AbortSignal.timeout(3000), // 3 second timeout
      });

      if (response.ok) {
        const result = await response.json();
        if (result.performance_insights) {
          // Update local insights cache
          this.lastPerformanceInsights = result.performance_insights;
        }
      }
    } catch (error) {
      // Don't throw - API failures shouldn't break the app
      console.warn("Failed to send metric to performance API:", error);
    }
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics(): MobilePerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get latest performance insights from API
   */
  getPerformanceInsights(): any {
    return this.lastPerformanceInsights;
  }

  /**
   * Get current session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }
}

// Singleton instance
let mobileWebVitalsMonitor: MobileWebVitalsMonitor | null = null;

/**
 * Get the global mobile web vitals monitor instance
 */
export function getMobileWebVitalsMonitor(): MobileWebVitalsMonitor {
  if (!mobileWebVitalsMonitor) {
    mobileWebVitalsMonitor = new MobileWebVitalsMonitor();
  }
  return mobileWebVitalsMonitor;
}

/**
 * Initialize mobile web vitals monitoring
 */
export async function initializeMobileWebVitals(): Promise<MobileWebVitalsMonitor> {
  const monitor = getMobileWebVitalsMonitor();
  await monitor.startMonitoring();
  return monitor;
}

// Hook for React components
export function useMobileWebVitals() {
  const monitor = getMobileWebVitalsMonitor();
  const [metrics, setMetrics] = React.useState(monitor.getMetrics());
  const [score, setScore] = React.useState(monitor.getPerformanceScore());

  React.useEffect(() => {
    const updateMetrics = () => {
      setMetrics(monitor.getMetrics());
      setScore(monitor.getPerformanceScore());
    };

    const interval = setInterval(updateMetrics, 5000);
    updateMetrics();

    return () => clearInterval(interval);
  }, [monitor]);

  return {
    metrics,
    score,
    monitor,
  };
}

export default MobileWebVitalsMonitor;
