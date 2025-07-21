// Sentry Edge Runtime configuration - TEMPORARILY DISABLED
// This file configures Sentry for Edge Runtime (middleware, edge API routes)

// import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

// Temporarily disable Sentry to fix core application functionality
/*
Sentry.init({
  dsn: SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Lower sampling for edge runtime due to performance constraints
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.01 : 0.1,

  // Minimal integrations for edge runtime
  integrations: [],

  // Error filtering for edge runtime
  beforeSend(event, hint) {
    // Filter out development errors
    if (process.env.NODE_ENV === "development") {
      console.log("Sentry Edge Event (Development):", event);
    }

    // Filter middleware-specific errors
    if (event.exception) {
      const error = hint.originalException;

      // Filter out expected middleware errors
      if (error && error.message && error.message.includes("middleware")) {
        return null;
      }
    }

    return event;
  },

  // Edge-specific tags
  initialScope: {
    tags: {
      component: "edge",
      version: process.env.NEXT_PUBLIC_APP_VERSION || "development",
      runtime: "edge",
    },
  },

  // No debug mode for edge runtime
  debug: false,
});
*/
