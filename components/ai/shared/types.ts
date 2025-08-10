// Shared type definitions for AI components
import { ReactNode } from "react";
import {
  AIMetricsData,
  HealthStatus,
  AggregatedMetrics,
} from "@/lib/types/ai-types";

// Chart configuration types
export interface ChartConfig {
  width?: number | string;
  height?: number;
  colors?: string[];
  showLegend?: boolean;
  showTooltip?: boolean;
  showGrid?: boolean;
}

// Common dashboard types
export interface DashboardTimeRange {
  value: string;
  label: string;
  days: number;
}

export interface DashboardState {
  loading: boolean;
  error: Error | null;
  autoRefresh: boolean;
  timeRange: string;
  data: any | null;
}

// Error boundary types
export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

export interface ErrorInfo {
  componentStack: string;
}

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  maxRetries?: number;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
  isolate?: boolean;
  level?: "page" | "section" | "component";
  showDetails?: boolean;
}

// Chart data types
export interface ChartDataPoint {
  [key: string]: string | number;
}

export interface TimeSeriesData {
  time: string;
  value: number;
  label?: string;
}

export interface CategoryData {
  category: string;
  value: number;
  percentage?: number;
}

// Loading state types
export interface LoadingState {
  isLoading: boolean;
  loadingMessage?: string;
  progress?: number;
}

// API response types
export interface APIResponse<T> {
  data?: T;
  error?: string;
  status: "success" | "error" | "loading";
  timestamp?: string;
}

// Metrics display types
export interface MetricCard {
  title: string;
  value: string | number;
  change?: number;
  changeType?: "increase" | "decrease" | "neutral";
  icon?: ReactNode;
  description?: string;
}

// Export everything from ai-types for convenience
export type {
  AIMetricsData,
  HealthStatus,
  AggregatedMetrics,
} from "@/lib/types/ai-types";
