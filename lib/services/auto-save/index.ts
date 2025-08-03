/**
 * Auto-Save Service - Main Orchestrator
 * Provides a unified interface to all auto-save functionality
 */

import { GuidedFlowData } from "@/lib/types/estimate-types";
import {
  AutoSaveStateManager,
  AutoSaveConfig,
  AutoSaveState,
} from "./auto-save-state-manager";
import { AutoSavePersistenceEngine } from "./auto-save-persistence-engine";
import {
  AutoSaveConflictResolver,
  ConflictResolution,
} from "./auto-save-conflict-resolver";
import {
  AutoSaveVersionController,
  SaveVersion,
} from "./auto-save-version-controller";

/**
 * Main Auto-Save Service Orchestrator
 * Delegates functionality to specialized services while maintaining a unified API
 */
export class AutoSaveService {
  /**
   * Initialize auto-save for a specific estimation flow
   */
  static initializeAutoSave(
    estimateId: string,
    initialData: GuidedFlowData,
    customConfig?: Partial<AutoSaveConfig>,
  ): void {
    // Initialize with automatic save callback
    const onAutoSave = async (estimateId: string) => {
      await AutoSavePersistenceEngine.performAutoSave(
        estimateId,
        this.getCurrentData,
      );
    };

    AutoSaveStateManager.initializeAutoSave(
      estimateId,
      initialData,
      customConfig,
      onAutoSave,
    );

    // Perform initial save
    AutoSavePersistenceEngine.saveNow(
      estimateId,
      initialData,
      "auto-save-init",
      "flow-initialization",
    );
  }

  /**
   * Stop auto-save for a specific estimation flow
   */
  static stopAutoSave(estimateId: string): void {
    AutoSaveStateManager.stopAutoSave(estimateId);
  }

  /**
   * Mark data as dirty (needs saving)
   */
  static markDirty(estimateId: string): void {
    AutoSaveStateManager.markDirty(estimateId);
  }

  /**
   * Get current save state
   */
  static getSaveState(estimateId: string): AutoSaveState | null {
    return AutoSaveStateManager.getSaveState(estimateId);
  }

  /**
   * Perform immediate save
   */
  static async saveNow(
    estimateId: string,
    data: GuidedFlowData,
    stepId: string,
    description: string = "manual-save",
    userId?: string,
  ): Promise<boolean> {
    return AutoSavePersistenceEngine.saveNow(
      estimateId,
      data,
      stepId,
      description,
      userId,
    );
  }

  /**
   * Check if save is in progress
   */
  static isSaveInProgress(estimateId: string): boolean {
    return AutoSaveStateManager.isSaveInProgress(estimateId);
  }

  /**
   * Update configuration
   */
  static updateConfig(customConfig: Partial<AutoSaveConfig>): void {
    AutoSaveStateManager.updateConfig(customConfig);
  }

  /**
   * Get current configuration
   */
  static getConfig(): AutoSaveConfig {
    return AutoSaveStateManager.getConfig();
  }

  /**
   * Conflict Resolution API
   */
  static async detectConflicts(
    estimateId: string,
    localVersion: number,
  ): Promise<boolean> {
    return AutoSaveConflictResolver.detectConflicts(estimateId, localVersion);
  }

  static async resolveConflict(
    localData: GuidedFlowData,
    serverData: GuidedFlowData,
    strategy: "merge" | "overwrite-local" | "overwrite-server" = "merge",
  ): Promise<ConflictResolution> {
    return AutoSaveConflictResolver.resolveConflict(
      localData,
      serverData,
      strategy,
    );
  }

  static async resolveConflictManually(
    estimateId: string,
    resolution: ConflictResolution,
  ): Promise<boolean> {
    return AutoSaveConflictResolver.resolveConflictManually(
      estimateId,
      resolution,
    );
  }

  static async getPendingConflicts(estimateId: string): Promise<{
    local_data: GuidedFlowData;
    server_data: GuidedFlowData;
    conflicted_fields: string[];
    created_at: string;
  } | null> {
    return AutoSaveConflictResolver.getPendingConflicts(estimateId);
  }

  static async clearConflicts(estimateId: string): Promise<boolean> {
    return AutoSaveConflictResolver.clearConflicts(estimateId);
  }

  /**
   * Version Control API
   */
  static async getVersionHistory(
    estimateId: string,
    limit: number = 10,
  ): Promise<SaveVersion[]> {
    return AutoSaveVersionController.getVersionHistory(estimateId, limit);
  }

  static async getVersion(
    estimateId: string,
    version: number,
  ): Promise<SaveVersion | null> {
    return AutoSaveVersionController.getVersion(estimateId, version);
  }

  static async restoreFromVersion(
    estimateId: string,
    version: number,
    currentUserId?: string,
  ): Promise<GuidedFlowData | null> {
    return AutoSaveVersionController.restoreFromVersion(
      estimateId,
      version,
      currentUserId,
    );
  }

  static async compareVersions(
    estimateId: string,
    version1: number,
    version2: number,
  ): Promise<{
    version1Data: GuidedFlowData | null;
    version2Data: GuidedFlowData | null;
    differences: string[];
  }> {
    return AutoSaveVersionController.compareVersions(
      estimateId,
      version1,
      version2,
    );
  }

  static async deleteAllVersions(estimateId: string): Promise<boolean> {
    return AutoSaveVersionController.deleteAllVersions(estimateId);
  }

  static async getVersionStats(estimateId: string): Promise<{
    totalVersions: number;
    oldestVersion: Date | null;
    newestVersion: Date | null;
    totalSizeBytes: number;
  }> {
    return AutoSaveVersionController.getVersionStats(estimateId);
  }

  /**
   * Utility Methods
   */
  static getSessionId(): string {
    return AutoSaveStateManager.getSessionId();
  }

  static getDeviceInfo() {
    return AutoSaveStateManager.getDeviceInfo();
  }

  static getCurrentStepNumber(stepId: string): number {
    return AutoSaveStateManager.getCurrentStepNumber(stepId);
  }

  static compressData(data: GuidedFlowData): string {
    return AutoSaveStateManager.compressData(data);
  }

  static decompressData(
    compressedData: string | GuidedFlowData,
  ): GuidedFlowData {
    return AutoSaveStateManager.decompressData(compressedData);
  }

  static getNestedValue(obj: any, path: string): any {
    return AutoSaveStateManager.getNestedValue(obj, path);
  }

  static setNestedValue(obj: any, path: string, value: any): void {
    return AutoSaveStateManager.setNestedValue(obj, path, value);
  }

  /**
   * Private helper method for getting current data
   * This would normally be provided by the component or hook using the service
   */
  private static async getCurrentData(
    estimateId: string,
  ): Promise<GuidedFlowData | null> {
    // This is a placeholder - in real usage, this would be provided
    // by the component state or a storage mechanism
    return null;
  }
}

// Export all types and interfaces for external use
export type {
  AutoSaveState,
  AutoSaveConfig,
  SaveVersion,
  ConflictResolution,
} from "./auto-save-state-manager";

export { AutoSaveStateManager } from "./auto-save-state-manager";
export { AutoSavePersistenceEngine } from "./auto-save-persistence-engine";
export { AutoSaveConflictResolver } from "./auto-save-conflict-resolver";
export { AutoSaveVersionController } from "./auto-save-version-controller";

export default AutoSaveService;
