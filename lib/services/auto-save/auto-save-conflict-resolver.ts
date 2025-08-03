/**
 * AutoSave Conflict Resolver
 * Handles conflict detection and resolution logic
 */

import { createClient } from "@/lib/supabase/universal-client";
import { withDatabaseRetry } from "@/lib/utils/retry-logic";
import { GuidedFlowData } from "@/lib/types/estimate-types";
import { AutoSaveStateManager } from "./auto-save-state-manager";
import { AutoSavePersistenceEngine } from "./auto-save-persistence-engine";

export interface ConflictResolution {
  strategy: "merge" | "overwrite-local" | "overwrite-server" | "manual";
  resolvedData: GuidedFlowData;
  conflictedFields: string[];
  resolutionNotes?: string;
}

export class AutoSaveConflictResolver {
  /**
   * Detect conflicts between local and server versions
   */
  static async detectConflicts(
    estimateId: string,
    localVersion: number,
  ): Promise<boolean> {
    try {
      // Try to fetch versioning information; fall back gracefully if these columns
      // are absent in the current schema.
      const result = await withDatabaseRetry(async () => {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("estimation_flows")
          .select("version, updated_at")
          .eq("estimate_id", estimateId)
          .single();

        if (error) throw error;
        return data;
      });

      if (result.success && result.data) {
        const serverVersion = (result.data as any).version || 1;
        AutoSaveStateManager.updateSaveState(estimateId, { serverVersion });
        return (result.data as any).version
          ? (result.data as any).version > localVersion
          : false; // if version column absent, skip conflict detection
      }

      return false;
    } catch (error) {
      console.warn(
        "Conflict detection failed - continuing without conflict check:",
        error,
      );
      return false; // No conflict if we can't check
    }
  }

  /**
   * Handle conflicts automatically or prepare for manual resolution
   */
  static async handleConflict(
    estimateId: string,
    localData: GuidedFlowData,
    stepId: string,
    description: string,
    userId?: string,
  ): Promise<boolean> {
    try {
      // Get server data
      const serverData =
        await AutoSavePersistenceEngine.getServerData(estimateId);
      if (!serverData) {
        // No server data, proceed with local save - delegate to persistence engine
        return false; // Let persistence engine handle this
      }

      // Attempt automatic conflict resolution
      const resolution = await this.resolveConflict(
        localData,
        serverData,
        "merge",
      );

      if (resolution.strategy === "merge") {
        // Use merged data - delegate save to persistence engine
        const success = await AutoSavePersistenceEngine.saveNow(
          estimateId,
          resolution.resolvedData,
          stepId,
          `${description} (auto-merged)`,
          userId,
        );
        return success;
      } else {
        // Manual resolution required - store conflict for user intervention
        await this.storeConflictForResolution(
          estimateId,
          localData,
          serverData,
          resolution.conflictedFields,
        );
        return false;
      }
    } catch (error) {
      console.error("Conflict resolution failed:", error);
      return false;
    }
  }

  /**
   * Automatic conflict resolution with different strategies
   */
  static async resolveConflict(
    localData: GuidedFlowData,
    serverData: GuidedFlowData,
    strategy: "merge" | "overwrite-local" | "overwrite-server" = "merge",
  ): Promise<ConflictResolution> {
    const conflictedFields: string[] = [];
    let resolvedData: GuidedFlowData;

    switch (strategy) {
      case "merge":
        resolvedData = this.mergeData(localData, serverData, conflictedFields);
        break;
      case "overwrite-local":
        resolvedData = serverData;
        break;
      case "overwrite-server":
        resolvedData = localData;
        break;
      default:
        resolvedData = localData;
    }

    return {
      strategy,
      resolvedData,
      conflictedFields,
      resolutionNotes: `Auto-resolved using ${strategy} strategy`,
    };
  }

  /**
   * Smart merge of data with different strategies for different field types
   */
  private static mergeData(
    localData: GuidedFlowData,
    serverData: GuidedFlowData,
    conflictedFields: string[],
  ): GuidedFlowData {
    const merged = { ...serverData };

    // Define merge strategies for different data types
    const mergeStrategies = {
      // Take most recent for simple fields
      "initialContact.contactMethod": "latest",
      "initialContact.originalContent": "latest",

      // Merge arrays intelligently
      "scopeDetails.selectedServices": "merge-arrays",
      "scopeDetails.accessRestrictions": "merge-arrays",
      "scopeDetails.specialRequirements": "merge-arrays",

      // Take local for user input fields
      areaOfWork: "local-preferred",
      takeoff: "local-preferred",

      // Take latest for calculated fields
      expenses: "latest",
      pricing: "latest",
    };

    // Apply merge strategies
    Object.keys(mergeStrategies).forEach((path) => {
      const strategy = mergeStrategies[path as keyof typeof mergeStrategies];
      const localValue = AutoSaveStateManager.getNestedValue(localData, path);
      const serverValue = AutoSaveStateManager.getNestedValue(serverData, path);

      if (
        localValue !== undefined &&
        serverValue !== undefined &&
        localValue !== serverValue
      ) {
        conflictedFields.push(path);

        switch (strategy) {
          case "merge-arrays":
            if (Array.isArray(localValue) && Array.isArray(serverValue)) {
              const mergedArray = [...new Set([...serverValue, ...localValue])];
              AutoSaveStateManager.setNestedValue(merged, path, mergedArray);
            }
            break;
          case "local-preferred":
            AutoSaveStateManager.setNestedValue(merged, path, localValue);
            break;
          case "latest":
          default:
            // Keep server value (already in merged)
            break;
        }
      } else if (localValue !== undefined && serverValue === undefined) {
        AutoSaveStateManager.setNestedValue(merged, path, localValue);
      }
    });

    return merged;
  }

  /**
   * Store conflict data for manual resolution
   */
  private static async storeConflictForResolution(
    estimateId: string,
    localData: GuidedFlowData,
    serverData: GuidedFlowData,
    conflictedFields: string[],
  ): Promise<void> {
    // Store conflict data for manual resolution
    await withDatabaseRetry(async () => {
      const supabase = createClient();
      const { error } = await supabase
        .from("estimation_flow_conflicts")
        .insert({
          estimate_id: estimateId,
          local_data: localData as any,
          server_data: serverData as any,
          conflicted_fields: conflictedFields,
          created_at: new Date().toISOString(),
        });

      if (error && error.code !== "PGRST106") {
        // Only throw if it's not a missing table error
        throw error;
      }
    });
  }

  /**
   * Public API for manual conflict resolution
   */
  static async resolveConflictManually(
    estimateId: string,
    resolution: ConflictResolution,
  ): Promise<boolean> {
    try {
      const success = await AutoSavePersistenceEngine.saveNow(
        estimateId,
        resolution.resolvedData,
        "manual-resolution",
        `Manual conflict resolution: ${resolution.resolutionNotes}`,
      );

      if (success) {
        // Clear conflict state
        AutoSaveStateManager.updateSaveState(estimateId, {
          conflictDetected: false,
        });

        // Remove conflict record
        await withDatabaseRetry(async () => {
          const supabase = createClient();
          const { error } = await supabase
            .from("estimation_flow_conflicts")
            .delete()
            .eq("estimate_id", estimateId);

          if (error) console.warn("Failed to clear conflict record:", error);
        });
      }

      return success;
    } catch (error) {
      console.error("Manual conflict resolution failed:", error);
      return false;
    }
  }

  /**
   * Get pending conflicts for an estimate
   */
  static async getPendingConflicts(estimateId: string): Promise<{
    local_data: GuidedFlowData;
    server_data: GuidedFlowData;
    conflicted_fields: string[];
    created_at: string;
  } | null> {
    const result = await withDatabaseRetry(async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("estimation_flow_conflicts")
        .select("*")
        .eq("estimate_id", estimateId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      return data;
    });

    if (result.success && result.data) {
      return {
        local_data: result.data.local_data as GuidedFlowData,
        server_data: result.data.server_data as GuidedFlowData,
        conflicted_fields: result.data.conflicted_fields as string[],
        created_at: result.data.created_at,
      };
    }

    return null;
  }

  /**
   * Clear all conflicts for an estimate
   */
  static async clearConflicts(estimateId: string): Promise<boolean> {
    try {
      await withDatabaseRetry(async () => {
        const supabase = createClient();
        const { error } = await supabase
          .from("estimation_flow_conflicts")
          .delete()
          .eq("estimate_id", estimateId);

        if (error) throw error;
      });

      // Clear conflict state
      AutoSaveStateManager.updateSaveState(estimateId, {
        conflictDetected: false,
      });

      return true;
    } catch (error) {
      console.error("Failed to clear conflicts:", error);
      return false;
    }
  }
}
