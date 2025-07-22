#!/usr/bin/env node

/**
 * Production-Safe Database Migration Deployment Script
 * Deploys EstimatePro database migrations with comprehensive safety checks
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

class MigrationDeployer {
  constructor() {
    this.migrationDir = path.join(__dirname, "..", "sql", "migrations");
    this.backupDir = path.join(__dirname, "..", "backups");
    this.deploymentLog = [];
    this.errors = [];

    // Ensure backup directory exists
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  log(message, type = "info") {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: "🔍",
      success: "✅",
      warning: "⚠️",
      error: "❌",
      backup: "💾",
      migrate: "🚀",
    }[type];

    const logMessage = `${prefix} [${timestamp}] ${message}`;
    console.log(logMessage);
    this.deploymentLog.push(logMessage);
  }

  validateEnvironment() {
    this.log("Validating environment configuration...");

    const requiredVars = [
      "NEXT_PUBLIC_SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
    ];

    for (const envVar of requiredVars) {
      if (!process.env[envVar]) {
        this.errors.push(`Missing required environment variable: ${envVar}`);
      }
    }

    if (this.errors.length > 0) {
      this.log("Environment validation failed", "error");
      return false;
    }

    this.log("Environment validation passed", "success");
    return true;
  }

  async createDatabaseBackup() {
    this.log("Creating database backup before migration...", "backup");

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFile = path.join(this.backupDir, `backup-${timestamp}.sql`);

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const projectRef = supabaseUrl.split("//")[1].split(".")[0];

      // Create a backup using Supabase CLI if available, otherwise warn user
      try {
        execSync(
          `supabase db dump --project-id ${projectRef} > ${backupFile}`,
          {
            stdio: "pipe",
            encoding: "utf8",
          },
        );
        this.log(`Database backup created: ${backupFile}`, "success");
        return backupFile;
      } catch (cliError) {
        this.log(
          "Supabase CLI not available - please create manual backup",
          "warning",
        );
        this.log("Manual backup command:", "info");
        this.log(
          `pg_dump -h <host> -U <user> -d <database> > ${backupFile}`,
          "info",
        );

        // Ask user to confirm they have a backup
        const readline = require("readline").createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        return new Promise((resolve) => {
          readline.question(
            "Have you created a database backup? (y/N): ",
            (answer) => {
              readline.close();
              if (answer.toLowerCase() !== "y") {
                this.errors.push("Database backup required before migration");
                resolve(null);
              } else {
                this.log("User confirmed manual backup created", "success");
                resolve("manual-backup-confirmed");
              }
            },
          );
        });
      }
    } catch (error) {
      this.errors.push(`Backup creation failed: ${error.message}`);
      return null;
    }
  }

  getMigrationFiles() {
    this.log("Scanning for migration files...");

    // Priority order for deployment
    const migrationFiles = [
      "14-add-collaboration-tables.sql",
      "21-add-vendor-system.sql",
      "22-add-pilot-system.sql",
      "migration_transaction_support.sql",
      "migration_auto_save_system.sql",
    ];

    const availableFiles = [];

    for (const file of migrationFiles) {
      const filePath = path.join(this.migrationDir, file);
      if (fs.existsSync(filePath)) {
        availableFiles.push({
          name: file,
          path: filePath,
          priority: migrationFiles.indexOf(file),
        });
        this.log(`Found migration: ${file}`, "success");
      } else {
        this.log(`Migration not found: ${file}`, "warning");
      }
    }

    // Sort by priority
    availableFiles.sort((a, b) => a.priority - b.priority);

    this.log(`Ready to deploy ${availableFiles.length} migrations`, "info");
    return availableFiles;
  }

  async checkExistingTables() {
    this.log("Checking existing database schema...");

    try {
      const checkScript = path.join(__dirname, "check-database-schema.js");

      if (fs.existsSync(checkScript)) {
        const output = execSync(`node ${checkScript}`, {
          encoding: "utf8",
          stdio: "pipe",
        });
        this.log("Database schema check completed", "success");
        return output;
      } else {
        this.log("Database schema check script not found", "warning");
        return null;
      }
    } catch (error) {
      this.log(`Schema check failed: ${error.message}`, "warning");
      return null;
    }
  }

  async deployMigration(migration) {
    this.log(`Deploying migration: ${migration.name}...`, "migrate");

    try {
      // Read migration file
      const migrationSQL = fs.readFileSync(migration.path, "utf8");

      // Check for dangerous operations
      const dangerousPatterns = [
        /DROP\s+TABLE/i,
        /TRUNCATE\s+TABLE/i,
        /DELETE\s+FROM.*WHERE/i,
      ];

      for (const pattern of dangerousPatterns) {
        if (pattern.test(migrationSQL)) {
          this.log(
            `⚠️  Migration ${migration.name} contains potentially destructive operations`,
            "warning",
          );
          break;
        }
      }

      // Deploy using Node.js script instead of direct SQL execution
      const deployScript = path.join(__dirname, "run-migration.js");
      const command = `node ${deployScript} "${migration.path}"`;

      const output = execSync(command, {
        encoding: "utf8",
        stdio: "pipe",
        cwd: path.dirname(__filename),
      });

      this.log(`Migration ${migration.name} deployed successfully`, "success");
      this.log(`Output: ${output.slice(0, 200)}...`, "info");

      return true;
    } catch (error) {
      const errorMsg = `Migration ${migration.name} failed: ${error.message}`;
      this.errors.push(errorMsg);
      this.log(errorMsg, "error");
      return false;
    }
  }

  async verifyMigrations() {
    this.log("Verifying migration deployment...");

    try {
      // Run verification script
      const verifyScript = path.join(__dirname, "verify-database-setup.js");

      if (fs.existsSync(verifyScript)) {
        const output = execSync(`node ${verifyScript}`, {
          encoding: "utf8",
          stdio: "pipe",
        });

        this.log("Migration verification completed", "success");
        return true;
      } else {
        this.log("Migration verification script not found", "warning");
        return false;
      }
    } catch (error) {
      this.errors.push(`Migration verification failed: ${error.message}`);
      return false;
    }
  }

  generateDeploymentReport() {
    this.log("=".repeat(60), "info");
    this.log("DATABASE MIGRATION DEPLOYMENT REPORT", "info");
    this.log("=".repeat(60), "info");

    if (this.errors.length === 0) {
      this.log("🎉 All migrations deployed successfully!", "success");
    } else {
      this.log("🚨 Migration deployment completed with errors:", "error");
      this.errors.forEach((error) => this.log(`  - ${error}`, "error"));
    }

    // Save deployment log
    const logFile = path.join(
      this.backupDir,
      `deployment-log-${new Date().toISOString().replace(/[:.]/g, "-")}.txt`,
    );
    fs.writeFileSync(logFile, this.deploymentLog.join("\n"));
    this.log(`Deployment log saved: ${logFile}`, "info");
  }

  async deploy() {
    try {
      this.log("Starting database migration deployment...");
      this.log("=".repeat(60));

      // Step 1: Validate environment
      if (!this.validateEnvironment()) {
        throw new Error("Environment validation failed");
      }

      // Step 2: Create backup
      const backup = await this.createDatabaseBackup();
      if (!backup) {
        throw new Error("Database backup required");
      }

      // Step 3: Check existing schema
      await this.checkExistingTables();

      // Step 4: Get migration files
      const migrations = this.getMigrationFiles();
      if (migrations.length === 0) {
        this.log("No migrations to deploy", "info");
        return;
      }

      // Step 5: Deploy migrations
      let successCount = 0;
      for (const migration of migrations) {
        const success = await this.deployMigration(migration);
        if (success) {
          successCount++;
        } else {
          // Stop on first failure for safety
          this.log("Stopping deployment due to migration failure", "error");
          break;
        }
      }

      // Step 6: Verify deployment
      if (successCount === migrations.length) {
        await this.verifyMigrations();
      }

      // Step 7: Generate report
      this.generateDeploymentReport();

      // Exit with appropriate code
      process.exit(this.errors.length > 0 ? 1 : 0);
    } catch (error) {
      this.log(`Deployment failed: ${error.message}`, "error");
      this.generateDeploymentReport();
      process.exit(1);
    }
  }
}

// CLI execution
if (require.main === module) {
  const deployer = new MigrationDeployer();

  // Check for command line arguments
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
EstimatePro Database Migration Deployer

Usage:
  node deploy-migrations.js [options]

Options:
  --help, -h     Show this help message
  --dry-run      Simulate deployment without making changes
  --force        Skip confirmation prompts (use with caution)

Prerequisites:
  1. Database backup created
  2. Environment variables configured
  3. Network access to database
  
Safety Features:
  - Automatic backup creation
  - Step-by-step deployment
  - Comprehensive error handling  
  - Detailed deployment logging
  - Migration verification
    `);
    process.exit(0);
  }

  if (args.includes("--dry-run")) {
    console.log("🧪 DRY RUN MODE - No changes will be made");
    // TODO: Implement dry run functionality
    process.exit(0);
  }

  deployer.deploy().catch((error) => {
    console.error("Unexpected deployment error:", error);
    process.exit(1);
  });
}

module.exports = MigrationDeployer;
