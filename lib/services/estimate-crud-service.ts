// MIGRATED: Estimate CRUD Service - Now uses unified service
// This file provides backward compatibility during consolidation
// All CRUD functionality has been moved to estimate-service-unified.ts

export {
  estimateService as EstimateCrudService,
  EstimateService,
  type EstimateCreationParams,
  type EstimateUpdateParams,
  type EstimateListOptions,
  createEstimate,
  getEstimate,
  updateEstimate,
  deleteEstimate,
  listEstimates,
} from "./estimate-service-backup";

// Legacy default export for compatibility
export { EstimateService as default } from "./estimate-service-unified";
