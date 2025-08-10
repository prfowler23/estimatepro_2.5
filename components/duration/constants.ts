/**
 * Constants for duration components
 */

import type { ServiceWeatherSensitivity } from "./types";

// Service name mappings
export const SERVICE_NAMES: Record<string, string> = {
  WC: "Window Cleaning",
  GR: "Glass Restoration",
  BWP: "Building Wash (Pressure)",
  BWS: "Building Wash (Soft)",
  HBW: "High-Rise Building Wash",
  PWF: "Pressure Wash (Flat)",
  HFS: "Hard Floor Scrubbing",
  PC: "Parking Cleaning",
  PWP: "Parking Pressure Wash",
  IW: "Interior Wall Cleaning",
  DC: "Deck Cleaning",
} as const;

// Service weather sensitivity mapping
export const SERVICE_WEATHER_SENSITIVITY: Record<
  string,
  ServiceWeatherSensitivity
> = {
  WC: { rain: "high", temperature: "medium", wind: "high", snow: "high" },
  GR: { rain: "medium", temperature: "medium", wind: "low", snow: "medium" },
  BWP: { rain: "medium", temperature: "low", wind: "high", snow: "high" },
  BWS: {
    rain: "critical",
    temperature: "high",
    wind: "medium",
    snow: "critical",
  },
  HBW: {
    rain: "high",
    temperature: "medium",
    wind: "critical",
    snow: "critical",
  },
  PWF: { rain: "medium", temperature: "low", wind: "medium", snow: "high" },
  HFS: { rain: "low", temperature: "low", wind: "low", snow: "low" },
  PC: { rain: "low", temperature: "low", wind: "low", snow: "medium" },
  PWP: { rain: "medium", temperature: "low", wind: "medium", snow: "high" },
  IW: { rain: "low", temperature: "low", wind: "low", snow: "low" },
  DC: { rain: "medium", temperature: "medium", wind: "medium", snow: "high" },
} as const;

// Manual override reasons
export const OVERRIDE_REASONS = [
  "Client request for extended timeline",
  "Additional work discovered",
  "Equipment/crew availability constraints",
  "Site access limitations",
  "Weather contingency adjustment",
  "Quality assurance requirements",
  "Coordination with other trades",
  "Safety considerations",
  "Custom work requirements",
  "Other (specify below)",
] as const;

// Service color mappings for timeline visualization
export const SERVICE_COLORS: Record<string, string> = {
  WC: "bg-blue-500",
  GR: "bg-green-500",
  BWP: "bg-purple-500",
  BWS: "bg-indigo-500",
  HBW: "bg-red-500",
  PWF: "bg-cyan-500",
  HFS: "bg-teal-500",
  PC: "bg-orange-500",
  PWP: "bg-yellow-500",
  IW: "bg-pink-500",
  DC: "bg-gray-500",
} as const;

// Risk level thresholds
export const RISK_THRESHOLDS = {
  LOW: 0.3,
  MEDIUM: 0.6,
  HIGH: 1.0,
} as const;

// Confidence level thresholds
export const CONFIDENCE_THRESHOLDS = {
  HIGH: 80,
  MEDIUM: 60,
  LOW: 0,
} as const;

// Duration limits
export const DURATION_LIMITS = {
  MIN: 0.5,
  MAX: 365,
} as const;

// Chart configuration
export const CHART_CONFIG = {
  HEIGHT: 300,
  MARKER_INTERVAL_DIVISOR: 10,
  MIN_BAR_WIDTH_PERCENT: 2,
} as const;

// Weather sensitivity colors
export const WEATHER_SENSITIVITY_COLORS = {
  low: "text-green-500",
  medium: "text-yellow-500",
  high: "text-orange-500",
  critical: "text-red-500",
} as const;

// Weather sensitivity badge variants
export const WEATHER_SENSITIVITY_BADGES = {
  low: "default",
  medium: "secondary",
  high: "secondary",
  critical: "destructive",
} as const;

// Status colors for timeline
export const STATUS_COLORS = {
  scheduled: "",
  in_progress: "opacity-80",
  completed: "brightness-110",
  delayed: "bg-red-400",
} as const;

// Helper functions
export const getServiceName = (serviceCode: string): string => {
  return SERVICE_NAMES[serviceCode] || serviceCode;
};

export const getServiceColor = (serviceCode: string): string => {
  return SERVICE_COLORS[serviceCode] || "bg-gray-500";
};

export const getRiskLevel = (score: number): "low" | "medium" | "high" => {
  if (score < RISK_THRESHOLDS.LOW) return "low";
  if (score < RISK_THRESHOLDS.MEDIUM) return "medium";
  return "high";
};

export const getRiskLabel = (score: number): string => {
  const level = getRiskLevel(score);
  return `${level.charAt(0).toUpperCase() + level.slice(1)} Risk`;
};

export const getConfidenceLevel = (
  percentage: number,
): "high" | "medium" | "low" => {
  if (percentage >= CONFIDENCE_THRESHOLDS.HIGH) return "high";
  if (percentage >= CONFIDENCE_THRESHOLDS.MEDIUM) return "medium";
  return "low";
};

export const getConfidenceColor = (percentage: number): string => {
  const level = getConfidenceLevel(percentage);
  switch (level) {
    case "high":
      return "text-green-600";
    case "medium":
      return "text-yellow-600";
    case "low":
      return "text-red-600";
    default:
      return "text-gray-600";
  }
};

export const formatDurationChange = (
  original: number,
  newDuration: number,
): string => {
  const diff = newDuration - original;
  if (diff > 0) {
    return `+${diff.toFixed(1)} days longer`;
  } else if (diff < 0) {
    return `${Math.abs(diff).toFixed(1)} days shorter`;
  }
  return "No change";
};

export const formatDate = (date: Date | null | undefined): string => {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return "Invalid Date";
  }
  return date.toLocaleDateString();
};
