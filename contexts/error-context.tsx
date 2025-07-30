"use client";

import React, {
  createContext,
  useContext,
  useCallback,
  useState,
  useEffect,
} from "react";
import * as Sentry from "@sentry/nextjs";
import { logger } from "@/lib/monitoring/sentry-logger";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";

interface ErrorInfo {
  id: string;
  message: string;
  severity: "low" | "medium" | "high" | "critical";
  timestamp: Date;
  component?: string;
  action?: string;
  metadata?: Record<string, any>;
}

interface ErrorContextValue {
  // Error tracking
  trackError: (error: Error, context?: Record<string, any>) => string;
  trackMessage: (
    message: string,
    level?: "info" | "warning" | "error",
  ) => string;

  // Performance tracking
  trackPerformance: (metric: string, value: number, unit?: string) => void;
  trackBusinessMetric: (
    metric: string,
    value: number,
    context?: Record<string, any>,
  ) => void;

  // User context
  setUserContext: (userId: string, userData?: Record<string, any>) => void;
  clearUserContext: () => void;

  // Session management
  startSession: (sessionId: string) => void;
  endSession: () => void;

  // Feature flags
  trackFeatureFlag: (flag: string, value: boolean) => void;

  // Recent errors
  recentErrors: ErrorInfo[];
  clearRecentErrors: () => void;

  // Error recovery
  canRecover: (error: Error) => boolean;
  suggestRecovery: (error: Error) => string[];
}

const ErrorContext = createContext<ErrorContextValue | null>(null);

export function ErrorProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const [recentErrors, setRecentErrors] = useState<ErrorInfo[]>([]);
  const [sessionId] = useState(
    `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  );

  // Initialize user context when user changes
  useEffect(() => {
    if (user) {
      logger.setUserContext(user.id, {
        email: user.email,
        role: user.user_metadata?.role,
        plan: user.user_metadata?.plan,
      });
    } else {
      logger.clearUserContext();
    }
  }, [user]);

  // Initialize session
  useEffect(() => {
    logger.startSession(sessionId, {
      startTime: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    });

    return () => {
      logger.endSession();
    };
  }, [sessionId]);

  // Track errors
  const trackError = useCallback(
    (error: Error, context?: Record<string, any>): string => {
      const eventId = Sentry.captureException(error, {
        tags: {
          component: context?.component,
          action: context?.action,
        },
        extra: context,
      });

      // Log using enhanced logger
      logger.error(error.message, error, context);

      // Add to recent errors
      const errorInfo: ErrorInfo = {
        id: eventId || crypto.randomUUID(),
        message: error.message,
        severity: determineSeverity(error),
        timestamp: new Date(),
        component: context?.component,
        action: context?.action,
        metadata: context,
      };

      setRecentErrors((prev) => [errorInfo, ...prev].slice(0, 10)); // Keep last 10

      return eventId || "";
    },
    [],
  );

  // Track messages
  const trackMessage = useCallback(
    (message: string, level: "info" | "warning" | "error" = "info"): string => {
      const eventId = Sentry.captureMessage(message, level);

      switch (level) {
        case "info":
          logger.info(message);
          break;
        case "warning":
          logger.warn(message);
          break;
        case "error":
          logger.error(message);
          break;
      }

      return eventId || "";
    },
    [],
  );

  // Track performance
  const trackPerformance = useCallback(
    (metric: string, value: number, unit: string = "ms") => {
      logger.trackPerformance({
        name: metric,
        value,
        unit: unit as any,
      });
    },
    [],
  );

  // Track business metrics
  const trackBusinessMetric = useCallback(
    (metric: string, value: number, context?: Record<string, any>) => {
      logger.trackBusinessMetric(metric, value, undefined, context);
    },
    [],
  );

  // User context management
  const setUserContext = useCallback(
    (userId: string, userData?: Record<string, any>) => {
      logger.setUserContext(userId, userData);
    },
    [],
  );

  const clearUserContext = useCallback(() => {
    logger.clearUserContext();
  }, []);

  // Session management
  const startSession = useCallback((sessionId: string) => {
    logger.startSession(sessionId);
  }, []);

  const endSession = useCallback(() => {
    logger.endSession();
  }, []);

  // Feature flag tracking
  const trackFeatureFlag = useCallback(
    (flag: string, value: boolean) => {
      logger.trackFeatureFlag(flag, value, user?.id);
    },
    [user],
  );

  // Clear recent errors
  const clearRecentErrors = useCallback(() => {
    setRecentErrors([]);
  }, []);

  // Error recovery suggestions
  const canRecover = useCallback((error: Error): boolean => {
    // Network errors are often recoverable
    if (error.message.includes("Network") || error.message.includes("fetch")) {
      return true;
    }

    // Chunk load errors (code splitting issues)
    if (
      error.message.includes("Loading chunk") ||
      error.message.includes("ChunkLoadError")
    ) {
      return true;
    }

    // Auth errors might be recoverable
    if (
      error.message.includes("Unauthorized") ||
      error.message.includes("401")
    ) {
      return true;
    }

    return false;
  }, []);

  const suggestRecovery = useCallback((error: Error): string[] => {
    const suggestions: string[] = [];

    // Network errors
    if (error.message.includes("Network") || error.message.includes("fetch")) {
      suggestions.push("Check your internet connection");
      suggestions.push("Try refreshing the page");
      suggestions.push("Wait a moment and try again");
    }

    // Chunk load errors
    if (
      error.message.includes("Loading chunk") ||
      error.message.includes("ChunkLoadError")
    ) {
      suggestions.push("Refresh the page to get the latest version");
      suggestions.push("Clear your browser cache");
    }

    // Auth errors
    if (
      error.message.includes("Unauthorized") ||
      error.message.includes("401")
    ) {
      suggestions.push("Sign in again");
      suggestions.push("Check if your session has expired");
    }

    // Rate limit errors
    if (error.message.includes("Rate limit") || error.message.includes("429")) {
      suggestions.push("Wait a few minutes before trying again");
      suggestions.push("Reduce the frequency of your requests");
    }

    // Generic suggestions
    if (suggestions.length === 0) {
      suggestions.push("Try refreshing the page");
      suggestions.push("Contact support if the problem persists");
    }

    return suggestions;
  }, []);

  const value: ErrorContextValue = {
    trackError,
    trackMessage,
    trackPerformance,
    trackBusinessMetric,
    setUserContext,
    clearUserContext,
    startSession,
    endSession,
    trackFeatureFlag,
    recentErrors,
    clearRecentErrors,
    canRecover,
    suggestRecovery,
  };

  return (
    <ErrorContext.Provider value={value}>{children}</ErrorContext.Provider>
  );
}

// Hook to use error context
export function useErrorTracking() {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error("useErrorTracking must be used within ErrorProvider");
  }
  return context;
}

// Helper to determine error severity
function determineSeverity(error: Error): ErrorInfo["severity"] {
  // Critical errors
  if (
    error.message.includes("CRITICAL") ||
    error.message.includes("FATAL") ||
    error.name === "SecurityError"
  ) {
    return "critical";
  }

  // High severity
  if (
    error.message.includes("Database") ||
    error.message.includes("Authentication") ||
    error.message.includes("Payment")
  ) {
    return "high";
  }

  // Medium severity
  if (
    error.message.includes("Network") ||
    error.message.includes("API") ||
    error.message.includes("Validation")
  ) {
    return "medium";
  }

  // Low severity
  return "low";
}

// Error boundary that uses the error context
export function ErrorBoundaryWithContext({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ErrorProvider>
      <ErrorBoundaryInner>{children}</ErrorBoundaryInner>
    </ErrorProvider>
  );
}

function ErrorBoundaryInner({ children }: { children: React.ReactNode }) {
  const { trackError } = useErrorTracking();

  React.useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      trackError(event.error || new Error(event.message), {
        component: "window",
        action: "error",
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      trackError(
        new Error(event.reason?.message || "Unhandled promise rejection"),
        {
          component: "window",
          action: "unhandledrejection",
          reason: event.reason,
        },
      );
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, [trackError]);

  return <>{children}</>;
}
