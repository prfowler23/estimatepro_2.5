"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import {
  ExtendedError,
  ErrorNotificationConfig,
  DEFAULT_ERROR_NOTIFICATION_CONFIG,
} from "./types";

// Error context for global error handling
interface ErrorContextType {
  errors: ExtendedError[];
  addError: (error: ExtendedError) => void;
  removeError: (errorId: string) => void;
  clearErrors: () => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

export function ErrorProvider({ children }: { children: ReactNode }) {
  const [errors, setErrors] = useState<ExtendedError[]>([]);

  const addError = (error: ExtendedError) => {
    const errorWithId = {
      ...error,
      id: error.timestamp || Date.now().toString(),
    } as ExtendedError & { id: string };
    setErrors((prev) => [...prev, errorWithId]);
  };

  const removeError = (errorId: string) => {
    setErrors((prev) => prev.filter((error) => (error as any).id !== errorId));
  };

  const clearErrors = () => {
    setErrors([]);
  };

  return (
    <ErrorContext.Provider
      value={{ errors, addError, removeError, clearErrors }}
    >
      {children}
    </ErrorContext.Provider>
  );
}

export function useErrorContext() {
  const context = useContext(ErrorContext);
  if (context === undefined) {
    throw new Error("useErrorContext must be used within an ErrorProvider");
  }
  return context;
}

// Error notification hook
export function useErrorNotification(
  config: Partial<ErrorNotificationConfig> = {},
) {
  const [notifications, setNotifications] = useState<ExtendedError[]>([]);
  const finalConfig = { ...DEFAULT_ERROR_NOTIFICATION_CONFIG, ...config };

  const showError = (error: ExtendedError) => {
    if (!finalConfig.enabled) return;

    setNotifications((prev) => {
      const newNotifications = [...prev, error];
      return newNotifications.slice(-finalConfig.maxNotifications);
    });

    if (finalConfig.duration > 0) {
      setTimeout(() => {
        dismissError(error);
      }, finalConfig.duration);
    }
  };

  const dismissError = (error: ExtendedError) => {
    setNotifications((prev) => prev.filter((n) => n !== error));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return {
    notifications,
    showError,
    dismissError,
    clearAll,
    config: finalConfig,
  };
}
