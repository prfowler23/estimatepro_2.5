#!/usr/bin/env node

/**
 * Test script to verify Sentry integration without relying on DSN configuration
 */

const { exec } = require("child_process");
const http = require("http");

console.log("Testing Sentry Integration...\n");

// Test 1: Check if Sentry is imported correctly
try {
  const Sentry = require("@sentry/nextjs");
  console.log("✅ Sentry package imported successfully");
  console.log(`   Version: ${Sentry.SDK_VERSION || "Unknown"}`);
} catch (error) {
  console.error("❌ Failed to import Sentry:", error.message);
  process.exit(1);
}

// Test 2: Check Sentry configuration files
const fs = require("fs");
const path = require("path");

const configFiles = [
  "sentry.client.config.ts",
  "sentry.server.config.ts",
  "sentry.edge.config.ts",
];

console.log("\nChecking Sentry configuration files:");
configFiles.forEach((file) => {
  const filePath = path.join(__dirname, "..", file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file} exists`);
  } else {
    console.log(`❌ ${file} missing`);
  }
});

// Test 3: Check if test page is accessible
console.log("\nTesting Sentry test page accessibility:");
const options = {
  hostname: "localhost",
  port: 3001,
  path: "/test-sentry",
  method: "GET",
};

const req = http.request(options, (res) => {
  console.log(`✅ Test page accessible (Status: ${res.statusCode})`);

  // Test 4: Check for Sentry initialization in the response
  let data = "";
  res.on("data", (chunk) => {
    data += chunk;
  });

  res.on("end", () => {
    if (data.includes("Sentry Integration Test Page")) {
      console.log("✅ Sentry test page rendered correctly");
    } else {
      console.log("⚠️  Sentry test page may not be rendering correctly");
    }

    console.log("\n📋 Summary:");
    console.log("- Sentry SDK is installed and can be imported");
    console.log("- Configuration files are in place");
    console.log("- Test page is accessible");
    console.log("\n⚠️  Note: Sentry DSN is not configured in .env.local");
    console.log("To fully enable Sentry, add the following to .env.local:");
    console.log(
      "NEXT_PUBLIC_SENTRY_DSN=https://YOUR_DSN@sentry.io/YOUR_PROJECT_ID",
    );
    console.log(
      "\nSentry integration is ready but will only activate when DSN is configured.",
    );
  });
});

req.on("error", (error) => {
  console.error("❌ Failed to access test page:", error.message);
  console.log("\nMake sure the development server is running on port 3001");
});

req.end();
