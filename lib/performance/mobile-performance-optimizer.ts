/**
 * Mobile Performance Optimizer
 *
 * Advanced mobile performance optimization system that works with the mobile Web Vitals
 * monitoring to provide real-time performance enhancements and adaptive loading.
 *
 * Features:
 * - Real-time performance optimization based on device capabilities
 * - Adaptive image loading and quality adjustment
 * - Battery-aware performance modes
 * - Network condition-based content delivery
 * - Intelligent prefetching and caching
 * - Critical resource prioritization
 * - Background task optimization
 *
 * Part of Phase 4 Priority 3: Mobile Performance & Core Web Vitals
 */

import { MobileWebVitalsMonitor } from "./mobile-web-vitals";

interface PerformanceProfile {
  deviceTier: "low-end" | "mid-range" | "high-end";
  networkSpeed: "slow-2g" | "2g" | "3g" | "4g" | "5g" | "wifi";
  batteryLevel: "critical" | "low" | "medium" | "high";
  memoryPressure: "high" | "medium" | "low";
  cpuUtilization: "high" | "medium" | "low";
  thermalState: "critical" | "serious" | "fair" | "nominal";
  dataSaverMode: boolean;
}

interface OptimizationStrategy {
  imageQuality: number; // 0.1-1.0
  enableAnimations: boolean;
  enableTransitions: boolean;
  prefetchEnabled: boolean;
  backgroundSyncEnabled: boolean;
  lazyLoadingThreshold: number; // pixels
  criticalResourcePriority: "high" | "medium" | "low";
  enableBlurPlaceholders: boolean;
  enableWebP: boolean;
  enableAVIF: boolean;
  maxConcurrentRequests: number;
}

interface PerformanceBudget {
  maxLCP: number; // milliseconds
  maxFID: number; // milliseconds
  maxCLS: number; // score
  maxTTFB: number; // milliseconds
  maxFCP: number; // milliseconds
  maxMemoryUsage: number; // MB
  maxBundleSize: number; // KB
}

interface OptimizationResult {
  strategy: OptimizationStrategy;
  budget: PerformanceBudget;
  cssClasses: string[];
  recommendations: string[];
  estimatedImpact: {
    lcpImprovement: number;
    fidImprovement: number;
    clsImprovement: number;
    bandwidthSavings: number;
    batteryImpact: number;
  };
}

export class MobilePerformanceOptimizer {
  private webVitalsMonitor: MobileWebVitalsMonitor;
  private performanceProfile: PerformanceProfile | null = null;
  private currentStrategy: OptimizationStrategy | null = null;
  private observers: PerformanceObserver[] = [];
  private optimizationCallbacks: ((result: OptimizationResult) => void)[] = [];

  constructor() {
    this.webVitalsMonitor = new MobileWebVitalsMonitor();
  }

  /**
   * Initialize the performance optimizer
   */
  async initialize(): Promise<void> {
    try {
      // Start Web Vitals monitoring
      await this.webVitalsMonitor.startMonitoring();

      // Detect device capabilities
      await this.detectDeviceCapabilities();

      // Generate optimization strategy
      this.generateOptimizationStrategy();

      // Apply optimizations
      this.applyOptimizations();

      // Start continuous optimization
      this.startContinuousOptimization();

      console.log("🚀 Mobile Performance Optimizer initialized");
    } catch (error) {
      console.error(
        "Failed to initialize Mobile Performance Optimizer:",
        error,
      );
    }
  }

  /**
   * Detect comprehensive device capabilities and conditions
   */
  private async detectDeviceCapabilities(): Promise<void> {
    const profile: Partial<PerformanceProfile> = {};

    // Device tier detection
    profile.deviceTier = this.detectDeviceTier();

    // Network condition detection
    profile.networkSpeed = this.detectNetworkSpeed();

    // Battery level detection
    if ("getBattery" in navigator) {
      try {
        const battery = await (navigator as any).getBattery();
        if (battery.level <= 0.15) profile.batteryLevel = "critical";
        else if (battery.level <= 0.3) profile.batteryLevel = "low";
        else if (battery.level <= 0.6) profile.batteryLevel = "medium";
        else profile.batteryLevel = "high";
      } catch {
        profile.batteryLevel = "medium";
      }
    } else {
      profile.batteryLevel = "medium";
    }

    // Memory pressure detection
    if ("memory" in performance) {
      const memoryInfo = (performance as any).memory;
      const memoryPressure =
        memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit;
      if (memoryPressure > 0.8) profile.memoryPressure = "high";
      else if (memoryPressure > 0.6) profile.memoryPressure = "medium";
      else profile.memoryPressure = "low";
    } else {
      profile.memoryPressure = "low";
    }

    // CPU utilization estimation (simplified)
    profile.cpuUtilization = this.estimateCPUUtilization();

    // Thermal state detection (if available)
    if ("deviceThermalState" in navigator) {
      profile.thermalState = (navigator as any).deviceThermalState || "nominal";
    } else {
      profile.thermalState = "nominal";
    }

    // Data saver mode detection
    profile.dataSaverMode = this.isDataSaverModeEnabled();

    this.performanceProfile = profile as PerformanceProfile;
  }

  /**
   * Detect device performance tier
   */
  private detectDeviceTier(): "low-end" | "mid-range" | "high-end" {
    // Hardware concurrency
    const cores = navigator.hardwareConcurrency || 4;

    // Memory (if available)
    let memory = 4;
    if ("memory" in performance) {
      memory =
        (performance as any).memory.jsHeapSizeLimit / (1024 * 1024 * 1024);
    }

    // Device pixel ratio
    const dpr = window.devicePixelRatio || 1;

    // User agent analysis for known low-end devices
    const userAgent = navigator.userAgent.toLowerCase();
    const lowEndPatterns = [
      "android 4",
      "android 5",
      "android 6",
      "iphone 5",
      "iphone 6",
      "chrome/[4-5][0-9]", // Older Chrome versions
      "samsung-sm-g", // Older Samsung Galaxy
    ];

    const isLowEndUA = lowEndPatterns.some((pattern) =>
      new RegExp(pattern).test(userAgent),
    );

    // Combined scoring
    let score = 0;
    if (cores >= 8) score += 3;
    else if (cores >= 4) score += 2;
    else score += 1;

    if (memory >= 8) score += 3;
    else if (memory >= 4) score += 2;
    else score += 1;

    if (dpr >= 3) score += 2;
    else if (dpr >= 2) score += 1;

    if (isLowEndUA) score -= 2;

    if (score >= 7) return "high-end";
    if (score >= 4) return "mid-range";
    return "low-end";
  }

  /**
   * Detect network speed
   */
  private detectNetworkSpeed(): PerformanceProfile["networkSpeed"] {
    if ("connection" in navigator) {
      const connection = (navigator as any).connection;
      const effectiveType = connection.effectiveType;
      const downlink = connection.downlink;

      if (effectiveType === "slow-2g" || downlink < 0.5) return "slow-2g";
      if (effectiveType === "2g" || downlink < 1.5) return "2g";
      if (effectiveType === "3g" || downlink < 10) return "3g";
      if (effectiveType === "4g" || downlink < 50) return "4g";
      if (downlink >= 50) return "5g";
    }

    // WiFi detection (simplified)
    if ("onLine" in navigator && navigator.onLine) {
      return "wifi"; // Assume WiFi if online and no connection API
    }

    return "3g"; // Default assumption
  }

  /**
   * Estimate CPU utilization
   */
  private estimateCPUUtilization(): "high" | "medium" | "low" {
    const start = performance.now();

    // Simple CPU benchmark
    let iterations = 0;
    const endTime = start + 10; // 10ms test

    while (performance.now() < endTime) {
      iterations++;
    }

    // Rough thresholds based on iterations per 10ms
    if (iterations < 100000) return "high";
    if (iterations < 500000) return "medium";
    return "low";
  }

  /**
   * Check if data saver mode is enabled
   */
  private isDataSaverModeEnabled(): boolean {
    if ("connection" in navigator) {
      const connection = (navigator as any).connection;
      return connection.saveData === true;
    }
    return false;
  }

  /**
   * Generate optimization strategy based on device profile
   */
  private generateOptimizationStrategy(): void {
    if (!this.performanceProfile) return;

    const profile = this.performanceProfile;
    const strategy: OptimizationStrategy = {
      imageQuality: 0.8,
      enableAnimations: true,
      enableTransitions: true,
      prefetchEnabled: true,
      backgroundSyncEnabled: true,
      lazyLoadingThreshold: 300,
      criticalResourcePriority: "high",
      enableBlurPlaceholders: true,
      enableWebP: true,
      enableAVIF: false,
      maxConcurrentRequests: 6,
    };

    // Adjust based on device tier
    switch (profile.deviceTier) {
      case "low-end":
        strategy.imageQuality = 0.6;
        strategy.enableAnimations = false;
        strategy.enableTransitions = false;
        strategy.prefetchEnabled = false;
        strategy.lazyLoadingThreshold = 100;
        strategy.enableAVIF = false;
        strategy.maxConcurrentRequests = 3;
        break;

      case "mid-range":
        strategy.imageQuality = 0.75;
        strategy.enableAnimations = true;
        strategy.prefetchEnabled = true;
        strategy.lazyLoadingThreshold = 200;
        strategy.maxConcurrentRequests = 4;
        break;

      case "high-end":
        strategy.imageQuality = 0.9;
        strategy.enableAVIF = true;
        strategy.lazyLoadingThreshold = 500;
        strategy.maxConcurrentRequests = 8;
        break;
    }

    // Adjust based on network speed
    switch (profile.networkSpeed) {
      case "slow-2g":
      case "2g":
        strategy.imageQuality = Math.min(strategy.imageQuality, 0.5);
        strategy.prefetchEnabled = false;
        strategy.backgroundSyncEnabled = false;
        strategy.enableWebP = true;
        strategy.enableAVIF = false;
        strategy.maxConcurrentRequests = 2;
        break;

      case "3g":
        strategy.imageQuality = Math.min(strategy.imageQuality, 0.7);
        strategy.prefetchEnabled = false;
        strategy.maxConcurrentRequests = 3;
        break;
    }

    // Adjust based on battery level
    if (profile.batteryLevel === "critical" || profile.batteryLevel === "low") {
      strategy.enableAnimations = false;
      strategy.enableTransitions = false;
      strategy.prefetchEnabled = false;
      strategy.backgroundSyncEnabled = false;
      strategy.maxConcurrentRequests = 2;
    }

    // Adjust based on memory pressure
    if (profile.memoryPressure === "high") {
      strategy.prefetchEnabled = false;
      strategy.lazyLoadingThreshold = 50;
      strategy.maxConcurrentRequests = Math.min(
        strategy.maxConcurrentRequests,
        3,
      );
    }

    // Adjust for data saver mode
    if (profile.dataSaverMode) {
      strategy.imageQuality = Math.min(strategy.imageQuality, 0.6);
      strategy.prefetchEnabled = false;
      strategy.backgroundSyncEnabled = false;
      strategy.enableAnimations = false;
      strategy.enableTransitions = false;
    }

    // Adjust based on thermal state
    if (
      profile.thermalState === "critical" ||
      profile.thermalState === "serious"
    ) {
      strategy.enableAnimations = false;
      strategy.enableTransitions = false;
      strategy.backgroundSyncEnabled = false;
      strategy.maxConcurrentRequests = 2;
    }

    this.currentStrategy = strategy;
  }

  /**
   * Apply optimizations to the page
   */
  private applyOptimizations(): void {
    if (!this.currentStrategy || !this.performanceProfile) return;

    const strategy = this.currentStrategy;
    const profile = this.performanceProfile;

    // Apply CSS classes for performance modes
    const cssClasses: string[] = [];

    if (!strategy.enableAnimations) {
      cssClasses.push("no-animations");
    }

    if (!strategy.enableTransitions) {
      cssClasses.push("no-transitions");
    }

    if (profile.deviceTier === "low-end") {
      cssClasses.push("low-end-device");
    }

    if (profile.batteryLevel === "critical" || profile.batteryLevel === "low") {
      cssClasses.push("battery-saver-mode");
    }

    if (profile.dataSaverMode) {
      cssClasses.push("data-saver-mode");
    }

    if (profile.memoryPressure === "high") {
      cssClasses.push("memory-pressure-high");
    }

    // Apply classes to document body
    document.body.classList.add(...cssClasses);

    // Set CSS custom properties for dynamic values
    document.documentElement.style.setProperty(
      "--image-quality",
      strategy.imageQuality.toString(),
    );

    document.documentElement.style.setProperty(
      "--lazy-loading-threshold",
      `${strategy.lazyLoadingThreshold}px`,
    );

    document.documentElement.style.setProperty(
      "--max-concurrent-requests",
      strategy.maxConcurrentRequests.toString(),
    );

    // Notify optimization callbacks
    this.notifyOptimizationCallbacks();

    console.log("📱 Mobile optimizations applied:", {
      deviceTier: profile.deviceTier,
      networkSpeed: profile.networkSpeed,
      batteryLevel: profile.batteryLevel,
      strategy,
    });
  }

  /**
   * Start continuous optimization monitoring
   */
  private startContinuousOptimization(): void {
    // Monitor performance metrics and re-optimize if needed
    setInterval(() => {
      this.checkForReoptimization();
    }, 10000); // Check every 10 seconds

    // Monitor network changes
    if ("connection" in navigator) {
      const connection = (navigator as any).connection;
      connection.addEventListener("change", () => {
        setTimeout(() => {
          this.detectDeviceCapabilities().then(() => {
            this.generateOptimizationStrategy();
            this.applyOptimizations();
          });
        }, 1000);
      });
    }

    // Monitor battery changes
    if ("getBattery" in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        battery.addEventListener("levelchange", () => {
          this.detectDeviceCapabilities().then(() => {
            this.generateOptimizationStrategy();
            this.applyOptimizations();
          });
        });
      });
    }
  }

  /**
   * Check if re-optimization is needed based on current performance
   */
  private async checkForReoptimization(): Promise<void> {
    if (!this.webVitalsMonitor) return;

    const currentMetrics = this.webVitalsMonitor.getCurrentMetrics();
    if (!currentMetrics || currentMetrics.length === 0) return;

    const latestMetrics = currentMetrics[currentMetrics.length - 1];

    // Check if performance has degraded
    let needsReoptimization = false;

    if (latestMetrics.name === "LCP" && latestMetrics.value > 4000) {
      needsReoptimization = true;
    }

    if (latestMetrics.name === "FID" && latestMetrics.value > 300) {
      needsReoptimization = true;
    }

    if (latestMetrics.name === "CLS" && latestMetrics.value > 0.25) {
      needsReoptimization = true;
    }

    if (needsReoptimization) {
      console.log("🔄 Performance degradation detected, re-optimizing...");

      // More aggressive optimization
      if (this.currentStrategy) {
        this.currentStrategy.imageQuality *= 0.8;
        this.currentStrategy.enableAnimations = false;
        this.currentStrategy.prefetchEnabled = false;
        this.currentStrategy.maxConcurrentRequests = Math.max(
          this.currentStrategy.maxConcurrentRequests - 1,
          2,
        );

        this.applyOptimizations();
      }
    }
  }

  /**
   * Get performance budget based on device profile
   */
  getPerformanceBudget(): PerformanceBudget {
    if (!this.performanceProfile) {
      return {
        maxLCP: 2500,
        maxFID: 100,
        maxCLS: 0.1,
        maxTTFB: 600,
        maxFCP: 1800,
        maxMemoryUsage: 100,
        maxBundleSize: 500,
      };
    }

    const profile = this.performanceProfile;
    const budget: PerformanceBudget = {
      maxLCP: 2500,
      maxFID: 100,
      maxCLS: 0.1,
      maxTTFB: 600,
      maxFCP: 1800,
      maxMemoryUsage: 100,
      maxBundleSize: 500,
    };

    // Adjust based on device tier
    switch (profile.deviceTier) {
      case "low-end":
        budget.maxLCP = 4000;
        budget.maxFID = 300;
        budget.maxCLS = 0.25;
        budget.maxTTFB = 1200;
        budget.maxFCP = 3000;
        budget.maxMemoryUsage = 50;
        budget.maxBundleSize = 300;
        break;

      case "high-end":
        budget.maxLCP = 1500;
        budget.maxFID = 50;
        budget.maxCLS = 0.05;
        budget.maxTTFB = 400;
        budget.maxFCP = 1000;
        budget.maxMemoryUsage = 200;
        budget.maxBundleSize = 1000;
        break;
    }

    // Adjust based on network speed
    if (profile.networkSpeed === "slow-2g" || profile.networkSpeed === "2g") {
      budget.maxLCP += 2000;
      budget.maxTTFB += 1000;
      budget.maxFCP += 1500;
      budget.maxBundleSize = Math.min(budget.maxBundleSize, 200);
    }

    return budget;
  }

  /**
   * Get current optimization strategy
   */
  getCurrentStrategy(): OptimizationStrategy | null {
    return this.currentStrategy;
  }

  /**
   * Get device performance profile
   */
  getPerformanceProfile(): PerformanceProfile | null {
    return this.performanceProfile;
  }

  /**
   * Subscribe to optimization updates
   */
  onOptimizationUpdate(callback: (result: OptimizationResult) => void): void {
    this.optimizationCallbacks.push(callback);
  }

  /**
   * Notify optimization callbacks
   */
  private notifyOptimizationCallbacks(): void {
    if (!this.currentStrategy || !this.performanceProfile) return;

    const result: OptimizationResult = {
      strategy: this.currentStrategy,
      budget: this.getPerformanceBudget(),
      cssClasses: this.getCSSClasses(),
      recommendations: this.getRecommendations(),
      estimatedImpact: this.calculateEstimatedImpact(),
    };

    this.optimizationCallbacks.forEach((callback) => {
      try {
        callback(result);
      } catch (error) {
        console.error("Error in optimization callback:", error);
      }
    });
  }

  /**
   * Get current CSS classes for optimization
   */
  private getCSSClasses(): string[] {
    const classes: string[] = [];

    if (!this.currentStrategy || !this.performanceProfile) return classes;

    if (!this.currentStrategy.enableAnimations) classes.push("no-animations");
    if (!this.currentStrategy.enableTransitions) classes.push("no-transitions");
    if (this.performanceProfile.deviceTier === "low-end")
      classes.push("low-end-device");
    if (this.performanceProfile.batteryLevel === "critical")
      classes.push("battery-saver-mode");
    if (this.performanceProfile.dataSaverMode) classes.push("data-saver-mode");

    return classes;
  }

  /**
   * Get performance recommendations
   */
  private getRecommendations(): string[] {
    const recommendations: string[] = [];

    if (!this.performanceProfile) return recommendations;

    if (this.performanceProfile.deviceTier === "low-end") {
      recommendations.push(
        "Consider reducing image quality for better performance",
      );
    }

    if (
      this.performanceProfile.networkSpeed === "slow-2g" ||
      this.performanceProfile.networkSpeed === "2g"
    ) {
      recommendations.push(
        "Reduce network requests and enable aggressive caching",
      );
    }

    if (this.performanceProfile.batteryLevel === "critical") {
      recommendations.push(
        "Disable animations and background tasks to preserve battery",
      );
    }

    if (this.performanceProfile.memoryPressure === "high") {
      recommendations.push(
        "Reduce memory usage by limiting concurrent operations",
      );
    }

    return recommendations;
  }

  /**
   * Calculate estimated performance impact
   */
  private calculateEstimatedImpact(): OptimizationResult["estimatedImpact"] {
    if (!this.performanceProfile || !this.currentStrategy) {
      return {
        lcpImprovement: 0,
        fidImprovement: 0,
        clsImprovement: 0,
        bandwidthSavings: 0,
        batteryImpact: 0,
      };
    }

    const profile = this.performanceProfile;
    const strategy = this.currentStrategy;

    // Rough estimates based on optimization strategy
    let lcpImprovement = 0;
    let fidImprovement = 0;
    let clsImprovement = 0;
    let bandwidthSavings = 0;
    let batteryImpact = 0;

    // Image quality impact
    const qualityReduction = 1 - strategy.imageQuality;
    bandwidthSavings += qualityReduction * 30; // 30% potential savings

    // Animation disabling impact
    if (!strategy.enableAnimations) {
      lcpImprovement += 200; // ~200ms improvement
      fidImprovement += 50; // ~50ms improvement
      batteryImpact += 15; // 15% battery improvement
    }

    // Prefetching impact
    if (!strategy.prefetchEnabled) {
      bandwidthSavings += 20; // 20% bandwidth savings
      batteryImpact += 10; // 10% battery improvement
    }

    // Device tier adjustments
    if (profile.deviceTier === "low-end") {
      lcpImprovement += 500;
      fidImprovement += 100;
    }

    return {
      lcpImprovement,
      fidImprovement,
      clsImprovement,
      bandwidthSavings,
      batteryImpact,
    };
  }

  /**
   * Clean up optimizer
   */
  destroy(): void {
    this.observers.forEach((observer) => observer.disconnect());
    this.observers = [];
    this.optimizationCallbacks = [];

    if (this.webVitalsMonitor) {
      // Assume webVitalsMonitor has a destroy method
      // this.webVitalsMonitor.destroy();
    }
  }
}

// React hook for using the mobile performance optimizer
export function useMobilePerformanceOptimizer() {
  const [optimizer] = React.useState(() => new MobilePerformanceOptimizer());
  const [isInitialized, setIsInitialized] = React.useState(false);
  const [optimizationResult, setOptimizationResult] =
    React.useState<OptimizationResult | null>(null);

  React.useEffect(() => {
    let mounted = true;

    const initializeOptimizer = async () => {
      try {
        await optimizer.initialize();
        if (mounted) {
          setIsInitialized(true);

          // Subscribe to optimization updates
          optimizer.onOptimizationUpdate((result) => {
            if (mounted) {
              setOptimizationResult(result);
            }
          });
        }
      } catch (error) {
        console.error(
          "Failed to initialize mobile performance optimizer:",
          error,
        );
      }
    };

    initializeOptimizer();

    return () => {
      mounted = false;
      optimizer.destroy();
    };
  }, [optimizer]);

  return {
    optimizer,
    isInitialized,
    optimizationResult,
    performanceProfile: optimizer.getPerformanceProfile(),
    currentStrategy: optimizer.getCurrentStrategy(),
    performanceBudget: optimizer.getPerformanceBudget(),
  };
}

// React import for the hook
import React from "react";

export default MobilePerformanceOptimizer;
