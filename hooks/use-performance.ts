// Performance Hooks
// React hooks for performance monitoring and optimization

import { useState, useEffect, useCallback, useRef } from "react";
import { performanceMonitor } from "@/lib/performance/performance-monitor";
import { cacheManager } from "@/lib/cache/cache-manager";

// Performance tracking hook
export const usePerformanceTracking = (componentName: string) => {
  const mountTime = useRef<number>(Date.now());
  const renderCount = useRef<number>(0);
  const [isInitialized, setIsInitialized] = useState(false);

  // Track component mount
  useEffect(() => {
    const mountDuration = Date.now() - mountTime.current;

    performanceMonitor.recordEntry({
      name: `${componentName}-mount`,
      type: "component",
      duration: mountDuration,
      timestamp: Date.now(),
      success: true,
      metadata: {
        componentName,
        mountTime: mountTime.current,
      },
    });

    setIsInitialized(true);

    // Track component unmount
    return () => {
      performanceMonitor.recordEntry({
        name: `${componentName}-unmount`,
        type: "component",
        duration: 0,
        timestamp: Date.now(),
        success: true,
        metadata: {
          componentName,
          lifetimeMs: Date.now() - mountTime.current,
          renderCount: renderCount.current,
        },
      });
    };
  }, [componentName]);

  // Track renders
  useEffect(() => {
    if (isInitialized) {
      renderCount.current++;
    }
  });

  // Measure async operations
  const measureAsync = useCallback(
    async <T>(
      operationName: string,
      operation: () => Promise<T>,
    ): Promise<T> => {
      return performanceMonitor.measure(
        `${componentName}-${operationName}`,
        "component",
        operation,
      );
    },
    [componentName],
  );

  // Measure sync operations
  const measureSync = useCallback(
    <T>(operationName: string, operation: () => T): T => {
      return performanceMonitor.measureSync(
        `${componentName}-${operationName}`,
        "component",
        operation,
      );
    },
    [componentName],
  );

  // Start timing
  const startTimer = useCallback(
    (operationName: string) => {
      performanceMonitor.startTimer(`${componentName}-${operationName}`);
    },
    [componentName],
  );

  // End timing
  const endTimer = useCallback(
    (operationName: string, success: boolean = true, error?: string) => {
      return performanceMonitor.endTimer(
        `${componentName}-${operationName}`,
        "component",
        success,
        error,
      );
    },
    [componentName],
  );

  return {
    measureAsync,
    measureSync,
    startTimer,
    endTimer,
    renderCount: renderCount.current,
    mountTime: mountTime.current,
  };
};

// Cache-aware query hook
export const useCachedQuery = <T>(
  key: string,
  queryFn: () => Promise<T>,
  options: {
    cacheKey?: string;
    ttl?: number;
    dependencies?: any[];
    enabled?: boolean;
  } = {},
) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [cached, setCached] = useState(false);
  const [lastFetch, setLastFetch] = useState<number>(0);

  const {
    cacheKey = key,
    ttl = 300000, // 5 minutes
    dependencies = [],
    enabled = true,
  } = options;

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    try {
      // Try to get from cache first
      const cachedData = await cacheManager.get<T>({
        type: "user_data",
        id: cacheKey,
      });

      if (cachedData) {
        setData(cachedData);
        setCached(true);
        setLoading(false);
        return;
      }

      // Execute query with performance monitoring
      const result = await performanceMonitor.measure(
        `query-${key}`,
        "database",
        queryFn,
      );

      // Cache the result
      await cacheManager.set(
        {
          type: "user_data",
          id: cacheKey,
        },
        result,
        ttl,
      );

      setData(result);
      setCached(false);
      setLastFetch(Date.now());
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [key, cacheKey, queryFn, ttl, enabled]);

  // Invalidate cache
  const invalidate = useCallback(async () => {
    await cacheManager.delete({
      type: "user_data",
      id: cacheKey,
    });
    await fetchData();
  }, [cacheKey, fetchData]);

  // Refetch data
  const refetch = useCallback(async () => {
    await invalidate();
  }, [invalidate]);

  // Effect to fetch data
  useEffect(() => {
    fetchData();
  }, [fetchData, ...dependencies]);

  return {
    data,
    loading,
    error,
    cached,
    lastFetch,
    refetch,
    invalidate,
  };
};

// Performance monitoring hook
export const usePerformanceMonitoring = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Subscribe to performance alerts
  useEffect(() => {
    if (isSubscribed) return;

    const unsubscribe = performanceMonitor.subscribe((alert) => {
      setAlerts((prev) => [alert, ...prev]);
    });

    setIsSubscribed(true);

    return () => {
      unsubscribe();
      setIsSubscribed(false);
    };
  }, [isSubscribed]);

  // Get current metrics
  const getMetrics = useCallback(() => {
    const currentMetrics = performanceMonitor.getMetrics();
    setMetrics(currentMetrics);
    return currentMetrics;
  }, []);

  // Get performance entries
  const getEntries = useCallback((filter?: any) => {
    return performanceMonitor.getEntries(filter);
  }, []);

  // Clear metrics
  const clearMetrics = useCallback(() => {
    performanceMonitor.clear();
    setMetrics(null);
    setAlerts([]);
  }, []);

  // Resolve alert
  const resolveAlert = useCallback((alertId: string) => {
    performanceMonitor.resolveAlert(alertId);
    setAlerts((prev) =>
      prev.map((alert) =>
        alert.id === alertId ? { ...alert, resolved: true } : alert,
      ),
    );
  }, []);

  return {
    metrics,
    alerts,
    getMetrics,
    getEntries,
    clearMetrics,
    resolveAlert,
  };
};

// Optimized image loading hook
export const useOptimizedImage = (
  src: string,
  options: {
    lazy?: boolean;
    placeholder?: string;
    onLoad?: () => void;
    onError?: (error: Error) => void;
  } = {},
) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [imageSrc, setImageSrc] = useState<string>(options.placeholder || "");
  const imageRef = useRef<HTMLImageElement | null>(null);

  const { lazy = true, placeholder = "", onLoad, onError } = options;

  useEffect(() => {
    if (!src) return;

    const img = new Image();
    imageRef.current = img;

    const handleLoad = () => {
      setImageSrc(src);
      setLoading(false);
      setError(null);
      onLoad?.();
    };

    const handleError = (event: ErrorEvent) => {
      const error = new Error(`Failed to load image: ${src}`);
      setError(error);
      setLoading(false);
      onError?.(error);
    };

    img.onload = handleLoad;
    img.onerror = handleError;

    // Use intersection observer for lazy loading
    if (lazy && "IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          const [entry] = entries;
          if (entry.isIntersecting) {
            img.src = src;
            observer.disconnect();
          }
        },
        { threshold: 0.1 },
      );

      // Create a dummy element to observe
      const dummyElement = document.createElement("div");
      observer.observe(dummyElement);

      return () => {
        observer.disconnect();
        img.onload = null;
        img.onerror = null;
      };
    } else {
      img.src = src;
    }

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src, lazy, onLoad, onError]);

  return {
    src: imageSrc,
    loading,
    error,
    retry: () => {
      setLoading(true);
      setError(null);
      if (imageRef.current) {
        imageRef.current.src = src;
      }
    },
  };
};

// Debounced performance tracking
export const useDebouncedPerformance = (
  operation: () => Promise<void>,
  delay: number = 500,
) => {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const [isExecuting, setIsExecuting] = useState(false);

  const execute = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(async () => {
      setIsExecuting(true);

      try {
        await performanceMonitor.measure(
          "debounced-operation",
          "component",
          operation,
        );
      } finally {
        setIsExecuting(false);
      }
    }, delay);
  }, [operation, delay]);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsExecuting(false);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    execute,
    cancel,
    isExecuting,
  };
};

// Memory monitoring hook
export const useMemoryMonitoring = () => {
  const [memoryInfo, setMemoryInfo] = useState<any>(null);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if memory API is supported
    const supported = "memory" in performance;
    setIsSupported(supported);

    if (!supported) return;

    const updateMemoryInfo = () => {
      const memory = (performance as any).memory;
      setMemoryInfo({
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        usedPercent: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
      });
    };

    // Update immediately
    updateMemoryInfo();

    // Update every 5 seconds
    const interval = setInterval(updateMemoryInfo, 5000);

    return () => clearInterval(interval);
  }, []);

  return {
    memoryInfo,
    isSupported,
  };
};

export default {
  usePerformanceTracking,
  useCachedQuery,
  usePerformanceMonitoring,
  useOptimizedImage,
  useDebouncedPerformance,
  useMemoryMonitoring,
};
