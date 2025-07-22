// Sentry client-side configuration
// This file configures Sentry for the browser/client-side JavaScript bundle

import * as Sentry from "@sentry/nextjs";

const CLIENT_SENTRY_DSN =
  process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

// Only initialize if DSN is provided
if (CLIENT_SENTRY_DSN) {
  Sentry.init({
    dsn: CLIENT_SENTRY_DSN,
    environment: process.env.NODE_ENV,

    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Session replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Error filtering
    beforeSend(event, hint) {
      // Filter out development errors
      if (process.env.NODE_ENV === "development") {
        console.log("Sentry Event (Development):", event);
      }

      // Filter out specific errors
      if (event.exception && hint.originalException) {
        const error = hint.originalException as Error;

        // Filter out network errors
        if (error.message?.includes("Network Error")) {
          return null;
        }

        // Filter out cancelled requests
        if (error.message?.includes("AbortError")) {
          return null;
        }

        // Filter out ResizeObserver errors (common browser issue)
        if (error.message?.includes("ResizeObserver")) {
          return null;
        }
      }

      return event;
    },

    // Additional configuration
    integrations: [
      Sentry.replayIntegration({
        // Capture 10% of all sessions,
        // plus always capture sessions with an error
        errorSampleRate: 1.0,

        // Mask sensitive data
        maskAllText: true,
        maskAllInputs: true,
        blockAllMedia: true,
      }),
    ],

    // Tag all events with user information
    initialScope: {
      tags: {
        component: "client",
        version: process.env.NEXT_PUBLIC_APP_VERSION || "development",
      },
    },

    // Debug mode for development
    debug: process.env.NODE_ENV === "development",

    // Custom error boundaries
    beforeSendTransaction(event) {
      // Add context information
      event.tags = {
        ...event.tags,
        errorBoundary: "react",
      };
      event.contexts = {
        ...event.contexts,
        buildInfo: {
          version: process.env.NEXT_PUBLIC_APP_VERSION,
          buildTime: process.env.NEXT_PUBLIC_BUILD_TIME,
          environment: process.env.NODE_ENV,
        },
      };
      return event;
    },
  });
}
