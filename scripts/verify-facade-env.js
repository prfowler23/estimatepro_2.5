#!/usr/bin/env node

/**
 * Verify facade analysis environment variables
 */

require("dotenv").config({ path: ".env.local" });

console.log("🔍 Verifying Facade Analysis Environment Variables\n");

const requiredVars = {
  // Core Supabase
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,

  // OpenAI
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,

  // Facade Analysis Specific
  FACADE_ANALYSIS_MODEL_VERSION: process.env.FACADE_ANALYSIS_MODEL_VERSION,
  AI_VISION_MODEL: process.env.AI_VISION_MODEL,
  MAX_IMAGE_SIZE_MB: process.env.MAX_IMAGE_SIZE_MB,
  CONFIDENCE_THRESHOLD: process.env.CONFIDENCE_THRESHOLD,
  NEXT_PUBLIC_ENABLE_FACADE_ANALYSIS:
    process.env.NEXT_PUBLIC_ENABLE_FACADE_ANALYSIS,
};

let allValid = true;

console.log("📋 Required Environment Variables:\n");

Object.entries(requiredVars).forEach(([key, value]) => {
  if (!value) {
    console.log(`❌ ${key}: NOT SET`);
    allValid = false;
  } else {
    // Mask sensitive values
    let displayValue = value;
    if (key.includes("KEY") || key.includes("SECRET")) {
      displayValue =
        value.substring(0, 10) + "..." + value.substring(value.length - 4);
    } else if (key.includes("SUPABASE_URL")) {
      displayValue = value;
    } else if (value.length > 50) {
      displayValue = value.substring(0, 20) + "...";
    }
    console.log(`✅ ${key}: ${displayValue}`);
  }
});

console.log("\n📊 Configuration Summary:\n");
console.log(
  `Model Version: ${process.env.FACADE_ANALYSIS_MODEL_VERSION || "Not set"}`,
);
console.log(`AI Vision Model: ${process.env.AI_VISION_MODEL || "Not set"}`);
console.log(`Max Image Size: ${process.env.MAX_IMAGE_SIZE_MB || "Not set"} MB`);
console.log(
  `Confidence Threshold: ${process.env.CONFIDENCE_THRESHOLD || "Not set"}%`,
);
console.log(
  `Feature Enabled: ${process.env.NEXT_PUBLIC_ENABLE_FACADE_ANALYSIS === "true" ? "Yes" : "No"}`,
);

if (allValid) {
  console.log("\n✅ All required environment variables are set!");
} else {
  console.log("\n❌ Some environment variables are missing!");
  console.log("\n💡 Add missing variables to your .env.local file");
  console.log("📄 See .env.example for reference");
  process.exit(1);
}

// Test OpenAI API key validity
if (
  process.env.OPENAI_API_KEY &&
  process.env.OPENAI_API_KEY.startsWith("sk-")
) {
  console.log("\n🔑 OpenAI API Key format looks valid");
} else {
  console.log(
    "\n⚠️  OpenAI API Key format may be invalid (should start with 'sk-')",
  );
}

console.log("\n✨ Environment verification complete!");
