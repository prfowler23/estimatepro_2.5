// Enhanced Auto-Save Service with Conflict Resolution
// Handles automatic saving, version control, and conflict resolution for guided estimation flows

import { supabase } from "@/lib/supabase/client";
import { withDatabaseRetry } from "@/lib/utils/retry-logic";
import { GuidedFlowData } from "@/lib/types/estimate-types";
import { getUser } from "@/lib/auth/server";
import { offlineUtils } from "@/lib/pwa/offline-manager";

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

export interface SaveVersion {
  id: string;
  version: number;
  data: GuidedFlowData;
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

export interface ConflictResolution {
  strategy: "merge" | "overwrite-local" | "overwrite-server" | "manual";
  resolvedData: GuidedFlowData;
  conflictedFields: string[];
  resolutionNotes?: string;
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

export class AutoSaveService {
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

  // Initialize auto-save for a specific estimation flow
  static initializeAutoSave(
    estimateId: string,
    initialData: GuidedFlowData,
    customConfig?: Partial<AutoSaveConfig>,
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
    const interval = setInterval(() => {
      this.performAutoSave(estimateId);
    }, this.config.saveInterval);

    this.saveIntervals.set(estimateId, interval);

    // Perform initial save
    this.saveData(
      estimateId,
      initialData,
      "auto-save-init",
      "flow-initialization",
    );
  }

  // Stop auto-save for a specific estimation flow
  static stopAutoSave(estimateId: string): void {
    const interval = this.saveIntervals.get(estimateId);
    if (interval) {
      clearInterval(interval);
      this.saveIntervals.delete(estimateId);
    }
    this.saveStates.delete(estimateId);
    this.pendingSaves.delete(estimateId);
  }

  // Mark data as dirty (needs saving)
  static markDirty(estimateId: string): void {
    const state = this.saveStates.get(estimateId);
    if (state) {
      state.isDirty = true;
      state.saveError = null;
    }
  }

  // Get current save state
  static getSaveState(estimateId: string): AutoSaveState | null {
    return this.saveStates.get(estimateId) || null;
  }

  // Perform immediate save
  static async saveNow(
    estimateId: string,
    data: GuidedFlowData,
    stepId: string,
    description: string = "manual-save",
  ): Promise<boolean> {
    return this.saveData(estimateId, data, stepId, description);
  }

  // Automatic save (called by interval)
  private static async performAutoSave(estimateId: string): Promise<void> {
    const state = this.saveStates.get(estimateId);
    if (!state || !state.isDirty || state.isSaving) {
      return;
    }

    try {
      // Get current data from storage or cache
      const currentData = await this.getCurrentData(estimateId);
      if (currentData) {
        await this.saveData(
          estimateId,
          currentData,
          "auto-save",
          "auto-save-interval",
        );
      }
    } catch (error) {
      console.error("Auto-save failed:", error);
      this.updateSaveState(estimateId, {
        saveError: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Core save method with conflict detection and resolution
  private static async saveData(
    estimateId: string,
    data: GuidedFlowData,
    stepId: string,
    description: string,
    userId?: string,
  ): Promise<boolean> {
    const state = this.saveStates.get(estimateId);
    if (!state) {
      throw new Error("Auto-save not initialized for this estimate");
    }

    // Check if save is already in progress
    const existingSave = this.pendingSaves.get(estimateId);
    if (existingSave) {
      return existingSave;
    }

    // Create save promise
    const savePromise = this.performSaveWithRetry(
      estimateId,
      data,
      stepId,
      description,
      userId,
    );
    this.pendingSaves.set(estimateId, savePromise);

    try {
      const result = await savePromise;
      this.pendingSaves.delete(estimateId);
      return result;
    } catch (error) {
      this.pendingSaves.delete(estimateId);
      throw error;
    }
  }

  // Save with retry logic
  private static async performSaveWithRetry(
    estimateId: string,
    data: GuidedFlowData,
    stepId: string,
    description: string,
    userId?: string,
  ): Promise<boolean> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        this.updateSaveState(estimateId, {
          isSaving: true,
          saveError: null,
          lastSaveAttempt: new Date(),
        });

        const success = await this.performSave(
          estimateId,
          data,
          stepId,
          description,
          userId,
        );

        if (success) {
          this.updateSaveState(estimateId, {
            lastSaved: new Date(),
            isDirty: false,
            isSaving: false,
            saveError: null,
            localVersion: this.saveStates.get(estimateId)!.localVersion + 1,
          });
          return true;
        }
      } catch (error) {
        lastError =
          error instanceof Error ? error : new Error("Unknown save error");

        if (attempt < this.config.maxRetries) {
          await this.delay(this.config.retryDelay * attempt); // Exponential backoff
        }
      }
    }

    // All attempts failed
    this.updateSaveState(estimateId, {
      isSaving: false,
      saveError: lastError?.message || "Save failed after maximum retries",
    });

    throw lastError || new Error("Save failed");
  }

  // Perform the actual save operation
  private static async performSave(
    estimateId: string,
    data: GuidedFlowData,
    stepId: string,
    description: string,
    userId?: string,
  ): Promise<boolean> {
    const state = this.saveStates.get(estimateId)!;

    try {
      // Check for conflicts if enabled
      if (this.config.conflictDetectionEnabled) {
        const hasConflict = await this.detectConflicts(
          estimateId,
          state.localVersion,
        );
        if (hasConflict) {
          this.updateSaveState(estimateId, { conflictDetected: true });
          return await this.handleConflict(
            estimateId,
            data,
            stepId,
            description,
            userId,
          );
        }
      }
    } catch (conflictError) {
      console.warn(
        "Conflict detection failed, proceeding with save:",
        conflictError,
      );
      // Continue with save even if conflict detection fails
    }

    // PHASE 3 FIX: Check if we're offline and queue for later sync
    if (!navigator.onLine) {
      console.log("Device offline, queuing estimate save for later sync");

      // Queue the save for offline sync
      offlineUtils.queueEstimateSave(estimateId, {
        flow_data: this.config.compressionEnabled
          ? this.compressData(data)
          : data,
        current_step: this.getCurrentStepNumber(stepId),
        version: state.localVersion + 1,
        last_modified: new Date().toISOString(),
        device_info: this.getDeviceInfo(),
        description,
        userId,
      });

      // Mark as saved locally (optimistic update)
      this.updateSaveState(estimateId, {
        lastSaved: new Date(),
        isDirty: false,
        isSaving: false,
        saveError: null,
        localVersion: state.localVersion + 1,
      });

      return true; // Return success for offline save
    }

    const result = await withDatabaseRetry(async () => {
      // Prepare save data
      const saveData = {
        flow_data: this.config.compressionEnabled
          ? this.compressData(data)
          : data,
        current_step: this.getCurrentStepNumber(stepId),
        version: state.localVersion + 1,
        last_modified: new Date().toISOString(),
        device_info: this.getDeviceInfo(),
      };

      // Save to main table - use the actual table schema
      // Handle UUID conversion for temporary estimate IDs
      let actualEstimateId = estimateId;
      if (estimateId.startsWith("temp-estimate-")) {
        // For temporary estimates, we need to either find existing UUID or generate one
        try {
          const { data: existingFlow } = await supabase
            .from("estimation_flows")
            .select("estimate_id")
            .eq("id", estimateId.replace("temp-estimate-", ""))
            .single();

          if (existingFlow) {
            actualEstimateId = existingFlow.estimate_id;
          } else {
            // Generate a new UUID for this temp estimate
            const { data: newEstimate, error: estimateError } = await supabase
              .from("estimates")
              .insert({
                quote_number: estimateId,
                customer_name: "Estimate Customer",
                customer_email: null, // Will be filled when customer is selected
                building_name: `Building for ${estimateId}`,
                created_by: userId,
              })
              .select("id")
              .single();

            if (estimateError) {
              console.warn(
                "Could not create estimate record, using temp ID:",
                estimateError,
              );
              // Fallback: use a generated UUID
              actualEstimateId = crypto.randomUUID();
            } else {
              actualEstimateId = newEstimate.id;
            }
          }
        } catch (error) {
          console.warn(
            "Error handling temp estimate ID, generating UUID:",
            error,
          );
          // Fallback: generate a UUID
          actualEstimateId = crypto.randomUUID();
        }
      }

      // Ensure we always include an authenticated user_id – fetch from Supabase if not provided
      let effectiveUserId = userId;
      if (!effectiveUserId) {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          effectiveUserId = session?.user?.id || undefined;
        } catch (authErr) {
          console.warn(
            "Unable to retrieve auth session while saving:",
            authErr,
          );
        }
      }

      if (!effectiveUserId) {
        console.error(
          "Auto-save aborted – no authenticated user found, cannot satisfy RLS policy.",
        );
        throw new Error("Not authenticated: user ID missing");
      }

      // ---------------------------------------------------------------------------
      // Guarantee foreign-key integrity: create a stub record in `estimates` if one
      // does not already exist for `actualEstimateId`.
      // ---------------------------------------------------------------------------
      try {
        const { data: existingEstimate, error: estimateLookupErr } =
          await supabase
            .from("estimates")
            .select("id")
            .eq("id", actualEstimateId)
            .single();

        if (estimateLookupErr && estimateLookupErr.code !== "PGRST116") {
          // PGRST116 = no rows returned; any other error we surface for visibility
          console.warn(
            "Unexpected error looking up estimate:",
            estimateLookupErr,
          );
        }

        if (!existingEstimate) {
          // Create a minimal placeholder estimate so the FK constraint passes.
          const placeholderQuote = `AUTO-${Date.now()}`;
          const insertPayload: any = {
            id: actualEstimateId,
            quote_number: placeholderQuote,
            customer_name: "New Customer",
            customer_email: "placeholder@example.com",
            building_name: "Untitled Building",
            building_address: "",
            building_height_stories: 0,
            total_price: 0,
            status: "draft",
            created_by: effectiveUserId,
          };

          const { error: createEstimateErr } = await supabase
            .from("estimates")
            .insert(insertPayload);

          if (createEstimateErr) {
            console.error(
              "Failed to create placeholder estimate, auto-save will abort:",
              createEstimateErr,
            );
            throw createEstimateErr;
          }
        }
      } catch (fkGuardErr) {
        // Rethrow so outer retry logic can handle
        throw fkGuardErr;
      }

      const upsertData = {
        estimate_id: actualEstimateId,
        user_id: effectiveUserId,
        current_step: saveData.current_step || 1,
        status: "draft",

        // Store the complete flow data in the main JSONB column
        flow_data: saveData.flow_data,

        // Store flow data in the existing JSONB columns based on step (legacy compatibility)
        ai_extracted_data: data.initialContact
          ? { initialContact: data.initialContact }
          : null,
        selected_services: data.scopeDetails?.selectedServices || [],
        uploaded_files: data.filesPhotos
          ? { filesPhotos: data.filesPhotos }
          : null,
        work_areas: data.areaOfWork ? { areaOfWork: data.areaOfWork } : null,
        takeoff_data: data.takeoff ? { takeoff: data.takeoff } : null,
        estimated_duration: data.duration?.estimatedDuration || null,
        equipment_costs: data.expenses?.equipment || null,
        material_costs: data.expenses?.materials || null,
        labor_costs: data.expenses?.labor || null,
        pricing_calculations: data.pricing || null,
        final_estimate: data.summary || null,

        // Metadata
        version: saveData.version || 1,
        last_modified: new Date().toISOString(),
        device_info: saveData.device_info,
        updated_at: new Date().toISOString(),
      };

      const { error: saveError } = await supabase
        .from("estimation_flows")
        .upsert(upsertData);

      if (saveError) {
        console.error("Auto-save error details:", saveError);

        // Handle specific error cases
        if (
          saveError.message.includes("does not exist") ||
          saveError.code === "PGRST106"
        ) {
          console.warn(
            "Database table missing. Auto-save disabled until tables are created.",
          );
          return false;
        }

        if (
          saveError.message.includes("column") &&
          saveError.message.includes("does not exist")
        ) {
          console.warn(
            "Database schema mismatch. Auto-save disabled until schema is updated.",
          );
          return false;
        }

        if (
          saveError.message.includes("invalid input syntax for type uuid") ||
          saveError.code === "22P02"
        ) {
          console.warn(
            "UUID type mismatch in database. Auto-save disabled until schema is corrected.",
          );
          return false;
        }

        // For other errors, also don't throw - just log and continue
        console.warn(
          "Auto-save failed, but continuing application:",
          saveError.message,
        );
        return false;
      }

      // Save version if version control is enabled
      if (this.config.enableVersionControl) {
        try {
          await this.saveVersion(
            estimateId,
            data,
            stepId,
            description,
            state.localVersion + 1,
            userId,
          );
        } catch (versionError) {
          console.warn(
            "Version control disabled - table may not exist:",
            versionError,
          );
          // Continue without version control
        }
      }

      return true;
    });

    return result.success;
  }

  // Conflict detection
  private static async detectConflicts(
    estimateId: string,
    localVersion: number,
  ): Promise<boolean> {
    try {
      // Try to fetch versioning information; fall back gracefully if these columns
      // are absent in the current schema.
      const result = await withDatabaseRetry(async () => {
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
        this.updateSaveState(estimateId, { serverVersion });
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

  // Handle conflicts
  private static async handleConflict(
    estimateId: string,
    localData: GuidedFlowData,
    stepId: string,
    description: string,
    userId?: string,
  ): Promise<boolean> {
    try {
      // Get server data
      const serverData = await this.getServerData(estimateId);
      if (!serverData) {
        // No server data, proceed with local save
        return this.performSave(
          estimateId,
          localData,
          stepId,
          description,
          userId,
        );
      }

      // Attempt automatic conflict resolution
      const resolution = await this.resolveConflict(
        localData,
        serverData,
        "merge",
      );

      if (resolution.strategy === "merge") {
        // Use merged data
        return this.performSave(
          estimateId,
          resolution.resolvedData,
          stepId,
          `${description} (auto-merged)`,
          userId,
        );
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

  // Automatic conflict resolution
  private static async resolveConflict(
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

  // Smart merge of data
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
      const localValue = this.getNestedValue(localData, path);
      const serverValue = this.getNestedValue(serverData, path);

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
              this.setNestedValue(merged, path, mergedArray);
            }
            break;
          case "local-preferred":
            this.setNestedValue(merged, path, localValue);
            break;
          case "latest":
          default:
            // Keep server value (already in merged)
            break;
        }
      } else if (localValue !== undefined && serverValue === undefined) {
        this.setNestedValue(merged, path, localValue);
      }
    });

    return merged;
  }

  // Save version for version control
  private static async saveVersion(
    estimateId: string,
    data: GuidedFlowData,
    stepId: string,
    description: string,
    version: number,
    userId?: string,
  ): Promise<void> {
    const versionData: Omit<SaveVersion, "id"> = {
      version,
      data: this.config.compressionEnabled ? this.compressData(data) : data,
      timestamp: new Date(),
      userId: userId || "unknown-user",
      stepId,
      changeDescription: description,
      deviceInfo: this.getDeviceInfo(),
    };

    await withDatabaseRetry(async () => {
      const { error } = await supabase.from("estimation_flow_versions").insert({
        estimate_id: estimateId,
        ...versionData,
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

  // Utility methods
  private static updateSaveState(
    estimateId: string,
    updates: Partial<AutoSaveState>,
  ): void {
    const state = this.saveStates.get(estimateId);
    if (state) {
      Object.assign(state, updates);
    }
  }

  private static async getCurrentData(
    estimateId: string,
  ): Promise<GuidedFlowData | null> {
    // This would get current data from the component state or storage
    // For now, return null to trigger manual save
    return null;
  }

  private static async getServerData(
    estimateId: string,
  ): Promise<GuidedFlowData | null> {
    const result = await withDatabaseRetry(async () => {
      const { data, error } = await supabase
        .from("estimation_flows")
        .select("*")
        .eq("estimate_id", estimateId)
        .single();

      if (error) throw error;
      return data;
    });

    if (result.success && result.data) {
      // Reconstruct flow data from database columns
      const flowData: GuidedFlowData = {};

      if (result.data.ai_extracted_data?.initialContact) {
        flowData.initialContact = result.data.ai_extracted_data.initialContact;
      }

      if (
        result.data.selected_services &&
        result.data.selected_services.length > 0
      ) {
        flowData.scopeDetails = {
          selectedServices: result.data.selected_services,
        };
      }

      if (result.data.uploaded_files?.filesPhotos) {
        flowData.filesPhotos = result.data.uploaded_files.filesPhotos;
      }

      if (result.data.work_areas?.areaOfWork) {
        flowData.areaOfWork = result.data.work_areas.areaOfWork;
      }

      if (result.data.takeoff_data?.takeoff) {
        flowData.takeoff = result.data.takeoff_data.takeoff;
      }

      if (result.data.estimated_duration) {
        flowData.duration = {
          estimatedDuration: result.data.estimated_duration,
        };
      }

      if (
        result.data.equipment_costs ||
        result.data.material_costs ||
        result.data.labor_costs
      ) {
        flowData.expenses = {
          equipment: result.data.equipment_costs,
          materials: result.data.material_costs,
          labor: result.data.labor_costs,
          otherCosts: [],
          totalCosts: {
            equipment: 0,
            materials: 0,
            labor: 0,
            other: 0,
            grand: 0,
          },
          margins: {
            equipment: 0,
            materials: 0,
            labor: 0,
          },
        };
      }

      if (result.data.pricing_calculations) {
        flowData.pricing = result.data.pricing_calculations;
      }

      if (result.data.final_estimate) {
        flowData.summary = result.data.final_estimate;
      }

      return flowData;
    }

    return null;
  }

  private static async storeConflictForResolution(
    estimateId: string,
    localData: GuidedFlowData,
    serverData: GuidedFlowData,
    conflictedFields: string[],
  ): Promise<void> {
    // Store conflict data for manual resolution
    await withDatabaseRetry(async () => {
      const { error } = await supabase
        .from("estimation_flow_conflicts")
        .insert({
          estimate_id: estimateId,
          local_data: localData,
          server_data: serverData,
          conflicted_fields: conflictedFields,
          created_at: new Date().toISOString(),
        });

      if (error) throw error;
    });
  }

  private static async cleanupOldVersions(estimateId: string): Promise<void> {
    if (this.config.maxVersions <= 0) return;

    await withDatabaseRetry(async () => {
      const { data, error: selectError } = await supabase
        .from("estimation_flow_versions")
        .select("id")
        .eq("estimate_id", estimateId)
        .order("version", { ascending: false })
        .range(this.config.maxVersions, 1000);

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

  private static getCurrentStepNumber(stepId: string): number {
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

  private static getDeviceInfo() {
    return {
      userAgent:
        typeof navigator !== "undefined" ? navigator.userAgent : "server",
      platform:
        typeof navigator !== "undefined" ? navigator.platform : "server",
      sessionId: this.sessionId,
    };
  }

  private static generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static compressData(data: GuidedFlowData): string {
    // Simple JSON compression - could be enhanced with actual compression
    return JSON.stringify(data);
  }

  private static decompressData(
    compressedData: string | GuidedFlowData,
  ): GuidedFlowData {
    if (typeof compressedData === "string") {
      return JSON.parse(compressedData);
    }
    return compressedData;
  }

  private static getNestedValue(obj: any, path: string): any {
    return path.split(".").reduce((current, key) => current?.[key], obj);
  }

  private static setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split(".");
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  private static delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Public API for manual conflict resolution
  static async resolveConflictManually(
    estimateId: string,
    resolution: ConflictResolution,
  ): Promise<boolean> {
    try {
      const success = await this.saveData(
        estimateId,
        resolution.resolvedData,
        "manual-resolution",
        `Manual conflict resolution: ${resolution.resolutionNotes}`,
      );

      if (success) {
        // Clear conflict state
        this.updateSaveState(estimateId, { conflictDetected: false });

        // Remove conflict record
        await withDatabaseRetry(async () => {
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

  // Get version history
  static async getVersionHistory(
    estimateId: string,
    limit: number = 10,
  ): Promise<SaveVersion[]> {
    const result = await withDatabaseRetry(async () => {
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
      return result.data.map((v) => ({
        id: v.id,
        version: v.version,
        data: this.config.compressionEnabled
          ? this.decompressData(v.data)
          : v.data,
        timestamp: new Date(v.timestamp),
        userId: v.user_id,
        stepId: v.step_id,
        changeDescription: v.change_description,
        deviceInfo: v.device_info,
      }));
    }

    return [];
  }
}

export default AutoSaveService;
