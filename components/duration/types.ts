/**
 * Type definitions for duration components
 */

// Service duration calculation types
export interface ServiceDuration {
  service: string;
  serviceName?: string;
  baseDuration: number;
  weatherImpact: number;
  finalDuration: number;
  confidence: "high" | "medium" | "low";
  dependencies: string[];
  isOverridden?: boolean;
  overrideReason?: string;
  originalDuration?: number;
  overrideBy?: string;
  overrideDate?: Date;
}

// Timeline visualization types
export interface TimelineEntry {
  service: string;
  serviceName: string;
  startDate: Date;
  endDate: Date;
  duration: number;
  dependencies: string[];
  weatherRisk: "low" | "medium" | "high";
  isOnCriticalPath: boolean;
  crewSize?: number;
  status?: "scheduled" | "in_progress" | "completed" | "delayed";
  confidence?: "high" | "medium" | "low";
}

export interface Timeline {
  entries: TimelineEntry[];
  totalDuration: number;
  criticalPath: string[];
}

// Weather analysis types
export interface WeatherImpact {
  riskLevel: "low" | "medium" | "high";
  delayDays: number;
  confidence: number;
}

export interface WeatherAnalysis {
  location: string;
  riskScore: number;
  forecast: {
    recommendations: string[];
  };
  serviceImpacts: Record<string, WeatherImpact>;
}

// Weather chart types
export interface MonthlyWeatherData {
  month: string;
  avgTempHigh: number;
  avgTempLow: number;
  avgPrecipitation: number;
  avgHumidity: number;
  avgWindSpeed: number;
  rainDays: number;
  snowDays: number;
  extremeTempDays: number;
  workableDays: number;
}

export interface HistoricalWeather {
  fiveYearAverages: MonthlyWeatherData[];
  bestMonths: string[];
  worstMonths: string[];
}

export interface ServiceWeatherSensitivity {
  rain: WeatherSensitivityLevel;
  temperature: WeatherSensitivityLevel;
  wind: WeatherSensitivityLevel;
  snow: WeatherSensitivityLevel;
}

export type WeatherSensitivityLevel = "low" | "medium" | "high" | "critical";

// Component prop types
export interface DurationSummaryProps {
  serviceDurations: ServiceDuration[];
  totalDuration: number;
  weatherAnalysis: WeatherAnalysis;
  timeline: Timeline;
  confidence?: number;
}

export interface ManualOverrideProps {
  serviceDurations: ServiceDuration[];
  onOverride: (service: string, newDuration: number, reason: string) => void;
  onRemoveOverride?: (service: string) => void;
  allowRemoval?: boolean;
}

export interface TimelineVisualizationProps {
  timeline: TimelineEntry[];
  onAdjust?: (service: string, newStart: Date) => void;
  showDetails?: boolean;
}

export interface WeatherImpactChartProps {
  historical: HistoricalWeather;
  services: string[];
  location?: string;
}

export interface MetricsGridProps {
  startDate: Date;
  endDate: Date;
  confidence: number;
  weatherRiskScore: number;
}

export interface DurationBreakdownProps {
  serviceDurations: ServiceDuration[];
  criticalPath: string[];
  totalBaseDuration: number;
  totalWeatherImpact: number;
  totalDuration: number;
}

export interface WeatherRiskAssessmentProps {
  weatherAnalysis: WeatherAnalysis;
  weatherSensitiveServices: number;
}

export interface CriticalPathAnalysisProps {
  criticalPath: string[];
  criticalPathDuration: number;
}

export interface ProjectConfidenceProps {
  confidence: number;
  highConfidenceServices: number;
  lowConfidenceServices: number;
}

// Adjustment form types
export interface AdjustmentFormData {
  startDate: string;
  duration: string;
  reason: string;
  adjustmentType: "delay" | "advance" | "extend" | "reduce";
}

// Tooltip types for charts
export interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    color: string;
    name: string;
    value: number;
  }>;
  label?: string;
}
