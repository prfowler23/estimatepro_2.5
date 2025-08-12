#!/usr/bin/env node

/**
 * Unified Build System for EstimatePro
 * Consolidates build, optimization, and analysis functionality
 *
 * Usage:
 *   node scripts/build-system.js [command] [options]
 *
 * Commands:
 *   dev           - Start development server
 *   build         - Production build
 *   analyze       - Build with bundle analysis
 *   test          - Run test suite
 *   lint          - Run linting and type checking
 *   deploy        - Full deployment check
 *   clean         - Clean build artifacts
 *   perf          - Performance monitoring
 */

const { execSync, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

// Configuration
const CONFIG = {
  buildDir: ".next",
  nodeOptions: {
    development: "--max-old-space-size=4096",
    production: "--max-old-space-size=8192",
  },
  thresholds: {
    bundleSize: 5000, // 5MB
    jsSize: 2000, // 2MB
    cssSize: 500, // 500KB
    testCoverage: 80, // 80%
  },
};

class BuildSystem {
  constructor() {
    this.startTime = Date.now();
    this.verbose =
      process.argv.includes("--verbose") || process.argv.includes("-v");
    this.silent =
      process.argv.includes("--silent") || process.argv.includes("-s");
  }

  log(message, type = "info") {
    if (this.silent) return;

    const icons = {
      info: "📦",
      success: "✅",
      warning: "⚠️",
      error: "❌",
      build: "🏗️",
      test: "🧪",
      perf: "📊",
    };

    console.log(`${icons[type] || "ℹ️"} ${message}`);
  }

  async executeCommand(command, options = {}) {
    const { silent = this.silent, env = {} } = options;

    try {
      if (!silent) {
        this.log(`Running: ${command}`, "info");
      }

      const result = execSync(command, {
        stdio: silent ? "pipe" : "inherit",
        env: { ...process.env, ...env },
        encoding: "utf8",
        cwd: process.cwd(),
      });

      return { success: true, output: result };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        output: error.stdout || error.output,
      };
    }
  }

  async clean() {
    this.log("Cleaning build artifacts...", "build");

    const cleanTargets = [
      CONFIG.buildDir,
      "node_modules/.cache",
      "coverage",
      "bundle-metrics.json",
      "bundle-history.json",
      ".turbo",
    ];

    for (const target of cleanTargets) {
      if (fs.existsSync(target)) {
        fs.rmSync(target, { recursive: true, force: true });
        this.log(`Removed ${target}`, "success");
      }
    }
  }

  async lint() {
    this.log("Running linting and type checking...", "build");

    // TypeScript check
    const typeResult = await this.executeCommand("npm run typecheck");
    if (!typeResult.success) {
      this.log("TypeScript check failed", "error");
      return false;
    }

    // ESLint check
    const lintResult = await this.executeCommand("npm run lint");
    if (!lintResult.success) {
      this.log("Linting failed", "error");
      return false;
    }

    this.log("Linting and type checking passed!", "success");
    return true;
  }

  async test(coverage = false) {
    this.log("Running test suite...", "test");

    const testCommand = coverage ? "npm run test:coverage" : "npm test";
    const testResult = await this.executeCommand(testCommand);

    if (!testResult.success) {
      this.log("Tests failed", "error");
      return false;
    }

    // Check coverage if enabled
    if (coverage && fs.existsSync("coverage/coverage-summary.json")) {
      const coverageData = JSON.parse(
        fs.readFileSync("coverage/coverage-summary.json"),
      );
      const totalCoverage = coverageData.total.lines.pct;

      if (totalCoverage < CONFIG.thresholds.testCoverage) {
        this.log(
          `Test coverage ${totalCoverage}% below threshold ${CONFIG.thresholds.testCoverage}%`,
          "warning",
        );
      } else {
        this.log(`Test coverage: ${totalCoverage}%`, "success");
      }
    }

    this.log("Tests passed!", "success");
    return true;
  }

  async build(mode = "production", analyze = false) {
    this.log(`Building for ${mode}...`, "build");

    const nodeOptions =
      CONFIG.nodeOptions[mode] || CONFIG.nodeOptions.production;
    const buildEnv = {
      NODE_ENV: mode,
      NODE_OPTIONS: nodeOptions,
      ANALYZE: analyze ? "true" : "false",
    };

    // Run pre-build steps
    await this.executeCommand("node scripts/copy-pdf-worker.js", {
      env: buildEnv,
    });

    // Execute build
    const buildResult = await this.executeCommand("next build", {
      env: buildEnv,
    });

    if (!buildResult.success) {
      this.log("Build failed", "error");
      return false;
    }

    // Analyze bundle if requested
    if (analyze) {
      await this.analyzeBundle();
    }

    this.log("Build completed successfully!", "success");
    return true;
  }

  async analyzeBundle() {
    this.log("Analyzing bundle size...", "perf");

    const bundleResult = await this.executeCommand(
      "node scripts/track-bundle-size.js",
    );

    if (!bundleResult.success) {
      this.log("Bundle analysis failed", "error");
      return false;
    }

    // Check if metrics file exists and analyze
    if (fs.existsSync("bundle-metrics.json")) {
      const metrics = JSON.parse(fs.readFileSync("bundle-metrics.json"));

      if (metrics.warnings && metrics.warnings.length > 0) {
        this.log(
          `Bundle analysis found ${metrics.warnings.length} warnings`,
          "warning",
        );

        if (this.verbose) {
          metrics.warnings.forEach((warning) => {
            this.log(`  ${warning.type}: ${warning.file || "N/A"}`, "warning");
          });
        }
      } else {
        this.log("Bundle analysis passed all thresholds", "success");
      }
    }

    return true;
  }

  async performance() {
    this.log("Running performance checks...", "perf");

    const perfResult = await this.executeCommand("npm run perf:monitor:quick");

    if (!perfResult.success) {
      this.log("Performance check failed", "error");
      return false;
    }

    this.log("Performance check completed", "success");
    return true;
  }

  async deploy() {
    this.log("Running deployment checks...", "build");

    // Full pipeline
    const steps = [
      { name: "Production Readiness Check", fn: () => this.productionCheck() },
      { name: "Linting & Type Check", fn: () => this.lint() },
      { name: "Tests with Coverage", fn: () => this.test(true) },
      { name: "Production Build", fn: () => this.build("production", true) },
      { name: "Performance Check", fn: () => this.performance() },
    ];

    for (const step of steps) {
      this.log(`Step: ${step.name}`, "build");
      const result = await step.fn();

      if (!result) {
        this.log(`Deployment check failed at: ${step.name}`, "error");
        return false;
      }
    }

    this.log("All deployment checks passed!", "success");
    return true;
  }

  async productionCheck() {
    this.log("Running production readiness check...", "build");

    const checkResult = await this.executeCommand(
      "node scripts/production-readiness-check.js",
    );

    if (!checkResult.success) {
      this.log("Production readiness check failed", "error");
      return false;
    }

    this.log("Production readiness check passed", "success");
    return true;
  }

  async dev() {
    this.log("Starting development server...", "build");

    // Copy PDF worker first
    await this.executeCommand("node scripts/copy-pdf-worker.js");

    // Start dev server
    const devEnv = {
      NODE_ENV: "development",
      NODE_OPTIONS: CONFIG.nodeOptions.development,
    };

    // Use spawn for long-running process
    const devProcess = spawn("next", ["dev"], {
      stdio: "inherit",
      env: { ...process.env, ...devEnv },
    });

    devProcess.on("exit", (code) => {
      this.log(
        `Development server exited with code ${code}`,
        code === 0 ? "success" : "error",
      );
    });
  }

  printElapsed() {
    const elapsed = Math.round((Date.now() - this.startTime) / 1000);
    this.log(`Completed in ${elapsed}s`, "success");
  }

  printUsage() {
    console.log(`
EstimatePro Unified Build System

Usage: node scripts/build-system.js <command> [options]

Commands:
  dev         Start development server
  build       Production build
  analyze     Build with bundle analysis
  test        Run test suite
  lint        Run linting and type checking
  deploy      Full deployment pipeline
  clean       Clean build artifacts
  perf        Performance monitoring
  prod-check  Production readiness check

Options:
  --verbose   Show detailed output
  --silent    Suppress output
  --coverage  Include test coverage (for test command)

Examples:
  node scripts/build-system.js dev
  node scripts/build-system.js build --verbose
  node scripts/build-system.js test --coverage
  node scripts/build-system.js deploy
`);
  }

  async run() {
    const command = process.argv[2];

    if (!command) {
      this.printUsage();
      return;
    }

    try {
      switch (command.toLowerCase()) {
        case "dev":
        case "development":
          await this.dev();
          break;

        case "build":
          await this.build("production");
          break;

        case "analyze":
          await this.build("production", true);
          break;

        case "test":
          const withCoverage = process.argv.includes("--coverage");
          await this.test(withCoverage);
          break;

        case "lint":
          await this.lint();
          break;

        case "deploy":
          await this.deploy();
          break;

        case "clean":
          await this.clean();
          break;

        case "perf":
        case "performance":
          await this.performance();
          break;

        case "prod-check":
        case "production-check":
          await this.productionCheck();
          break;

        default:
          this.log(`Unknown command: ${command}`, "error");
          this.printUsage();
          process.exit(1);
      }

      this.printElapsed();
    } catch (error) {
      this.log(`Error: ${error.message}`, "error");
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const buildSystem = new BuildSystem();
  buildSystem.run();
}

module.exports = BuildSystem;
