#!/usr/bin/env node

/**
 * Development Tools Script
 * Provides automated development workflow commands
 */

const { execSync, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const COMMANDS = {
  "quality-check": {
    description: "Run full quality check (format, lint, typecheck)",
    command: "npm run fmt && npm run lint && npm run typecheck",
  },
  "fresh-start": {
    description: "Clean install and setup",
    command: "rm -rf node_modules package-lock.json && npm install",
  },
  "test-coverage": {
    description: "Run tests with coverage report",
    command: "npm test -- --coverage --watchAll=false",
  },
  "build-check": {
    description: "Verify production build works",
    command: "npm run build && npm run start &",
  },
  "security-audit": {
    description: "Run security audit and check for vulnerabilities",
    command: "npm audit && npm audit --audit-level high",
  },
  "db-reset": {
    description: "Reset database and run migrations",
    command:
      "node scripts/setup-basic-schema.js && node scripts/create-sample-data.js",
  },
  "analyze-bundle": {
    description: "Analyze bundle size and dependencies",
    command: "ANALYZE=true npm run build",
  },
  "validate-env": {
    description: "Validate environment variables",
    action: validateEnvironment,
  },
  "pre-commit": {
    description: "Run pre-commit checks",
    command:
      "npm run fmt && npm run lint && npm run typecheck && npm test -- --passWithNoTests",
  },
};

function showHelp() {
  console.log("🛠️  EstimatePro Development Tools\\n");
  console.log("Usage: node scripts/dev-tools.js <command>\\n");
  console.log("Available commands:");

  Object.entries(COMMANDS).forEach(([cmd, { description }]) => {
    console.log(`  ${cmd.padEnd(20)} - ${description}`);
  });

  console.log("\\nExample: node scripts/dev-tools.js quality-check");
}

function validateEnvironment() {
  console.log("🔍 Validating environment configuration...");

  const requiredEnvVars = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "OPENAI_API_KEY",
  ];

  const optionalEnvVars = [
    "RESEND_API_KEY",
    "ACCUWEATHER_API_KEY",
    "SENTRY_DSN",
  ];

  let hasErrors = false;

  console.log("\\n📋 Required Environment Variables:");
  requiredEnvVars.forEach((envVar) => {
    if (process.env[envVar]) {
      console.log(`  ✅ ${envVar}: Set`);
    } else {
      console.log(`  ❌ ${envVar}: Missing`);
      hasErrors = true;
    }
  });

  console.log("\\n📋 Optional Environment Variables:");
  optionalEnvVars.forEach((envVar) => {
    if (process.env[envVar]) {
      console.log(`  ✅ ${envVar}: Set`);
    } else {
      console.log(`  ⚠️  ${envVar}: Not set (optional)`);
    }
  });

  if (hasErrors) {
    console.log(
      "\\n❌ Environment validation failed. Check your .env.local file.",
    );
    process.exit(1);
  } else {
    console.log("\\n✅ Environment validation passed!");
  }
}

function runCommand(command) {
  console.log(`🚀 Running: ${command}\\n`);

  try {
    execSync(command, {
      stdio: "inherit",
      cwd: process.cwd(),
      env: { ...process.env },
    });
    console.log("\\n✅ Command completed successfully!");
  } catch (error) {
    console.error("\\n❌ Command failed with exit code:", error.status);
    process.exit(error.status || 1);
  }
}

function main() {
  const command = process.argv[2];

  if (!command || command === "help" || command === "--help") {
    showHelp();
    return;
  }

  if (!COMMANDS[command]) {
    console.error(`❌ Unknown command: ${command}`);
    console.log(
      '\\nRun "node scripts/dev-tools.js help" to see available commands.',
    );
    process.exit(1);
  }

  const { command: cmd, action, description } = COMMANDS[command];

  console.log(`📝 ${description}\\n`);

  if (action) {
    action();
  } else {
    runCommand(cmd);
  }
}

if (require.main === module) {
  main();
}

module.exports = { COMMANDS, validateEnvironment };
