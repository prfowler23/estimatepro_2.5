"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  ErrorRecoveryEngine,
  ErrorContext,
  ErrorMessage,
} from "@/lib/error/error-recovery-engine";
import { useErrorRecovery } from "@/components/error/ErrorRecoveryProvider";

interface UseErrorHandlerOptions {
  stepId?: string;
  stepNumber?: number;
  userId?: string;
  flowData?: any;
  onError?: (error: ErrorMessage) => void;
  onRecovery?: () => void;
  enableAutoRecovery?: boolean;
  maxRetryAttempts?: number;
  retryDelay?: number;
}

interface UseErrorHandlerReturn {
  // Error state
  currentError: ErrorMessage | null;
  isRecovering: boolean;
  hasError: boolean;
  retryCount: number;

  // Error handling methods
  handleError: (
    error: Error | string,
    context?: Partial<ErrorContext>,
  ) => Promise<void>;
  handleAsyncOperation: <T>(
    operation: () => Promise<T>,
    context?: Partial<ErrorContext>,
  ) => Promise<T | null>;
  clearError: () => void;
  retry: () => Promise<void>;

  // Recovery methods
  executeRecoveryAction: (actionId: string) => Promise<boolean>;
  startAutoRecovery: () => Promise<boolean>;

  // Validation helpers
  validateAndHandle: <T>(
    value: T,
    validator: (value: T) => boolean,
    errorMessage: string,
  ) => boolean;
  handleFormValidation: (errors: Record<string, string>) => void;

  // Utility methods
  withErrorHandling: <T extends any[], R>(
    fn: (...args: T) => Promise<R>,
  ) => (...args: T) => Promise<R | null>;
  createErrorContext: (overrides?: Partial<ErrorContext>) => ErrorContext;
}

/**
 * Comprehensive error handling hook
 */
export function useErrorHandler(
  options: UseErrorHandlerOptions = {},
): UseErrorHandlerReturn {
  const {
    stepId = "unknown",
    stepNumber = 0,
    userId = "anonymous",
    flowData = {},
    onError,
    onRecovery,
    enableAutoRecovery = true,
    maxRetryAttempts = 3,
    retryDelay = 1000,
  } = options;

  const [currentError, setCurrentError] = useState<ErrorMessage | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastOperation, setLastOperation] = useState<
    (() => Promise<any>) | null
  >(null);

  const errorRecovery = useErrorRecovery();
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Handle error with context and recovery
   */
  const handleError = useCallback(
    async (
      error: Error | string,
      contextOverrides: Partial<ErrorContext> = {},
    ) => {
      try {
        setIsRecovering(true);

        const errorInstance = error instanceof Error ? error : new Error(error);

        const errorContext = createErrorContext(contextOverrides);
        errorContext.originalError = errorInstance;

        const errorMessage =
          await ErrorRecoveryEngine.processError(errorContext);

        setCurrentError(errorMessage);
        onError?.(errorMessage);

        // Attempt auto-recovery if enabled and appropriate
        if (
          enableAutoRecovery &&
          errorMessage.isRecoverable &&
          shouldAttemptAutoRecovery(errorMessage)
        ) {
          setTimeout(() => {
            startAutoRecovery();
          }, 500);
        }
      } catch (processingError) {
        console.error("Error processing error:", processingError);

        // Fallback error state
        const fallbackError: ErrorMessage = {
          id: "fallback-error",
          title: "System Error",
          message: "An error occurred while processing your request.",
          severity: "error",
          category: "system_error",
          isRecoverable: true,
          canRetry: true,
          userFriendly: "Something went wrong. Please try again.",
          recoveryActions: [
            {
              id: "retry",
              label: "Try Again",
              description: "Retry the last operation",
              type: "user-action",
              priority: 1,
              execute: () => retry(),
            },
          ],
        };

        setCurrentError(fallbackError);
        onError?.(fallbackError);
      } finally {
        setIsRecovering(false);
      }
    },
    [stepId, stepNumber, userId, flowData, onError, enableAutoRecovery],
  );

  /**
   * Handle async operations with automatic error handling
   */
  const handleAsyncOperation = useCallback(
    async <T>(
      operation: () => Promise<T>,
      contextOverrides: Partial<ErrorContext> = {},
    ): Promise<T | null> => {
      try {
        setLastOperation(() => operation);
        const result = await operation();

        // Clear error on successful operation
        if (currentError) {
          clearError();
        }

        return result;
      } catch (error) {
        await handleError(error as Error, {
          ...contextOverrides,
          errorType: contextOverrides.errorType || "unknown",
        });
        return null;
      }
    },
    [currentError, handleError],
  );

  /**
   * Clear current error
   */
  const clearError = useCallback(() => {
    setCurrentError(null);
    setIsRecovering(false);
    setRetryCount(0);

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    onRecovery?.();
  }, [onRecovery]);

  /**
   * Retry last operation
   */
  const retry = useCallback(async () => {
    if (!lastOperation || retryCount >= maxRetryAttempts) {
      return;
    }

    setRetryCount((prev) => prev + 1);
    setIsRecovering(true);

    try {
      // Add delay before retry
      if (retryDelay > 0) {
        await new Promise((resolve) => {
          retryTimeoutRef.current = setTimeout(
            resolve,
            retryDelay * Math.pow(2, retryCount),
          ); // Exponential backoff
        });
      }

      const result = await lastOperation();

      // Success - clear error
      clearError();

      return result;
    } catch (error) {
      if (retryCount < maxRetryAttempts) {
        // Will retry again
        console.warn(`Retry ${retryCount}/${maxRetryAttempts} failed:`, error);
      } else {
        // Max retries reached
        await handleError(error as Error, {
          errorType: "retry_failed",
          errorCode: "MAX_RETRIES_EXCEEDED",
        });
      }
    } finally {
      setIsRecovering(false);
    }
  }, [
    lastOperation,
    retryCount,
    maxRetryAttempts,
    retryDelay,
    handleError,
    clearError,
  ]);

  /**
   * Execute specific recovery action
   */
  const executeRecoveryAction = useCallback(
    async (actionId: string): Promise<boolean> => {
      if (!currentError) return false;

      const action = currentError.recoveryActions.find(
        (a) => a.id === actionId,
      );
      if (!action) return false;

      try {
        setIsRecovering(true);
        await action.execute();

        // Clear error after successful action
        if (action.type === "auto" || action.type === "user-action") {
          clearError();
        }

        return true;
      } catch (error) {
        console.error(`Recovery action ${actionId} failed:`, error);
        return false;
      } finally {
        setIsRecovering(false);
      }
    },
    [currentError, clearError],
  );

  /**
   * Start automatic recovery
   */
  const startAutoRecovery = useCallback(async (): Promise<boolean> => {
    if (!currentError || !currentError.isRecoverable) return false;

    const autoActions = currentError.recoveryActions
      .filter((action) => action.type === "auto")
      .sort((a, b) => a.priority - b.priority);

    for (const action of autoActions) {
      const success = await executeRecoveryAction(action.id);
      if (success) return true;
    }

    return false;
  }, [currentError, executeRecoveryAction]);

  /**
   * Validate value and handle error if invalid
   */
  const validateAndHandle = useCallback(
    <T>(
      value: T,
      validator: (value: T) => boolean,
      errorMessage: string,
    ): boolean => {
      if (!validator(value)) {
        handleError(errorMessage, {
          errorType: "validation",
          errorCode: "VALIDATION_FAILED",
        });
        return false;
      }
      return true;
    },
    [handleError],
  );

  /**
   * Handle form validation errors
   */
  const handleFormValidation = useCallback(
    (errors: Record<string, string>) => {
      const errorCount = Object.keys(errors).length;
      if (errorCount === 0) return;

      const errorMessage = `Form validation failed: ${errorCount} error${errorCount > 1 ? "s" : ""} found`;
      const firstError = Object.values(errors)[0];

      handleError(errorMessage, {
        errorType: "validation",
        errorCode: "FORM_VALIDATION_FAILED",
        fieldId: Object.keys(errors)[0],
        userBehavior: {
          previousErrors: Object.keys(errors),
          timeOnStep: 0,
          attemptCount: retryCount + 1,
        },
      });
    },
    [handleError, retryCount],
  );

  /**
   * Create error context with defaults
   */
  const createErrorContext = useCallback(
    (overrides: Partial<ErrorContext> = {}): ErrorContext => {
      return {
        errorType: "unknown",
        errorCode: `ERR_${Date.now()}`,
        originalError: new Error("Unknown error"),
        stepId,
        stepNumber,
        userId,
        flowData,
        userBehavior: {
          previousErrors: [],
          timeOnStep: 0,
          attemptCount: retryCount + 1,
        },
        ...overrides,
      };
    },
    [stepId, stepNumber, userId, flowData, retryCount],
  );

  /**
   * Higher-order function to wrap functions with error handling
   */
  const withErrorHandling = useCallback(
    <T extends any[], R>(
      fn: (...args: T) => Promise<R>,
    ): ((...args: T) => Promise<R | null>) => {
      return async (...args: T): Promise<R | null> => {
        return handleAsyncOperation(() => fn(...args));
      };
    },
    [handleAsyncOperation],
  );

  /**
   * Determine if auto-recovery should be attempted
   */
  const shouldAttemptAutoRecovery = useCallback(
    (errorMessage: ErrorMessage): boolean => {
      // Don't auto-recover if user has already tried multiple times
      if (retryCount > 1) return false;

      // Don't auto-recover for certain error types
      const nonAutoRecoverableTypes = [
        "validation",
        "authentication",
        "permission",
      ];
      if (nonAutoRecoverableTypes.includes(errorMessage.category)) return false;

      // Only auto-recover if there are auto actions available
      return errorMessage.recoveryActions.some(
        (action) => action.type === "auto",
      );
    },
    [retryCount],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  return {
    // Error state
    currentError,
    isRecovering,
    hasError: currentError !== null,
    retryCount,

    // Error handling methods
    handleError,
    handleAsyncOperation,
    clearError,
    retry,

    // Recovery methods
    executeRecoveryAction,
    startAutoRecovery,

    // Validation helpers
    validateAndHandle,
    handleFormValidation,

    // Utility methods
    withErrorHandling,
    createErrorContext,
  };
}

/**
 * Hook for handling specific error types
 */
export function useSpecificErrorHandler(errorType: ErrorContext["errorType"]) {
  const baseHandler = useErrorHandler();

  const handleSpecificError = useCallback(
    (error: Error | string, contextOverrides: Partial<ErrorContext> = {}) => {
      return baseHandler.handleError(error, {
        ...contextOverrides,
        errorType,
      });
    },
    [baseHandler.handleError, errorType],
  );

  return {
    ...baseHandler,
    handleError: handleSpecificError,
  };
}

/**
 * Hook for handling network errors specifically
 */
export function useNetworkErrorHandler() {
  return useSpecificErrorHandler("network");
}

/**
 * Hook for handling validation errors specifically
 */
export function useValidationErrorHandler() {
  return useSpecificErrorHandler("validation");
}

/**
 * Hook for handling AI service errors specifically
 */
export function useAIErrorHandler() {
  return useSpecificErrorHandler("ai_service");
}

export default useErrorHandler;
