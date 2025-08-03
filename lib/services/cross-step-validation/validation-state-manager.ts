/**
 * Validation State Manager
 * State management, subscriptions, listeners, and result caching
 */

import { GuidedFlowData } from "@/lib/types/estimate-types";
import {
  CrossStepValidationResult,
  CrossStepValidationConfig,
} from "./validation-rules-engine";

export interface ValidationState {
  isValidating: boolean;
  lastValidation: Date | null;
  validationError: string | null;
  currentResult: CrossStepValidationResult | null;
  pendingValidation: boolean;
}

export class ValidationStateManager {
  private static listeners = new Map<
    string,
    ((result: CrossStepValidationResult) => void)[]
  >();
  private static lastResults = new Map<string, CrossStepValidationResult>();
  private static validationTimers = new Map<string, NodeJS.Timeout>();
  private static validationStates = new Map<string, ValidationState>();
  private static pendingSaves = new Map<string, Promise<boolean>>();

  private static readonly DEFAULT_CONFIG: CrossStepValidationConfig = {
    enableRealTimeValidation: true,
    enableAutoFix: false,
    validationInterval: 2000,
    priorityThreshold: "medium",
  };

  private static config = this.DEFAULT_CONFIG;

  /**
   * Initialize validation state for an estimate
   */
  static initializeValidationState(
    estimateId: string,
    config?: Partial<CrossStepValidationConfig>,
  ): void {
    if (config) {
      this.config = { ...this.DEFAULT_CONFIG, ...config };
    }

    this.validationStates.set(estimateId, {
      isValidating: false,
      lastValidation: null,
      validationError: null,
      currentResult: null,
      pendingValidation: false,
    });

    this.listeners.set(estimateId, []);
    this.lastResults.delete(estimateId);
  }

  /**
   * Get current validation state
   */
  static getValidationState(estimateId: string): ValidationState | null {
    return this.validationStates.get(estimateId) || null;
  }

  /**
   * Update validation state
   */
  static updateValidationState(
    estimateId: string,
    updates: Partial<ValidationState>,
  ): void {
    const state = this.validationStates.get(estimateId);
    if (state) {
      Object.assign(state, updates);
    }
  }

  /**
   * Subscribe to validation updates
   */
  static subscribe(
    estimateId: string,
    callback: (result: CrossStepValidationResult) => void,
  ): () => void {
    if (!this.listeners.has(estimateId)) {
      this.listeners.set(estimateId, []);
    }

    this.listeners.get(estimateId)!.push(callback);

    return () => {
      const callbacks = this.listeners.get(estimateId);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
        if (callbacks.length === 0) {
          this.listeners.delete(estimateId);
          this.clearValidationTimer(estimateId);
        }
      }
    };
  }

  /**
   * Notify all listeners of validation result
   */
  static notifyListeners(
    estimateId: string,
    result: CrossStepValidationResult,
  ): void {
    const listeners = this.listeners.get(estimateId);
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(result);
        } catch (error) {
          console.error("Validation listener error:", error);
        }
      });
    }
  }

  /**
   * Cache validation result
   */
  static cacheValidationResult(
    estimateId: string,
    result: CrossStepValidationResult,
  ): void {
    this.lastResults.set(estimateId, result);
    this.updateValidationState(estimateId, {
      currentResult: result,
      lastValidation: new Date(),
      validationError: null,
    });
  }

  /**
   * Get cached validation result
   */
  static getCachedResult(estimateId: string): CrossStepValidationResult | null {
    return this.lastResults.get(estimateId) || null;
  }

  /**
   * Schedule debounced validation
   */
  static scheduleValidation(
    estimateId: string,
    validationCallback: () => Promise<CrossStepValidationResult>,
    changedStep?: string,
  ): void {
    if (!this.config.enableRealTimeValidation) {
      return;
    }

    // Clear existing timer
    this.clearValidationTimer(estimateId);

    // Update state
    this.updateValidationState(estimateId, {
      pendingValidation: true,
    });

    // Set up debounced validation
    const timer = setTimeout(async () => {
      try {
        this.updateValidationState(estimateId, {
          isValidating: true,
          pendingValidation: false,
        });

        const result = await validationCallback();

        this.cacheValidationResult(estimateId, result);
        this.notifyListeners(estimateId, result);

        this.updateValidationState(estimateId, {
          isValidating: false,
          validationError: null,
        });
      } catch (error) {
        console.error("Validation failed:", error);
        this.updateValidationState(estimateId, {
          isValidating: false,
          pendingValidation: false,
          validationError:
            error instanceof Error ? error.message : "Unknown validation error",
        });
      }
    }, this.config.validationInterval);

    this.validationTimers.set(estimateId, timer);
  }

  /**
   * Clear validation timer
   */
  static clearValidationTimer(estimateId: string): void {
    const timer = this.validationTimers.get(estimateId);
    if (timer) {
      clearTimeout(timer);
      this.validationTimers.delete(estimateId);
    }
  }

  /**
   * Update validation with debouncing
   */
  static updateValidation(
    estimateId: string,
    validationCallback: () => Promise<CrossStepValidationResult>,
    changedStep?: string,
  ): void {
    this.scheduleValidation(estimateId, validationCallback, changedStep);
  }

  /**
   * Add validation listener
   */
  static addListener(
    estimateId: string,
    callback: (result: CrossStepValidationResult) => void,
  ): void {
    if (!this.listeners.has(estimateId)) {
      this.listeners.set(estimateId, []);
    }
    this.listeners.get(estimateId)!.push(callback);
  }

  /**
   * Remove validation listener
   */
  static removeListener(
    estimateId: string,
    callback: (result: CrossStepValidationResult) => void,
  ): void {
    const callbacks = this.listeners.get(estimateId);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
      if (callbacks.length === 0) {
        this.listeners.delete(estimateId);
        this.clearValidationTimer(estimateId);
      }
    }
  }

  /**
   * Check if validation is in progress
   */
  static isValidating(estimateId: string): boolean {
    const state = this.validationStates.get(estimateId);
    return state?.isValidating || false;
  }

  /**
   * Check if validation is pending
   */
  static isPendingValidation(estimateId: string): boolean {
    const state = this.validationStates.get(estimateId);
    return state?.pendingValidation || false;
  }

  /**
   * Get validation error if any
   */
  static getValidationError(estimateId: string): string | null {
    const state = this.validationStates.get(estimateId);
    return state?.validationError || null;
  }

  /**
   * Clear validation error
   */
  static clearValidationError(estimateId: string): void {
    this.updateValidationState(estimateId, {
      validationError: null,
    });
  }

  /**
   * Force immediate validation (bypass debouncing)
   */
  static async forceValidation(
    estimateId: string,
    validationCallback: () => Promise<CrossStepValidationResult>,
  ): Promise<CrossStepValidationResult> {
    // Clear any pending validation
    this.clearValidationTimer(estimateId);

    this.updateValidationState(estimateId, {
      isValidating: true,
      pendingValidation: false,
    });

    try {
      const result = await validationCallback();

      this.cacheValidationResult(estimateId, result);
      this.notifyListeners(estimateId, result);

      this.updateValidationState(estimateId, {
        isValidating: false,
        validationError: null,
      });

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown validation error";

      this.updateValidationState(estimateId, {
        isValidating: false,
        validationError: errorMessage,
      });

      throw error;
    }
  }

  /**
   * Get pending save promise
   */
  static getPendingSave(estimateId: string): Promise<boolean> | null {
    return this.pendingSaves.get(estimateId) || null;
  }

  /**
   * Set pending save promise
   */
  static setPendingSave(
    estimateId: string,
    savePromise: Promise<boolean>,
  ): void {
    this.pendingSaves.set(estimateId, savePromise);
  }

  /**
   * Clear pending save promise
   */
  static clearPendingSave(estimateId: string): void {
    this.pendingSaves.delete(estimateId);
  }

  /**
   * Clear all data for estimate
   */
  static clearEstimateData(estimateId: string): void {
    this.lastResults.delete(estimateId);
    this.listeners.delete(estimateId);
    this.validationStates.delete(estimateId);
    this.pendingSaves.delete(estimateId);
    this.clearValidationTimer(estimateId);
  }

  /**
   * Get current configuration
   */
  static getConfig(): CrossStepValidationConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  static updateConfig(updates: Partial<CrossStepValidationConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Get validation statistics for an estimate
   */
  static getValidationStats(estimateId: string): {
    hasListeners: boolean;
    listenerCount: number;
    hasResult: boolean;
    hasPendingValidation: boolean;
    isValidating: boolean;
    lastValidation: Date | null;
    validationError: string | null;
  } {
    const listeners = this.listeners.get(estimateId) || [];
    const state = this.validationStates.get(estimateId);

    return {
      hasListeners: listeners.length > 0,
      listenerCount: listeners.length,
      hasResult: this.lastResults.has(estimateId),
      hasPendingValidation: state?.pendingValidation || false,
      isValidating: state?.isValidating || false,
      lastValidation: state?.lastValidation || null,
      validationError: state?.validationError || null,
    };
  }

  /**
   * Clean up all state (useful for testing or cleanup)
   */
  static cleanup(): void {
    // Clear all timers
    for (const timer of this.validationTimers.values()) {
      clearTimeout(timer);
    }

    // Clear all maps
    this.validationTimers.clear();
    this.listeners.clear();
    this.lastResults.clear();
    this.validationStates.clear();
    this.pendingSaves.clear();

    // Reset config
    this.config = { ...this.DEFAULT_CONFIG };
  }

  /**
   * Utility delay method
   */
  static delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get all active estimate IDs with validation state
   */
  static getActiveEstimateIds(): string[] {
    return Array.from(this.validationStates.keys());
  }

  /**
   * Check if estimate has active validation
   */
  static hasActiveValidation(estimateId: string): boolean {
    return (
      this.validationStates.has(estimateId) ||
      this.listeners.has(estimateId) ||
      this.validationTimers.has(estimateId)
    );
  }
}
