// MIGRATED: Calculator Service - Now uses unified service
// This file provides backward compatibility during consolidation
// All calculation functionality has been moved to resource-service-unified.ts

export {
  unifiedResourceService as calculatorService,
  UnifiedResourceService as CalculatorService,
  type CalculationParams,
  type ValidationResult,
} from "./resource-service-unified";

// Legacy default export for compatibility
export { unifiedResourceService as default } from "./resource-service-unified";
