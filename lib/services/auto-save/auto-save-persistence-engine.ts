/**
 * AutoSave Persistence Engine
 * Handles core save operations and database interactions
 */

import { createClient } from "@/lib/supabase/universal-client";
import { withDatabaseRetry } from "@/lib/utils/retry-logic";
import { GuidedFlowData, ServiceType } from "@/lib/types/estimate-types";
import { offlineUtils } from "@/lib/pwa/offline-manager";
import { AutoSaveStateManager } from "./auto-save-state-manager";

export class AutoSavePersistenceEngine {
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
    return this.saveData(estimateId, data, stepId, description, userId);
  }

  /**
   * Automatic save (called by interval)
   */
  static async performAutoSave(
    estimateId: string,
    getCurrentData: (estimateId: string) => Promise<GuidedFlowData | null>,
  ): Promise<void> {
    const state = AutoSaveStateManager.getSaveState(estimateId);
    if (!state || !state.isDirty || state.isSaving) {
      return;
    }

    try {
      // Get current data from storage or cache
      const currentData = await getCurrentData(estimateId);
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
      AutoSaveStateManager.updateSaveState(estimateId, {
        saveError: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Core save method with conflict detection and resolution
   */
  private static async saveData(
    estimateId: string,
    data: GuidedFlowData,
    stepId: string,
    description: string,
    userId?: string,
  ): Promise<boolean> {
    const state = AutoSaveStateManager.getSaveState(estimateId);
    if (!state) {
      throw new Error("Auto-save not initialized for this estimate");
    }

    // Check if save is already in progress
    const existingSave = AutoSaveStateManager.getPendingSave(estimateId);
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
    AutoSaveStateManager.setPendingSave(estimateId, savePromise);

    try {
      const result = await savePromise;
      AutoSaveStateManager.clearPendingSave(estimateId);
      return result;
    } catch (error) {
      AutoSaveStateManager.clearPendingSave(estimateId);
      throw error;
    }
  }

  /**
   * Save with retry logic
   */
  private static async performSaveWithRetry(
    estimateId: string,
    data: GuidedFlowData,
    stepId: string,
    description: string,
    userId?: string,
  ): Promise<boolean> {
    const config = AutoSaveStateManager.getConfig();
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
      try {
        AutoSaveStateManager.updateSaveState(estimateId, {
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
          const currentState = AutoSaveStateManager.getSaveState(estimateId)!;
          AutoSaveStateManager.updateSaveState(estimateId, {
            lastSaved: new Date(),
            isDirty: false,
            isSaving: false,
            saveError: null,
            localVersion: currentState.localVersion + 1,
          });
          return true;
        }
      } catch (error) {
        lastError =
          error instanceof Error ? error : new Error("Unknown save error");

        if (attempt < config.maxRetries) {
          await AutoSaveStateManager.delay(config.retryDelay * attempt); // Exponential backoff
        }
      }
    }

    // All attempts failed
    AutoSaveStateManager.updateSaveState(estimateId, {
      isSaving: false,
      saveError: lastError?.message || "Save failed after maximum retries",
    });

    throw lastError || new Error("Save failed");
  }

  /**
   * Perform the actual save operation
   */
  private static async performSave(
    estimateId: string,
    data: GuidedFlowData,
    stepId: string,
    description: string,
    userId?: string,
  ): Promise<boolean> {
    const state = AutoSaveStateManager.getSaveState(estimateId)!;
    const config = AutoSaveStateManager.getConfig();

    // PHASE 3 FIX: Check if we're offline and queue for later sync
    if (!navigator.onLine) {
      console.log("Device offline, queuing estimate save for later sync");

      // Queue the save for offline sync
      offlineUtils.queueEstimateSave(estimateId, {
        flow_data: config.compressionEnabled
          ? AutoSaveStateManager.compressData(data)
          : data,
        current_step: AutoSaveStateManager.getCurrentStepNumber(stepId),
        version: state.localVersion + 1,
        last_modified: new Date().toISOString(),
        device_info: AutoSaveStateManager.getDeviceInfo(),
        description,
        userId,
      });

      // Mark as saved locally (optimistic update)
      AutoSaveStateManager.updateSaveState(estimateId, {
        lastSaved: new Date(),
        isDirty: false,
        isSaving: false,
        saveError: null,
        localVersion: state.localVersion + 1,
      });

      return true; // Return success for offline save
    }

    const result = await withDatabaseRetry(async () => {
      const supabase = createClient();
      // Prepare save data
      const saveData = {
        flow_data: config.compressionEnabled
          ? AutoSaveStateManager.compressData(data)
          : data,
        current_step: AutoSaveStateManager.getCurrentStepNumber(stepId),
        version: state.localVersion + 1,
        last_modified: new Date().toISOString(),
        device_info: AutoSaveStateManager.getDeviceInfo(),
      };

      // Save to main table - use the actual table schema
      // Handle UUID conversion for temporary estimate IDs
      let actualEstimateId = estimateId;
      if (estimateId.startsWith("temp-estimate-")) {
        actualEstimateId = await this.handleTempEstimateId(
          estimateId,
          supabase,
          userId,
        );
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

      // Guarantee foreign-key integrity
      await this.ensureEstimateExists(actualEstimateId, effectiveUserId);

      const upsertData: any = {
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
        equipment_costs: data.expenses?.equipmentCosts || null,
        material_costs: data.expenses?.materialCosts || null,
        labor_costs: data.expenses?.laborCosts || null,
        pricing_calculations: data.pricing || null,
        final_estimate: null, // GuidedFlowData doesn't have summary

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
        return this.handleSaveError(saveError);
      }

      return true;
    });

    return result.success;
  }

  /**
   * Handle temporary estimate ID conversion
   */
  private static async handleTempEstimateId(
    estimateId: string,
    supabase: any,
    userId?: string,
  ): Promise<string> {
    try {
      const { data: existingFlow } = await supabase
        .from("estimation_flows")
        .select("estimate_id")
        .eq("id", estimateId.replace("temp-estimate-", ""))
        .single();

      if (existingFlow) {
        return existingFlow.estimate_id;
      } else {
        // Generate a new UUID for this temp estimate
        const { data: newEstimate, error: estimateError } = await supabase
          .from("estimates")
          .insert({
            quote_number: estimateId,
            customer_name: "Estimate Customer",
            customer_email: "temp@example.com", // Will be filled when customer is selected
            building_name: `Building for ${estimateId}`,
            building_address: "TBD", // Required field
            building_height_stories: 1, // Required field with default
            created_by: userId,
            total_price: 0, // Default to 0
          })
          .select("id")
          .single();

        if (estimateError) {
          console.warn(
            "Could not create estimate record, using temp ID:",
            estimateError,
          );
          // Fallback: use a generated UUID
          return crypto.randomUUID();
        } else {
          return newEstimate.id;
        }
      }
    } catch (error) {
      console.warn("Error handling temp estimate ID, generating UUID:", error);
      // Fallback: generate a UUID
      return crypto.randomUUID();
    }
  }

  /**
   * Ensure estimate record exists for foreign key integrity
   */
  private static async ensureEstimateExists(
    actualEstimateId: string,
    effectiveUserId: string,
  ): Promise<void> {
    try {
      const supabase = createClient();
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
  }

  /**
   * Handle save errors gracefully
   */
  private static handleSaveError(saveError: any): boolean {
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

  /**
   * Get server data for conflict resolution
   */
  static async getServerData(
    estimateId: string,
  ): Promise<GuidedFlowData | null> {
    const result = await withDatabaseRetry(async () => {
      const supabase = createClient();
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
      const dbData = result.data;

      // Type-safe extraction with proper casting
      if (
        dbData.ai_extracted_data &&
        typeof dbData.ai_extracted_data === "object" &&
        "initialContact" in dbData.ai_extracted_data
      ) {
        flowData.initialContact = dbData.ai_extracted_data
          .initialContact as any;
      }

      if (
        dbData.selected_services &&
        Array.isArray(dbData.selected_services) &&
        dbData.selected_services.length > 0
      ) {
        flowData.scopeDetails = {
          selectedServices: dbData.selected_services as ServiceType[],
          serviceDependencies: {},
          serviceNotes: {},
          scopeComplete: false,
        };
      }

      if (
        dbData.uploaded_files &&
        typeof dbData.uploaded_files === "object" &&
        "filesPhotos" in dbData.uploaded_files
      ) {
        flowData.filesPhotos = (dbData.uploaded_files as any).filesPhotos;
      }

      if (
        dbData.work_areas &&
        typeof dbData.work_areas === "object" &&
        "areaOfWork" in dbData.work_areas
      ) {
        flowData.areaOfWork = (dbData.work_areas as any).areaOfWork;
      }

      if (
        dbData.takeoff_data &&
        typeof dbData.takeoff_data === "object" &&
        "takeoff" in dbData.takeoff_data
      ) {
        flowData.takeoff = (dbData.takeoff_data as any).takeoff;
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
        // Calculate total expenses
        const laborTotal = (dbData.labor_costs as any)?.total || 0;
        const materialsTotal = Array.isArray(dbData.material_costs)
          ? (dbData.material_costs as any[]).reduce(
              (sum, item) => sum + (item.total || 0),
              0,
            )
          : 0;
        const equipmentTotal = Array.isArray(dbData.equipment_costs)
          ? (dbData.equipment_costs as any[]).reduce(
              (sum, item) => sum + (item.total || 0),
              0,
            )
          : 0;

        flowData.expenses = {
          laborCosts: (dbData.labor_costs as any) || {
            workers: 0,
            hoursPerWorker: 0,
            ratePerHour: 0,
            total: 0,
          },
          materialCosts: Array.isArray(dbData.material_costs)
            ? (dbData.material_costs as any[])
            : [],
          equipmentCosts: Array.isArray(dbData.equipment_costs)
            ? (dbData.equipment_costs as any[])
            : [],
          totalExpenses: laborTotal + materialsTotal + equipmentTotal,
        };
      }

      if (
        dbData.pricing_calculations &&
        typeof dbData.pricing_calculations === "object"
      ) {
        flowData.pricing = dbData.pricing_calculations as any;
      }

      return flowData;
    }

    return null;
  }
}
