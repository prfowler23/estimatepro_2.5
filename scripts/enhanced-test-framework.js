#!/usr/bin/env node

/**
 * Enhanced Test Framework for EstimatePro
 * Provides unified testing infrastructure with advanced features
 *
 * Usage:
 *   node scripts/enhanced-test-framework.js [command] [options]
 *
 * Commands:
 *   run           - Run all tests with enhanced reporting
 *   watch         - Watch mode with intelligent re-running
 *   coverage      - Generate comprehensive coverage reports
 *   integration   - Run integration tests only
 *   unit          - Run unit tests only
 *   e2e           - Run end-to-end tests
 *   lint-tests    - Lint test files specifically
 *   generate      - Generate test templates
 *   validate      - Validate test quality and coverage
 */

const { execSync, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

// Enhanced Testing Configuration
const TEST_CONFIG = {
  coverageThresholds: {
    global: {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80,
    },
    critical: {
      branches: 85,
      functions: 90,
      lines: 95,
      statements: 95,
    },
  },
  testPatterns: {
    unit: ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}"],
    integration: ["**/*.integration.test.{ts,tsx}"],
    e2e: ["**/*.e2e.test.{ts,tsx}"],
  },
  criticalPaths: [
    "lib/services/ai-service.ts",
    "lib/services/estimate-service.ts",
    "lib/services/workflow-service-unified.ts",
    "lib/services/resource-service-unified.ts",
    "lib/services/analytics-service-unified.ts",
    "lib/supabase/",
    "app/api/",
  ],
  testDirs: {
    unit: "__tests__",
    integration: "__tests__/integration",
    e2e: "__tests__/e2e",
    utilities: "__tests__/utils",
    mocks: "__tests__/__mocks__",
    fixtures: "__tests__/fixtures",
  },
};

class EnhancedTestFramework {
  constructor() {
    this.startTime = Date.now();
    this.verbose =
      process.argv.includes("--verbose") || process.argv.includes("-v");
    this.silent =
      process.argv.includes("--silent") || process.argv.includes("-s");
    this.watch =
      process.argv.includes("--watch") || process.argv.includes("-w");
    this.bail = process.argv.includes("--bail") || process.argv.includes("-b");
  }

  log(message, type = "info") {
    if (this.silent) return;

    const icons = {
      info: "🧪",
      success: "✅",
      warning: "⚠️",
      error: "❌",
      test: "🔍",
      coverage: "📊",
      generate: "🏭",
    };

    console.log(`${icons[type] || "ℹ️"} ${message}`);
  }

  async executeCommand(command, options = {}) {
    const { silent = this.silent, env = {} } = options;

    try {
      if (!silent && this.verbose) {
        this.log(`Running: ${command}`, "test");
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

  async setupTestEnvironment() {
    this.log("Setting up enhanced test environment...", "test");

    // Ensure test directories exist
    for (const [name, dir] of Object.entries(TEST_CONFIG.testDirs)) {
      const fullPath = path.join(process.cwd(), dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        this.log(`Created test directory: ${dir}`, "success");
      }
    }

    // Validate Jest configuration
    const jestConfigPath = path.join(process.cwd(), "jest.config.js");
    if (!fs.existsSync(jestConfigPath)) {
      this.log(
        "Jest configuration not found, creating enhanced config...",
        "warning",
      );
      await this.generateJestConfig();
    }

    return true;
  }

  async generateJestConfig() {
    const enhancedJestConfig = `const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./",
});

const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  testEnvironment: "jest-environment-jsdom",
  transformIgnorePatterns: [
    "node_modules/(?!(isows|@supabase|jose|p-queue|eventemitter3)/)",
  ],
  
  // Enhanced Coverage Configuration
  collectCoverageFrom: [
    "components/**/*.{js,jsx,ts,tsx}",
    "lib/**/*.{js,jsx,ts,tsx}",
    "hooks/**/*.{js,jsx,ts,tsx}",
    "app/**/*.{js,jsx,ts,tsx}",
    "!**/*.d.ts",
    "!**/node_modules/**",
    "!**/__tests__/**",
    "!**/coverage/**",
    "!app/layout.tsx",
    "!app/globals.css",
  ],
  
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80,
    },
    // Critical paths with higher thresholds
    "lib/services/ai-service.ts": {
      branches: 85,
      functions: 90,
      lines: 95,
      statements: 95,
    },
    "lib/services/estimate-service.ts": {
      branches: 85,
      functions: 90,
      lines: 95,
      statements: 95,
    },
  },
  
  // Enhanced Test Matching
  testMatch: [
    "<rootDir>/__tests__/**/*.{test,spec}.{js,jsx,ts,tsx}",
    "<rootDir>/**/*.{test,spec}.{js,jsx,ts,tsx}",
  ],
  
  testPathIgnorePatterns: [
    "<rootDir>/node_modules/",
    "<rootDir>/.next/",
    "<rootDir>/coverage/",
    "<rootDir>/__tests__/test-utils.tsx",
    "<rootDir>/__tests__/.*\\.md$",
  ],
  
  // Test Categories
  testRunner: "jest",
  maxWorkers: "50%",
  testTimeout: 10000,
  
  // Enhanced Reporting
  reporters: [
    "default",
    [
      "jest-html-reporters",
      {
        publicPath: "./coverage/html",
        filename: "test-report.html",
        expand: true,
      },
    ],
  ],
  
  // Code Coverage Reports
  coverageReporters: ["text", "lcov", "html", "json-summary"],
  coverageDirectory: "coverage",
  
  moduleFileExtensions: ["ts", "tsx", "js", "jsx"],
};

module.exports = createJestConfig(customJestConfig);`;

    fs.writeFileSync(
      path.join(process.cwd(), "jest.config.js"),
      enhancedJestConfig,
    );
    this.log("Enhanced Jest configuration created", "success");
  }

  async runTests(type = "all", options = {}) {
    await this.setupTestEnvironment();

    this.log(`Running ${type} tests...`, "test");

    let testCommand = "jest";
    let testPattern = "";

    // Configure test command based on type
    switch (type) {
      case "unit":
        testPattern = "--testPathIgnorePatterns=integration e2e";
        break;
      case "integration":
        testPattern = "--testPathPattern=integration";
        break;
      case "e2e":
        testPattern = "--testPathPattern=e2e";
        break;
      case "coverage":
        testCommand += " --coverage --watchAll=false";
        break;
      case "watch":
        testCommand += " --watch";
        break;
      default:
        testCommand += " --watchAll=false";
    }

    if (this.bail) {
      testCommand += " --bail";
    }

    if (testPattern) {
      testCommand += ` ${testPattern}`;
    }

    if (options.updateSnapshots) {
      testCommand += " --updateSnapshot";
    }

    const result = await this.executeCommand(testCommand);

    if (result.success) {
      this.log(`${type} tests completed successfully!`, "success");

      // Generate coverage analysis if coverage was run
      if (type === "coverage" || testCommand.includes("--coverage")) {
        await this.analyzeCoverage();
      }
    } else {
      this.log(`${type} tests failed`, "error");
    }

    return result.success;
  }

  async analyzeCoverage() {
    this.log("Analyzing test coverage...", "coverage");

    const coverageSummaryPath = path.join(
      process.cwd(),
      "coverage",
      "coverage-summary.json",
    );

    if (!fs.existsSync(coverageSummaryPath)) {
      this.log("Coverage summary not found", "warning");
      return;
    }

    const coverageData = JSON.parse(
      fs.readFileSync(coverageSummaryPath, "utf8"),
    );
    const { total } = coverageData;

    this.log("Coverage Summary:", "coverage");
    console.log(
      `  Lines: ${total.lines.pct}% (${total.lines.covered}/${total.lines.total})`,
    );
    console.log(
      `  Functions: ${total.functions.pct}% (${total.functions.covered}/${total.functions.total})`,
    );
    console.log(
      `  Branches: ${total.branches.pct}% (${total.branches.covered}/${total.branches.total})`,
    );
    console.log(
      `  Statements: ${total.statements.pct}% (${total.statements.covered}/${total.statements.total})`,
    );

    // Check critical paths
    let criticalCoverage = true;
    for (const criticalPath of TEST_CONFIG.criticalPaths) {
      const pathData = coverageData[criticalPath];
      if (pathData) {
        const criticalThreshold = TEST_CONFIG.coverageThresholds.critical;
        if (pathData.lines.pct < criticalThreshold.lines) {
          this.log(
            `Critical path ${criticalPath} has low coverage: ${pathData.lines.pct}%`,
            "warning",
          );
          criticalCoverage = false;
        }
      }
    }

    if (criticalCoverage) {
      this.log("All critical paths meet coverage requirements", "success");
    }

    // Generate coverage recommendations
    await this.generateCoverageRecommendations(coverageData);
  }

  async generateCoverageRecommendations(coverageData) {
    const recommendations = [];

    // Analyze files with low coverage
    for (const [filePath, fileData] of Object.entries(coverageData)) {
      if (filePath === "total") continue;

      if (fileData.lines && fileData.lines.pct < 60) {
        recommendations.push({
          type: "low_coverage",
          file: filePath,
          coverage: fileData.lines.pct,
          priority: TEST_CONFIG.criticalPaths.some((cp) =>
            filePath.includes(cp),
          )
            ? "high"
            : "medium",
        });
      }
    }

    if (recommendations.length > 0) {
      this.log("Coverage Recommendations:", "coverage");
      recommendations
        .sort((a, b) => (b.priority === "high" ? 1 : -1))
        .slice(0, 10)
        .forEach((rec) => {
          console.log(
            `  ${rec.priority === "high" ? "🔴" : "🟡"} ${rec.file}: ${rec.coverage}%`,
          );
        });
    }
  }

  async lintTests() {
    this.log("Linting test files...", "test");

    const lintResult = await this.executeCommand(
      'eslint "__tests__/**/*.{js,jsx,ts,tsx}" --max-warnings=0',
    );

    if (lintResult.success) {
      this.log("Test files passed linting", "success");
    } else {
      this.log("Test files have linting errors", "error");
    }

    return lintResult.success;
  }

  async generateTestTemplate(type, name) {
    this.log(`Generating ${type} test template for ${name}...`, "generate");

    const templates = {
      unit: this.getUnitTestTemplate(name),
      integration: this.getIntegrationTestTemplate(name),
      service: this.getServiceTestTemplate(name),
      component: this.getComponentTestTemplate(name),
    };

    const template = templates[type];
    if (!template) {
      this.log(`Unknown test type: ${type}`, "error");
      return false;
    }

    const testDir = TEST_CONFIG.testDirs.unit;
    const fileName = `${name}.test.ts${type === "component" ? "x" : ""}`;
    const filePath = path.join(process.cwd(), testDir, fileName);

    // Ensure directory exists
    const dirPath = path.dirname(filePath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    fs.writeFileSync(filePath, template);
    this.log(`Test template created: ${filePath}`, "success");

    return true;
  }

  getServiceTestTemplate(name) {
    return `import { ${name} } from "@/lib/services/${name.toLowerCase().replace(/service$/, "")}-service";

describe("${name}", () => {
  let service: ${name};

  beforeEach(() => {
    service = new ${name}();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("initialization", () => {
    it("should initialize correctly", () => {
      expect(service).toBeDefined();
    });
  });

  describe("core functionality", () => {
    it("should handle basic operations", async () => {
      // TODO: Add test implementation
      expect(true).toBe(true);
    });

    it("should handle errors gracefully", async () => {
      // TODO: Add error handling test
      expect(true).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should handle null/undefined inputs", () => {
      // TODO: Add edge case tests
      expect(true).toBe(true);
    });
  });
});`;
  }

  getComponentTestTemplate(name) {
    return `import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ${name} } from "@/components/${name}";

// Mock dependencies if needed
jest.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

describe("${name}", () => {
  const defaultProps = {
    // TODO: Add default props
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders correctly", () => {
    render(<${name} {...defaultProps} />);
    
    // TODO: Add assertions
    expect(screen.getByRole("")).toBeInTheDocument();
  });

  it("handles user interactions", async () => {
    render(<${name} {...defaultProps} />);
    
    // TODO: Add interaction tests
    // fireEvent.click(screen.getByRole("button"));
    // await waitFor(() => {
    //   expect(mockFunction).toHaveBeenCalled();
    // });
  });

  it("handles loading states", () => {
    render(<${name} {...defaultProps} loading />);
    
    // TODO: Add loading state assertions
    expect(true).toBe(true);
  });

  it("handles error states", () => {
    render(<${name} {...defaultProps} error="Test error" />);
    
    // TODO: Add error state assertions
    expect(true).toBe(true);
  });
});`;
  }

  getUnitTestTemplate(name) {
    return `import { ${name} } from "@/lib/utils/${name.toLowerCase()}";

describe("${name}", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("core functionality", () => {
    it("should work correctly with valid inputs", () => {
      // TODO: Add test implementation
      expect(true).toBe(true);
    });

    it("should handle edge cases", () => {
      // TODO: Add edge case tests
      expect(true).toBe(true);
    });
  });

  describe("error handling", () => {
    it("should throw appropriate errors for invalid inputs", () => {
      // TODO: Add error handling tests
      expect(() => ${name}(null)).toThrow();
    });
  });
});`;
  }

  getIntegrationTestTemplate(name) {
    return `import { createMockSupabaseClient } from "@/__tests__/utils/supabase-mock";
import { ${name} } from "@/lib/services/${name.toLowerCase()}";

describe("${name} Integration", () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  let service: ${name};

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    service = new ${name}(mockSupabase);
    jest.clearAllMocks();
  });

  describe("database integration", () => {
    it("should interact correctly with database", async () => {
      // TODO: Add database integration tests
      expect(true).toBe(true);
    });

    it("should handle database errors", async () => {
      // Mock database error
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: "Database error" }
        })
      });

      // TODO: Add error handling assertions
      expect(true).toBe(true);
    });
  });

  describe("API integration", () => {
    it("should handle API calls correctly", async () => {
      // TODO: Add API integration tests
      expect(true).toBe(true);
    });
  });
});`;
  }

  async validateTestQuality() {
    this.log("Validating test quality...", "test");

    const validationResults = {
      coverage: false,
      linting: false,
      structure: false,
      mocks: false,
    };

    // Check coverage
    const coverageResult = await this.runTests("coverage");
    validationResults.coverage = coverageResult;

    // Check linting
    const lintResult = await this.lintTests();
    validationResults.linting = lintResult;

    // Check test structure
    validationResults.structure = await this.validateTestStructure();

    // Check mocks
    validationResults.mocks = await this.validateMocks();

    const overallQuality = Object.values(validationResults).every(Boolean);

    if (overallQuality) {
      this.log("All test quality checks passed!", "success");
    } else {
      this.log("Some test quality checks failed", "warning");
      Object.entries(validationResults).forEach(([check, passed]) => {
        if (!passed) {
          this.log(`  ❌ ${check} check failed`, "error");
        }
      });
    }

    return overallQuality;
  }

  async validateTestStructure() {
    // Check if required test directories exist
    for (const [name, dir] of Object.entries(TEST_CONFIG.testDirs)) {
      const fullPath = path.join(process.cwd(), dir);
      if (!fs.existsSync(fullPath)) {
        this.log(`Missing test directory: ${dir}`, "warning");
        return false;
      }
    }

    return true;
  }

  async validateMocks() {
    const mocksDir = path.join(process.cwd(), TEST_CONFIG.testDirs.mocks);
    return fs.existsSync(mocksDir);
  }

  printElapsed() {
    const elapsed = Math.round((Date.now() - this.startTime) / 1000);
    this.log(`Completed in ${elapsed}s`, "success");
  }

  printUsage() {
    console.log(`
Enhanced Test Framework for EstimatePro

Usage: node scripts/enhanced-test-framework.js <command> [options]

Commands:
  run           Run all tests with enhanced reporting
  watch         Watch mode with intelligent re-running  
  coverage      Generate comprehensive coverage reports
  integration   Run integration tests only
  unit          Run unit tests only
  e2e           Run end-to-end tests
  lint-tests    Lint test files specifically
  generate      Generate test templates
  validate      Validate test quality and coverage

Options:
  --verbose     Show detailed output
  --silent      Suppress output
  --watch       Watch for changes
  --bail        Stop on first failure

Examples:
  node scripts/enhanced-test-framework.js run
  node scripts/enhanced-test-framework.js coverage --verbose
  node scripts/enhanced-test-framework.js generate service UserService
  node scripts/enhanced-test-framework.js validate
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
        case "run":
          await this.runTests("all");
          break;

        case "watch":
          await this.runTests("watch");
          break;

        case "coverage":
          await this.runTests("coverage");
          break;

        case "unit":
          await this.runTests("unit");
          break;

        case "integration":
          await this.runTests("integration");
          break;

        case "e2e":
          await this.runTests("e2e");
          break;

        case "lint-tests":
          await this.lintTests();
          break;

        case "generate":
          const type = process.argv[3];
          const name = process.argv[4];
          if (!type || !name) {
            this.log("Usage: generate <type> <name>", "error");
            this.log("Types: unit, integration, service, component", "info");
            return;
          }
          await this.generateTestTemplate(type, name);
          break;

        case "validate":
          await this.validateTestQuality();
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
  const testFramework = new EnhancedTestFramework();
  testFramework.run();
}

module.exports = EnhancedTestFramework;
