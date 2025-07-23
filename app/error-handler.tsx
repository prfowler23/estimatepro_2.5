"use client";

import { useEffect } from "react";

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
        console.log("Detected chunk loading error, attempting page reload...");

        // Prevent the default error handling
        event.preventDefault();

        // Show a user-friendly message and reload after a delay
        const shouldReload = confirm(
          "A component failed to load. Would you like to refresh the page to try again?",
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

        // Try to recover silently first
        setTimeout(() => {
          try {
            // Force a re-render by triggering a state change
            window.dispatchEvent(new Event("resize"));
          } catch (recoveryError) {
            // If recovery fails, try a page reload as last resort
            setTimeout(() => {
              window.location.reload();
            }, 1000);
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
