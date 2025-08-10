/**
 * Centralized Type Definitions for Pricing System
 * Provides comprehensive type safety across all pricing-related modules
 */

import { ServiceType } from "@/lib/types/estimate-types";

/**
 * Confidence levels for pricing calculations
 */
export type ConfidenceLevel = "high" | "medium" | "low";

/**
 * Pricing method options
 */
export type PricingMethod = "hourly" | "fixed" | "square-foot" | "per-unit";

/**
 * Adjustment types for pricing
 */
export type AdjustmentType =
  | "markup"
  | "discount"
  | "risk"
  | "complexity"
  | "duration"
  | "equipment"
  | "seasonal"
  | "volume";

/**
 * Application scope for adjustments
 */
export type AdjustmentScope = "total" | "labor" | "materials" | ServiceType;

/**
 * Market tier classifications
 */
export type MarketTier = "budget" | "standard" | "premium" | "luxury";

/**
 * Customer priority focus
 */
export type CustomerPriority = "price" | "quality" | "speed" | "relationship";

/**
 * Timeline urgency levels
 */
export type TimelineUrgency = "urgent" | "normal" | "flexible";

/**
 * Budget indicators
 */
export type BudgetIndicator = "tight" | "moderate" | "flexible" | "premium";

/**
 * Company size categories
 */
export type CompanySize = "small" | "medium" | "large" | "enterprise";

/**
 * Access type for services
 */
export type AccessType = "ladder" | "lift" | "scaffold" | "rope";

/**
 * Difficulty levels
 */
export type DifficultyLevel = "easy" | "moderate" | "difficult";

/**
 * Base pricing calculation input
 */
export interface PricingInput {
  serviceType: ServiceType;
  area: number;
  height?: number;
  complexity?: number;
  accessType?: AccessType;
  urgency?: TimelineUrgency;
  seasonalFactor?: number;
}

/**
 * Pricing adjustment definition
 */
export interface PricingAdjustment {
  type: AdjustmentType;
  description: string;
  value: number;
  isPercentage: boolean;
  appliedTo: AdjustmentScope;
  reason?: string;
  confidence?: ConfidenceLevel;
}

/**
 * Service pricing breakdown
 */
export interface ServicePricingBreakdown {
  serviceType: ServiceType;
  serviceName: string;
  basePrice: number;
  adjustedPrice: number;
  hours: number;
  area: number;
  laborCost: number;
  materialCost: number;
  equipmentCost: number;
  confidence: ConfidenceLevel;
  adjustments: PricingAdjustment[];
  dependencies?: string[];
  warnings?: string[];
}

/**
 * Real-time pricing result
 */
export interface RealTimePricingResult {
  totalCost: number;
  totalHours: number;
  totalArea: number;
  laborCost: number;
  materialCost: number;
  equipmentCost: number;
  serviceBreakdown: ServicePricingBreakdown[];
  adjustments: PricingAdjustment[];
  confidence: ConfidenceLevel;
  missingData: string[];
  warnings: string[];
  suggestions?: string[];
  alternativePricing?: AlternativePricing[];
  lastUpdated: Date;
  cacheKey?: string;
}

/**
 * Alternative pricing option
 */
export interface AlternativePricing {
  name: string;
  price: number;
  description: string;
  savings?: number;
  conditions?: string[];
}

/**
 * Pricing dependency definition
 */
export interface PricingDependency {
  stepId: string;
  fieldPath: string;
  affects: string[];
  validator?: (value: unknown) => boolean;
  transformer?: (value: unknown) => unknown;
}

/**
 * Market analysis data
 */
export interface MarketAnalysisData {
  location: string;
  services: ServiceType[];
  priceDistribution: PriceDistribution;
  demandLevel: number;
  seasonalityFactor: number;
  competitorData: CompetitorProfile[];
  marketTrends: MarketTrend[];
  confidence: number;
  lastUpdated: Date;
}

/**
 * Price distribution statistics
 */
export interface PriceDistribution {
  min: number;
  p25: number;
  median: number;
  p75: number;
  max: number;
  mean?: number;
  stdDev?: number;
}

/**
 * Competitor profile
 */
export interface CompetitorProfile {
  id: string;
  name: string;
  tier: MarketTier;
  marketShare: number;
  avgPricing: {
    multiplier: number;
    confidence: number;
  };
  strengths: string[];
  weaknesses: string[];
  typicalDiscount: number;
  responseTime?: number;
  serviceQuality?: number;
  insuranceCoverage?: string;
  services: ServiceType[];
}

/**
 * Market trend information
 */
export interface MarketTrend {
  category: string;
  direction: "up" | "down" | "stable";
  magnitude: number;
  duration: "short" | "medium" | "long";
  impact: "low" | "medium" | "high";
  affectedServices?: ServiceType[];
}

/**
 * Customer profile for pricing
 */
export interface CustomerProfile {
  companySize: CompanySize;
  timeline: TimelineUrgency;
  budgetIndicators: BudgetIndicator;
  previousVendors: string[];
  priority: CustomerPriority;
  paymentHistory?: "excellent" | "good" | "fair" | "poor";
  loyaltyScore?: number;
  lifetimeValue?: number;
}

/**
 * Project complexity scoring
 */
export interface ComplexityScore {
  technical: number; // 1-10
  access: number; // 1-10
  safety: number; // 1-10
  timeline: number; // 1-10
  coordination: number; // 1-10
  overall: number; // weighted average
  factors?: string[];
}

/**
 * Win rate data for pricing optimization
 */
export interface WinRateData {
  pricePoint: number;
  services: ServiceType[];
  winRate: number;
  sampleSize: number;
  customerType: string;
  projectSize: "small" | "medium" | "large";
  margin: number;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

/**
 * Pricing strategy definition
 */
export interface PricingStrategy {
  id: string;
  name: string;
  description: string;
  baseMultiplier: number;
  adjustments: PricingAdjustment[];
  conditions?: PricingCondition[];
  priority: number;
  enabled: boolean;
}

/**
 * Pricing condition for strategy application
 */
export interface PricingCondition {
  field: string;
  operator: "equals" | "greater" | "less" | "contains" | "in";
  value: unknown;
  weight?: number;
}

/**
 * Pricing cache entry
 */
export interface PricingCacheEntry {
  key: string;
  result: RealTimePricingResult;
  timestamp: Date;
  ttl: number;
  hits: number;
  dependencies?: string[];
}

/**
 * Pricing configuration
 */
export interface PricingConfig {
  updateInterval: number;
  enableLiveUpdates: boolean;
  confidenceThreshold: number;
  includeRiskAdjustments: boolean;
  enableDependencyTracking: boolean;
  cacheEnabled: boolean;
  cacheTTL: number;
  maxCacheSize: number;
  enableAlternativePricing: boolean;
  enableMarketAnalysis: boolean;
  debugMode?: boolean;
}

/**
 * Pricing error types
 */
export enum PricingErrorType {
  INVALID_INPUT = "INVALID_INPUT",
  CALCULATION_ERROR = "CALCULATION_ERROR",
  MISSING_DATA = "MISSING_DATA",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
  TIMEOUT = "TIMEOUT",
  CACHE_ERROR = "CACHE_ERROR",
}

/**
 * Pricing error
 */
export class PricingError extends Error {
  constructor(
    message: string,
    public type: PricingErrorType,
    public details?: unknown,
  ) {
    super(message);
    this.name = "PricingError";
  }
}

/**
 * Pricing validation result
 */
export interface PricingValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions?: string[];
}

/**
 * Type guards for runtime type checking
 */
export const isPricingAdjustment = (
  value: unknown,
): value is PricingAdjustment => {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    "description" in value &&
    "value" in value &&
    "isPercentage" in value &&
    "appliedTo" in value
  );
};

export const isConfidenceLevel = (value: unknown): value is ConfidenceLevel => {
  return value === "high" || value === "medium" || value === "low";
};

export const isValidPricingResult = (
  value: unknown,
): value is RealTimePricingResult => {
  return (
    typeof value === "object" &&
    value !== null &&
    "totalCost" in value &&
    "totalHours" in value &&
    "totalArea" in value &&
    "serviceBreakdown" in value &&
    "confidence" in value &&
    typeof (value as any).totalCost === "number" &&
    typeof (value as any).totalHours === "number" &&
    Array.isArray((value as any).serviceBreakdown)
  );
};
