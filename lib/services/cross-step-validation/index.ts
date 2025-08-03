/**
 * Cross-Step Validation Service - Main Orchestrator
 * Coordinates validation rules, validators, auto-fix engine, and state management
 */

import { GuidedFlowData } from "@/lib/types/estimate-types";
import {
  ValidationRulesEngine,
  CrossStepValidationResult,
  CrossStepValidationConfig,
} from "./validation-rules-engine";
import { CrossStepValidators } from "./cross-step-validators";
import { AutoFixEngine } from "./auto-fix-engine";
import { ValidationStateManager } from "./validation-state-manager";

export class CrossStepValidationService {
  private static instance: CrossStepValidationService | null = null;
  private crossStepValidators: CrossStepValidators;
  private initialized: boolean = false;

  private constructor(config?: Partial<CrossStepValidationConfig>) {
    this.crossStepValidators = new CrossStepValidators();

    if (config) {
      ValidationStateManager.updateConfig(config);
    }
  }

  /**
   * Get singleton instance
   */
  static getInstance(
    config?: Partial<CrossStepValidationConfig>,
  ): CrossStepValidationService {
    if (!CrossStepValidationService.instance) {
      CrossStepValidationService.instance = new CrossStepValidationService(
        config,
      );
    }
    return CrossStepValidationService.instance;
  }

  /**
   * Initialize validation system for an estimate
   */
  initializeValidation(
    estimateId: string,
    config?: Partial<CrossStepValidationConfig>,
  ): void {
    // Initialize state manager
    ValidationStateManager.initializeValidationState(estimateId, config);

    // Initialize validation rules
    if (!this.initialized) {
      ValidationRulesEngine.initializeValidationRules(
        this.crossStepValidators,
        AutoFixEngine,
      );
      this.initialized = true;
    }
  }

  /**
   * Subscribe to validation updates
   */
  subscribe(
    estimateId: string,
    callback: (result: CrossStepValidationResult) => void,
  ): () => void {
    return ValidationStateManager.subscribe(estimateId, callback);
  }

  /**
   * Validate cross-step data
   */
  validateCrossStepData(
    flowData: GuidedFlowData,
    estimateId?: string,
    changedStep?: string,
  ): CrossStepValidationResult {
    const result = ValidationRulesEngine.executeValidationRules(
      flowData,
      changedStep,
    );

    // Cache result if estimate ID provided
    if (estimateId) {
      ValidationStateManager.cacheValidationResult(estimateId, result);
    }

    return result;
  }

  /**
   * Update validation with debouncing
   */
  updateValidation(
    flowData: GuidedFlowData,
    estimateId: string,
    changedStep?: string,
  ): void {
    const validationCallback = async (): Promise<CrossStepValidationResult> => {
      return this.validateCrossStepData(flowData, estimateId, changedStep);
    };

    ValidationStateManager.updateValidation(
      estimateId,
      validationCallback,
      changedStep,
    );
  }

  /**
   * Schedule validation with delay
   */
  scheduleValidation(
    flowData: GuidedFlowData,
    estimateId: string,
    changedStep?: string,
  ): void {
    const validationCallback = async (): Promise<CrossStepValidationResult> => {
      return this.validateCrossStepData(flowData, estimateId, changedStep);
    };

    ValidationStateManager.scheduleValidation(
      estimateId,
      validationCallback,
      changedStep,
    );
  }

  /**
   * Force immediate validation (bypass debouncing)
   */
  async forceValidation(
    flowData: GuidedFlowData,
    estimateId: string,
  ): Promise<CrossStepValidationResult> {
    const validationCallback = async (): Promise<CrossStepValidationResult> => {
      return this.validateCrossStepData(flowData, estimateId);
    };

    return ValidationStateManager.forceValidation(
      estimateId,
      validationCallback,
    );
  }

  /**
   * Apply auto-fixes to data
   */
  applyAutoFixes(
    data: GuidedFlowData,
    validationResult: CrossStepValidationResult,
  ): GuidedFlowData {
    const autoFixableWarnings = validationResult.warnings.filter(
      (w) => w.canAutoFix,
    );

    if (autoFixableWarnings.length === 0) {
      return data;
    }

    const fixes: Partial<GuidedFlowData>[] = [];

    for (const warning of autoFixableWarnings) {
      switch (warning.id) {
        case "missing-service-area":
        case "service-area-consistency":
          fixes.push(AutoFixEngine.autoFixServiceAreaConsistency(data));
          break;

        case "inadequate-access":
        case "equipment-access":
          fixes.push(AutoFixEngine.autoFixEquipmentAccess(data));
          break;

        case "duration-too-short":
        case "duration-too-long":
        case "duration-feasibility":
          fixes.push(AutoFixEngine.autoFixDurationFeasibility(data));
          break;

        case "window-cleaning-access":
          fixes.push(AutoFixEngine.autoFixWindowCleaningAccess(data));
          break;

        case "urgent-timeline-conflict":
          if (data.duration?.crew?.size) {
            fixes.push(
              AutoFixEngine.autoFixTimelineConstraints(
                data,
                Math.ceil(data.duration.crew.size * 1.5),
              ),
            );
          }
          break;

        case "missing-dependency":
          // Extract missing dependencies from warning message
          const missingServices = this.extractMissingServices(warning.message);
          if (missingServices.length > 0) {
            fixes.push(
              AutoFixEngine.autoFixServiceDependencies(data, missingServices),
            );
          }
          break;

        case "pricing-variance":
          // Get suggested price from validation or real-time pricing
          const suggestedPrice = this.getSuggestedPrice(data, validationResult);
          if (suggestedPrice > 0) {
            fixes.push(
              AutoFixEngine.autoFixPricingConsistency(data, suggestedPrice),
            );
          }
          break;
      }
    }

    // Apply all fixes
    return AutoFixEngine.applyAutoFixes(data, fixes);
  }

  /**
   * Get last validation result
   */
  getLastResult(estimateId: string): CrossStepValidationResult | null {
    return ValidationStateManager.getCachedResult(estimateId);
  }

  /**
   * Get validation state
   */
  getValidationState(estimateId: string) {
    return ValidationStateManager.getValidationState(estimateId);
  }

  /**
   * Get validation statistics
   */
  getValidationStats(estimateId: string) {
    return ValidationStateManager.getValidationStats(estimateId);
  }

  /**
   * Check if validation is in progress
   */
  isValidating(estimateId: string): boolean {
    return ValidationStateManager.isValidating(estimateId);
  }

  /**
   * Check if validation is pending
   */
  isPendingValidation(estimateId: string): boolean {
    return ValidationStateManager.isPendingValidation(estimateId);
  }

  /**
   * Get validation error if any
   */
  getValidationError(estimateId: string): string | null {
    return ValidationStateManager.getValidationError(estimateId);
  }

  /**
   * Clear validation error
   */
  clearValidationError(estimateId: string): void {
    ValidationStateManager.clearValidationError(estimateId);
  }

  /**
   * Get available validation rules
   */
  getValidationRules() {
    return ValidationRulesEngine.getValidationRules();
  }

  /**
   * Enable specific validation rule
   */
  enableRule(ruleId: string): void {
    ValidationRulesEngine.enableRule(ruleId);
  }

  /**
   * Disable specific validation rule
   */
  disableRule(ruleId: string): void {
    ValidationRulesEngine.disableRule(ruleId);
  }

  /**
   * Add validation listener
   */
  addListener(
    estimateId: string,
    callback: (result: CrossStepValidationResult) => void,
  ): void {
    ValidationStateManager.addListener(estimateId, callback);
  }

  /**
   * Remove validation listener
   */
  removeListener(
    estimateId: string,
    callback: (result: CrossStepValidationResult) => void,
  ): void {
    ValidationStateManager.removeListener(estimateId, callback);
  }

  /**
   * Clear all data for estimate
   */
  clearEstimateData(estimateId: string): void {
    ValidationStateManager.clearEstimateData(estimateId);
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return ValidationStateManager.getConfig();
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<CrossStepValidationConfig>): void {
    ValidationStateManager.updateConfig(updates);
  }

  /**
   * Cleanup all validation data
   */
  cleanup(): void {
    ValidationStateManager.cleanup();
    this.initialized = false;
  }

  /**
   * Get all active estimate IDs
   */
  getActiveEstimateIds(): string[] {
    return ValidationStateManager.getActiveEstimateIds();
  }

  /**
   * Check if estimate has active validation
   */
  hasActiveValidation(estimateId: string): boolean {
    return ValidationStateManager.hasActiveValidation(estimateId);
  }

  // Private helper methods

  /**
   * Extract missing services from warning message
   */
  private extractMissingServices(message: string): string[] {
    // Parse warning messages like "GR typically requires WC service"
    const match = message.match(/requires (\w+) service/);
    return match ? [match[1]] : [];
  }

  /**
   * Get suggested price from validation result or calculate real-time price
   */
  private getSuggestedPrice(
    data: GuidedFlowData,
    validationResult: CrossStepValidationResult,
  ): number {
    // Look for price suggestion in validation suggestions
    const priceSuggestion = validationResult.suggestions.find(
      (s) => s.id === "align-pricing" && s.suggestedValue,
    );

    if (priceSuggestion && typeof priceSuggestion.suggestedValue === "number") {
      return priceSuggestion.suggestedValue;
    }

    // If no specific suggestion, return 0 to indicate no auto-fix
    return 0;
  }
}

// Export singleton instance getter for convenience
export const getCrossStepValidationService = (
  config?: Partial<CrossStepValidationConfig>,
) => CrossStepValidationService.getInstance(config);

// Re-export types and interfaces for convenience
export type {
  CrossStepValidationResult,
  CrossStepValidationConfig,
  ValidationWarning,
  ValidationError,
  ValidationSuggestion,
  ValidationRule,
} from "./validation-rules-engine";

export type { ValidationState } from "./validation-state-manager";

// Export default
export default CrossStepValidationService;
