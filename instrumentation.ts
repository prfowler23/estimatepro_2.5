// Next.js Instrumentation File
// This file is used to initialize monitoring and observability tools
// Required for Next.js 14+ instrumentation hook

import { registerInstrumentations } from "@opentelemetry/instrumentation";

export async function register() {
  // Initialize monitoring and observability tools here
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Server-side instrumentation
    console.log("🔧 Server instrumentation initialized");

    // Initialize Sentry for server-side instrumentation
    if (process.env.SENTRY_DSN) {
      await import("./sentry.server.config");
    }
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    // Edge runtime instrumentation
    console.log("🔧 Edge runtime instrumentation initialized");

    // Initialize Sentry for edge runtime
    if (process.env.SENTRY_DSN) {
      await import("./sentry.edge.config");
    }
  }

  // Register OpenTelemetry instrumentations
  registerInstrumentations({
    instrumentations: [
      // Add OpenTelemetry instrumentations here when needed
    ],
  });
}
