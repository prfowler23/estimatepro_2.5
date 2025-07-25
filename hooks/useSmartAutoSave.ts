// PHASE 3 FIX: Smart Auto-Save with Debouncing and Change Detection
// Replaces polling-based auto-save with efficient change-driven saving

import { useState, useEffect, useRef, useCallback } from "react";
import {
  AutoSaveService,
  AutoSaveState,
  AutoSaveConfig,
  ConflictResolution,
} from "@/lib/services/auto-save-service";
import { GuidedFlowData } from "@/lib/types/estimate-types";

export interface UseSmartAutoSaveOptions {
  estimateId: string;
  enabled?: boolean;
  config?: Partial<AutoSaveConfig>;
  onSaveSuccess?: (wasAutoSave: boolean) => void;
  onSaveError?: (error: string, wasAutoSave: boolean) => void;
  onConflictDetected?: (conflictData: any) => void;
}

export interface UseSmartAutoSaveReturn {
  saveState: AutoSaveState | null;
  saveNow: (
    data: GuidedFlowData,
    stepId: string,
    description?: string,
  ) => Promise<boolean>;
  updateData: (
    data: GuidedFlowData,
    stepId: string,
    immediate?: boolean,
  ) => void;
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
  clearSaveError: () => void;
}

interface PendingSave {
  data: GuidedFlowData;
  stepId: string;
  timestamp: number;
}

export function useSmartAutoSave({
  estimateId,
  enabled = true,
  config,
  onSaveSuccess,
  onSaveError,
  onConflictDetected,
}: UseSmartAutoSaveOptions): UseSmartAutoSaveReturn {
  const [saveState, setSaveState] = useState<AutoSaveState | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Refs for stable references and preventing memory leaks
  const enabledRef = useRef(enabled);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSaveRef = useRef<PendingSave | null>(null);
  const lastSavedDataRef = useRef<string>("");
  const saveCounterRef = useRef(0);

  // Callback refs to prevent stale closures
  const onSaveSuccessRef = useRef(onSaveSuccess);
  const onSaveErrorRef = useRef(onSaveError);
  const onConflictDetectedRef = useRef(onConflictDetected);

  useEffect(() => {
    onSaveSuccessRef.current = onSaveSuccess;
    onSaveErrorRef.current = onSaveError;
    onConflictDetectedRef.current = onConflictDetected;
  });

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  // Smart auto-save configuration with optimized intervals
  const autoSaveConfig: AutoSaveConfig = {
    saveInterval: 5000, // Fallback interval (rarely used)
    maxRetries: 3,
    retryDelay: 1000,
    enableVersionControl: false,
    maxVersions: 10,
    conflictDetectionEnabled: true,
    compressionEnabled: true,
    ...config,
  };

  // Initialize smart auto-save without polling
  useEffect(() => {
    if (!estimateId || isInitialized) return;

    const initializeService = async () => {
      try {
        AutoSaveService.initializeAutoSave(estimateId, {}, autoSaveConfig);
        setIsInitialized(true);

        // Set initial save state
        setSaveState({
          lastSaved: new Date(),
          isDirty: false,
          isSaving: false,
          saveError: null,
          conflictDetected: false,
          localVersion: 1,
          serverVersion: 1,
          lastSaveAttempt: null,
        });
      } catch (error) {
        console.error("Failed to initialize smart auto-save:", error);
        if (onSaveErrorRef.current) {
          onSaveErrorRef.current(
            error instanceof Error ? error.message : "Initialization failed",
            false,
          );
        }
      }
    };

    initializeService();

    // Cleanup
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [estimateId, isInitialized]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (estimateId && isInitialized) {
        AutoSaveService.stopAutoSave(estimateId);
      }
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [estimateId, isInitialized]);

  // Update save state with optimistic updates
  const updateSaveState = useCallback((updates: Partial<AutoSaveState>) => {
    setSaveState((current) => {
      if (!current) return null;
      return { ...current, ...updates };
    });
  }, []);

  // Smart change detection
  const hasDataChanged = useCallback((data: GuidedFlowData): boolean => {
    const currentDataString = JSON.stringify(data);
    const hasChanged = currentDataString !== lastSavedDataRef.current;
    return hasChanged;
  }, []);

  // Debounced auto-save function
  const performDebouncedSave = useCallback(async () => {
    if (!pendingSaveRef.current || !enabledRef.current || !isInitialized) {
      return;
    }

    const { data, stepId, timestamp } = pendingSaveRef.current;
    const saveId = ++saveCounterRef.current;

    // Skip if newer save is pending
    if (
      saveTimeoutRef.current &&
      pendingSaveRef.current.timestamp > timestamp
    ) {
      return;
    }

    try {
      updateSaveState({
        isSaving: true,
        saveError: null,
        lastSaveAttempt: new Date(),
      });

      const success = await AutoSaveService.saveNow(
        estimateId,
        data,
        stepId,
        `auto-save-debounced-${saveId}`,
      );

      // Only update if this is still the latest save
      if (saveId === saveCounterRef.current) {
        if (success) {
          lastSavedDataRef.current = JSON.stringify(data);
          updateSaveState({
            lastSaved: new Date(),
            isDirty: false,
            isSaving: false,
            saveError: null,
            localVersion: saveState?.localVersion
              ? saveState.localVersion + 1
              : 1,
          });

          if (onSaveSuccessRef.current) {
            onSaveSuccessRef.current(true); // wasAutoSave = true
          }
        } else {
          updateSaveState({
            isSaving: false,
            saveError: "Auto-save failed",
          });
        }
      }
    } catch (error) {
      if (saveId === saveCounterRef.current) {
        const errorMessage =
          error instanceof Error ? error.message : "Auto-save failed";
        updateSaveState({
          isSaving: false,
          saveError: errorMessage,
        });

        if (onSaveErrorRef.current) {
          onSaveErrorRef.current(errorMessage, true); // wasAutoSave = true
        }
      }
    }

    // Clear pending save if this was the latest
    if (
      pendingSaveRef.current &&
      pendingSaveRef.current.timestamp === timestamp
    ) {
      pendingSaveRef.current = null;
    }
  }, [estimateId, isInitialized, updateSaveState, saveState?.localVersion]);

  // Update data with smart change detection and debounced saving
  const updateData = useCallback(
    (data: GuidedFlowData, stepId: string, immediate: boolean = false) => {
      if (!isInitialized || !enabledRef.current) {
        return;
      }

      // Skip if data hasn't actually changed
      if (!hasDataChanged(data)) {
        return;
      }

      // Mark as dirty
      updateSaveState({ isDirty: true, saveError: null });

      // Store pending save
      pendingSaveRef.current = {
        data: { ...data }, // Create a snapshot
        stepId,
        timestamp: Date.now(),
      };

      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }

      if (immediate) {
        // Save immediately
        performDebouncedSave();
      } else {
        // Debounced save after 2 seconds of no changes
        saveTimeoutRef.current = setTimeout(() => {
          performDebouncedSave();
          saveTimeoutRef.current = null;
        }, 2000);
      }
    },
    [isInitialized, hasDataChanged, updateSaveState, performDebouncedSave],
  );

  // Manual save function
  const saveNow = useCallback(
    async (
      data: GuidedFlowData,
      stepId: string,
      description: string = "manual-save",
    ): Promise<boolean> => {
      if (!isInitialized || !enabledRef.current) {
        return false;
      }

      // Clear any pending debounced save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      pendingSaveRef.current = null;

      try {
        updateSaveState({
          isSaving: true,
          saveError: null,
          lastSaveAttempt: new Date(),
        });

        const success = await AutoSaveService.saveNow(
          estimateId,
          data,
          stepId,
          description,
        );

        if (success) {
          lastSavedDataRef.current = JSON.stringify(data);
          updateSaveState({
            lastSaved: new Date(),
            isDirty: false,
            isSaving: false,
            saveError: null,
            localVersion: saveState?.localVersion
              ? saveState.localVersion + 1
              : 1,
          });

          if (onSaveSuccessRef.current) {
            onSaveSuccessRef.current(false); // wasAutoSave = false
          }
        } else {
          updateSaveState({
            isSaving: false,
            saveError: "Manual save failed",
          });
        }

        return success;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Save failed";
        updateSaveState({
          isSaving: false,
          saveError: errorMessage,
        });

        if (onSaveErrorRef.current) {
          onSaveErrorRef.current(errorMessage, false); // wasAutoSave = false
        }
        return false;
      }
    },
    [estimateId, isInitialized, updateSaveState, saveState?.localVersion],
  );

  // Enable auto-save
  const enableAutoSave = useCallback(() => {
    enabledRef.current = true;
  }, []);

  // Disable auto-save
  const disableAutoSave = useCallback(() => {
    enabledRef.current = false;

    // Clear any pending saves
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    pendingSaveRef.current = null;
  }, []);

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

        if (success) {
          updateSaveState({
            conflictDetected: false,
            saveError: null,
          });

          if (onSaveSuccessRef.current) {
            onSaveSuccessRef.current(false); // wasAutoSave = false
          }
        }

        return success;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Conflict resolution failed";
        updateSaveState({ saveError: errorMessage });

        if (onSaveErrorRef.current) {
          onSaveErrorRef.current(errorMessage, false); // wasAutoSave = false
        }
        return false;
      }
    },
    [estimateId, isInitialized, updateSaveState],
  );

  // Clear save error
  const clearSaveError = useCallback(() => {
    updateSaveState({ saveError: null });
  }, [updateSaveState]);

  // Mark data as dirty (for compatibility with UseAutoSaveReturn)
  const markDirty = useCallback(() => {
    updateSaveState({ isDirty: true });
  }, [updateSaveState]);

  // Handle conflicts from service
  useEffect(() => {
    if (saveState?.conflictDetected && onConflictDetectedRef.current) {
      onConflictDetectedRef.current(saveState);
    }
  }, [saveState?.conflictDetected]);

  return {
    saveState,
    saveNow,
    updateData,
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
    clearSaveError,
  };
}

// Enhanced data management hook with smart auto-save
export function useSmartAutoSaveData<T extends GuidedFlowData>(
  initialData: T,
  smartAutoSaveHook: UseSmartAutoSaveReturn,
  currentStep: string,
) {
  const [data, setData] = useState<T>(initialData);
  const [hasLocalChanges, setHasLocalChanges] = useState(false);
  const changeCounterRef = useRef(0);

  // Update data with smart change tracking
  const updateData = useCallback(
    (updater: T | ((prevData: T) => T), immediate: boolean = false) => {
      const changeId = ++changeCounterRef.current;

      setData((prevData) => {
        const newData =
          typeof updater === "function" ? updater(prevData) : updater;

        // Only trigger auto-save if this is the latest change
        if (changeId === changeCounterRef.current) {
          setHasLocalChanges(true);
          smartAutoSaveHook.updateData(newData, currentStep, immediate);
        }

        return newData;
      });
    },
    [smartAutoSaveHook, currentStep],
  );

  // Force immediate save
  const saveImmediately = useCallback(() => {
    return smartAutoSaveHook.saveNow(data, currentStep, "force-save");
  }, [smartAutoSaveHook, data, currentStep]);

  // Update local changes state based on auto-save state
  useEffect(() => {
    if (!smartAutoSaveHook.hasUnsavedChanges && !smartAutoSaveHook.isSaving) {
      setHasLocalChanges(false);
    }
  }, [smartAutoSaveHook.hasUnsavedChanges, smartAutoSaveHook.isSaving]);

  // Reset local changes when data changes externally (with conditional check to prevent loops)
  useEffect(() => {
    if (JSON.stringify(data) !== JSON.stringify(initialData)) {
      setData(initialData);
      setHasLocalChanges(false);
    }
  }, [initialData, data]);

  return {
    data,
    updateData,
    saveImmediately,
    hasLocalChanges: hasLocalChanges || smartAutoSaveHook.hasUnsavedChanges,
    isSaving: smartAutoSaveHook.isSaving,
    saveError: smartAutoSaveHook.saveError,
    clearSaveError: smartAutoSaveHook.clearSaveError,
  };
}

export default useSmartAutoSave;
