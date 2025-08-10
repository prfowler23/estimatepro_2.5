/**
 * Drone Component Type Definitions
 * Shared types for drone operations and UI components
 */

// Import base types from drone service
export type {
  FlightPlan,
  DroneSpec,
  DroneFlightResult,
  FlightObjective,
  FlightWaypoint,
  PilotInfo,
  WeatherConditions as ServiceWeatherConditions,
  SafetyStatus,
  FlightPathPoint,
  FlightAnalysis,
} from "@/lib/drone/drone-service";

// UI-specific weather conditions (extends service type)
export interface WeatherConditions {
  windSpeed: number;
  visibility: number;
  temperature: number;
  precipitation: number;
  cloudCeiling: number;
}

// Flight suitability assessment
export interface FlightSuitability {
  suitable: boolean;
  issues: string[];
  warnings: string[];
  score?: number;
}

// Dashboard component props
export interface DroneDashboardProps {
  projectId?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  onFlightPlanCreated?: (flightPlan: any) => void;
  onAnalysisComplete?: (analysis: any) => void;
}

// Tab navigation state
export type DashboardTab =
  | "overview"
  | "fleet"
  | "planning"
  | "execution"
  | "analysis";

// Quick action types
export interface QuickAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  objectives: any[];
  variant?: "default" | "outline";
  description?: string;
}

// Activity item for recent activity display
export interface ActivityItem {
  id: string;
  type: "flight" | "analysis" | "plan";
  status: "completed" | "in_progress" | "failed";
  timestamp: Date;
  details: {
    flightId?: string;
    duration?: number;
    photosCount?: number;
    dataQuality?: string;
  };
}

// Fleet card props
export interface FleetCardProps {
  drone: any;
  isSelected: boolean;
  onSelect: (drone: any) => void;
  disabled?: boolean;
}

// Weather card props
export interface WeatherCardProps {
  conditions: WeatherConditions;
  suitability: FlightSuitability;
  onRefresh?: () => void;
  isLoading?: boolean;
}

// Flight plan card props
export interface FlightPlanCardProps {
  plan: any;
  onExecute: (planId: string) => void;
  onEdit?: (planId: string) => void;
  onDelete?: (planId: string) => void;
  isExecuting?: boolean;
  canExecute: boolean;
}

// Analysis result card props
export interface AnalysisResultCardProps {
  result: any;
  onViewDetails?: (resultId: string) => void;
  onExport?: (resultId: string) => void;
}

// Loading states for different sections
export interface LoadingStates {
  drones: boolean;
  plans: boolean;
  weather: boolean;
  execution: boolean;
  analysis: boolean;
}

// Error states for different operations
export interface ErrorStates {
  drones: Error | null;
  plans: Error | null;
  weather: Error | null;
  execution: Error | null;
  analysis: Error | null;
}

// Form data for creating flight plans
export interface FlightPlanFormData {
  name: string;
  projectId: string;
  objectives: string[];
  droneId: string;
  pilotId: string;
  plannedDate: Date;
  notes?: string;
  weatherOverride?: boolean;
}

// Statistics for dashboard overview
export interface DashboardStatistics {
  totalFlights: number;
  totalPhotos: number;
  flightHours: number;
  successRate: number;
  averageDataQuality: string;
  recentActivity: ActivityItem[];
}
