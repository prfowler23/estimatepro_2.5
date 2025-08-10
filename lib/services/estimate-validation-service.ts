// MIGRATED: Estimate Validation Service - Now uses unified service
// This file provides backward compatibility during consolidation
// All validation functionality has been moved to estimate-service-unified.ts

export {
  estimateService as EstimateValidationService,
  EstimateService,
  type EstimateValidationResult,
  type EstimateCreationParams,
  validateEstimate,
} from "./estimate-service-backup";

// Legacy default export for compatibility
export { EstimateService as default } from "./estimate-service-unified";
