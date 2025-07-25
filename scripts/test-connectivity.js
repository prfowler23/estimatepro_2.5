#!/usr/bin/env node

/**
 * EstimatePro Connectivity Test Script
 *
 * This script tests all system connections and provides a comprehensive
 * health check for the application.
 */

const https = require("https");
const http = require("http");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  header: (msg) =>
    console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}`),
};

class ConnectivityTester {
  constructor() {
    this.results = {
      environment: { passed: 0, failed: 0, tests: [] },
      database: { passed: 0, failed: 0, tests: [] },
      authentication: { passed: 0, failed: 0, tests: [] },
      features: { passed: 0, failed: 0, tests: [] },
      network: { passed: 0, failed: 0, tests: [] },
    };
  }

  async runAllTests() {
    log.header("🏗️  EstimatePro Connectivity Test Suite");
    log.info("Starting comprehensive connectivity test...\n");

    await this.testEnvironment();
    await this.testDatabase();
    await this.testAuthentication();
    await this.testFeatures();
    await this.testNetwork();

    this.printSummary();
  }

  async testEnvironment() {
    log.header("🔧 Environment Configuration");

    // Test .env file existence
    const envPath = path.join(process.cwd(), ".env.local");
    if (fs.existsSync(envPath)) {
      this.addResult(
        "environment",
        true,
        "Environment file (.env.local) exists",
      );
    } else {
      this.addResult(
        "environment",
        false,
        "Environment file (.env.local) missing",
      );
    }

    // Test required environment variables
    const requiredVars = [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ];

    const optionalVars = [
      "SUPABASE_SERVICE_ROLE_KEY",
      "OPENAI_API_KEY",
      "RESEND_API_KEY",
      "EMAIL_FROM",
      "NEXT_PUBLIC_APP_URL",
      "NEXT_PUBLIC_APP_NAME",
      "NEXT_PUBLIC_APP_VERSION",
    ];

    for (const envVar of requiredVars) {
      if (process.env[envVar]) {
        this.addResult("environment", true, `Required env var: ${envVar}`);
      } else {
        this.addResult(
          "environment",
          false,
          `Missing required env var: ${envVar}`,
        );
      }
    }

    for (const envVar of optionalVars) {
      if (process.env[envVar]) {
        this.addResult("environment", true, `Optional env var: ${envVar}`);
      } else {
        this.addResult(
          "environment",
          false,
          `Missing optional env var: ${envVar}`,
          true,
        );
      }
    }

    // Test Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split(".")[0]);
    if (majorVersion >= 18) {
      this.addResult(
        "environment",
        true,
        `Node.js version: ${nodeVersion} (>= 18)`,
      );
    } else {
      this.addResult(
        "environment",
        false,
        `Node.js version: ${nodeVersion} (requires >= 18)`,
      );
    }

    // Test package.json
    const packagePath = path.join(process.cwd(), "package.json");
    if (fs.existsSync(packagePath)) {
      this.addResult("environment", true, "package.json exists");
    } else {
      this.addResult("environment", false, "package.json missing");
    }
  }

  async testDatabase() {
    log.header("🗄️  Database Connectivity");

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      this.addResult("database", false, "Supabase credentials not configured");
      return;
    }

    // Test Supabase URL format
    if (supabaseUrl.includes("supabase.co")) {
      this.addResult("database", true, "Supabase URL format is valid");
    } else {
      this.addResult("database", false, "Supabase URL format appears invalid");
    }

    // Test Supabase API key format
    if (supabaseKey.length > 50) {
      this.addResult("database", true, "Supabase API key format appears valid");
    } else {
      this.addResult(
        "database",
        false,
        "Supabase API key format appears invalid",
      );
    }

    // Test Supabase connectivity
    try {
      const response = await this.makeRequest(supabaseUrl + "/rest/v1/", {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      });

      if (response.status === 200 || response.status === 401) {
        this.addResult("database", true, "Supabase API is reachable");
      } else {
        this.addResult(
          "database",
          false,
          `Supabase API returned status: ${response.status}`,
        );
      }
    } catch (error) {
      this.addResult(
        "database",
        false,
        `Supabase API connection failed: ${error.message}`,
      );
    }
  }

  async testAuthentication() {
    log.header("🔐 Authentication Services");

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      this.addResult(
        "authentication",
        false,
        "Supabase credentials not configured",
      );
      return;
    }

    // Test auth endpoint
    try {
      const response = await this.makeRequest(supabaseUrl + "/auth/v1/", {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      });

      if (response.status === 200 || response.status === 401) {
        this.addResult(
          "authentication",
          true,
          "Supabase Auth endpoint is reachable",
        );
      } else {
        this.addResult(
          "authentication",
          false,
          `Auth endpoint returned status: ${response.status}`,
        );
      }
    } catch (error) {
      this.addResult(
        "authentication",
        false,
        `Auth endpoint connection failed: ${error.message}`,
      );
    }

    // Test service role key if available
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceRoleKey) {
      this.addResult("authentication", true, "Service role key is configured");
    } else {
      this.addResult(
        "authentication",
        false,
        "Service role key not configured (optional)",
      );
    }
  }

  async testFeatures() {
    log.header("⚡ Feature Configuration");

    // Test AI features
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      this.addResult("features", true, "OpenAI API key is configured");

      // Test OpenAI API key format
      if (openaiKey.startsWith("sk-")) {
        this.addResult("features", true, "OpenAI API key format is valid");
      } else {
        this.addResult(
          "features",
          false,
          "OpenAI API key format appears invalid",
        );
      }
    } else {
      this.addResult(
        "features",
        false,
        "OpenAI API key not configured (AI features disabled)",
      );
    }

    // Test email features
    const resendKey = process.env.RESEND_API_KEY;
    const emailFrom = process.env.EMAIL_FROM;

    if (resendKey && emailFrom) {
      this.addResult("features", true, "Email service is configured");
    } else {
      this.addResult("features", false, "Email service not fully configured");
    }

    // Test app configuration
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const appName = process.env.NEXT_PUBLIC_APP_NAME;
    const appVersion = process.env.NEXT_PUBLIC_APP_VERSION;

    if (appUrl) {
      this.addResult("features", true, "App URL is configured");
    } else {
      this.addResult("features", false, "App URL not configured");
    }

    if (appName) {
      this.addResult("features", true, "App name is configured");
    } else {
      this.addResult("features", false, "App name not configured");
    }

    if (appVersion) {
      this.addResult("features", true, "App version is configured");
    } else {
      this.addResult("features", false, "App version not configured");
    }
  }

  async testNetwork() {
    log.header("🌐 Network Connectivity");

    // Test internet connectivity
    try {
      const response = await this.makeRequest("https://httpbin.org/get");
      if (response.status === 200) {
        this.addResult("network", true, "Internet connectivity is working");
      } else {
        this.addResult("network", false, "Internet connectivity test failed");
      }
    } catch (error) {
      this.addResult(
        "network",
        false,
        `Internet connectivity failed: ${error.message}`,
      );
    }

    // Test DNS resolution
    try {
      const dns = require("dns").promises;
      await dns.lookup("supabase.co");
      this.addResult("network", true, "DNS resolution is working");
    } catch (error) {
      this.addResult(
        "network",
        false,
        `DNS resolution failed: ${error.message}`,
      );
    }

    // Test HTTPS support
    try {
      const response = await this.makeRequest("https://supabase.co");
      if (response.status === 200) {
        this.addResult("network", true, "HTTPS connections are working");
      } else {
        this.addResult("network", false, "HTTPS connection test failed");
      }
    } catch (error) {
      this.addResult(
        "network",
        false,
        `HTTPS connection failed: ${error.message}`,
      );
    }
  }

  addResult(category, passed, message, isWarning = false) {
    const result = {
      passed,
      message,
      isWarning,
      timestamp: new Date().toISOString(),
    };

    this.results[category].tests.push(result);

    if (passed) {
      this.results[category].passed++;
      log.success(message);
    } else if (isWarning) {
      this.results[category].failed++;
      log.warning(message);
    } else {
      this.results[category].failed++;
      log.error(message);
    }
  }

  async makeRequest(url, headers = {}) {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith("https:") ? https : http;

      const req = protocol.get(
        url,
        {
          headers: {
            "User-Agent": "EstimatePro-Connectivity-Test/1.0",
            ...headers,
          },
          timeout: 10000,
        },
        (res) => {
          resolve({ status: res.statusCode, headers: res.headers });
        },
      );

      req.on("error", reject);
      req.on("timeout", () => {
        req.destroy();
        reject(new Error("Request timeout"));
      });
    });
  }

  printSummary() {
    log.header("📊 Test Summary");

    let totalPassed = 0;
    let totalFailed = 0;
    let totalWarnings = 0;

    Object.entries(this.results).forEach(([category, result]) => {
      const total = result.passed + result.failed;
      const warnings = result.tests.filter(
        (t) => t.isWarning && !t.passed,
      ).length;

      totalPassed += result.passed;
      totalFailed += result.failed;
      totalWarnings += warnings;

      const percentage =
        total > 0 ? Math.round((result.passed / total) * 100) : 0;
      const status =
        result.failed === 0 ? "✅" : result.passed > 0 ? "⚠️" : "❌";

      console.log(
        `${status} ${category.toUpperCase()}: ${result.passed}/${total} passed (${percentage}%)`,
      );

      if (warnings > 0) {
        console.log(`   ⚠️  ${warnings} warnings`);
      }
    });

    console.log("\n" + "=".repeat(50));

    const overallTotal = totalPassed + totalFailed;
    const overallPercentage =
      overallTotal > 0 ? Math.round((totalPassed / overallTotal) * 100) : 0;

    if (totalFailed === 0) {
      log.success(
        `Overall: ${totalPassed}/${overallTotal} tests passed (${overallPercentage}%)`,
      );
      log.success("🎉 All critical tests passed! Your system is ready.");
    } else if (totalPassed > totalFailed) {
      log.warning(
        `Overall: ${totalPassed}/${overallTotal} tests passed (${overallPercentage}%)`,
      );
      log.warning("⚠️  Some tests failed, but the system should still work.");
    } else {
      log.error(
        `Overall: ${totalPassed}/${overallTotal} tests passed (${overallPercentage}%)`,
      );
      log.error("❌ Critical tests failed. Please fix the issues above.");
    }

    if (totalWarnings > 0) {
      log.warning(
        `⚠️  ${totalWarnings} warnings - these are optional but recommended.`,
      );
    }

    console.log("\n" + "=".repeat(50));

    // Provide next steps
    if (totalFailed > 0) {
      log.header("🔧 Next Steps");
      log.info("1. Check your .env.local file configuration");
      log.info("2. Verify your Supabase project settings");
      log.info("3. Ensure all required environment variables are set");
      log.info("4. Check your internet connection");
      log.info("5. Run this test again after making changes");
    } else {
      log.header("🚀 Ready to Go!");
      log.success("Your EstimatePro environment is properly configured.");
      log.info("You can now start the development server with: npm run dev");
    }
  }
}

// Run the tests
async function main() {
  const tester = new ConnectivityTester();
  await tester.runAllTests();
}

// Handle command line arguments
if (require.main === module) {
  main().catch((error) => {
    log.error(`Test suite failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = ConnectivityTester;
