// Shared utility functions for AI components
import { ChartDataPoint, TimeSeriesData, CategoryData } from "./types";

// Performance utilities
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func(...args);
    }, wait);
  };
};

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number,
): ((...args: Parameters<T>) => void) => {
  let inThrottle = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
};

// Chart utilities
export const formatChartData = (
  data: Record<string, number>,
  keyName = "name",
  valueName = "value",
): ChartDataPoint[] => {
  return Object.entries(data).map(([key, value]) => ({
    [keyName]: key,
    [valueName]: value,
  }));
};

export const formatTimeSeriesData = (
  data: Record<string, number>,
  timeFormat?: (time: string) => string,
): TimeSeriesData[] => {
  return Object.entries(data).map(([time, value]) => ({
    time: timeFormat ? timeFormat(time) : time,
    value,
  }));
};

export const formatCategoryData = (
  data: Record<string, number>,
): CategoryData[] => {
  const total = Object.values(data).reduce((sum, val) => sum + val, 0);

  return Object.entries(data).map(([category, value]) => ({
    category,
    value,
    percentage: total > 0 ? (value / total) * 100 : 0,
  }));
};

// Number formatting utilities
export const formatNumber = (num: number, decimals = 0): string => {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
};

export const formatPercentage = (value: number, decimals = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

export const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
};

// Error handling utilities
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "An unknown error occurred";
};

export const isRetryableError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;

  const retryableMessages = [
    "network",
    "timeout",
    "rate limit",
    "temporary",
    "503",
    "429",
  ];

  const message = error.message.toLowerCase();
  return retryableMessages.some((msg) => message.includes(msg));
};

// Retry logic with exponential backoff
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000,
): Promise<T> => {
  let lastError: Error | unknown;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (i < maxRetries - 1 && isRetryableError(error)) {
        const delay = baseDelay * Math.pow(2, i);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        break;
      }
    }
  }

  throw lastError;
};

// Cache utilities
export class SimpleCache<T> {
  private cache = new Map<string, { data: T; timestamp: number }>();
  private ttl: number;

  constructor(ttlSeconds = 60) {
    this.ttl = ttlSeconds * 1000;
  }

  get(key: string): T | null {
    const cached = this.cache.get(key);

    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  set(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }
}

// Default chart colors
export const DEFAULT_CHART_COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82ca9d",
  "#ffc658",
  "#8dd1e1",
  "#d084d0",
  "#82d982",
];

// Health status utilities
export const getHealthStatusColor = (status: string): string => {
  switch (status) {
    case "healthy":
      return "text-green-600";
    case "degraded":
      return "text-yellow-600";
    case "critical":
    case "unhealthy":
      return "text-red-600";
    default:
      return "text-gray-600";
  }
};

export const getHealthStatusIcon = (status: string): string => {
  switch (status) {
    case "healthy":
      return "CheckCircle";
    case "degraded":
      return "AlertCircle";
    case "critical":
    case "unhealthy":
      return "XCircle";
    default:
      return "Circle";
  }
};
