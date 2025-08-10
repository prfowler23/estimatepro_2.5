// MIGRATED: Estimate Service - Now uses unified service
// This file provides backward compatibility during consolidation
// All functionality has been moved to estimate-service-unified.ts

export {
  estimateService,
  EstimateService,
  EstimateBusinessService,
  EstimateCrudService,
  EstimateValidationService,
  type EstimateValidationResult,
  type EstimateCreationParams,
  type EstimateUpdateParams,
  type EstimateListOptions,
  validateEstimate,
  createEstimate,
  getEstimate,
  updateEstimate,
  deleteEstimate,
  listEstimates,
  updateEstimateStatus,
} from "./estimate-service-backup";

// Legacy default export for compatibility
export { estimateService as default } from "./estimate-service-unified";
