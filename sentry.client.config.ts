// Sentry client-side configuration - TEMPORARILY DISABLED
// This file configures Sentry for the browser/client-side JavaScript bundle

// import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

// Temporarily disable Sentry to fix core application functionality
// TODO: Fix Sentry imports and re-enable
/*
Sentry.init({
  dsn: SENTRY_DSN,
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
    if (event.exception) {
      const error = hint.originalException;

      // Filter out network errors
      if (error && error.message && error.message.includes("Network Error")) {
        return null;
      }

      // Filter out cancelled requests
      if (error && error.message && error.message.includes("AbortError")) {
        return null;
      }

      // Filter out ResizeObserver errors (common browser issue)
      if (error && error.message && error.message.includes("ResizeObserver")) {
        return null;
      }
    }

    return event;
  },

  // Additional configuration
  integrations: [
    new Sentry.Replay({
      // Capture 10% of all sessions,
      // plus always capture sessions with an error
      sessionSampleRate: 0.1,
      errorSampleRate: 1.0,

      // Mask sensitive data
      maskAllText: true,
      maskAllInputs: true,
      blockAllMedia: true,
    }),
    new Sentry.BrowserTracing({
      // Performance monitoring for specific routes
      routingInstrumentation: Sentry.nextRouterInstrumentation,

      // Track component updates
      tracePropagationTargets: [
        "localhost",
        /^https:\/\/estimatepro\./,
        /^https:\/\/.*\.vercel\.app$/,
      ],
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
  beforeCapture(scope, hint) {
    // Add context information
    scope.setTag("errorBoundary", "react");
    scope.setContext("buildInfo", {
      version: process.env.NEXT_PUBLIC_APP_VERSION,
      buildTime: process.env.NEXT_PUBLIC_BUILD_TIME,
      environment: process.env.NODE_ENV,
    });
  },
});
*/
