"use client";

import { useEffect } from "react";

const RELOAD_ATTEMPTS_KEY = "error-handler-reload-attempts";
const MAX_RELOAD_ATTEMPTS = 3;
const RELOAD_ATTEMPTS_RESET_TIME = 30000; // Reset after 30 seconds

export function ClientErrorHandler() {
  useEffect(() => {
    // Handle unhandled promise rejections (often from failed chunk loading)
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled promise rejection:", event.reason);

      // Check if this is a chunk loading error
      if (
        event.reason?.message?.includes("Loading chunk") ||
        event.reason?.message?.includes(
          "Cannot read properties of undefined",
        ) ||
        event.reason?.stack?.includes("webpack") ||
        event.reason?.stack?.includes("requireModule")
      ) {
        console.log(
          "Detected chunk loading error, checking reload attempts...",
        );

        // Prevent the default error handling
        event.preventDefault();

        // Get current reload attempts
        const storedAttempts = sessionStorage.getItem(RELOAD_ATTEMPTS_KEY);
        const attempts = storedAttempts
          ? JSON.parse(storedAttempts)
          : { count: 0, lastAttempt: 0 };

        const now = Date.now();
        const timeSinceLastAttempt = now - attempts.lastAttempt;

        // Reset counter if enough time has passed
        if (timeSinceLastAttempt > RELOAD_ATTEMPTS_RESET_TIME) {
          attempts.count = 0;
        }

        // Check if we've exceeded max attempts
        if (attempts.count >= MAX_RELOAD_ATTEMPTS) {
          console.error(
            `Maximum reload attempts (${MAX_RELOAD_ATTEMPTS}) reached. Stopping automatic reloads.`,
          );
          // Don't show confirm dialog, just log the error
          return;
        }

        // Update attempts
        attempts.count++;
        attempts.lastAttempt = now;
        sessionStorage.setItem(RELOAD_ATTEMPTS_KEY, JSON.stringify(attempts));

        // Show a user-friendly message and reload after a delay
        const shouldReload = confirm(
          `A component failed to load. Would you like to refresh the page to try again? (Attempt ${attempts.count}/${MAX_RELOAD_ATTEMPTS})`,
        );

        if (shouldReload) {
          window.location.reload();
        }
      }
    };

    // Handle regular JavaScript errors
    const handleError = (event: ErrorEvent) => {
      // Use try-catch to prevent recursive errors from console.error
      try {
        console.error("JavaScript error:", event.error);
      } catch (logError) {
        // Silently ignore console errors to prevent recursion
      }

      // Check if this is a webpack/module loading error or React component error
      if (
        event.error?.message?.includes("Cannot read properties of undefined") ||
        event.error?.stack?.includes("webpack") ||
        event.error?.stack?.includes("requireModule") ||
        event.error?.stack?.includes("react") ||
        event.error?.stack?.includes("radix-ui") ||
        event.filename?.includes("webpack")
      ) {
        try {
          console.log("Detected webpack/React error, attempting recovery...");
        } catch (logError) {
          // Silently ignore console errors
        }

        // Check reload attempts before attempting recovery
        const storedAttempts = sessionStorage.getItem(RELOAD_ATTEMPTS_KEY);
        const attempts = storedAttempts
          ? JSON.parse(storedAttempts)
          : { count: 0, lastAttempt: 0 };

        if (attempts.count >= MAX_RELOAD_ATTEMPTS) {
          console.error(
            "Maximum reload attempts reached. Skipping recovery to prevent infinite loops.",
          );
          return;
        }

        // Try to recover silently first
        setTimeout(() => {
          try {
            // Force a re-render by triggering a state change
            window.dispatchEvent(new Event("resize"));
          } catch (recoveryError) {
            // If recovery fails and we haven't exceeded attempts, try a page reload as last resort
            const currentAttempts = sessionStorage.getItem(RELOAD_ATTEMPTS_KEY);
            const attemptsNow = currentAttempts
              ? JSON.parse(currentAttempts)
              : { count: 0, lastAttempt: 0 };

            if (attemptsNow.count < MAX_RELOAD_ATTEMPTS) {
              setTimeout(() => {
                // Update attempts before reloading
                attemptsNow.count++;
                attemptsNow.lastAttempt = Date.now();
                sessionStorage.setItem(
                  RELOAD_ATTEMPTS_KEY,
                  JSON.stringify(attemptsNow),
                );
                window.location.reload();
              }, 1000);
            }
          }
        }, 100);
      }
    };

    // Add event listeners
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleError);

    // Cleanup
    return () => {
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection,
      );
      window.removeEventListener("error", handleError);
    };
  }, []);

  return null; // This component doesn't render anything
}

export default ClientErrorHandler;
