/**
 * AutoSave Version Controller
 * Handles version history, cleanup, and version-related operations
 */

import { createClient } from "@/lib/supabase/universal-client";
import { withDatabaseRetry } from "@/lib/utils/retry-logic";
import { GuidedFlowData } from "@/lib/types/estimate-types";
import { AutoSaveStateManager } from "./auto-save-state-manager";

export interface SaveVersion {
  id: string;
  version: number;
  data: GuidedFlowData | string;
  timestamp: Date;
  userId: string;
  stepId: string;
  changeDescription: string;
  deviceInfo?: {
    userAgent: string;
    platform: string;
    sessionId: string;
  };
}

export class AutoSaveVersionController {
  /**
   * Save version for version control
   */
  static async saveVersion(
    estimateId: string,
    data: GuidedFlowData,
    stepId: string,
    description: string,
    version: number,
    userId?: string,
  ): Promise<void> {
    const config = AutoSaveStateManager.getConfig();

    if (!config.enableVersionControl) {
      return; // Version control is disabled
    }

    await withDatabaseRetry(async () => {
      const supabase = createClient();
      const { error } = await supabase.from("estimation_flow_versions").insert({
        estimate_id: estimateId,
        version,
        data: config.compressionEnabled
          ? AutoSaveStateManager.compressData(data)
          : data,
        timestamp: new Date().toISOString(),
        user_id: userId || "unknown-user",
        step_id: stepId,
        change_description: description,
        device_info: AutoSaveStateManager.getDeviceInfo(),
      });

      if (error) {
        // If table doesn't exist, log and continue
        if (
          error.message.includes("does not exist") ||
          error.code === "PGRST106"
        ) {
          console.warn("Version control table missing - skipping version save");
          return;
        }
        throw error;
      }

      // Clean up old versions if needed
      try {
        await this.cleanupOldVersions(estimateId);
      } catch (cleanupError) {
        console.warn("Version cleanup failed:", cleanupError);
        // Continue - cleanup failure is not critical
      }
    });
  }

  /**
   * Clean up old versions to maintain storage limits
   */
  private static async cleanupOldVersions(estimateId: string): Promise<void> {
    const config = AutoSaveStateManager.getConfig();
    if (config.maxVersions <= 0) return;

    await withDatabaseRetry(async () => {
      const supabase = createClient();
      const { data, error: selectError } = await supabase
        .from("estimation_flow_versions")
        .select("id")
        .eq("estimate_id", estimateId)
        .order("version", { ascending: false })
        .range(config.maxVersions, 1000);

      if (selectError) throw selectError;

      if (data && data.length > 0) {
        const idsToDelete = data.map((v) => v.id);
        const { error: deleteError } = await supabase
          .from("estimation_flow_versions")
          .delete()
          .in("id", idsToDelete);

        if (deleteError) throw deleteError;
      }
    });
  }

  /**
   * Get version history for an estimate
   */
  static async getVersionHistory(
    estimateId: string,
    limit: number = 10,
  ): Promise<SaveVersion[]> {
    const config = AutoSaveStateManager.getConfig();

    const result = await withDatabaseRetry(async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("estimation_flow_versions")
        .select("*")
        .eq("estimate_id", estimateId)
        .order("version", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    });

    if (result.success && result.data) {
      return result.data.map((v: any) => ({
        id: v.id,
        version: v.version,
        data:
          config.compressionEnabled && typeof v.data === "string"
            ? AutoSaveStateManager.decompressData(v.data as string)
            : (v.data as GuidedFlowData),
        timestamp: new Date(v.timestamp),
        userId: v.user_id || "unknown",
        stepId: v.step_id || "",
        changeDescription: v.change_description || "",
        deviceInfo: v.device_info as any,
      }));
    }

    return [];
  }

  /**
   * Get specific version by version number
   */
  static async getVersion(
    estimateId: string,
    version: number,
  ): Promise<SaveVersion | null> {
    const config = AutoSaveStateManager.getConfig();

    const result = await withDatabaseRetry(async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("estimation_flow_versions")
        .select("*")
        .eq("estimate_id", estimateId)
        .eq("version", version)
        .single();

      if (error) throw error;
      return data;
    });

    if (result.success && result.data) {
      const v = result.data;
      return {
        id: v.id,
        version: v.version,
        data:
          config.compressionEnabled && typeof v.data === "string"
            ? AutoSaveStateManager.decompressData(v.data as string)
            : (v.data as GuidedFlowData),
        timestamp: new Date(v.timestamp),
        userId: v.user_id || "unknown",
        stepId: v.step_id || "",
        changeDescription: v.change_description || "",
        deviceInfo: v.device_info as any,
      };
    }

    return null;
  }

  /**
   * Restore from a specific version
   */
  static async restoreFromVersion(
    estimateId: string,
    version: number,
    currentUserId?: string,
  ): Promise<GuidedFlowData | null> {
    const versionData = await this.getVersion(estimateId, version);
    if (!versionData) {
      return null;
    }

    const restoredData =
      typeof versionData.data === "string"
        ? AutoSaveStateManager.decompressData(versionData.data)
        : versionData.data;

    // Save a new version to record the restoration
    const currentState = AutoSaveStateManager.getSaveState(estimateId);
    if (currentState) {
      await this.saveVersion(
        estimateId,
        restoredData,
        "version-restore",
        `Restored from version ${version}`,
        currentState.localVersion + 1,
        currentUserId,
      );

      // Update local version
      AutoSaveStateManager.updateSaveState(estimateId, {
        localVersion: currentState.localVersion + 1,
      });
    }

    return restoredData;
  }

  /**
   * Compare two versions and return differences
   */
  static async compareVersions(
    estimateId: string,
    version1: number,
    version2: number,
  ): Promise<{
    version1Data: GuidedFlowData | null;
    version2Data: GuidedFlowData | null;
    differences: string[];
  }> {
    const [v1, v2] = await Promise.all([
      this.getVersion(estimateId, version1),
      this.getVersion(estimateId, version2),
    ]);

    const version1Data = v1
      ? typeof v1.data === "string"
        ? AutoSaveStateManager.decompressData(v1.data)
        : v1.data
      : null;

    const version2Data = v2
      ? typeof v2.data === "string"
        ? AutoSaveStateManager.decompressData(v2.data)
        : v2.data
      : null;

    const differences: string[] = [];

    if (version1Data && version2Data) {
      // Compare major sections
      const sections = [
        "initialContact",
        "scopeDetails",
        "filesPhotos",
        "areaOfWork",
        "takeoff",
        "duration",
        "expenses",
        "pricing",
      ];

      sections.forEach((section) => {
        const v1Value = version1Data[section as keyof GuidedFlowData];
        const v2Value = version2Data[section as keyof GuidedFlowData];

        if (JSON.stringify(v1Value) !== JSON.stringify(v2Value)) {
          differences.push(section);
        }
      });
    }

    return {
      version1Data,
      version2Data,
      differences,
    };
  }

  /**
   * Delete all versions for an estimate
   */
  static async deleteAllVersions(estimateId: string): Promise<boolean> {
    try {
      await withDatabaseRetry(async () => {
        const supabase = createClient();
        const { error } = await supabase
          .from("estimation_flow_versions")
          .delete()
          .eq("estimate_id", estimateId);

        if (error) throw error;
      });

      return true;
    } catch (error) {
      console.error("Failed to delete versions:", error);
      return false;
    }
  }

  /**
   * Get version statistics
   */
  static async getVersionStats(estimateId: string): Promise<{
    totalVersions: number;
    oldestVersion: Date | null;
    newestVersion: Date | null;
    totalSizeBytes: number;
  }> {
    const result = await withDatabaseRetry(async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("estimation_flow_versions")
        .select("timestamp, data")
        .eq("estimate_id", estimateId)
        .order("timestamp", { ascending: true });

      if (error) throw error;
      return data;
    });

    if (result.success && result.data) {
      const versions = result.data;
      const totalSizeBytes = versions.reduce((size, version) => {
        const dataStr =
          typeof version.data === "string"
            ? version.data
            : JSON.stringify(version.data);
        return size + new Blob([dataStr]).size;
      }, 0);

      return {
        totalVersions: versions.length,
        oldestVersion:
          versions.length > 0 ? new Date(versions[0].timestamp) : null,
        newestVersion:
          versions.length > 0
            ? new Date(versions[versions.length - 1].timestamp)
            : null,
        totalSizeBytes,
      };
    }

    return {
      totalVersions: 0,
      oldestVersion: null,
      newestVersion: null,
      totalSizeBytes: 0,
    };
  }
}
