// MIGRATED: Real-Time Pricing Service - Now uses unified service
// This file provides backward compatibility during consolidation
// All real-time pricing functionality has been moved to real-time-pricing-service-unified.ts

export {
  unifiedRealTimePricingService as realTimePricingService,
  RealTimePricingService,
  RealTimePricingServiceV2,
  type RealTimePricingResult,
  type ServicePricingBreakdown,
  type PricingAdjustment,
  type PricingDependency,
  type RealTimePricingConfig,
  type ConfidenceLevel,
  type PricingInput,
  type PricingError,
  type PricingErrorType,
  type CustomerProfile,
  type MarketAnalysisData,
  type ComplexityScore,
  type PricingConfig,
  calculatePricing,
  startLivePricing,
  stopLivePricing,
  updatePricing,
  getLastResult,
  clearPricingData,
  getConfig,
  updateConfig,
  subscribe,
  unsubscribe,
  registerDependency,
  checkDependencies,
  clearDependencies,
  getRealTimePricingService,
  createRealTimePricingService,
  getSharedRealTimePricingService,
} from "./real-time-pricing-service-backup";

// Legacy default export for compatibility
export {
  UnifiedRealTimePricingService,
  unifiedRealTimePricingService as default,
} from "./real-time-pricing-service-unified";
