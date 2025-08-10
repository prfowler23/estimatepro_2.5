// MIGRATED: Real-Time Pricing Service V2 - Now uses unified service
// This file provides backward compatibility during consolidation
// All real-time pricing functionality has been moved to real-time-pricing-service-unified.ts

export {
  unifiedRealTimePricingService as realTimePricingServiceV2,
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
  createRealTimePricingServiceV2,
  getSharedRealTimePricingService,
} from "./real-time-pricing-service-backup";

// Legacy default export for compatibility
export {
  UnifiedRealTimePricingService,
  unifiedRealTimePricingService as default,
} from "./real-time-pricing-service-unified";

// Provide legacy class name for components expecting it
export { LegacyRealTimePricingService as RealTimePricingService } from "./real-time-pricing-service-backup";
