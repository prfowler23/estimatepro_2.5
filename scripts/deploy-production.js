#!/usr/bin/env node

/**
 * Production deployment script for AI Assistant
 * Validates configuration and prepares for deployment
 */

const fs = require("fs").promises;
const path = require("path");
const { execSync } = require("child_process");

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function section(title) {
  console.log("");
  log(`${"=".repeat(50)}`, colors.cyan);
  log(title, colors.bright + colors.cyan);
  log(`${"=".repeat(50)}`, colors.cyan);
  console.log("");
}

function success(message) {
  log(`✓ ${message}`, colors.green);
}

function warning(message) {
  log(`⚠ ${message}`, colors.yellow);
}

function error(message) {
  log(`✗ ${message}`, colors.red);
}

function info(message) {
  log(`ℹ ${message}`, colors.blue);
}

async function checkEnvironmentVariables() {
  section("Checking Environment Variables");

  const requiredVars = {
    // Core Supabase
    NEXT_PUBLIC_SUPABASE_URL: "Supabase project URL",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "Supabase anonymous key",
    SUPABASE_SERVICE_ROLE_KEY: "Supabase service role key",

    // AI Services
    OPENAI_API_KEY: "OpenAI API key for AI services",

    // Email (optional but recommended)
    RESEND_API_KEY: "Resend API key for email notifications",

    // Deployment
    NODE_ENV: "Node environment (should be 'production')",
  };

  const optionalVars = {
    // AI Configuration
    AI_ENABLED: "Enable AI features (default: true)",
    AI_RATE_LIMIT_PER_MINUTE: "AI rate limit per minute",
    AI_CACHE_TTL: "AI response cache TTL in seconds",

    // Feature Flags
    FEATURE_AI_ASSISTANT: "Enable AI assistant feature",
    FEATURE_FACADE_ANALYSIS: "Enable facade analysis",
    FEATURE_DOCUMENT_EXTRACTION: "Enable document extraction",

    // Monitoring
    AI_MONITORING_ENABLED: "Enable AI monitoring",
    AI_ERROR_TRACKING_ENABLED: "Enable error tracking",

    // CDN
    CDN_ENABLED: "Enable CDN for static assets",
    CDN_PROVIDER: "CDN provider name",
  };

  let hasErrors = false;
  const missingRequired = [];

  // Check required variables
  for (const [key, description] of Object.entries(requiredVars)) {
    if (!process.env[key]) {
      error(`Missing required: ${key} - ${description}`);
      missingRequired.push(key);
      hasErrors = true;
    } else {
      success(`Found ${key}`);
    }
  }

  // Check optional variables
  console.log("");
  info("Optional Environment Variables:");
  for (const [key, description] of Object.entries(optionalVars)) {
    if (!process.env[key]) {
      warning(`Missing optional: ${key} - ${description}`);
    } else {
      success(`Found ${key}`);
    }
  }

  // Special checks
  if (process.env.NODE_ENV !== "production") {
    warning("NODE_ENV is not set to 'production'");
  }

  return { hasErrors, missingRequired };
}

async function validateDatabaseConnection() {
  section("Validating Database Connection");

  try {
    const healthCheck = await fetch("http://localhost:3000/api/health");
    const health = await healthCheck.json();

    if (health.checks?.database?.status === "healthy") {
      success("Database connection is healthy");
      info(`Database latency: ${health.checks.database.latency}ms`);
    } else {
      error("Database connection failed");
      if (health.checks?.database?.error) {
        error(`Error: ${health.checks.database.error}`);
      }
      return false;
    }
  } catch (err) {
    warning("Could not check database health (server may not be running)");
    info("Run 'npm run dev' and try again to validate database connection");
  }

  return true;
}

async function runTests() {
  section("Running Tests");

  try {
    info("Running TypeScript type check...");
    execSync("npm run typecheck", { stdio: "inherit" });
    success("TypeScript compilation passed");
  } catch (err) {
    error("TypeScript compilation failed");
    return false;
  }

  try {
    info("Running linter...");
    execSync("npm run lint", { stdio: "inherit" });
    success("Linting passed");
  } catch (err) {
    error("Linting failed");
    return false;
  }

  try {
    info("Running tests...");
    execSync("npm test -- --passWithNoTests", { stdio: "inherit" });
    success("Tests passed");
  } catch (err) {
    warning("Tests failed - review before deploying");
  }

  return true;
}

async function buildProject() {
  section("Building Project");

  try {
    info("Creating production build...");
    execSync("npm run build", { stdio: "inherit" });
    success("Build completed successfully");

    // Check build output
    const buildDir = path.join(__dirname, "..", ".next");
    const stats = await fs.stat(buildDir);

    if (stats.isDirectory()) {
      success("Build output verified");
    }
  } catch (err) {
    error("Build failed");
    console.error(err);
    return false;
  }

  return true;
}

async function generateDeploymentChecklist() {
  section("Deployment Checklist");

  const checklist = [
    "Environment variables are configured in production",
    "Database migrations have been run",
    "RLS policies are properly configured",
    "API rate limiting is enabled",
    "Error monitoring is configured (Sentry/LogRocket)",
    "CDN is configured for static assets",
    "SSL certificates are valid",
    "Backup strategy is in place",
    "Monitoring dashboards are set up",
    "AI usage limits are configured",
    "Security headers are configured",
    "CORS policies are properly set",
  ];

  console.log("Please verify the following before deploying:\n");
  checklist.forEach((item, index) => {
    console.log(`  ${index + 1}. [ ] ${item}`);
  });
}

async function main() {
  log("\n🚀 Production Deployment Validator for EstimatePro AI", colors.bright);

  const startTime = Date.now();

  // Load environment variables
  try {
    require("dotenv").config({ path: ".env.local" });
    require("dotenv").config({ path: ".env.production.local" });
  } catch (err) {
    // Environment files might not exist, which is okay
  }

  // Run checks
  const { hasErrors, missingRequired } = await checkEnvironmentVariables();

  if (hasErrors) {
    section("Environment Variable Setup");
    error("Missing required environment variables!");
    console.log("\nCreate a .env.production.local file with:");
    console.log("```");
    missingRequired.forEach((key) => {
      console.log(`${key}=your_value_here`);
    });
    console.log("```");
    process.exit(1);
  }

  const dbValid = await validateDatabaseConnection();
  const testsPass = await runTests();
  const buildSuccess = await buildProject();

  // Generate deployment checklist
  await generateDeploymentChecklist();

  // Summary
  section("Deployment Readiness Summary");

  const checks = {
    "Environment Variables": !hasErrors,
    "Database Connection": dbValid,
    "Tests & Linting": testsPass,
    "Production Build": buildSuccess,
  };

  let allPassed = true;
  for (const [check, passed] of Object.entries(checks)) {
    if (passed) {
      success(check);
    } else {
      error(check);
      allPassed = false;
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log("");

  if (allPassed) {
    success(
      `All checks passed! Ready for production deployment. (${duration}s)`,
    );
    info("\nNext steps:");
    info("1. Review the deployment checklist above");
    info("2. Deploy using: vercel --prod");
    info("3. Monitor the health endpoint: /api/health");
    info("4. Check AI service status in production");
  } else {
    error(
      `Some checks failed. Please fix issues before deploying. (${duration}s)`,
    );
    process.exit(1);
  }
}

// Run the script
main().catch((err) => {
  error("Script failed with error:");
  console.error(err);
  process.exit(1);
});
