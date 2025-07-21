// Sentry server-side configuration - TEMPORARILY DISABLED
// This file configures Sentry for the server-side Node.js runtime

// import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

// Temporarily disable Sentry to fix core application functionality
/*
Sentry.init({
  dsn: SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Performance monitoring - lower sampling for server
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 1.0,

  // Server-specific configuration
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Express({ app: undefined }),
    new Sentry.Integrations.Postgres(),
  ],

  // Error filtering for server
  beforeSend(event, hint) {
    // Filter out development errors
    if (process.env.NODE_ENV === "development") {
      console.log("Sentry Server Event (Development):", event);
    }

    // Filter out specific server errors
    if (event.exception) {
      const error = hint.originalException;

      // Filter out expected Supabase connection issues
      if (
        error &&
        error.message &&
        error.message.includes("connection terminated")
      ) {
        return null;
      }

      // Filter out rate limiting errors (these are expected)
      if (
        error &&
        error.message &&
        error.message.includes("Too many requests")
      ) {
        return null;
      }

      // Filter out validation errors (client-side issues)
      if (
        error &&
        error.message &&
        error.message.includes("validation failed")
      ) {
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
  beforeCapture(scope, hint) {
    scope.setTag("runtime", "server");
    scope.setContext("serverInfo", {
      nodeVersion: process.version,
      platform: process.platform,
      memory:
        typeof process !== "undefined" && process.memoryUsage
          ? process.memoryUsage()
          : null,
    });
  },
});
*/
