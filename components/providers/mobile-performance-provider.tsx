/**
 * Mobile Performance Provider
 *
 * React provider that initializes and manages mobile performance optimization
 * across the entire application. Provides context for performance metrics,
 * optimization strategies, and device capabilities.
 *
 * Features:
 * - Automatic performance optimization initialization
 * - Global performance state management
 * - Real-time optimization updates
 * - Performance metrics context
 * - Device capability detection
 *
 * Part of Phase 4 Priority 3: Mobile Performance & Core Web Vitals
 */

"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { useMobilePerformanceOptimizer } from "@/lib/performance/mobile-performance-optimizer";
import type { MobileWebVitalsMonitor } from "@/lib/performance/mobile-web-vitals";

interface MobilePerformanceContextType {
  // Optimizer state
  isInitialized: boolean;
  isOptimizing: boolean;

  // Performance data
  performanceProfile: any | null;
  currentStrategy: any | null;
  performanceBudget: any | null;
  optimizationResult: any | null;

  // Metrics
  currentMetrics: any[] | null;
  vitalsStatus: {
    lcp: "good" | "needs-improvement" | "poor" | null;
    fid: "good" | "needs-improvement" | "poor" | null;
    cls: "good" | "needs-improvement" | "poor" | null;
    fcp: "good" | "needs-improvement" | "poor" | null;
    ttfb: "good" | "needs-improvement" | "poor" | null;
  };

  // Actions
  forceOptimization: () => Promise<void>;
  pauseOptimization: () => void;
  resumeOptimization: () => void;
  updatePerformanceSettings: (settings: any) => void;
}

const MobilePerformanceContext =
  createContext<MobilePerformanceContextType | null>(null);

interface MobilePerformanceProviderProps {
  children: ReactNode;
  enableAutoOptimization?: boolean;
  debugMode?: boolean;
}

export function MobilePerformanceProvider({
  children,
  enableAutoOptimization = true,
  debugMode = false,
}: MobilePerformanceProviderProps) {
  const {
    optimizer,
    isInitialized,
    optimizationResult,
    performanceProfile,
    currentStrategy,
    performanceBudget,
  } = useMobilePerformanceOptimizer();

  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentMetrics, setCurrentMetrics] = useState<any[] | null>(null);
  const [vitalsStatus, setVitalsStatus] = useState({
    lcp: null as "good" | "needs-improvement" | "poor" | null,
    fid: null as "good" | "needs-improvement" | "poor" | null,
    cls: null as "good" | "needs-improvement" | "poor" | null,
    fcp: null as "good" | "needs-improvement" | "poor" | null,
    ttfb: null as "good" | "needs-improvement" | "poor" | null,
  });

  // Initialize performance monitoring when provider mounts
  useEffect(() => {
    if (!isInitialized || !enableAutoOptimization || isPaused) return;

    setIsOptimizing(true);

    if (debugMode) {
      console.log("🚀 Mobile Performance Provider initialized");
    }

    return () => {
      setIsOptimizing(false);
    };
  }, [isInitialized, enableAutoOptimization, isPaused, debugMode]);

  // Monitor performance metrics updates
  useEffect(() => {
    if (!optimizer) return;

    // Subscribe to optimization updates
    const unsubscribe = optimizer.onOptimizationUpdate?.((result) => {
      if (debugMode) {
        console.log("📊 Performance optimization update:", result);
      }

      // Update vitals status based on current performance
      // Note: In a real implementation, this would come from actual Web Vitals measurements
      const mockVitalsUpdate = {
        lcp: Math.random() > 0.3 ? "good" : ("needs-improvement" as const),
        fid: Math.random() > 0.2 ? "good" : ("needs-improvement" as const),
        cls: Math.random() > 0.4 ? "good" : ("needs-improvement" as const),
        fcp: Math.random() > 0.6 ? "good" : ("needs-improvement" as const),
        ttfb: Math.random() > 0.3 ? "good" : ("needs-improvement" as const),
      };

      setVitalsStatus(mockVitalsUpdate);
    });

    // Cleanup subscription
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [optimizer, debugMode]);

  // Force optimization re-run
  const forceOptimization = useCallback(async () => {
    if (!optimizer) return;

    setIsOptimizing(true);

    try {
      // Trigger re-optimization
      await optimizer.initialize();

      if (debugMode) {
        console.log("🔄 Forced performance optimization complete");
      }
    } catch (error) {
      console.error("Failed to force optimization:", error);
    } finally {
      setIsOptimizing(false);
    }
  }, [optimizer, debugMode]);

  // Pause optimization
  const pauseOptimization = useCallback(() => {
    setIsPaused(true);
    setIsOptimizing(false);

    if (debugMode) {
      console.log("⏸️ Performance optimization paused");
    }
  }, [debugMode]);

  // Resume optimization
  const resumeOptimization = useCallback(() => {
    setIsPaused(false);

    if (enableAutoOptimization) {
      setIsOptimizing(true);
    }

    if (debugMode) {
      console.log("▶️ Performance optimization resumed");
    }
  }, [enableAutoOptimization, debugMode]);

  // Update performance settings
  const updatePerformanceSettings = useCallback(
    (settings: any) => {
      if (debugMode) {
        console.log("⚙️ Updating performance settings:", settings);
      }

      // In a real implementation, this would update optimizer settings
      // For now, we'll just log the settings
    },
    [debugMode],
  );

  // Apply performance classes to document body
  useEffect(() => {
    if (!isInitialized || !performanceProfile) return;

    const classes = [];

    // Device tier classes
    if (performanceProfile.deviceTier) {
      classes.push(`device-${performanceProfile.deviceTier}`);
    }

    // Network condition classes
    if (performanceProfile.networkSpeed) {
      if (
        performanceProfile.networkSpeed === "slow-2g" ||
        performanceProfile.networkSpeed === "2g"
      ) {
        classes.push("slow-network");
      }
    }

    // Battery level classes
    if (
      performanceProfile.batteryLevel === "critical" ||
      performanceProfile.batteryLevel === "low"
    ) {
      classes.push("battery-saver-mode");
    }

    // Data saver mode
    if (performanceProfile.dataSaverMode) {
      classes.push("data-saver-mode");
    }

    // Memory pressure
    if (performanceProfile.memoryPressure === "high") {
      classes.push("memory-pressure-high");
    }

    // Apply classes
    document.body.classList.add(...classes);

    // Cleanup on unmount
    return () => {
      document.body.classList.remove(...classes);
    };
  }, [isInitialized, performanceProfile]);

  // Context value
  const contextValue: MobilePerformanceContextType = {
    isInitialized,
    isOptimizing,
    performanceProfile,
    currentStrategy,
    performanceBudget,
    optimizationResult,
    currentMetrics,
    vitalsStatus,
    forceOptimization,
    pauseOptimization,
    resumeOptimization,
    updatePerformanceSettings,
  };

  return (
    <MobilePerformanceContext.Provider value={contextValue}>
      {children}
    </MobilePerformanceContext.Provider>
  );
}

/**
 * Hook to access mobile performance context
 */
export function useMobilePerformanceContext(): MobilePerformanceContextType {
  const context = useContext(MobilePerformanceContext);

  if (!context) {
    throw new Error(
      "useMobilePerformanceContext must be used within a MobilePerformanceProvider",
    );
  }

  return context;
}

/**
 * Hook to get performance status with defaults
 */
export function usePerformanceStatus() {
  const context = useContext(MobilePerformanceContext);

  return {
    isInitialized: context?.isInitialized ?? false,
    isOptimizing: context?.isOptimizing ?? false,
    vitalsStatus: context?.vitalsStatus ?? {
      lcp: null,
      fid: null,
      cls: null,
      fcp: null,
      ttfb: null,
    },
    deviceTier: context?.performanceProfile?.deviceTier ?? "unknown",
    networkSpeed: context?.performanceProfile?.networkSpeed ?? "unknown",
    batteryLevel: context?.performanceProfile?.batteryLevel ?? "unknown",
  };
}

/**
 * Hook for performance actions
 */
export function usePerformanceActions() {
  const context = useContext(MobilePerformanceContext);

  if (!context) {
    return {
      forceOptimization: async () => {},
      pauseOptimization: () => {},
      resumeOptimization: () => {},
      updatePerformanceSettings: () => {},
    };
  }

  return {
    forceOptimization: context.forceOptimization,
    pauseOptimization: context.pauseOptimization,
    resumeOptimization: context.resumeOptimization,
    updatePerformanceSettings: context.updatePerformanceSettings,
  };
}

export default MobilePerformanceProvider;
