// React Hook for Session Recovery
// Provides session recovery functionality with browser tab detection and draft management

import { useState, useEffect, useCallback, useRef } from "react";
import {
  SessionRecoveryService,
  SessionDraft,
  RecoveryState,
  RecoveryOptions,
} from "@/lib/services/session-recovery-service";
import { GuidedFlowData } from "@/lib/types/estimate-types";

export interface UseSessionRecoveryOptions {
  estimateId: string;
  enabled?: boolean;
  autoSaveInterval?: number; // milliseconds
  recoveryOptions?: Partial<RecoveryOptions>;
  onRecoveryAvailable?: (drafts: SessionDraft[]) => void;
  onRecoveryComplete?: (draft: SessionDraft) => void;
  onRecoveryError?: (error: string) => void;
}

export interface UseSessionRecoveryReturn {
  // Recovery state
  recoveryState: RecoveryState;
  availableDrafts: SessionDraft[];
  hasRecoverableSessions: boolean;
  isRecovering: boolean;

  // Actions
  saveDraft: (
    data: GuidedFlowData,
    currentStep: string,
    immediate?: boolean,
  ) => Promise<boolean>;
  recoverSession: (draftId: string) => Promise<SessionDraft | null>;
  deleteDraft: (draftId: string) => Promise<boolean>;
  saveAndExit: (data: GuidedFlowData, currentStep: string) => Promise<boolean>;

  // State management
  setCurrentSession: (data: GuidedFlowData, currentStep: string) => void;
  hasUnsavedChanges: boolean;
  lastDraftTime: Date | null;

  // Recovery notifications
  showRecoveryPrompt: boolean;
  dismissRecoveryPrompt: () => void;
  acceptRecovery: (draftId: string) => Promise<void>;
  declineRecovery: () => void;
}

export function useSessionRecovery({
  estimateId,
  enabled = true,
  autoSaveInterval = 30000, // 30 seconds
  recoveryOptions,
  onRecoveryAvailable,
  onRecoveryComplete,
  onRecoveryError,
}: UseSessionRecoveryOptions): UseSessionRecoveryReturn {
  // State management
  const [recoveryState, setRecoveryState] = useState<RecoveryState>({
    hasRecoverableSessions: false,
    availableDrafts: [],
    lastRecoveryCheck: new Date(),
    recoveryInProgress: false,
  });

  const [isRecovering, setIsRecovering] = useState(false);
  const [showRecoveryPrompt, setShowRecoveryPrompt] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastDraftTime, setLastDraftTime] = useState<Date | null>(null);

  // Refs for stable callbacks
  const currentDataRef = useRef<GuidedFlowData>({});
  const currentStepRef = useRef<string>("initial-contact");
  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const enabledRef = useRef(enabled);
  const pendingSaveRef = useRef<Promise<boolean> | null>(null);

  // Update enabled state
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  // Initialize session recovery service
  useEffect(() => {
    let mounted = true;

    const initializeRecovery = async () => {
      try {
        await SessionRecoveryService.initialize(recoveryOptions);

        if (!mounted) return;

        // Check for existing recoverable sessions
        const state = SessionRecoveryService.getRecoveryState();
        setRecoveryState(state);

        // Show recovery prompt if there are recoverable sessions
        if (state.hasRecoverableSessions && state.availableDrafts.length > 0) {
          setShowRecoveryPrompt(true);
          onRecoveryAvailable?.(state.availableDrafts);
        }
      } catch (error) {
        console.error("Failed to initialize session recovery:", error);
        onRecoveryError?.(
          error instanceof Error
            ? error.message
            : "Recovery initialization failed",
        );
      }
    };

    if (enabled) {
      initializeRecovery();
    }

    return () => {
      mounted = false;
    };
  }, [enabled, recoveryOptions, onRecoveryAvailable, onRecoveryError]);

  // Set up auto-save interval
  useEffect(() => {
    if (!enabled || !estimateId) return;

    const setupAutoSave = () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }

      autoSaveIntervalRef.current = setInterval(async () => {
        if (
          enabledRef.current &&
          hasUnsavedChanges &&
          !pendingSaveRef.current
        ) {
          try {
            await saveDraft(
              currentDataRef.current,
              currentStepRef.current,
              false,
            );
          } catch (error) {
            console.error("Auto-save failed:", error);
          }
        }
      }, autoSaveInterval);
    };

    setupAutoSave();

    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
        autoSaveIntervalRef.current = null;
      }
    };
  }, [enabled, estimateId, autoSaveInterval, hasUnsavedChanges]);

  // Save draft function
  const saveDraft = useCallback(
    async (
      data: GuidedFlowData,
      currentStep: string,
      immediate: boolean = false,
    ): Promise<boolean> => {
      if (!enabled || !estimateId) {
        return false;
      }

      // Avoid duplicate saves
      if (pendingSaveRef.current && !immediate) {
        return pendingSaveRef.current;
      }

      const savePromise = (async () => {
        try {
          const success = await SessionRecoveryService.saveDraft(
            estimateId,
            data,
            currentStep,
            immediate ? "manual-save" : "auto-save",
          );

          if (success) {
            setHasUnsavedChanges(false);
            setLastDraftTime(new Date());

            // Update recovery state
            const newState = SessionRecoveryService.getRecoveryState();
            setRecoveryState(newState);
          }

          return success;
        } catch (error) {
          console.error("Save draft failed:", error);
          onRecoveryError?.(
            error instanceof Error ? error.message : "Save failed",
          );
          return false;
        } finally {
          pendingSaveRef.current = null;
        }
      })();

      pendingSaveRef.current = savePromise;
      return savePromise;
    },
    [enabled, estimateId, onRecoveryError],
  );

  // Recover session function
  const recoverSession = useCallback(
    async (draftId: string): Promise<SessionDraft | null> => {
      setIsRecovering(true);
      try {
        const draft = await SessionRecoveryService.recoverSession(draftId);

        if (draft) {
          // Update current session data
          currentDataRef.current = draft.data;
          currentStepRef.current = draft.currentStep;
          setHasUnsavedChanges(false);
          setLastDraftTime(new Date(draft.updatedAt));

          // Update recovery state
          const newState = SessionRecoveryService.getRecoveryState();
          setRecoveryState(newState);

          onRecoveryComplete?.(draft);
        }

        return draft;
      } catch (error) {
        console.error("Session recovery failed:", error);
        onRecoveryError?.(
          error instanceof Error ? error.message : "Recovery failed",
        );
        return null;
      } finally {
        setIsRecovering(false);
      }
    },
    [onRecoveryComplete, onRecoveryError],
  );

  // Delete draft function
  const deleteDraft = useCallback(
    async (draftId: string): Promise<boolean> => {
      try {
        const success = await SessionRecoveryService.deleteDraft(draftId);

        if (success) {
          // Update recovery state
          const newState = SessionRecoveryService.getRecoveryState();
          setRecoveryState(newState);

          // Hide recovery prompt if no more drafts
          if (!newState.hasRecoverableSessions) {
            setShowRecoveryPrompt(false);
          }
        }

        return success;
      } catch (error) {
        console.error("Delete draft failed:", error);
        onRecoveryError?.(
          error instanceof Error ? error.message : "Delete failed",
        );
        return false;
      }
    },
    [onRecoveryError],
  );

  // Save and exit function
  const saveAndExit = useCallback(
    async (data: GuidedFlowData, currentStep: string): Promise<boolean> => {
      try {
        const success = await SessionRecoveryService.saveDraft(
          estimateId,
          data,
          currentStep,
          "manual-save",
        );

        if (success) {
          setHasUnsavedChanges(false);
          setLastDraftTime(new Date());
        }

        return success;
      } catch (error) {
        console.error("Save and exit failed:", error);
        onRecoveryError?.(
          error instanceof Error ? error.message : "Save and exit failed",
        );
        return false;
      }
    },
    [estimateId, onRecoveryError],
  );

  // Set current session data
  const setCurrentSession = useCallback(
    (data: GuidedFlowData, currentStep: string) => {
      currentDataRef.current = data;
      currentStepRef.current = currentStep;
      setHasUnsavedChanges(true);
    },
    [],
  );

  // Recovery prompt actions
  const dismissRecoveryPrompt = useCallback(() => {
    setShowRecoveryPrompt(false);
  }, []);

  const acceptRecovery = useCallback(
    async (draftId: string) => {
      try {
        const draft = await recoverSession(draftId);
        if (draft) {
          setShowRecoveryPrompt(false);
        }
      } catch (error) {
        console.error("Recovery acceptance failed:", error);
        onRecoveryError?.(
          error instanceof Error ? error.message : "Recovery failed",
        );
      }
    },
    [recoverSession, onRecoveryError],
  );

  const declineRecovery = useCallback(() => {
    setShowRecoveryPrompt(false);
    // Optionally clean up declined drafts
    recoveryState.availableDrafts.forEach((draft) => {
      deleteDraft(draft.id);
    });
  }, [recoveryState.availableDrafts, deleteDraft]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
    };
  }, []);

  return {
    // Recovery state
    recoveryState,
    availableDrafts: recoveryState.availableDrafts,
    hasRecoverableSessions: recoveryState.hasRecoverableSessions,
    isRecovering,

    // Actions
    saveDraft,
    recoverSession,
    deleteDraft,
    saveAndExit,

    // State management
    setCurrentSession,
    hasUnsavedChanges,
    lastDraftTime,

    // Recovery notifications
    showRecoveryPrompt,
    dismissRecoveryPrompt,
    acceptRecovery,
    declineRecovery,
  };
}

// Enhanced hook for integration with guided flow
export function useGuidedFlowRecovery(
  estimateId: string,
  options?: Omit<UseSessionRecoveryOptions, "estimateId">,
) {
  const [currentData, setCurrentData] = useState<GuidedFlowData>({});
  const [currentStep, setCurrentStep] = useState<string>("initial-contact");

  const recovery = useSessionRecovery({
    estimateId,
    ...options,
    onRecoveryComplete: (draft) => {
      setCurrentData(draft.data);
      setCurrentStep(draft.currentStep);
      options?.onRecoveryComplete?.(draft);
    },
  });

  // Auto-update session when data changes
  useEffect(() => {
    recovery.setCurrentSession(currentData, currentStep);
  }, [currentData, currentStep, recovery.setCurrentSession]);

  const updateData = useCallback(
    (
      updater: GuidedFlowData | ((prevData: GuidedFlowData) => GuidedFlowData),
      saveImmediately = false,
    ) => {
      setCurrentData((prevData) => {
        const newData =
          typeof updater === "function" ? updater(prevData) : updater;

        if (saveImmediately) {
          recovery.saveDraft(newData, currentStep, true);
        }

        return newData;
      });
    },
    [currentStep, recovery.saveDraft],
  );

  const updateStep = useCallback(
    (step: string, saveImmediately = false) => {
      setCurrentStep(step);

      if (saveImmediately) {
        recovery.saveDraft(currentData, step, true);
      }
    },
    [currentData, recovery.saveDraft],
  );

  return {
    ...recovery,
    currentData,
    currentStep,
    updateData,
    updateStep,
  };
}

export default useSessionRecovery;
