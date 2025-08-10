"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import {
  ErrorRecoveryEngine,
  ErrorContext,
  ErrorMessage,
} from "@/lib/error/error-recovery-engine";
import { useHelp } from "@/components/help/HelpProvider";
import { GuidedFlowData } from "@/lib/types/estimate-types";
import { errorRateLimiter } from "@/lib/utils/error-sanitization";

interface ErrorRecoveryContextType {
  // Error state
  currentError: ErrorMessage | null;
  isRecovering: boolean;
  recoveryAttempts: number;

  // Error handling methods
  reportError: (
    error: Error | string,
    context?: Partial<ErrorContext>,
  ) => Promise<void>;
  clearError: () => void;
  retryLastAction: () => void;

  // Recovery methods
  executeRecoveryAction: (actionId: string) => Promise<boolean>;
  startAutoRecovery: () => Promise<boolean>;

  // Error history and patterns
  getErrorHistory: () => ErrorContext[];
  getErrorStatistics: () => {
    totalErrors: number;
    errorsByType: Record<string, number>;
    recoverySuccessRate: number;
    averageRecoveryTime: number;
  };
}

const ErrorRecoveryContext = createContext<ErrorRecoveryContextType | null>(
  null,
);

interface ErrorRecoveryProviderProps {
  children: React.ReactNode;
  stepId?: string;
  stepNumber?: number;
  userId?: string;
  flowData?: GuidedFlowData;
  onErrorRecovered?: () => void;
  onErrorEscalated?: (error: ErrorMessage) => void;
}

export function ErrorRecoveryProvider({
  children,
  stepId = "unknown",
  stepNumber = 0,
  userId = "anonymous",
  flowData = {} as GuidedFlowData,
  onErrorRecovered,
  onErrorEscalated,
}: ErrorRecoveryProviderProps) {
  const [currentError, setCurrentError] = useState<ErrorMessage | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryAttempts, setRecoveryAttempts] = useState(0);
  const [lastActionContext, setLastActionContext] = useState<{
    retry: () => void;
    context?: Partial<ErrorContext>;
  } | null>(null);

  const { trackBehavior } = useHelp();

  /**
   * Report an error and process it through the recovery engine
   */
  const reportError = useCallback(
    async (
      error: Error | string,
      contextOverrides: Partial<ErrorContext> = {},
    ) => {
      try {
        setIsRecovering(true);

        const errorInstance = error instanceof Error ? error : new Error(error);

        const errorContext: ErrorContext = {
          errorType: "unknown",
          errorCode: `ERR_${Date.now()}`,
          originalError: errorInstance,
          stepId,
          stepNumber,
          userId,
          flowData,
          userBehavior: {
            previousErrors: [],
            timeOnStep: 0,
            attemptCount: recoveryAttempts + 1,
          },
          ...contextOverrides,
        };

        // Process through recovery engine
        const errorMessage =
          await ErrorRecoveryEngine.processError(errorContext);

        setCurrentError(errorMessage);
        setRecoveryAttempts((prev) => prev + 1);

        // Track error in help system
        trackBehavior("error_occurred", {
          errorType: errorContext.errorType,
          errorCode: errorContext.errorCode,
          stepId: errorContext.stepId,
          isRecoverable: errorMessage.isRecoverable,
        });

        // Attempt auto-recovery for certain error types
        if (
          errorMessage.isRecoverable &&
          shouldAttemptAutoRecovery(errorMessage)
        ) {
          setTimeout(() => {
            startAutoRecovery();
          }, 1000);
        }

        // Escalate critical errors
        if (errorMessage.severity === "error" && !errorMessage.isRecoverable) {
          onErrorEscalated?.(errorMessage);
        }
      } catch (processingError) {
        console.error("Error processing error:", processingError);

        // Fallback error handling
        setCurrentError({
          id: "fallback-error",
          title: "System Error",
          message: "A system error occurred while processing your request.",
          severity: "error",
          category: "system_error",
          isRecoverable: true,
          canRetry: true,
          userFriendly: "Something went wrong. Please try again.",
          recoveryActions: [
            {
              id: "reload",
              label: "Reload Page",
              description: "Refresh the page to reset the application",
              type: "user-action",
              priority: 1,
              execute: () => window.location.reload(),
            },
          ],
        });
      } finally {
        setIsRecovering(false);
      }
    },
    [
      stepId,
      stepNumber,
      userId,
      flowData,
      recoveryAttempts,
      trackBehavior,
      onErrorEscalated,
    ],
  );

  /**
   * Clear current error
   */
  const clearError = useCallback(() => {
    setCurrentError(null);
    setIsRecovering(false);

    trackBehavior("error_cleared", {
      stepId,
      recoveryAttempts,
    });

    onErrorRecovered?.();
  }, [stepId, recoveryAttempts, trackBehavior, onErrorRecovered]);

  /**
   * Retry last failed action
   */
  const retryLastAction = useCallback(() => {
    if (lastActionContext) {
      // Re-execute the last action that failed
      if (typeof lastActionContext.retry === "function") {
        try {
          lastActionContext.retry();
          clearError();
        } catch (error) {
          reportError(error as Error, { errorType: "unknown" });
        }
      }
    }
  }, [lastActionContext, clearError, reportError]);

  /**
   * Execute a specific recovery action
   */
  const executeRecoveryAction = useCallback(
    async (actionId: string): Promise<boolean> => {
      if (!currentError) return false;

      const action = currentError.recoveryActions.find(
        (a) => a.id === actionId,
      );
      if (!action) return false;

      // Apply rate limiting to prevent spam
      const rateLimitKey = `recovery_${actionId}_${userId}_${stepId}`;
      if (!errorRateLimiter.shouldAllow(rateLimitKey)) {
        console.warn(
          `Recovery action ${actionId} rate limited for user ${userId}`,
        );
        return false;
      }

      try {
        setIsRecovering(true);

        await action.execute();

        trackBehavior("recovery_action_executed", {
          actionId,
          actionType: action.type,
          stepId,
          recoveryAttempts,
        });

        // Clear error if action was successful
        if (action.type === "auto" || action.type === "user-action") {
          clearError();
        }

        return true;
      } catch (error) {
        console.error(`Recovery action ${actionId} failed:`, error);

        trackBehavior("recovery_action_failed", {
          actionId,
          actionType: action.type,
          stepId,
          error: (error as Error).message,
        });

        return false;
      } finally {
        setIsRecovering(false);
      }
    },
    [currentError, stepId, recoveryAttempts, trackBehavior, clearError],
  );

  /**
   * Start automatic recovery
   */
  const startAutoRecovery = useCallback(async (): Promise<boolean> => {
    if (!currentError || !currentError.isRecoverable) return false;

    // Apply rate limiting to auto-recovery to prevent loops
    const autoRecoveryKey = `auto_recovery_${userId}_${stepId}`;
    if (!errorRateLimiter.shouldAllow(autoRecoveryKey)) {
      console.warn(
        `Auto-recovery rate limited for user ${userId} in step ${stepId}`,
      );
      return false;
    }

    setIsRecovering(true);

    try {
      // Execute auto-recovery actions in priority order
      const autoActions = currentError.recoveryActions
        .filter((action) => action.type === "auto")
        .sort((a, b) => a.priority - b.priority);

      let recoverySuccessful = false;

      for (const action of autoActions) {
        try {
          await action.execute();
          recoverySuccessful = true;

          trackBehavior("auto_recovery_successful", {
            actionId: action.id,
            stepId,
            recoveryAttempts,
          });

          break; // Stop after first successful action
        } catch (error) {
          console.error(`Auto-recovery action ${action.id} failed:`, error);
          continue; // Try next action
        }
      }

      if (recoverySuccessful) {
        clearError();
        return true;
      }

      trackBehavior("auto_recovery_failed", {
        stepId,
        recoveryAttempts,
        totalActions: autoActions.length,
      });

      return false;
    } finally {
      setIsRecovering(false);
    }
  }, [currentError, stepId, recoveryAttempts, trackBehavior, clearError]);

  /**
   * Get error history for analysis
   */
  const getErrorHistory = useCallback((): ErrorContext[] => {
    // This would typically come from the ErrorRecoveryEngine
    return [];
  }, []);

  /**
   * Get error statistics
   */
  const getErrorStatistics = useCallback(() => {
    return ErrorRecoveryEngine.getErrorStatistics();
  }, []);

  /**
   * Determine if auto-recovery should be attempted
   */
  const shouldAttemptAutoRecovery = (errorMessage: ErrorMessage): boolean => {
    // Don't auto-recover if user has already tried multiple times
    if (recoveryAttempts > 2) return false;

    // Auto-recover for specific error types
    const autoRecoverableTypes = ["network", "timeout", "database"];
    return autoRecoverableTypes.includes(errorMessage.category);
  };

  /**
   * Set up global error handlers
   */
  useEffect(() => {
    const handleUnhandledError = (event: ErrorEvent) => {
      reportError(event.error || event.message, {
        errorType: "unknown",
        errorCode: "UNHANDLED_ERROR",
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      reportError(event.reason, {
        errorType: "unknown",
        errorCode: "UNHANDLED_PROMISE_REJECTION",
      });
    };

    window.addEventListener("error", handleUnhandledError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleUnhandledError);
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection,
      );
    };
  }, [reportError]);

  const contextValue: ErrorRecoveryContextType = {
    currentError,
    isRecovering,
    recoveryAttempts,
    reportError,
    clearError,
    retryLastAction,
    executeRecoveryAction,
    startAutoRecovery,
    getErrorHistory,
    getErrorStatistics,
  };

  return (
    <ErrorRecoveryContext.Provider value={contextValue}>
      {children}
    </ErrorRecoveryContext.Provider>
  );
}

/**
 * Hook to use error recovery context
 */
export function useErrorRecovery() {
  const context = useContext(ErrorRecoveryContext);

  if (!context) {
    throw new Error(
      "useErrorRecovery must be used within an ErrorRecoveryProvider",
    );
  }

  return context;
}

/**
 * Hook to wrap async operations with error handling
 */
export function useAsyncErrorHandler() {
  const { reportError } = useErrorRecovery();

  const handleAsync = useCallback(
    async <T,>(
      operation: () => Promise<T>,
      errorContext?: Partial<ErrorContext>,
    ): Promise<T | null> => {
      try {
        return await operation();
      } catch (error) {
        await reportError(error as Error, errorContext);
        return null;
      }
    },
    [reportError],
  );

  return { handleAsync };
}

/**
 * Higher-order component to wrap components with error recovery
 */
export function withErrorRecovery<P extends object>(
  Component: React.ComponentType<P>,
  errorRecoveryProps?: Partial<ErrorRecoveryProviderProps>,
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorRecoveryProvider {...errorRecoveryProps}>
        <Component {...props} />
      </ErrorRecoveryProvider>
    );
  };
}

export default ErrorRecoveryProvider;
