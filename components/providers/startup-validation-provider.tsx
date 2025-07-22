"use client";

import { useEffect, useState } from "react";
import { performClientStartupValidation } from "@/lib/config/startup-validation";

interface StartupValidationProviderProps {
  children: React.ReactNode;
}

export function StartupValidationProvider({
  children,
}: StartupValidationProviderProps) {
  const [isValidated, setIsValidated] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    const runValidation = async () => {
      try {
        // Add a small delay to allow Next.js to inject environment variables
        if (
          typeof window !== "undefined" &&
          process.env.NODE_ENV === "development"
        ) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        performClientStartupValidation();
        setIsValidated(true);
      } catch (error) {
        setValidationError(
          error instanceof Error ? error.message : "Unknown validation error",
        );

        // In development, show error but continue
        if (process.env.NODE_ENV === "development") {
          console.error(
            "Startup validation failed, continuing in development mode:",
            error,
          );
          setIsValidated(true);
        }
      }
    };

    runValidation();
  }, []);

  // In production, show error screen if validation fails
  if (validationError && process.env.NODE_ENV === "production") {
    return (
      <div className="min-h-screen bg-error-50 flex items-center justify-center p-4">
        <div className="bg-bg-elevated rounded-lg shadow-lg p-8 max-w-2xl w-full">
          <div className="text-center">
            <div className="text-error-600 text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-text-primary mb-4">
              Configuration Error
            </h1>
            <p className="text-text-secondary mb-6">
              The application could not start due to configuration issues:
            </p>
            <div className="bg-error-50 border border-error-200 rounded-md p-4 mb-6">
              <pre className="text-sm text-error-700 text-left whitespace-pre-wrap">
                {validationError}
              </pre>
            </div>
            <p className="text-sm text-text-muted">
              Please check your environment configuration and try again.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // In development, show warning but continue
  if (validationError && process.env.NODE_ENV === "development") {
    return (
      <>
        <div className="bg-warning-50 border-l-4 border-warning-400 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-warning-500"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-warning-700">
                <strong>Development Mode:</strong> Configuration issues detected
                but continuing anyway.
              </p>
            </div>
          </div>
        </div>
        {children}
      </>
    );
  }

  // Show loading state during validation
  if (!isValidated) {
    return (
      <div className="min-h-screen bg-bg-subtle flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            Initializing EstimatePro
          </h2>
          <p className="text-text-secondary">Validating configuration...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
