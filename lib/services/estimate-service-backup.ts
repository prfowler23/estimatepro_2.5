// BACKUP - Legacy estimate service exports for migration
// This file provides backward compatibility during the consolidation phase
// Once all imports are updated, this file can be removed

export {
  estimateService as EstimateBusinessService,
  estimateService as EstimateCrudService,
  estimateService as EstimateValidationService,
  EstimateService,
  type EstimateValidationResult,
  type EstimateCreationParams,
  type EstimateUpdateParams,
  type EstimateListOptions,
} from "./estimate-service-unified";

// Legacy method exports for compatibility
import { estimateService } from "./estimate-service-unified";

// Export static methods for backward compatibility
export const validateEstimate = (params: any) =>
  estimateService.validateEstimate(params);
export const createEstimate = (params: any) =>
  estimateService.createEstimate(params);
export const getEstimate = (id: string) => estimateService.getEstimate(id);
export const updateEstimate = (id: string, params: any) =>
  estimateService.updateEstimate(id, params);
export const deleteEstimate = (id: string) =>
  estimateService.deleteEstimate(id);
export const listEstimates = (options?: any) =>
  estimateService.listEstimates(options);
export const updateEstimateStatus = (id: string, status: any) =>
  estimateService.updateEstimateStatus(id, status);

// Legacy method aliases for compatibility
export const getAllEstimates = (options?: any) =>
  estimateService.listEstimates(options);
