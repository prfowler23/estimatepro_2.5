// EstimatePro Calculation Constants
// Comprehensive constants for all service calculations

// Service Types
export const SERVICE_TYPES = {
  GR: "Glass Restoration",
  WC: "Window Cleaning",
  PW: "Pressure Washing",
  PWS: "Pressure Wash & Seal",
  FC: "Final Clean",
  FR: "Frame Restoration",
  HD: "High Dusting",
  SW: "Soft Washing",
  PD: "Parking Deck",
  GRC: "Granite Reconditioning",
  BR: "Biofilm Removal",
} as const;

// Location-based hourly rates
export const LOCATION_RATES = {
  windowCleaning: {
    raleigh: 75,
    charlotte: 65,
    greensboro: 75,
  },
  finalClean: {
    raleigh: 70,
    charlotte: 70,
    greensboro: 70,
  },
  pressureWashFlat: {
    raleigh: 0.19,
    charlotte: 0.15,
    greensboro: 0.19,
  },
} as const;

// Service-specific rates
export const SERVICE_RATES = {
  glassRestoration: 70, // per window
  frameRestoration: 25, // per frame
  parkingDeck: {
    raleigh: { min: 18, max: 23 },
    charlotte: { min: 16, max: 21 },
    greensboro: { min: 18, max: 23 },
  },
  graniteReconditioning: 1.75, // per sq ft
} as const;

// Pressure washing rates
export const PRESSURE_WASH_RATES = {
  regularFacade: 0.35,
  ornateFacade: 0.5,
  flatSurface: 0.19, // raleigh/greensboro
  flatSurfaceCharlotte: 0.15,
  hardscapes: 0.3,
} as const;

// Pressure wash & seal rates
export const PWS_RATES = {
  standardSealer: 1.25,
  premiumSealer: 1.35,
} as const;

// Other service rates
export const OTHER_RATES = {
  highDusting: { min: 0.37, max: 0.75 },
  softWashing: 0.45,
  biofilmRemoval: { min: 0.75, max: 1.0 },
} as const;

// Standard measurements
export const SURFACE = {
  standardWindowSize: 24, // sq ft (6x4 feet)
  standardFrameSize: 3.5, // sq ft per frame
  standardParkingSpace: 270, // sq ft
} as const;

// Time per unit constants
export const TIME_PER_UNIT = {
  glassRestoration: 0.5, // hours per window
  windowCleaning: 0.025, // hours per window
  finalClean: 0.167, // hours per window
  frameRestoration: 0.117, // hours per frame
} as const;

// Production rates (sq ft per hour per person)
export const PRODUCTION_RATES = {
  pwFacade: 350,
  pwFlatSurface: 1250,
  pwsBrick: 160,
  pwsConcrete: 120,
  swFacade: 1000,
  highDusting: 500,
} as const;

// Setup time multipliers
export const SETUP_TIME = {
  standard: 0.25, // 25% of labor hours
  special: 2, // For FC/FR: 2 × (labor hours ÷ shift length)
} as const;

// Equipment rig times (hours)
export const RIG_TIME = {
  rds: 0.5, // per drop
  scaffold: 3.0, // per drop
  boomLift: 0.25, // per drop
} as const;

// Validation constants
export const VALIDATION = {
  maxGlassToFacadeRatio: 0.9, // 90%
  minSetupTimePercent: 0.15, // 15%
  maxSetupTimePercent: 0.35, // 35%
  pricePerWindowRange: { min: 50, max: 90 },
  maxBuildingHeight: 60, // stories
} as const;

// Equipment types
export const EQUIPMENT_TYPES = {
  GROUND: "Ground Level",
  SCISSOR: "Scissor Lift",
  BOOM: "Boom Lift",
  RDS: "Rope Descent System",
  SCAFFOLD: "Suspended Scaffold",
} as const;

// Default crew and shift settings
export const DEFAULTS = {
  crewSize: 2,
  shiftLength: 8, // hours
  workWeek: 5, // days
  overtimeWeek: 6, // days
} as const;

// Location types
export type Location = "raleigh" | "charlotte" | "greensboro";
export type ServiceType = keyof typeof SERVICE_TYPES;

// Equipment rate constants
export const EQUIPMENT_RATES = {
  boom: {
    daily: 450,
    weekly: 1800,
    monthly: 6750,
  },
  scissor: {
    daily: 275,
    weekly: 1100,
    monthly: 4125,
  },
  rds: {
    daily: 125,
    weekly: 500,
    monthly: 1875,
  },
  scaffold: {
    daily: 200,
    weekly: 800,
    monthly: 3000,
  },
} as const;

// Multipliers for different building complexities
export const COMPLEXITY_MULTIPLIERS = {
  simple: 1.0,
  standard: 1.2,
  complex: 1.5,
  ornate: 1.8,
} as const;

// Height-based multipliers
export const HEIGHT_MULTIPLIERS = {
  ground: 1.0, // 0-2 stories
  low: 1.1, // 3-5 stories
  medium: 1.25, // 6-10 stories
  high: 1.5, // 11-20 stories
  veryHigh: 1.8, // 21+ stories
} as const;

// Safety and access multipliers
export const ACCESS_MULTIPLIERS = {
  easy: 1.0,
  moderate: 1.15,
  difficult: 1.3,
  veryDifficult: 1.5,
} as const;

// Minimum charge constants
export const MINIMUM_CHARGES = {
  windowCleaning: 150,
  glassRestoration: 500,
  frameRestoration: 300,
  pressureWashing: 200,
  softWashing: 250,
  finalClean: 200,
  parkingDeck: 400,
  graniteReconditioning: 300,
  biofilmRemoval: 350,
  highDusting: 180,
} as const;

// Material cost constants
export const MATERIAL_COSTS = {
  standardCleaner: 2.5, // per gallon
  premiumCleaner: 4.75, // per gallon
  sealer: 12.5, // per gallon
  restorationCompound: 8.25, // per gallon
  granitePolish: 15.0, // per gallon
} as const;

// Coverage rates for materials
export const MATERIAL_COVERAGE = {
  standardCleaner: 500, // sq ft per gallon
  premiumCleaner: 400, // sq ft per gallon
  sealer: 300, // sq ft per gallon
  restorationCompound: 200, // sq ft per gallon
  granitePolish: 250, // sq ft per gallon
} as const;

// Seasonal multipliers
export const SEASONAL_MULTIPLIERS = {
  winter: 1.2, // Dec-Feb
  spring: 1.0, // Mar-May
  summer: 1.0, // Jun-Aug
  fall: 1.1, // Sep-Nov
} as const;

// Rush job multipliers
export const RUSH_MULTIPLIERS = {
  same_day: 2.0,
  next_day: 1.5,
  within_week: 1.2,
  standard: 1.0,
} as const;

// Quality level multipliers
export const QUALITY_MULTIPLIERS = {
  basic: 0.85,
  standard: 1.0,
  premium: 1.25,
  luxury: 1.5,
} as const;

// Waste factor constants
export const WASTE_FACTORS = {
  materials: 0.1, // 10% waste on materials
  time: 0.05, // 5% time buffer
  equipment: 0.0, // No waste on equipment
} as const;

// Profit margins by service type
export const PROFIT_MARGINS = {
  windowCleaning: 0.35, // 35%
  glassRestoration: 0.45, // 45%
  frameRestoration: 0.4, // 40%
  pressureWashing: 0.38, // 38%
  softWashing: 0.42, // 42%
  finalClean: 0.4, // 40%
  parkingDeck: 0.35, // 35%
  graniteReconditioning: 0.5, // 50%
  biofilmRemoval: 0.45, // 45%
  highDusting: 0.38, // 38%
} as const;

// Travel time constants (minutes)
export const TRAVEL_TIME = {
  withinCity: 30,
  nearbyCity: 60,
  distantCity: 120,
} as const;

// Weather delay factors
export const WEATHER_FACTORS = {
  rain: 0.0, // Cannot work
  wind: 0.7, // 30% reduction
  cold: 0.8, // 20% reduction
  heat: 0.9, // 10% reduction
  ideal: 1.0, // No impact
} as const;

// Building type multipliers
export const BUILDING_TYPE_MULTIPLIERS = {
  residential: 1.0,
  commercial: 1.1,
  industrial: 1.2,
  healthcare: 1.3,
  educational: 1.15,
  government: 1.25,
  retail: 1.05,
} as const;

// Frequency discount multipliers
export const FREQUENCY_DISCOUNTS = {
  oneTime: 1.0,
  monthly: 0.9, // 10% discount
  quarterly: 0.95, // 5% discount
  biannual: 0.97, // 3% discount
  annual: 0.85, // 15% discount
} as const;

// Volume discount thresholds and multipliers
export const VOLUME_DISCOUNTS = {
  small: { threshold: 0, multiplier: 1.0 }, // $0-$2,500
  medium: { threshold: 2500, multiplier: 0.95 }, // $2,500-$10,000
  large: { threshold: 10000, multiplier: 0.9 }, // $10,000-$25,000
  enterprise: { threshold: 25000, multiplier: 0.85 }, // $25,000+
} as const;

// Insurance and bonding rates
export const INSURANCE_RATES = {
  general: 0.015, // 1.5% of project value
  workers_comp: 0.02, // 2% of labor costs
  bonding: 0.01, // 1% of project value
} as const;

// Permit and licensing constants
export const PERMIT_COSTS = {
  basic: 50,
  building: 150,
  environmental: 200,
  specialty: 300,
} as const;
