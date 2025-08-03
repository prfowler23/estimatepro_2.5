#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

console.log("🔧 Fixing production warnings...\n");

// Read current .env.local
const envPath = path.join(__dirname, "..", ".env.local");
let envContent = fs.readFileSync(envPath, "utf8");

// 1. Disable debug mode for production
console.log("1. Disabling debug mode...");
envContent = envContent.replace(
  "NEXT_PUBLIC_DEBUG=true",
  "NEXT_PUBLIC_DEBUG=false",
);

// 2. Add missing feature flags
console.log("2. Adding missing feature flags...");
const newFeatureFlags = `
# Additional Feature Flags
NEXT_PUBLIC_ENABLE_AI_ASSISTANT=true
NEXT_PUBLIC_ENABLE_VENDOR_MANAGEMENT=true
NEXT_PUBLIC_ENABLE_PILOT_CERTIFICATION=true
NEXT_PUBLIC_ENABLE_MONITORING=true
NEXT_PUBLIC_ENABLE_COLLABORATION=true
`;

// Add after existing feature flags
envContent = envContent.replace(
  "NEXT_PUBLIC_ENABLE_FACADE_ANALYSIS=true",
  `NEXT_PUBLIC_ENABLE_FACADE_ANALYSIS=true${newFeatureFlags}`,
);

// 3. Add Sentry configuration (commented out for user to fill)
console.log("3. Adding Sentry configuration template...");
if (!envContent.includes("NEXT_PUBLIC_SENTRY_DSN=")) {
  envContent += `
# Sentry Error Monitoring (IMPORTANT: Configure for production)
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn-here
SENTRY_ORG=your-sentry-org
SENTRY_PROJECT=your-sentry-project
SENTRY_AUTH_TOKEN=your-sentry-auth-token
`;
}

// Write updated .env.local
fs.writeFileSync(envPath, envContent);

console.log("\n✅ Production warnings fixed!");
console.log("\n📋 Summary of changes:");
console.log("  - Debug mode disabled (NEXT_PUBLIC_DEBUG=false)");
console.log("  - Added missing feature flags");
console.log("  - Added Sentry configuration template");
console.log(
  "\n⚠️  Important: Configure Sentry DSN for production error monitoring",
);
console.log('\n🔍 Run "node scripts/quick-production-check.js" to verify');
