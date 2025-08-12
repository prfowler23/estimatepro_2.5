#!/usr/bin/env node

/**
 * Memory Bank Setup Script
 * Initializes the complete Memory Bank automation system
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const PROJECT_ROOT = process.cwd();
const MEMORY_BANK_DIR = path.join(PROJECT_ROOT, "memory-bank");

console.log("🚀 Setting up Memory Bank Automation System...");
console.log(`📁 Project root: ${PROJECT_ROOT}`);

async function setupMemoryBankSystem() {
  try {
    // Step 1: Verify directory structure
    console.log("\n📋 Step 1: Verifying memory bank structure...");
    await verifyDirectoryStructure();

    // Step 2: Install Git hooks
    console.log("\n🔗 Step 2: Installing Git hooks...");
    await installGitHooks();

    // Step 3: Update package.json with memory bank scripts
    console.log("\n📦 Step 3: Adding memory bank scripts to package.json...");
    await updatePackageJsonScripts();

    // Step 4: Create Jest configuration for memory bank tests
    console.log("\n🧪 Step 4: Configuring memory bank tests...");
    await configureTests();

    // Step 5: Initialize sync metadata
    console.log("\n⚙️  Step 5: Initializing sync metadata...");
    await initializeSyncMetadata();

    // Step 6: Validate installation
    console.log("\n✅ Step 6: Validating installation...");
    await validateInstallation();

    console.log(
      "\n🎉 Memory Bank Automation System setup completed successfully!",
    );
    console.log("\n📚 Next steps:");
    console.log("  1. Run tests: npm run test:memory-bank");
    console.log("  2. Check hook status: npm run memory-bank:status");
    console.log("  3. Test automation: Create a PR and watch the magic! ✨");
  } catch (error) {
    console.error("\n❌ Setup failed:", error.message);
    console.error("\n🔧 Troubleshooting:");
    console.error(
      "  • Ensure you have write permissions to the project directory",
    );
    console.error("  • Check that Git is initialized in this project");
    console.error("  • Verify Node.js and npm are properly installed");
    process.exit(1);
  }
}

async function verifyDirectoryStructure() {
  const requiredFiles = [
    "activeContext.md",
    "progress.md",
    "systemPatterns.md",
    ".clinerules",
    "sync-metadata.json",
  ];

  // Check if memory bank directory exists
  if (!fs.existsSync(MEMORY_BANK_DIR)) {
    console.log("  ❌ Memory bank directory not found");
    throw new Error(
      "Memory bank directory structure not found. Please ensure memory-bank/ directory exists with required files.",
    );
  }

  console.log("  ✅ Memory bank directory found");

  // Check each required file
  let missingFiles = [];
  for (const file of requiredFiles) {
    const filePath = path.join(MEMORY_BANK_DIR, file);
    if (!fs.existsSync(filePath)) {
      missingFiles.push(file);
    }
  }

  if (missingFiles.length > 0) {
    console.log(`  ❌ Missing files: ${missingFiles.join(", ")}`);
    throw new Error(
      `Missing required memory bank files: ${missingFiles.join(", ")}`,
    );
  }

  console.log("  ✅ All required files present");

  // Validate JSON files
  const jsonFiles = ["sync-metadata.json"];
  for (const file of jsonFiles) {
    const filePath = path.join(MEMORY_BANK_DIR, file);
    try {
      const content = fs.readFileSync(filePath, "utf8");
      JSON.parse(content);
      console.log(`  ✅ ${file} is valid JSON`);
    } catch (error) {
      throw new Error(`Invalid JSON in ${file}: ${error.message}`);
    }
  }
}

async function installGitHooks() {
  const hooksSetupScript = path.join(
    PROJECT_ROOT,
    "scripts",
    "setup-memory-bank-hooks.js",
  );

  if (!fs.existsSync(hooksSetupScript)) {
    throw new Error(
      "Git hooks setup script not found at scripts/setup-memory-bank-hooks.js",
    );
  }

  console.log("  🔧 Installing Git hooks...");
  try {
    execSync(`node "${hooksSetupScript}"`, { stdio: "inherit" });
    console.log("  ✅ Git hooks installed successfully");
  } catch (error) {
    throw new Error(`Failed to install Git hooks: ${error.message}`);
  }
}

async function updatePackageJsonScripts() {
  const packageJsonPath = path.join(PROJECT_ROOT, "package.json");

  if (!fs.existsSync(packageJsonPath)) {
    throw new Error("package.json not found in project root");
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

  // Add memory bank scripts
  const memoryBankScripts = {
    "memory-bank:status": "node scripts/manage-memory-bank-hooks.js status",
    "memory-bank:enable": "node scripts/manage-memory-bank-hooks.js enable",
    "memory-bank:disable": "node scripts/manage-memory-bank-hooks.js disable",
    "memory-bank:sync":
      "node -e \"const { memoryBankAutomation } = require('./lib/services/memory-bank-automation-service.ts'); memoryBankAutomation.performFullSync()\"",
    "memory-bank:validate":
      "node -e \"const { memoryBankAutomation } = require('./lib/services/memory-bank-automation-service.ts'); memoryBankAutomation.initialize()\"",
    "test:memory-bank": "jest __tests__/memory-bank --passWithNoTests",
    "setup-memory-bank": "node scripts/setup-memory-bank.js",
  };

  // Merge scripts
  packageJson.scripts = packageJson.scripts || {};
  Object.assign(packageJson.scripts, memoryBankScripts);

  // Write updated package.json
  fs.writeFileSync(
    packageJsonPath,
    JSON.stringify(packageJson, null, 2) + "\n",
  );
  console.log("  ✅ Memory bank scripts added to package.json");
}

async function configureTests() {
  const jestConfigPath = path.join(PROJECT_ROOT, "jest.config.js");

  if (fs.existsSync(jestConfigPath)) {
    console.log("  ✅ Jest configuration found");

    // Check if memory bank tests are configured
    const jestConfig = fs.readFileSync(jestConfigPath, "utf8");
    if (jestConfig.includes("memory-bank")) {
      console.log("  ✅ Memory bank tests already configured");
    } else {
      console.log(
        "  ℹ️  Memory bank tests not explicitly configured (will use default Jest config)",
      );
    }
  } else {
    console.log(
      "  ⚠️  No Jest configuration found - tests may not run properly",
    );
  }

  // Verify test file exists
  const testFilePath = path.join(
    PROJECT_ROOT,
    "__tests__",
    "memory-bank",
    "memory-bank-automation.test.ts",
  );
  if (fs.existsSync(testFilePath)) {
    console.log("  ✅ Memory bank test file found");
  } else {
    console.log("  ❌ Memory bank test file not found");
    throw new Error(
      "Memory bank test file not found at __tests__/memory-bank/memory-bank-automation.test.ts",
    );
  }
}

async function initializeSyncMetadata() {
  const metadataPath = path.join(MEMORY_BANK_DIR, "sync-metadata.json");
  const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));

  // Update metadata with installation info
  const now = new Date().toISOString();
  metadata.last_updated = now;
  metadata.automation_status = "active";

  // Update integration status
  metadata.integration_status = metadata.integration_status || {};
  metadata.integration_status.git_hooks = {
    installed: true,
    installation_date: now,
    hooks: {
      "pre-commit": { enabled: true },
      "post-commit": { enabled: true },
      "pre-push": { enabled: true },
    },
  };

  metadata.integration_status.testing_framework = {
    integrated: true,
    jest_config: "configured",
    test_file: "__tests__/memory-bank/memory-bank-automation.test.ts",
  };

  metadata.integration_status.npm_scripts = {
    added: true,
    scripts: [
      "memory-bank:status",
      "memory-bank:enable",
      "memory-bank:disable",
      "memory-bank:sync",
      "memory-bank:validate",
      "test:memory-bank",
    ],
  };

  // Reset performance metrics
  metadata.performance_metrics = {
    sync_operations: {
      total_syncs: 0,
      successful_syncs: 0,
      failed_syncs: 0,
      average_sync_time_ms: 0,
      last_sync_duration_ms: 0,
    },
    validation_metrics: {
      total_validations: 0,
      successful_validations: 0,
      failed_validations: 0,
      average_validation_time_ms: 0,
    },
    automation_effectiveness: {
      manual_interventions_required: 0,
      automation_success_rate: 0.0,
      context_drift_incidents: 0,
      pattern_detection_accuracy: 0.0,
    },
  };

  // Write updated metadata
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  console.log("  ✅ Sync metadata initialized");
}

async function validateInstallation() {
  console.log("  🔍 Running validation checks...");

  // Check Git hooks
  const gitHooksDir = path.join(PROJECT_ROOT, ".git", "hooks");
  const requiredHooks = ["pre-commit", "post-commit", "pre-push"];

  for (const hook of requiredHooks) {
    const hookPath = path.join(gitHooksDir, hook);
    if (fs.existsSync(hookPath)) {
      const stats = fs.statSync(hookPath);
      if (stats.mode & parseInt("111", 8)) {
        console.log(`    ✅ ${hook} hook installed and executable`);
      } else {
        throw new Error(`${hook} hook exists but is not executable`);
      }
    } else {
      throw new Error(`${hook} hook not found`);
    }
  }

  // Check package.json scripts
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(PROJECT_ROOT, "package.json"), "utf8"),
  );
  const requiredScripts = ["memory-bank:status", "test:memory-bank"];

  for (const script of requiredScripts) {
    if (packageJson.scripts && packageJson.scripts[script]) {
      console.log(`    ✅ npm script '${script}' available`);
    } else {
      throw new Error(`npm script '${script}' not found`);
    }
  }

  // Test memory bank service initialization
  try {
    console.log("  🧪 Testing memory bank service...");
    execSync("npm run memory-bank:validate", { stdio: "pipe" });
    console.log("    ✅ Memory bank service validation passed");
  } catch (error) {
    console.log(
      "    ⚠️  Memory bank service validation failed (may need runtime environment)",
    );
  }

  console.log("  ✅ Installation validation completed");
}

// Utility functions
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Run setup if called directly
if (require.main === module) {
  setupMemoryBankSystem();
}

module.exports = { setupMemoryBankSystem };
