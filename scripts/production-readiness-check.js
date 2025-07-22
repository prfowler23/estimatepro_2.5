const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Load environment variables from .env.local
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

/**
 * Comprehensive production readiness check
 * Validates all aspects of the application before deployment
 */

class ProductionReadinessChecker {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.passed = [];
    this.projectRoot = process.cwd();
  }

  // Utility methods
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

  checkFile(filePath, description) {
    const fullPath = path.join(this.projectRoot, filePath);
    if (fs.existsSync(fullPath)) {
      this.passed.push(`${description} exists`);
      return true;
    } else {
      this.errors.push(`${description} missing: ${filePath}`);
      return false;
    }
  }

  checkDirectory(dirPath, description) {
    const fullPath = path.join(this.projectRoot, dirPath);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
      this.passed.push(`${description} directory exists`);
      return true;
    } else {
      this.errors.push(`${description} directory missing: ${dirPath}`);
      return false;
    }
  }

  runCommand(command, description) {
    try {
      const result = execSync(command, { encoding: "utf8", stdio: "pipe" });
      this.passed.push(`${description} successful`);
      return result;
    } catch (error) {
      this.errors.push(`${description} failed: ${error.message}`);
      return null;
    }
  }

  // Check methods
  checkEnvironmentSetup() {
    this.log("Checking environment setup...");

    // Check for required environment files
    this.checkFile(".env.example", "Environment example file");

    // Check for required environment variables
    const requiredEnvVars = [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "OPENAI_API_KEY",
      "RESEND_API_KEY",
      "EMAIL_FROM",
    ];

    requiredEnvVars.forEach((envVar) => {
      if (process.env[envVar]) {
        this.passed.push(`Environment variable ${envVar} is set`);
      } else {
        this.errors.push(`Environment variable ${envVar} is missing`);
      }
    });

    // Check for production environment
    if (process.env.NODE_ENV === "production") {
      this.passed.push("NODE_ENV is set to production");
    } else {
      this.warnings.push("NODE_ENV is not set to production");
    }

    // Check for debug mode in production
    if (
      process.env.NODE_ENV === "production" &&
      process.env.NEXT_PUBLIC_DEBUG === "true"
    ) {
      this.warnings.push("Debug mode is enabled in production");
    }
  }

  checkDependencies() {
    this.log("Checking dependencies...");

    // Check package.json
    this.checkFile("package.json", "Package.json");
    this.checkFile("package-lock.json", "Package-lock.json");

    // Run dependency audit
    const auditResult = this.runCommand(
      "npm audit --audit-level=moderate",
      "Dependency security audit",
    );
    if (auditResult && auditResult.includes("vulnerabilities")) {
      this.warnings.push("Dependencies have security vulnerabilities");
    }

    // Check for outdated dependencies
    try {
      const outdatedResult = execSync("npm outdated", {
        encoding: "utf8",
        stdio: "pipe",
      });
      if (outdatedResult.trim()) {
        this.warnings.push("Some dependencies are outdated");
      }
    } catch (error) {
      // npm outdated returns exit code 1 when outdated packages exist
      if (error.stdout && error.stdout.trim()) {
        this.warnings.push("Some dependencies are outdated");
      }
    }
  }

  checkBuildConfiguration() {
    this.log("Checking build configuration...");

    // Check Next.js configuration
    this.checkFile("next.config.mjs", "Next.js config");
    this.checkFile("tailwind.config.ts", "Tailwind config");
    this.checkFile("tsconfig.json", "TypeScript config");

    // Check deployment configuration
    this.checkFile("vercel.json", "Vercel deployment config");

    // Run TypeScript check
    this.runCommand("npx tsc --noEmit", "TypeScript compilation check");

    // Run ESLint
    this.runCommand("npm run lint", "ESLint check");
  }

  checkTestingSetup() {
    this.log("Checking testing setup...");

    // Check test configuration
    this.checkFile("jest.config.js", "Jest configuration");
    this.checkFile("jest.setup.js", "Jest setup");

    // Check for test directory
    this.checkDirectory("__tests__", "Tests");

    // Run tests
    this.runCommand("npm test -- --passWithNoTests", "Test execution");
  }

  checkSecuritySetup() {
    this.log("Checking security setup...");

    // Check for security utilities
    this.checkFile("lib/utils/security.ts", "Security utilities");
    this.checkFile("lib/utils/rate-limiter.ts", "Rate limiting utilities");
    this.checkFile("lib/config/env-validation.ts", "Environment validation");

    // Check for sensitive files in gitignore
    if (this.checkFile(".gitignore", "Git ignore file")) {
      const gitignoreContent = fs.readFileSync(
        path.join(this.projectRoot, ".gitignore"),
        "utf8",
      );
      const sensitivePatterns = [
        ".env.local",
        ".env.production",
        "node_modules",
      ];

      sensitivePatterns.forEach((pattern) => {
        if (gitignoreContent.includes(pattern)) {
          this.passed.push(`${pattern} is properly ignored`);
        } else {
          this.warnings.push(`${pattern} should be added to .gitignore`);
        }
      });
    }

    // Check for exposed secrets
    const potentialSecrets = this.runCommand(
      'grep -r "sk-" --include="*.ts" --include="*.js" --exclude-dir=node_modules --exclude-dir=.git .',
      "Secret detection",
    );
    if (potentialSecrets && potentialSecrets.trim()) {
      this.warnings.push("Potential API keys found in source code");
    }
  }

  checkDatabaseSetup() {
    this.log("Checking database setup...");

    // Check for database schema files
    this.checkFile("sql/schema/database_schema.sql", "Database schema");

    // Check for migration files in correct location
    const migrationFiles = [
      "sql/migrations/migration_fix_estimation_flows_schema.sql",
      "sql/migrations/migration_auto_save_system.sql",
      "sql/migrations/migration_guided_estimation_flow.sql",
    ];

    migrationFiles.forEach((file) => {
      this.checkFile(file, `Migration file: ${file}`);
    });

    // Check database connection (if possible)
    if (
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      this.passed.push("Database connection credentials are configured");
    } else {
      this.errors.push("Database connection credentials are missing");
    }
  }

  checkAPIEndpoints() {
    this.log("Checking API endpoints...");

    // Check for API directory structure
    this.checkDirectory("app/api", "API routes");

    // Check for key API endpoints
    const keyEndpoints = [
      "app/api/ai/enhanced-photo-analysis/route.ts",
      "app/api/ai/auto-estimate/route.ts",
      "app/api/analytics/route.ts",
      "app/api/estimation-flows/route.ts",
    ];

    keyEndpoints.forEach((endpoint) => {
      this.checkFile(endpoint, `API endpoint: ${endpoint}`);
    });

    // Check for rate limiting implementation
    this.checkFile("lib/utils/rate-limiter.ts", "Rate limiting implementation");
  }

  checkPerformanceOptimizations() {
    this.log("Checking performance optimizations...");

    // Check for optimization utilities
    this.checkFile("lib/utils/cache.ts", "Caching utilities");
    this.checkFile(
      "lib/utils/database-optimization.ts",
      "Database optimization",
    );

    // Check for lazy loading implementation
    this.checkFile("components/lazy-components.tsx", "Lazy loading components");

    // Check build size (if build exists)
    if (fs.existsSync(path.join(this.projectRoot, ".next"))) {
      this.passed.push("Build directory exists");

      // Check for bundle analysis
      try {
        const buildResult = execSync("npm run build", {
          encoding: "utf8",
          stdio: "pipe",
        });
        if (buildResult.includes("First Load JS")) {
          this.passed.push("Build completed successfully");
        }
      } catch (error) {
        this.errors.push("Build failed");
      }
    } else {
      this.warnings.push("No build directory found - run npm run build");
    }
  }

  checkDocumentation() {
    this.log("Checking documentation...");

    // Check for key documentation files
    this.checkFile("README.md", "README file");
    this.checkFile("CLAUDE.md", "Claude documentation");
    this.checkFile("DEPLOYMENT_GUIDE.md", "Deployment guide");

    // Check for API documentation
    this.checkDirectory("docs", "Documentation directory");
  }

  checkMonitoringSetup() {
    this.log("Checking monitoring setup...");

    // Check for logging setup
    this.checkFile("lib/utils/logger.ts", "Logging utilities");

    // Check for error monitoring configuration
    if (process.env.SENTRY_DSN) {
      this.passed.push("Sentry DSN is configured");
    } else {
      this.warnings.push("Error monitoring (Sentry) is not configured");
    }

    // Check for performance monitoring
    if (process.env.ENABLE_PERFORMANCE_MONITORING === "true") {
      this.passed.push("Performance monitoring is enabled");
    } else {
      this.warnings.push("Performance monitoring is disabled");
    }
  }

  // Main execution method
  async run() {
    this.log("Starting production readiness check...", "info");
    this.log("=".repeat(50), "info");

    // Run all checks
    this.checkEnvironmentSetup();
    this.checkDependencies();
    this.checkBuildConfiguration();
    this.checkTestingSetup();
    this.checkSecuritySetup();
    this.checkDatabaseSetup();
    this.checkAPIEndpoints();
    this.checkPerformanceOptimizations();
    this.checkDocumentation();
    this.checkMonitoringSetup();

    // Generate report
    this.generateReport();

    // Exit with appropriate code
    if (this.errors.length > 0) {
      process.exit(1);
    } else if (this.warnings.length > 0) {
      process.exit(0); // Warnings don't fail the check
    } else {
      process.exit(0);
    }
  }

  generateReport() {
    this.log("=".repeat(50), "info");
    this.log("PRODUCTION READINESS REPORT", "info");
    this.log("=".repeat(50), "info");

    // Summary
    this.log(`✅ Passed: ${this.passed.length}`, "success");
    this.log(`⚠️  Warnings: ${this.warnings.length}`, "warning");
    this.log(`❌ Errors: ${this.errors.length}`, "error");

    // Details
    if (this.errors.length > 0) {
      this.log("\nERRORS (Must be fixed before deployment):", "error");
      this.errors.forEach((error) => this.log(`  - ${error}`, "error"));
    }

    if (this.warnings.length > 0) {
      this.log("\nWARNINGS (Should be addressed):", "warning");
      this.warnings.forEach((warning) => this.log(`  - ${warning}`, "warning"));
    }

    if (this.passed.length > 0) {
      this.log("\nPASSED CHECKS:", "success");
      this.passed.forEach((passed) => this.log(`  - ${passed}`, "success"));
    }

    // Final verdict
    if (this.errors.length === 0) {
      this.log(
        "\n🎉 Application is ready for production deployment!",
        "success",
      );
    } else {
      this.log(
        "\n🚨 Application is NOT ready for production deployment!",
        "error",
      );
      this.log(
        `Please fix ${this.errors.length} error(s) before deploying.`,
        "error",
      );
    }
  }
}

// Run the check
const checker = new ProductionReadinessChecker();
checker.run().catch((error) => {
  console.error("Production readiness check failed:", error);
  process.exit(1);
});
