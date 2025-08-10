/**
 * Drone Component Constants
 * Centralized configuration for drone operations
 */

export const DRONE_CONSTANTS = {
  // Default values
  DEFAULT_LOCATION: {
    latitude: 40.7128,
    longitude: -74.006,
    name: "New York City",
  },
  DEFAULT_PROJECT_ID: "default-project",
  DEFAULT_PILOT_ID: "pilot-001",

  // UI Configuration
  RECENT_ACTIVITY_LIMIT: 3,
  ACTIVITY_DISPLAY_LIMIT: 3,
  TAB_ANIMATION_DURATION: 300,

  // Photo Resolutions
  PHOTO_RESOLUTIONS: {
    STANDARD: "4K" as const,
    HIGH: "6K" as const,
    ULTRA: "8K" as const,
  },

  // Flight Objectives Configuration
  FLIGHT_OBJECTIVES: {
    ROOF_INSPECTION: {
      id: "roof-inspection",
      type: "roof_inspection" as const,
      priority: "high" as const,
      description: "Comprehensive roof condition assessment",
      expectedOutcome: "Detailed roof inspection report",
      captureRequirements: {
        photoCount: 20,
        resolutionRequired: "4K" as const,
        angles: ["overhead", "oblique"] as const,
      },
    },
    FACADE_ANALYSIS: {
      id: "facade-analysis",
      type: "facade_analysis" as const,
      priority: "medium" as const,
      description: "Building facade condition analysis",
      expectedOutcome: "Facade cleaning and repair assessment",
      captureRequirements: {
        photoCount: 30,
        resolutionRequired: "4K" as const,
        angles: ["front", "side", "oblique"] as const,
      },
    },
    AREA_SURVEY: {
      id: "area-survey",
      type: "area_survey" as const,
      priority: "medium" as const,
      description: "Comprehensive site survey",
      expectedOutcome: "Site map and area measurements",
      captureRequirements: {
        photoCount: 40,
        resolutionRequired: "4K" as const,
        angles: ["overhead"] as const,
      },
    },
    MAPPING_3D: {
      id: "3d-mapping",
      type: "3d_mapping" as const,
      priority: "low" as const,
      description: "3D building model generation",
      expectedOutcome: "Detailed 3D building model",
      captureRequirements: {
        photoCount: 60,
        resolutionRequired: "6K" as const,
        angles: ["overhead", "oblique", "side"] as const,
      },
    },
  },

  // Weather Limits (Default safe operating conditions)
  DEFAULT_WEATHER_CONDITIONS: {
    windSpeed: 8,
    visibility: 9500,
    temperature: 72,
    precipitation: 0,
    cloudCeiling: 5000,
  },

  // Weather Thresholds
  WEATHER_THRESHOLDS: {
    MAX_SAFE_WIND_SPEED: 25, // mph
    MIN_SAFE_VISIBILITY: 3000, // meters
    MIN_SAFE_TEMPERATURE: 32, // fahrenheit
    MAX_SAFE_TEMPERATURE: 104, // fahrenheit
    MIN_CLOUD_CEILING: 400, // feet
    MAX_PRECIPITATION: 0.1, // inches per hour
  },

  // Flight Status Values
  FLIGHT_STATUS: {
    DRAFT: "draft" as const,
    SCHEDULED: "scheduled" as const,
    IN_PROGRESS: "in_progress" as const,
    COMPLETED: "completed" as const,
    CANCELLED: "cancelled" as const,
    FAILED: "failed" as const,
  },

  // Data Quality Levels
  DATA_QUALITY: {
    EXCELLENT: "excellent" as const,
    GOOD: "good" as const,
    FAIR: "fair" as const,
    POOR: "poor" as const,
  },

  // API Endpoints (relative paths for internal APIs)
  API_ENDPOINTS: {
    FLIGHT_PLANS: "/api/drone/flight-plans",
    FLIGHT_EXECUTION: "/api/drone/execute",
    WEATHER_CONDITIONS: "/api/drone/weather",
    DRONE_FLEET: "/api/drone/fleet",
    ANALYSIS_RESULTS: "/api/drone/analysis",
  },

  // Timing Configuration
  TIMING: {
    API_TIMEOUT: 30000, // 30 seconds
    WEATHER_REFRESH_INTERVAL: 300000, // 5 minutes
    STATUS_POLL_INTERVAL: 5000, // 5 seconds
    DEBOUNCE_DELAY: 500, // 500ms
  },

  // Validation Rules
  VALIDATION: {
    MIN_FLIGHT_DURATION: 5, // minutes
    MAX_FLIGHT_DURATION: 120, // minutes
    MIN_ALTITUDE: 50, // feet
    MAX_ALTITUDE: 400, // feet (FAA limit for most operations)
    MIN_PHOTOS: 5,
    MAX_PHOTOS_PER_FLIGHT: 500,
  },

  // Error Messages
  ERROR_MESSAGES: {
    FLIGHT_PLAN_CREATION_FAILED:
      "Failed to create flight plan. Please try again.",
    FLIGHT_EXECUTION_FAILED:
      "Failed to execute flight plan. Please check conditions and try again.",
    WEATHER_FETCH_FAILED:
      "Unable to fetch weather conditions. Using cached data.",
    DRONE_SELECTION_REQUIRED:
      "Please select a drone before creating a flight plan.",
    UNSUITABLE_CONDITIONS:
      "Current weather conditions are not suitable for flight operations.",
    NETWORK_ERROR: "Network error occurred. Please check your connection.",
    VALIDATION_ERROR: "Please check all required fields and try again.",
  },

  // Success Messages
  SUCCESS_MESSAGES: {
    FLIGHT_PLAN_CREATED: "Flight plan created successfully.",
    FLIGHT_EXECUTED: "Flight executed successfully.",
    DRONE_SELECTED: "Drone selected successfully.",
    DATA_SAVED: "Data saved successfully.",
  },

  // Feature Flags (can be overridden by environment)
  FEATURES: {
    ENABLE_3D_MAPPING: true,
    ENABLE_THERMAL_IMAGING: false,
    ENABLE_LIVE_STREAMING: false,
    ENABLE_AUTO_PILOT: true,
    ENABLE_WEATHER_INTEGRATION: true,
    ENABLE_FLEET_MANAGEMENT: true,
  },

  // CSS Classes for consistent styling
  STYLES: {
    CARD_SELECTED: "ring-2 ring-primary-500",
    BADGE_SUCCESS: "bg-success-600 text-white",
    BADGE_WARNING: "bg-warning-600 text-white",
    BADGE_ERROR: "bg-error-600 text-white",
    BADGE_INFO: "bg-primary-600 text-white",
    BADGE_NEUTRAL: "bg-bg-muted text-text-secondary",
  },
} as const;

// Type exports for better type safety
export type FlightObjectiveType =
  keyof typeof DRONE_CONSTANTS.FLIGHT_OBJECTIVES;
export type FlightStatus =
  (typeof DRONE_CONSTANTS.FLIGHT_STATUS)[keyof typeof DRONE_CONSTANTS.FLIGHT_STATUS];
export type DataQuality =
  (typeof DRONE_CONSTANTS.DATA_QUALITY)[keyof typeof DRONE_CONSTANTS.DATA_QUALITY];
export type PhotoResolution =
  (typeof DRONE_CONSTANTS.PHOTO_RESOLUTIONS)[keyof typeof DRONE_CONSTANTS.PHOTO_RESOLUTIONS];
