/**
 * Shared constants for schema validation
 * Centralizes all repeated enums, constraints, and validation rules
 */

// Building Types
export const BUILDING_TYPES = [
  "office",
  "retail",
  "residential",
  "industrial",
  "mixed-use",
  "institutional",
  "commercial",
  "healthcare",
  "educational",
  "hospitality",
  "warehouse",
  "medical",
] as const;

export type BuildingType = (typeof BUILDING_TYPES)[number];

// Service Types
export const SERVICE_TYPES = [
  "window-cleaning",
  "pressure-washing",
  "soft-washing",
  "biofilm-removal",
  "glass-restoration",
  "frame-restoration",
  "high-dusting",
  "final-clean",
  "granite-reconditioning",
  "pressure-wash-seal",
  "parking-deck",
] as const;

export type ServiceType = (typeof SERVICE_TYPES)[number];

// Workflow Steps
export const WORKFLOW_STEPS = [
  "initial-contact",
  "scope-details",
  "files-photos",
  "area-of-work",
  "takeoff",
  "duration",
  "expenses",
  "pricing",
  "summary",
] as const;

export type WorkflowStep = (typeof WORKFLOW_STEPS)[number];

// Status Types
export const ESTIMATE_STATUSES = [
  "draft",
  "sent",
  "approved",
  "rejected",
] as const;
export const FLOW_STATUSES = [
  "draft",
  "in-progress",
  "completed",
  "abandoned",
] as const;

export type EstimateStatus = (typeof ESTIMATE_STATUSES)[number];
export type FlowStatus = (typeof FLOW_STATUSES)[number];

// Contact Methods
export const CONTACT_METHODS = [
  "email",
  "phone",
  "meeting",
  "walkin",
  "other",
] as const;

export type ContactMethod = (typeof CONTACT_METHODS)[number];

// Analysis Types
export const ANALYSIS_TYPES = [
  "facade",
  "material",
  "damage",
  "general",
] as const;

export type AnalysisType = (typeof ANALYSIS_TYPES)[number];

// Work Area Types
export const WORK_AREA_TYPES = [
  "interior",
  "exterior",
  "rooftop",
  "basement",
  "parking",
] as const;

export type WorkAreaType = (typeof WORK_AREA_TYPES)[number];

// Access Types
export const ACCESS_TYPES = ["ground", "ladder", "lift", "rope"] as const;

export type AccessType = (typeof ACCESS_TYPES)[number];

// Difficulty Levels
export const DIFFICULTY_LEVELS = ["easy", "medium", "hard"] as const;
export const SEVERITY_LEVELS = [
  "light",
  "moderate",
  "heavy",
  "severe",
] as const;
export const CONDITION_LEVELS = ["excellent", "good", "fair", "poor"] as const;
export const COMPLEXITY_LEVELS = ["simple", "moderate", "complex"] as const;
export const IMPACT_LEVELS = ["low", "medium", "high"] as const;

export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[number];
export type SeverityLevel = (typeof SEVERITY_LEVELS)[number];
export type ConditionLevel = (typeof CONDITION_LEVELS)[number];
export type ComplexityLevel = (typeof COMPLEXITY_LEVELS)[number];
export type ImpactLevel = (typeof IMPACT_LEVELS)[number];

// Measurement Types
export const MEASUREMENT_TYPES = [
  "length",
  "width",
  "height",
  "area",
  "count",
] as const;
export const MEASUREMENT_UNITS = ["ft", "sqft", "count"] as const;

export type MeasurementType = (typeof MEASUREMENT_TYPES)[number];
export type MeasurementUnit = (typeof MEASUREMENT_UNITS)[number];

// Equipment Types
export const EQUIPMENT_TYPES = ["rental", "purchase", "maintenance"] as const;

export type EquipmentType = (typeof EQUIPMENT_TYPES)[number];

// Material Categories
export const MATERIAL_CATEGORIES = [
  "chemical",
  "supply",
  "safety",
  "disposal",
] as const;

export type MaterialCategory = (typeof MATERIAL_CATEGORIES)[number];

// Cost Categories
export const COST_CATEGORIES = [
  "permit",
  "insurance",
  "travel",
  "misc",
] as const;

export type CostCategory = (typeof COST_CATEGORIES)[number];

// Risk Categories
export const RISK_CATEGORIES = [
  "weather",
  "access",
  "safety",
  "client",
  "technical",
] as const;

export type RiskCategory = (typeof RISK_CATEGORIES)[number];

// Pricing Strategies
export const PRICING_STRATEGIES = [
  "competitive",
  "premium",
  "value",
  "penetration",
] as const;

export type PricingStrategy = (typeof PRICING_STRATEGIES)[number];

// Weather Risk Types
export const WEATHER_RISK_TYPES = [
  "rain",
  "wind",
  "temperature",
  "humidity",
] as const;

export type WeatherRiskType = (typeof WEATHER_RISK_TYPES)[number];

// Pricing Adjustment Types
export const ADJUSTMENT_TYPES = [
  "risk",
  "complexity",
  "urgency",
  "competitive",
] as const;

export type AdjustmentType = (typeof ADJUSTMENT_TYPES)[number];

// Numerical Constraints
export const CONSTRAINTS = {
  // Building constraints
  MIN_STORIES: 1,
  MAX_STORIES: 100,
  MIN_HEIGHT_FEET: 1,
  MAX_HEIGHT_FEET: 1000,

  // Area constraints
  MIN_AREA: 1,
  MAX_AREA: 1000000,
  MAX_GLASS_AREA: 100000,
  MAX_FACADE_AREA: 200000,

  // Team constraints
  MIN_CREW_SIZE: 1,
  MAX_CREW_SIZE: 20,
  MIN_SHIFT_LENGTH: 4,
  MAX_SHIFT_LENGTH: 12,
  MIN_WORK_WEEK: 3,
  MAX_WORK_WEEK: 7,

  // Pricing constraints
  MIN_MARGIN: 0,
  MAX_MARGIN: 500,
  MIN_OVERHEAD: 0,
  MAX_OVERHEAD: 100,

  // Validation constraints
  MIN_CONFIDENCE: 0,
  MAX_CONFIDENCE: 100,
  MIN_PERCENTAGE: 0,
  MAX_PERCENTAGE: 100,

  // Content constraints
  MAX_CONTENT_LENGTH: 10000,
  MAX_CONTEXT_LENGTH: 2000,
  MAX_NOTES_LENGTH: 5000,

  // File constraints
  MAX_PHOTOS: 10,
  MAX_FILE_SIZE_MB: 10,

  // Workflow constraints
  MIN_STEP: 1,
  MAX_STEP: 9,
  MIN_VERSION: 1,

  // Multiplier constraints
  MIN_RISK_MULTIPLIER: 0.5,
  MAX_RISK_MULTIPLIER: 3,
  MIN_COMPLEXITY_MULTIPLIER: 0.8,
  MAX_COMPLEXITY_MULTIPLIER: 2.5,
  MIN_URGENCY_MULTIPLIER: 0.9,
  MAX_URGENCY_MULTIPLIER: 2,
  MIN_COMPETITIVE_ADJUSTMENT: -50,
  MAX_COMPETITIVE_ADJUSTMENT: 50,
} as const;

// Validation Regex Patterns
export const PATTERNS = {
  PHONE: /^\+?[\d\s\-\(\)]+$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  URL: /^https?:\/\/.+/,
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  REQUIRED: "This field is required",
  INVALID_EMAIL: "Please enter a valid email address",
  INVALID_PHONE: "Please enter a valid phone number",
  INVALID_URL: "Please enter a valid URL",
  INVALID_UUID: "Please enter a valid UUID",
  POSITIVE_NUMBER: "Must be a positive number",
  MIN_VALUE: (min: number) => `Must be at least ${min}`,
  MAX_VALUE: (max: number) => `Must be no more than ${max}`,
  MIN_LENGTH: (min: number) => `Must be at least ${min} characters`,
  MAX_LENGTH: (max: number) => `Must be no more than ${max} characters`,
  INVALID_RANGE: (min: number, max: number) =>
    `Must be between ${min} and ${max}`,
  INVALID_ENUM: (values: readonly string[]) =>
    `Must be one of: ${values.join(", ")}`,
  CONTENT_TOO_LONG: "Content exceeds maximum allowed length",
  AT_LEAST_ONE: "At least one item is required",
  CONDITIONAL_REQUIRED: (condition: string) => `Required when ${condition}`,
} as const;

// Default Values
export const DEFAULTS = {
  CREW_SIZE: 2,
  SHIFT_LENGTH: 8,
  WORK_WEEK: 5,
  NUMBER_OF_DROPS: 1,
  BUILDING_HEIGHT_STORIES: 1,
  LABOR_MARGIN: 20,
  MATERIAL_MARGIN: 15,
  EQUIPMENT_MARGIN: 10,
  OVERHEAD_RATE: 15,
  EFFICIENCY: 1,
  OVERTIME_HOURS: 0,
  NUMBER_OF_COATS: 1,
  TAX_RATE: 0,
} as const;

// Locations
export const LOCATIONS = ["raleigh", "charlotte", "greensboro"] as const;

export type Location = (typeof LOCATIONS)[number];

// Surface Types
export const SURFACE_TYPES = {
  PRESSURE_WASHING: ["regular", "ornate", "mixed"] as const,
  PARKING_DECK: ["ground", "elevated", "underground"] as const,
  SOFT_WASHING: ["vinyl", "stucco", "wood", "composite", "mixed"] as const,
  BIOFILM: ["concrete", "stone", "metal", "glass", "mixed"] as const,
  PRESSURE_WASH_SEAL: ["brick", "concrete", "mixed"] as const,
} as const;

// Service Levels
export const SERVICE_LEVELS = {
  PARKING_DECK: ["sweep_only", "wash_only", "sweep_and_wash"] as const,
  GRANITE: ["clean_only", "clean_and_seal", "restore_and_seal"] as const,
  SEALER: ["standard", "premium"] as const,
} as const;

// Image Types
export const IMAGE_TYPES = ["aerial", "ground", "drone", "satellite"] as const;
export const VIEW_ANGLES = [
  "front",
  "rear",
  "left",
  "right",
  "oblique",
  "top",
] as const;

export type ImageType = (typeof IMAGE_TYPES)[number];
export type ViewAngle = (typeof VIEW_ANGLES)[number];

// Risk Tolerances
export const RISK_TOLERANCES = ["low", "medium", "high"] as const;

export type RiskTolerance = (typeof RISK_TOLERANCES)[number];
