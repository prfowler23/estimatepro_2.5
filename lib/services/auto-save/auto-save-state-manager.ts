/**
 * AutoSave State Manager
 * Manages save states, intervals, and configuration
 */

import { GuidedFlowData } from "@/lib/types/estimate-types";

export interface AutoSaveState {
  lastSaved: Date;
  isDirty: boolean;
  isSaving: boolean;
  saveError: string | null;
  conflictDetected: boolean;
  localVersion: number;
  serverVersion: number;
  lastSaveAttempt: Date | null;
}

export interface AutoSaveConfig {
  saveInterval: number; // milliseconds
  maxRetries: number;
  retryDelay: number; // milliseconds
  enableVersionControl: boolean;
  maxVersions: number;
  conflictDetectionEnabled: boolean;
  compressionEnabled: boolean;
}

export class AutoSaveStateManager {
  private static readonly DEFAULT_CONFIG: AutoSaveConfig = {
    saveInterval: 30000, // 30 seconds
    maxRetries: 3,
    retryDelay: 2000, // 2 seconds
    enableVersionControl: false, // disabled by default – can be re-enabled via hook config
    maxVersions: 50,
    conflictDetectionEnabled: true,
    compressionEnabled: true,
  };

  private static saveIntervals = new Map<string, NodeJS.Timeout>();
  private static saveStates = new Map<string, AutoSaveState>();
  private static pendingSaves = new Map<string, Promise<boolean>>();
  private static config = this.DEFAULT_CONFIG;
  private static sessionId = this.generateSessionId();

  /**
   * Get current configuration
   */
  static getConfig(): AutoSaveConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  static updateConfig(customConfig: Partial<AutoSaveConfig>): void {
    this.config = { ...this.DEFAULT_CONFIG, ...customConfig };
  }

  /**
   * Get session ID
   */
  static getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Initialize auto-save for a specific estimation flow
   */
  static initializeAutoSave(
    estimateId: string,
    initialData: GuidedFlowData,
    customConfig?: Partial<AutoSaveConfig>,
    onAutoSave?: (estimateId: string) => Promise<void>,
  ): void {
    // Update config if provided
    if (customConfig) {
      this.config = { ...this.DEFAULT_CONFIG, ...customConfig };
    }

    // Initialize save state
    this.saveStates.set(estimateId, {
      lastSaved: new Date(),
      isDirty: false,
      isSaving: false,
      saveError: null,
      conflictDetected: false,
      localVersion: 1,
      serverVersion: 1,
      lastSaveAttempt: null,
    });

    // Set up auto-save interval
    if (onAutoSave) {
      const interval = setInterval(() => {
        onAutoSave(estimateId);
      }, this.config.saveInterval);

      this.saveIntervals.set(estimateId, interval);
    }
  }

  /**
   * Stop auto-save for a specific estimation flow
   */
  static stopAutoSave(estimateId: string): void {
    const interval = this.saveIntervals.get(estimateId);
    if (interval) {
      clearInterval(interval);
      this.saveIntervals.delete(estimateId);
    }
    this.saveStates.delete(estimateId);
    this.pendingSaves.delete(estimateId);
  }

  /**
   * Mark data as dirty (needs saving)
   */
  static markDirty(estimateId: string): void {
    const state = this.saveStates.get(estimateId);
    if (state) {
      state.isDirty = true;
      state.saveError = null;
    }
  }

  /**
   * Get current save state
   */
  static getSaveState(estimateId: string): AutoSaveState | null {
    return this.saveStates.get(estimateId) || null;
  }

  /**
   * Update save state
   */
  static updateSaveState(
    estimateId: string,
    updates: Partial<AutoSaveState>,
  ): void {
    const state = this.saveStates.get(estimateId);
    if (state) {
      Object.assign(state, updates);
    }
  }

  /**
   * Check if save is in progress
   */
  static isSaveInProgress(estimateId: string): boolean {
    return this.pendingSaves.has(estimateId);
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
   * Generate unique session ID
   */
  private static generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get device information
   */
  static getDeviceInfo() {
    return {
      userAgent:
        typeof navigator !== "undefined" ? navigator.userAgent : "server",
      platform:
        typeof navigator !== "undefined" ? navigator.platform : "server",
      sessionId: this.sessionId,
    };
  }

  /**
   * Generate current step number from step ID
   */
  static getCurrentStepNumber(stepId: string): number {
    const stepMap: Record<string, number> = {
      "initial-contact": 1,
      "scope-details": 2,
      "files-photos": 3,
      "area-of-work": 4,
      takeoff: 5,
      duration: 6,
      expenses: 7,
      pricing: 8,
      summary: 9,
    };
    return stepMap[stepId] || 1;
  }

  /**
   * Utility delay function
   */
  static delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Simple data compression
   */
  static compressData(data: GuidedFlowData): string {
    // Simple JSON compression - could be enhanced with actual compression
    return JSON.stringify(data);
  }

  /**
   * Simple data decompression
   */
  static decompressData(
    compressedData: string | GuidedFlowData,
  ): GuidedFlowData {
    if (typeof compressedData === "string") {
      return JSON.parse(compressedData);
    }
    return compressedData;
  }

  /**
   * Get nested value from object using dot notation
   */
  static getNestedValue(obj: any, path: string): any {
    return path.split(".").reduce((current, key) => current?.[key], obj);
  }

  /**
   * Set nested value in object using dot notation
   */
  static setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split(".");
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }
}
