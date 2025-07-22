// Sentry Edge Runtime configuration
// This file configures Sentry for Edge Runtime (middleware, edge API routes)

import * as Sentry from "@sentry/nextjs";

const EDGE_SENTRY_DSN =
  process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

// Only initialize if DSN is provided
if (EDGE_SENTRY_DSN) {
  Sentry.init({
    dsn: EDGE_SENTRY_DSN,
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
      if (event.exception && hint.originalException) {
        const error = hint.originalException as Error;

        // Filter out expected middleware errors
        if (error.message?.includes("middleware")) {
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
}
