"use client";

import React, { createContext, useContext, useEffect, ReactNode } from "react";
import { ErrorBoundary } from "./error-boundary";
import { errorHandler } from "@/lib/error/error-handler";
import { EstimateProError } from "@/lib/error/error-types";

interface GlobalErrorContextType {
  reportError: (
    error: Error | unknown,
    context?: any,
  ) => Promise<EstimateProError>;
  errorCount: number;
  clearErrors: () => void;
}

const GlobalErrorContext = createContext<GlobalErrorContextType | null>(null);

interface GlobalErrorProviderProps {
  children: ReactNode;
  userId?: string;
}

export function GlobalErrorProvider({
  children,
  userId,
}: GlobalErrorProviderProps) {
  useEffect(() => {
    // Set up user context for error reporting
    if (userId) {
      // Store user ID for error context
      (window as any).__estimatePro_userId = userId;
    }

    // Initialize global error handling
    const initializeErrorHandling = async () => {
      // Pre-load error handler to set up global listeners
      await Promise.resolve(errorHandler);
    };

    initializeErrorHandling();
  }, [userId]);

  const reportError = async (
    error: Error | unknown,
    context?: any,
  ): Promise<EstimateProError> => {
    const enhancedContext = {
      ...context,
      userId: userId || (window as any).__estimatePro_userId,
    };

    return await errorHandler.handleError(error, enhancedContext);
  };

  const clearErrors = () => {
    errorHandler.clearErrorCounts();
  };

  const contextValue: GlobalErrorContextType = {
    reportError,
    errorCount: errorHandler.getErrorCount(),
    clearErrors,
  };

  return (
    <GlobalErrorContext.Provider value={contextValue}>
      <ErrorBoundary
        level="page"
        showDetails={process.env.NODE_ENV === "development"}
        maxRetries={3}
        onError={(error, errorInfo) => {
          // Additional global error handling if needed
          console.log("Global error boundary triggered:", { error, errorInfo });
        }}
      >
        {children}
      </ErrorBoundary>
    </GlobalErrorContext.Provider>
  );
}

export function useGlobalError() {
  const context = useContext(GlobalErrorContext);
  if (!context) {
    throw new Error("useGlobalError must be used within a GlobalErrorProvider");
  }
  return context;
}

// Provider for specific sections/components that need different error handling
interface SectionErrorProviderProps {
  children: ReactNode;
  sectionName: string;
  level?: "component" | "section";
  maxRetries?: number;
}

export function SectionErrorProvider({
  children,
  sectionName,
  level = "section",
  maxRetries = 2,
}: SectionErrorProviderProps) {
  return (
    <ErrorBoundary
      level={level}
      showDetails={process.env.NODE_ENV === "development"}
      maxRetries={maxRetries}
      onError={(error, errorInfo) => {
        // Section-specific error handling
        errorHandler.handleError(error, {
          component: sectionName,
          action: "section_error",
          metadata: errorInfo,
        });
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

// HOC for adding error boundaries to specific components
export function withSectionErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  sectionName: string,
  options?: {
    level?: "component" | "section";
    maxRetries?: number;
  },
) {
  const WrappedComponent = (props: P) => (
    <SectionErrorProvider
      sectionName={sectionName}
      level={options?.level}
      maxRetries={options?.maxRetries}
    >
      <Component {...props} />
    </SectionErrorProvider>
  );

  WrappedComponent.displayName = `withSectionErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}
