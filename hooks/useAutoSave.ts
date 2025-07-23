// React Hook for Auto-Save Integration
// Provides auto-save functionality with conflict resolution for guided estimation flows

import { useState, useEffect, useRef, useCallback } from "react";
import {
  AutoSaveService,
  AutoSaveState,
  AutoSaveConfig,
  ConflictResolution,
} from "@/lib/services/auto-save-service";
import { GuidedFlowData } from "@/lib/types/estimate-types";

export interface UseAutoSaveOptions {
  estimateId: string;
  enabled?: boolean;
  config?: Partial<AutoSaveConfig>;
  onSaveSuccess?: () => void;
  onSaveError?: (error: string) => void;
  onConflictDetected?: (conflictData: any) => void;
}

export interface UseAutoSaveReturn {
  saveState: AutoSaveState | null;
  saveNow: (
    data: GuidedFlowData,
    stepId: string,
    description?: string,
  ) => Promise<boolean>;
  markDirty: () => void;
  enableAutoSave: () => void;
  disableAutoSave: () => void;
  resolveConflict: (resolution: ConflictResolution) => Promise<boolean>;
  isInitialized: boolean;
  lastSaveTime: Date | null;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  hasConflict: boolean;
  saveError: string | null;
}

export function useAutoSave({
  estimateId,
  enabled = true,
  config,
  onSaveSuccess,
  onSaveError,
  onConflictDetected,
}: UseAutoSaveOptions): UseAutoSaveReturn {
  const [saveState, setSaveState] = useState<AutoSaveState | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const dataRef = useRef<GuidedFlowData>({});
  const currentStepRef = useRef<string>("initial-contact");
  const enabledRef = useRef(enabled);

  // Update enabled state
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  // Memoize callbacks to prevent excessive re-renders
  const onSaveSuccessRef = useRef(onSaveSuccess);
  const onSaveErrorRef = useRef(onSaveError);
  const onConflictDetectedRef = useRef(onConflictDetected);

  useEffect(() => {
    onSaveSuccessRef.current = onSaveSuccess;
    onSaveErrorRef.current = onSaveError;
    onConflictDetectedRef.current = onConflictDetected;
  });

  // Initialize auto-save
  useEffect(() => {
    if (!estimateId || isInitialized) return;

    let pollInterval: NodeJS.Timeout | null = null;

    try {
      AutoSaveService.initializeAutoSave(estimateId, dataRef.current, config);
      setIsInitialized(true);

      // Start polling for save state updates with reduced frequency
      pollInterval = setInterval(() => {
        if (!enabledRef.current) return;

        const currentState = AutoSaveService.getSaveState(estimateId);
        if (currentState) {
          setSaveState((prevState) => {
            // Only update if state actually changed to prevent unnecessary re-renders
            if (JSON.stringify(prevState) === JSON.stringify(currentState)) {
              return prevState;
            }
            return { ...currentState };
          });

          // Trigger callbacks based on state changes
          if (currentState.saveError && onSaveErrorRef.current) {
            onSaveErrorRef.current(currentState.saveError);
          }

          if (currentState.conflictDetected && onConflictDetectedRef.current) {
            onConflictDetectedRef.current(currentState);
          }

          if (
            !currentState.isDirty &&
            !currentState.isSaving &&
            !currentState.saveError &&
            onSaveSuccessRef.current
          ) {
            onSaveSuccessRef.current();
          }
        }
      }, 3000); // Reduced polling frequency to every 3 seconds

      return () => {
        if (pollInterval) {
          clearInterval(pollInterval);
          pollInterval = null;
        }
      };
    } catch (error) {
      console.error("Failed to initialize auto-save:", error);
      if (onSaveErrorRef.current) {
        onSaveErrorRef.current(
          error instanceof Error
            ? error.message
            : "Failed to initialize auto-save",
        );
      }
    }
  }, [estimateId, isInitialized]); // Removed volatile dependencies to prevent interval recreation

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (estimateId && isInitialized) {
        AutoSaveService.stopAutoSave(estimateId);
      }
    };
  }, [estimateId, isInitialized]);

  // Save now function
  const saveNow = useCallback(
    async (
      data: GuidedFlowData,
      stepId: string,
      description: string = "manual-save",
    ): Promise<boolean> => {
      if (!isInitialized || !enabledRef.current) {
        return false;
      }

      try {
        dataRef.current = data;
        currentStepRef.current = stepId;

        const success = await AutoSaveService.saveNow(
          estimateId,
          data,
          stepId,
          description,
        );

        if (success && onSaveSuccess) {
          onSaveSuccess();
        }

        return success;
      } catch (error) {
        console.error("Manual save failed:", error);
        if (onSaveError) {
          onSaveError(error instanceof Error ? error.message : "Save failed");
        }
        return false;
      }
    },
    [estimateId, isInitialized, onSaveSuccess, onSaveError],
  );

  // Mark data as dirty
  const markDirty = useCallback(() => {
    if (isInitialized && enabledRef.current) {
      AutoSaveService.markDirty(estimateId);
    }
  }, [estimateId, isInitialized]);

  // Enable auto-save
  const enableAutoSave = useCallback(() => {
    enabledRef.current = true;
    if (!isInitialized && estimateId) {
      AutoSaveService.initializeAutoSave(estimateId, dataRef.current, config);
      setIsInitialized(true);
    }
  }, [estimateId, config, isInitialized]);

  // Disable auto-save
  const disableAutoSave = useCallback(() => {
    enabledRef.current = false;
    if (isInitialized) {
      AutoSaveService.stopAutoSave(estimateId);
      setIsInitialized(false);
    }
  }, [estimateId, isInitialized]);

  // Resolve conflict
  const resolveConflict = useCallback(
    async (resolution: ConflictResolution): Promise<boolean> => {
      if (!isInitialized) {
        return false;
      }

      try {
        const success = await AutoSaveService.resolveConflictManually(
          estimateId,
          resolution,
        );

        if (success && onSaveSuccess) {
          onSaveSuccess();
        }

        return success;
      } catch (error) {
        console.error("Conflict resolution failed:", error);
        if (onSaveError) {
          onSaveError(
            error instanceof Error
              ? error.message
              : "Conflict resolution failed",
          );
        }
        return false;
      }
    },
    [estimateId, isInitialized, onSaveSuccess, onSaveError],
  );

  return {
    saveState,
    saveNow,
    markDirty,
    enableAutoSave,
    disableAutoSave,
    resolveConflict,
    isInitialized,
    lastSaveTime: saveState?.lastSaved || null,
    isSaving: saveState?.isSaving || false,
    hasUnsavedChanges: saveState?.isDirty || false,
    hasConflict: saveState?.conflictDetected || false,
    saveError: saveState?.saveError || null,
  };
}

// Additional hook for managing data updates with auto-save
export function useAutoSaveData<T extends GuidedFlowData>(
  initialData: T,
  autoSaveHook: UseAutoSaveReturn,
  currentStep: string,
) {
  const [data, setData] = useState<T>(initialData);
  const [hasLocalChanges, setHasLocalChanges] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  // Update data and trigger auto-save
  const updateData = useCallback(
    (updater: T | ((prevData: T) => T), immediate: boolean = false) => {
      setData((prevData) => {
        const newData =
          typeof updater === "function" ? updater(prevData) : updater;

        // Mark as dirty and schedule save
        autoSaveHook.markDirty();
        setHasLocalChanges(true);

        // Clear existing timeout to prevent memory leaks
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
          saveTimeoutRef.current = undefined;
        }

        if (immediate) {
          // Save immediately
          autoSaveHook
            .saveNow(newData, currentStep, "data-update-immediate")
            .catch((error) => {
              console.error("Immediate save failed:", error);
            });
        } else {
          // Debounced save after 2 seconds of no changes
          saveTimeoutRef.current = setTimeout(() => {
            autoSaveHook
              .saveNow(newData, currentStep, "data-update-debounced")
              .then(() => {
                setHasLocalChanges(false);
              })
              .catch((error) => {
                console.error("Debounced save failed:", error);
              });
            saveTimeoutRef.current = undefined;
          }, 2000);
        }

        return newData;
      });
    },
    [autoSaveHook, currentStep],
  );

  // Force immediate save
  const saveImmediately = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = undefined;
    }
    autoSaveHook
      .saveNow(data, currentStep, "force-save")
      .then(() => {
        setHasLocalChanges(false);
      })
      .catch((error) => {
        console.error("Force save failed:", error);
      });
  }, [autoSaveHook, data, currentStep]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = undefined;
      }
    };
  }, []);

  // Update hasLocalChanges based on auto-save state
  useEffect(() => {
    if (!autoSaveHook.hasUnsavedChanges && !autoSaveHook.isSaving) {
      setHasLocalChanges(false);
    }
  }, [autoSaveHook.hasUnsavedChanges, autoSaveHook.isSaving]);

  return {
    data,
    updateData,
    saveImmediately,
    hasLocalChanges: hasLocalChanges || autoSaveHook.hasUnsavedChanges,
    isSaving: autoSaveHook.isSaving,
  };
}

// Hook for conflict resolution UI
export function useConflictResolution(autoSaveHook: UseAutoSaveReturn) {
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflictData, setConflictData] = useState<any>(null);

  useEffect(() => {
    if (autoSaveHook.hasConflict) {
      setShowConflictDialog(true);
      // Get conflict data (would need to be passed from auto-save service)
    } else {
      setShowConflictDialog(false);
      setConflictData(null);
    }
  }, [autoSaveHook.hasConflict]);

  const resolveWithLocal = useCallback(async () => {
    if (conflictData) {
      const resolution: ConflictResolution = {
        strategy: "overwrite-server",
        resolvedData: conflictData.localData,
        conflictedFields: conflictData.conflictedFields,
        resolutionNotes: "User chose to keep local changes",
      };

      const success = await autoSaveHook.resolveConflict(resolution);
      if (success) {
        setShowConflictDialog(false);
      }
      return success;
    }
    return false;
  }, [autoSaveHook, conflictData]);

  const resolveWithServer = useCallback(async () => {
    if (conflictData) {
      const resolution: ConflictResolution = {
        strategy: "overwrite-local",
        resolvedData: conflictData.serverData,
        conflictedFields: conflictData.conflictedFields,
        resolutionNotes: "User chose to keep server changes",
      };

      const success = await autoSaveHook.resolveConflict(resolution);
      if (success) {
        setShowConflictDialog(false);
      }
      return success;
    }
    return false;
  }, [autoSaveHook, conflictData]);

  const resolveWithMerge = useCallback(async () => {
    if (conflictData) {
      const resolution: ConflictResolution = {
        strategy: "merge",
        resolvedData: conflictData.resolvedData, // Pre-merged data
        conflictedFields: conflictData.conflictedFields,
        resolutionNotes: "User chose to merge changes automatically",
      };

      const success = await autoSaveHook.resolveConflict(resolution);
      if (success) {
        setShowConflictDialog(false);
      }
      return success;
    }
    return false;
  }, [autoSaveHook, conflictData]);

  return {
    showConflictDialog,
    conflictData,
    resolveWithLocal,
    resolveWithServer,
    resolveWithMerge,
    dismissConflict: () => setShowConflictDialog(false),
  };
}

export default useAutoSave;
