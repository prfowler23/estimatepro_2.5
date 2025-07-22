// Sentry server-side configuration
// This file configures Sentry for the server-side Node.js runtime

import * as Sentry from "@sentry/nextjs";

const SERVER_SENTRY_DSN =
  process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

// Only initialize if DSN is provided
if (SERVER_SENTRY_DSN) {
  Sentry.init({
    dsn: SERVER_SENTRY_DSN,
    environment: process.env.NODE_ENV,

    // Performance monitoring - lower sampling for server
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 1.0,

    // Server-specific configuration
    integrations: [Sentry.httpIntegration()],

    // Error filtering for server
    beforeSend(event, hint) {
      // Filter out development errors
      if (process.env.NODE_ENV === "development") {
        console.log("Sentry Server Event (Development):", event);
      }

      // Filter out specific server errors
      if (event.exception && hint.originalException) {
        const error = hint.originalException as Error;

        // Filter out expected Supabase connection issues
        if (error.message?.includes("connection terminated")) {
          return null;
        }

        // Filter out rate limiting errors (these are expected)
        if (error.message?.includes("Too many requests")) {
          return null;
        }

        // Filter out validation errors (client-side issues)
        if (error.message?.includes("validation failed")) {
          return null;
        }
      }

      return event;
    },

    // Server-specific tags
    initialScope: {
      tags: {
        component: "server",
        version: process.env.NEXT_PUBLIC_APP_VERSION || "development",
        runtime: "nodejs",
      },
    },

    // Debug mode for development
    debug: process.env.NODE_ENV === "development",

    // Add context information
    beforeSendTransaction(event) {
      event.tags = {
        ...event.tags,
        runtime: "server",
      };
      event.contexts = {
        ...event.contexts,
        serverInfo: {
          nodeVersion: process.version,
          platform: process.platform,
          memory:
            typeof process !== "undefined" && process.memoryUsage
              ? process.memoryUsage()
              : null,
        },
      };
      return event;
    },
  });
}
