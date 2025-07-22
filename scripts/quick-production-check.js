#!/usr/bin/env node

/**
 * Quick Production Readiness Check
 * Focuses on environment and immediate deployment blockers
 */

const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

class QuickProductionChecker {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.passed = [];
    this.projectRoot = process.cwd();
  }

  log(message, type = "info") {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: "🔍",
      success: "✅",
      warning: "⚠️",
      error: "❌",
    }[type];

    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  checkEnvironmentVariables() {
    this.log("Checking essential environment variables...");

    const requiredVars = [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "OPENAI_API_KEY",
      "RESEND_API_KEY",
      "EMAIL_FROM",
    ];

    const newFeatureVars = [
      "NEXT_PUBLIC_ENABLE_AI_ASSISTANT",
      "NEXT_PUBLIC_ENABLE_VENDOR_MANAGEMENT",
      "NEXT_PUBLIC_ENABLE_PILOT_CERTIFICATION",
      "NEXT_PUBLIC_ENABLE_MONITORING",
      "NEXT_PUBLIC_ENABLE_COLLABORATION",
    ];

    requiredVars.forEach((envVar) => {
      if (process.env[envVar]) {
        this.passed.push(`✓ ${envVar} configured`);
      } else {
        this.errors.push(`Missing required: ${envVar}`);
      }
    });

    newFeatureVars.forEach((envVar) => {
      if (process.env[envVar]) {
        this.passed.push(`✓ ${envVar} enabled`);
      } else {
        this.warnings.push(`New feature not configured: ${envVar}`);
      }
    });

    // Check debug mode
    if (process.env.NEXT_PUBLIC_DEBUG === "true") {
      this.warnings.push("Debug mode enabled - should be false for production");
    } else {
      this.passed.push("✓ Debug mode properly disabled");
    }
  }

  checkCriticalFiles() {
    this.log("Checking critical files exist...");

    const criticalFiles = [
      { path: "package.json", desc: "Package configuration" },
      { path: "next.config.mjs", desc: "Next.js configuration" },
      { path: "tsconfig.json", desc: "TypeScript configuration" },
      { path: ".gitignore", desc: "Git ignore file" },
      { path: "sentry.client.config.ts", desc: "Sentry client config" },
      { path: "sentry.server.config.ts", desc: "Sentry server config" },
      { path: "middleware.ts", desc: "Next.js middleware" },
    ];

    const newFeatureFiles = [
      { path: "lib/features/feature-flags.ts", desc: "Feature flag system" },
      { path: "hooks/use-feature-flags.ts", desc: "Feature flag hooks" },
      { path: "lib/middleware/rate-limit.ts", desc: "Rate limiting" },
      {
        path: "components/ai/ai-assistant.tsx",
        desc: "AI Assistant component",
      },
      { path: "app/ai-assistant/page.tsx", desc: "AI Assistant page" },
      {
        path: "lib/services/vendor-service.ts",
        desc: "Vendor management service",
      },
      {
        path: "lib/services/pilot-service.ts",
        desc: "Pilot certification service",
      },
    ];

    [...criticalFiles, ...newFeatureFiles].forEach(
      ({ path: filePath, desc }) => {
        const fullPath = path.join(this.projectRoot, filePath);
        if (fs.existsSync(fullPath)) {
          this.passed.push(`✓ ${desc} exists`);
        } else {
          if (criticalFiles.some((f) => f.path === filePath)) {
            this.errors.push(`Missing critical file: ${filePath}`);
          } else {
            this.warnings.push(`Missing new feature file: ${filePath}`);
          }
        }
      },
    );
  }

  checkMigrationFiles() {
    this.log("Checking database migrations...");

    const migrationDir = path.join(this.projectRoot, "sql", "migrations");
    const newMigrations = [
      "21-add-vendor-system.sql",
      "22-add-pilot-system.sql",
      "14-add-collaboration-tables.sql",
    ];

    if (fs.existsSync(migrationDir)) {
      this.passed.push("✓ Migration directory exists");

      newMigrations.forEach((migration) => {
        const migrationPath = path.join(migrationDir, migration);
        if (fs.existsSync(migrationPath)) {
          this.passed.push(`✓ Migration ready: ${migration}`);
        } else {
          this.errors.push(`Missing migration: ${migration}`);
        }
      });
    } else {
      this.errors.push("Migration directory missing");
    }
  }

  checkSentryConfiguration() {
    this.log("Checking Sentry monitoring setup...");

    if (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN) {
      this.passed.push("✓ Sentry DSN configured");

      // Check if monitoring is enabled
      if (process.env.NEXT_PUBLIC_ENABLE_MONITORING === "true") {
        this.passed.push("✓ Monitoring feature flag enabled");
      } else {
        this.warnings.push("Monitoring feature flag not enabled");
      }
    } else {
      this.warnings.push(
        "Sentry DSN not configured - error monitoring disabled",
      );
    }
  }

  checkSecuritySettings() {
    this.log("Checking security configuration...");

    // Check feature flags for security features
    if (process.env.RATE_LIMIT_ENABLED !== "false") {
      this.passed.push("✓ Rate limiting enabled");
    } else {
      this.warnings.push("Rate limiting disabled");
    }

    // Check gitignore for sensitive files
    const gitignorePath = path.join(this.projectRoot, ".gitignore");
    if (fs.existsSync(gitignorePath)) {
      const gitignoreContent = fs.readFileSync(gitignorePath, "utf8");
      const requiredIgnores = [".env.local", ".env.production", "node_modules"];

      requiredIgnores.forEach((pattern) => {
        if (gitignoreContent.includes(pattern)) {
          this.passed.push(`✓ ${pattern} properly ignored`);
        } else {
          this.warnings.push(`${pattern} not in .gitignore`);
        }
      });
    }
  }

  checkNewFeatureDeployment() {
    this.log("Checking new feature deployment status...");

    const featureChecks = [
      {
        name: "AI Assistant",
        flag: "NEXT_PUBLIC_ENABLE_AI_ASSISTANT",
        file: "app/ai-assistant/page.tsx",
      },
      {
        name: "Vendor Management",
        flag: "NEXT_PUBLIC_ENABLE_VENDOR_MANAGEMENT",
        file: "lib/services/vendor-service.ts",
      },
      {
        name: "Pilot Certification",
        flag: "NEXT_PUBLIC_ENABLE_PILOT_CERTIFICATION",
        file: "lib/services/pilot-service.ts",
      },
      {
        name: "Feature Flag System",
        flag: null,
        file: "lib/features/feature-flags.ts",
      },
    ];

    featureChecks.forEach(({ name, flag, file }) => {
      const filePath = path.join(this.projectRoot, file);
      const fileExists = fs.existsSync(filePath);
      const flagEnabled = flag ? process.env[flag] === "true" : true;

      if (fileExists && (flagEnabled || !flag)) {
        this.passed.push(`✓ ${name} ready for deployment`);
      } else if (!fileExists) {
        this.errors.push(`${name} implementation missing: ${file}`);
      } else if (!flagEnabled) {
        this.warnings.push(`${name} disabled by feature flag`);
      }
    });
  }

  generateReport() {
    this.log("=".repeat(50));
    this.log("QUICK PRODUCTION READINESS REPORT", "info");
    this.log("=".repeat(50));

    this.log(`✅ Passed: ${this.passed.length}`, "success");
    this.log(`⚠️  Warnings: ${this.warnings.length}`, "warning");
    this.log(`❌ Errors: ${this.errors.length}`, "error");

    if (this.errors.length > 0) {
      this.log("\n🚨 CRITICAL ERRORS (Must fix before deployment):", "error");
      this.errors.forEach((error) => this.log(`  - ${error}`, "error"));
    }

    if (this.warnings.length > 0) {
      this.log("\n⚠️  WARNINGS (Should address):", "warning");
      this.warnings.forEach((warning) => this.log(`  - ${warning}`, "warning"));
    }

    this.log("\n📋 DEPLOYMENT READINESS:", "info");
    if (this.errors.length === 0) {
      this.log(
        "🎉 Ready for deployment! All critical checks passed.",
        "success",
      );
      this.log("\nNext steps:", "info");
      this.log(
        "1. Run database migrations: node scripts/deploy-migrations.js",
        "info",
      );
      this.log(
        "2. Configure environment: node scripts/configure-production-env.js",
        "info",
      );
      this.log("3. Deploy application to production", "info");
      this.log("4. Verify all features are working", "info");
    } else {
      this.log("🚨 NOT ready for deployment! Fix errors first.", "error");
    }

    if (this.warnings.length > 0) {
      this.log(
        `\n📝 Consider addressing ${this.warnings.length} warnings for optimal production setup.`,
        "warning",
      );
    }
  }

  async run() {
    try {
      this.log("Starting quick production readiness check...");
      this.log("=".repeat(50));

      this.checkEnvironmentVariables();
      this.checkCriticalFiles();
      this.checkMigrationFiles();
      this.checkSentryConfiguration();
      this.checkSecuritySettings();
      this.checkNewFeatureDeployment();

      this.generateReport();

      // Exit with appropriate code
      process.exit(this.errors.length > 0 ? 1 : 0);
    } catch (error) {
      this.log(`Check failed: ${error.message}`, "error");
      process.exit(1);
    }
  }
}

// Run the check
if (require.main === module) {
  const checker = new QuickProductionChecker();
  checker.run();
}

module.exports = QuickProductionChecker;
