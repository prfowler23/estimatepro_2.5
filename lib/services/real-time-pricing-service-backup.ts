// BACKUP - Legacy real-time pricing service exports for migration
// This file provides backward compatibility during the consolidation phase
// Once all imports are updated, this file can be removed

export {
  unifiedRealTimePricingService as RealTimePricingService,
  unifiedRealTimePricingService as RealTimePricingServiceV2,
  UnifiedRealTimePricingService,
  getUnifiedRealTimePricingService,
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
} from "./real-time-pricing-service-unified";

// Legacy method exports for compatibility
import {
  unifiedRealTimePricingService,
  UnifiedRealTimePricingService,
} from "./real-time-pricing-service-unified";

// ==============================================================================
// V1 REAL-TIME PRICING SERVICE LEGACY METHODS
// ==============================================================================

// Core V1 methods
export const calculatePricing = (workflowData: any, customerId?: string) =>
  unifiedRealTimePricingService.calculatePricing(workflowData, customerId);

export const startLivePricing = (
  workflowId: string,
  workflowData: any,
  callback: (result: any) => void,
  customerId?: string,
) =>
  unifiedRealTimePricingService.startLivePricing(
    workflowId,
    workflowData,
    callback,
    customerId,
  );

export const stopLivePricing = (workflowId: string) =>
  unifiedRealTimePricingService.stopLivePricing(workflowId);

export const updatePricing = (
  workflowId: string,
  updatedData: any,
  customerId?: string,
) =>
  unifiedRealTimePricingService.updatePricing(
    workflowId,
    updatedData,
    customerId,
  );

export const getLastResult = (workflowId: string) =>
  unifiedRealTimePricingService.getLastResult(workflowId);

export const clearPricingData = (workflowId: string) =>
  unifiedRealTimePricingService.clearPricingData(workflowId);

export const getConfig = () => unifiedRealTimePricingService.getConfig();

export const updateConfig = (newConfig: any) =>
  unifiedRealTimePricingService.updateConfig(newConfig);

// Subscription methods
export const subscribe = (
  workflowId: string,
  callback: (result: any) => void,
  filters?: any,
) => unifiedRealTimePricingService.subscribe(workflowId, callback, filters);

export const unsubscribe = (workflowId: string, subscriptionId?: string) =>
  unifiedRealTimePricingService.unsubscribe(workflowId, subscriptionId);

// Dependency tracking methods
export const registerDependency = (
  stepId: string,
  fieldPath: string,
  affects: string[],
  validator?: (value: unknown) => boolean,
) =>
  unifiedRealTimePricingService.registerDependency(
    stepId,
    fieldPath,
    affects,
    validator,
  );

export const checkDependencies = (
  stepId: string,
  fieldPath: string,
  newValue: unknown,
) =>
  unifiedRealTimePricingService.checkDependencies(stepId, fieldPath, newValue);

export const clearDependencies = (workflowId: string) =>
  unifiedRealTimePricingService.clearDependencies(workflowId);

// ==============================================================================
// V2 REAL-TIME PRICING SERVICE LEGACY METHODS
// ==============================================================================

// V2 specific methods (also available through unified service)
export const getMetrics = () => unifiedRealTimePricingService.getMetrics();

export const reset = () => unifiedRealTimePricingService.reset();

export const healthCheck = () => unifiedRealTimePricingService.healthCheck();

// ==============================================================================
// LEGACY CLASS ALIASES AND INSTANCES
// ==============================================================================

// V1 Legacy class (singleton-based)
export class LegacyRealTimePricingService {
  private static instance: RealTimePricingService | null = null;

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): LegacyRealTimePricingService {
    if (!LegacyRealTimePricingService.instance) {
      // @ts-expect-error private constructor pattern retained for compatibility
      LegacyRealTimePricingService.instance =
        new LegacyRealTimePricingService();
    }
    return LegacyRealTimePricingService.instance as any;
  }

  // Instance methods that delegate to unified service
  async calculatePricing(workflowData: any, customerId?: string) {
    return unifiedRealTimePricingService.calculatePricing(
      workflowData,
      customerId,
    );
  }

  async startLivePricing(
    workflowId: string,
    workflowData: any,
    callback: (result: any) => void,
    customerId?: string,
  ) {
    return unifiedRealTimePricingService.startLivePricing(
      workflowId,
      workflowData,
      callback,
      customerId,
    );
  }

  stopLivePricing(workflowId: string) {
    return unifiedRealTimePricingService.stopLivePricing(workflowId);
  }

  async updatePricing(
    workflowId: string,
    updatedData: any,
    customerId?: string,
  ) {
    return unifiedRealTimePricingService.updatePricing(
      workflowId,
      updatedData,
      customerId,
    );
  }

  getLastResult(workflowId: string) {
    return unifiedRealTimePricingService.getLastResult(workflowId);
  }

  clearPricingData(workflowId: string) {
    return unifiedRealTimePricingService.clearPricingData(workflowId);
  }

  getConfig() {
    return unifiedRealTimePricingService.getConfig();
  }

  updateConfig(newConfig: any) {
    return unifiedRealTimePricingService.updateConfig(newConfig);
  }

  subscribe(
    workflowId: string,
    callback: (result: any) => void,
    filters?: any,
  ) {
    return unifiedRealTimePricingService.subscribe(
      workflowId,
      callback,
      filters,
    );
  }

  unsubscribe(workflowId: string, subscriptionId?: string) {
    return unifiedRealTimePricingService.unsubscribe(
      workflowId,
      subscriptionId,
    );
  }

  registerDependency(
    stepId: string,
    fieldPath: string,
    affects: string[],
    validator?: (value: unknown) => boolean,
  ) {
    return unifiedRealTimePricingService.registerDependency(
      stepId,
      fieldPath,
      affects,
      validator,
    );
  }

  checkDependencies(stepId: string, fieldPath: string, newValue: unknown) {
    return unifiedRealTimePricingService.checkDependencies(
      stepId,
      fieldPath,
      newValue,
    );
  }

  clearDependencies(workflowId: string) {
    return unifiedRealTimePricingService.clearDependencies(workflowId);
  }
}

// V2 Legacy class (non-singleton, dependency injection)
export class LegacyRealTimePricingServiceV2 {
  constructor(config?: any, cache?: any, strategyManager?: any) {
    // V2 constructor just returns unified service instance
    // In practice, this would need more sophisticated handling
    return unifiedRealTimePricingService as any;
  }

  // All methods delegate to unified service
  async calculatePricing(workflowData: any, customerId?: string) {
    return unifiedRealTimePricingService.calculatePricing(
      workflowData,
      customerId,
    );
  }

  subscribe(
    workflowId: string,
    callback: (result: any) => void,
    filters?: any,
  ) {
    return unifiedRealTimePricingService.subscribe(
      workflowId,
      callback,
      filters,
    );
  }

  unsubscribe(workflowId: string, subscriptionId?: string) {
    return unifiedRealTimePricingService.unsubscribe(
      workflowId,
      subscriptionId,
    );
  }

  getLastResult(workflowId: string) {
    return unifiedRealTimePricingService.getLastResult(workflowId);
  }

  clearPricingData(workflowId: string) {
    return unifiedRealTimePricingService.clearPricingData(workflowId);
  }

  getConfig() {
    return unifiedRealTimePricingService.getConfig();
  }

  updateConfig(newConfig: any) {
    return unifiedRealTimePricingService.updateConfig(newConfig);
  }

  getMetrics() {
    return unifiedRealTimePricingService.getMetrics();
  }

  reset() {
    return unifiedRealTimePricingService.reset();
  }

  async healthCheck() {
    return unifiedRealTimePricingService.healthCheck();
  }
}

// ==============================================================================
// DEFAULT EXPORTS FOR COMPATIBILITY
// ==============================================================================

// Default export that matches original service patterns
export default unifiedRealTimePricingService;

// Legacy singleton pattern exports for V1 compatibility
export const realTimePricingService =
  LegacyRealTimePricingService.getInstance();

// Factory functions for creating instances (legacy compatibility)
export function getRealTimePricingService() {
  return LegacyRealTimePricingService.getInstance();
}

export function createRealTimePricingService(config?: any) {
  return new LegacyRealTimePricingServiceV2(config);
}

export function getSharedRealTimePricingService() {
  return unifiedRealTimePricingService;
}

// V2 factory compatibility
export function createRealTimePricingServiceV2(
  config?: any,
  cache?: any,
  strategyManager?: any,
) {
  return new LegacyRealTimePricingServiceV2(config, cache, strategyManager);
}

// Re-export unified service (already imported above)
export { unifiedRealTimePricingService };

// Export unified service as both V1 and V2 instances for compatibility
export const realTimePricingServiceV2 = unifiedRealTimePricingService;
