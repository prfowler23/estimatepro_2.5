#!/usr/bin/env node

/**
 * Automated Performance Testing Script
 *
 * This script runs performance tests against the application to ensure
 * it meets performance benchmarks. It uses Lighthouse for web vitals
 * and custom metrics for API performance.
 */

const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");

// Configuration
const BASE_URL = process.env.TEST_URL || "http://localhost:3000";
const PERFORMANCE_REPORT_DIR = path.join(process.cwd(), "performance-reports");
const THRESHOLDS = {
  // Lighthouse scores (0-100)
  performance: 80,
  accessibility: 90,
  bestPractices: 85,
  seo: 85,

  // Core Web Vitals
  lcp: 2500, // Largest Contentful Paint (ms)
  fid: 100, // First Input Delay (ms)
  cls: 0.1, // Cumulative Layout Shift

  // API Performance
  apiResponseTime: 500, // ms
  apiErrorRate: 0.01, // 1%
};

// Pages to test
const PAGES_TO_TEST = [
  { name: "Home", path: "/" },
  { name: "Dashboard", path: "/dashboard" },
  { name: "Calculator", path: "/calculator" },
  { name: "Estimates", path: "/estimates" },
  { name: "AI Assistant", path: "/ai-assistant" },
];

// API endpoints to test
const API_ENDPOINTS = [
  { name: "Health Check", method: "GET", path: "/api/health" },
  { name: "Analytics Vitals", method: "GET", path: "/api/analytics/vitals" },
  { name: "Weather Enhanced", method: "POST", path: "/api/weather/enhanced" },
];

// Ensure report directory exists
if (!fs.existsSync(PERFORMANCE_REPORT_DIR)) {
  fs.mkdirSync(PERFORMANCE_REPORT_DIR, { recursive: true });
}

/**
 * Run Lighthouse tests
 */
async function runLighthouseTests() {
  console.log("🔦 Running Lighthouse tests...\n");

  const results = [];

  for (const page of PAGES_TO_TEST) {
    console.log(`Testing ${page.name} (${page.path})...`);

    const reportPath = path.join(
      PERFORMANCE_REPORT_DIR,
      `lighthouse-${page.name.toLowerCase().replace(/\s+/g, "-")}.json`,
    );

    try {
      // Run Lighthouse
      const lighthouseCmd = `npx lighthouse ${BASE_URL}${page.path} --output=json --output-path=${reportPath} --chrome-flags="--headless" --quiet`;

      await new Promise((resolve, reject) => {
        exec(lighthouseCmd, (error, stdout, stderr) => {
          if (error) {
            console.error(`Error testing ${page.name}:`, error.message);
            reject(error);
          } else {
            resolve();
          }
        });
      });

      // Read and parse results
      const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
      const scores = {
        performance: Math.round(report.categories.performance.score * 100),
        accessibility: Math.round(report.categories.accessibility.score * 100),
        bestPractices: Math.round(
          report.categories["best-practices"].score * 100,
        ),
        seo: Math.round(report.categories.seo.score * 100),
      };

      // Get Core Web Vitals
      const metrics = report.audits.metrics.details.items[0];
      const webVitals = {
        lcp: report.audits["largest-contentful-paint"].numericValue,
        fid: report.audits["max-potential-fid"].numericValue,
        cls: report.audits["cumulative-layout-shift"].numericValue,
      };

      results.push({
        page: page.name,
        path: page.path,
        scores,
        webVitals,
        passed: checkLighthouseThresholds(scores, webVitals),
      });

      console.log(`✅ ${page.name} tested successfully`);
      console.log(`   Performance: ${scores.performance}/100`);
      console.log(`   LCP: ${webVitals.lcp.toFixed(0)}ms`);
      console.log(`   FID: ${webVitals.fid.toFixed(0)}ms`);
      console.log(`   CLS: ${webVitals.cls.toFixed(3)}\n`);
    } catch (error) {
      console.error(`❌ Failed to test ${page.name}:`, error.message);
      results.push({
        page: page.name,
        path: page.path,
        error: error.message,
        passed: false,
      });
    }
  }

  return results;
}

/**
 * Check if Lighthouse scores meet thresholds
 */
function checkLighthouseThresholds(scores, webVitals) {
  return (
    scores.performance >= THRESHOLDS.performance &&
    scores.accessibility >= THRESHOLDS.accessibility &&
    scores.bestPractices >= THRESHOLDS.bestPractices &&
    scores.seo >= THRESHOLDS.seo &&
    webVitals.lcp <= THRESHOLDS.lcp &&
    webVitals.fid <= THRESHOLDS.fid &&
    webVitals.cls <= THRESHOLDS.cls
  );
}

/**
 * Run API performance tests
 */
async function runAPITests() {
  console.log("🚀 Running API performance tests...\n");

  const results = [];

  for (const endpoint of API_ENDPOINTS) {
    console.log(
      `Testing ${endpoint.name} (${endpoint.method} ${endpoint.path})...`,
    );

    const metrics = {
      responseTimes: [],
      errors: 0,
      totalRequests: 0,
    };

    // Run multiple requests to get average
    const numRequests = 10;

    for (let i = 0; i < numRequests; i++) {
      const startTime = Date.now();

      try {
        const options = {
          method: endpoint.method,
          headers: {
            "Content-Type": "application/json",
          },
        };

        // Add body for POST requests
        if (endpoint.method === "POST") {
          options.body = JSON.stringify(getTestPayload(endpoint.path));
        }

        const response = await fetch(`${BASE_URL}${endpoint.path}`, options);
        const responseTime = Date.now() - startTime;

        metrics.responseTimes.push(responseTime);
        metrics.totalRequests++;

        if (!response.ok) {
          metrics.errors++;
        }
      } catch (error) {
        metrics.errors++;
        metrics.totalRequests++;
      }
    }

    // Calculate metrics
    const avgResponseTime =
      metrics.responseTimes.length > 0
        ? metrics.responseTimes.reduce((a, b) => a + b, 0) /
          metrics.responseTimes.length
        : 0;

    const errorRate = metrics.errors / metrics.totalRequests;

    const passed =
      avgResponseTime <= THRESHOLDS.apiResponseTime &&
      errorRate <= THRESHOLDS.apiErrorRate;

    results.push({
      endpoint: endpoint.name,
      path: endpoint.path,
      method: endpoint.method,
      avgResponseTime,
      errorRate,
      passed,
    });

    console.log(`✅ ${endpoint.name} tested`);
    console.log(`   Avg Response Time: ${avgResponseTime.toFixed(0)}ms`);
    console.log(`   Error Rate: ${(errorRate * 100).toFixed(2)}%\n`);
  }

  return results;
}

/**
 * Get test payload for POST endpoints
 */
function getTestPayload(path) {
  const payloads = {
    "/api/weather/enhanced": {
      location: "New York, NY",
    },
  };

  return payloads[path] || {};
}

/**
 * Generate performance report
 */
function generateReport(lighthouseResults, apiResults) {
  const timestamp = new Date().toISOString();
  const reportPath = path.join(
    PERFORMANCE_REPORT_DIR,
    `performance-report-${timestamp.split("T")[0]}.json`,
  );

  const report = {
    timestamp,
    thresholds: THRESHOLDS,
    lighthouse: lighthouseResults,
    api: apiResults,
    summary: {
      lighthousePassed: lighthouseResults.filter((r) => r.passed).length,
      lighthouseTotal: lighthouseResults.length,
      apiPassed: apiResults.filter((r) => r.passed).length,
      apiTotal: apiResults.length,
    },
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  return report;
}

/**
 * Display summary
 */
function displaySummary(report) {
  console.log("\n📊 Performance Test Summary");
  console.log("===========================\n");

  console.log("🔦 Lighthouse Tests:");
  console.log(
    `   Passed: ${report.summary.lighthousePassed}/${report.summary.lighthouseTotal}`,
  );

  const failedPages = report.lighthouse.filter((r) => !r.passed);
  if (failedPages.length > 0) {
    console.log("   Failed pages:");
    failedPages.forEach((page) => {
      console.log(`   - ${page.page}`);
    });
  }

  console.log("\n🚀 API Tests:");
  console.log(
    `   Passed: ${report.summary.apiPassed}/${report.summary.apiTotal}`,
  );

  const failedAPIs = report.api.filter((r) => !r.passed);
  if (failedAPIs.length > 0) {
    console.log("   Failed endpoints:");
    failedAPIs.forEach((api) => {
      console.log(`   - ${api.endpoint}`);
    });
  }

  const allPassed =
    report.summary.lighthousePassed === report.summary.lighthouseTotal &&
    report.summary.apiPassed === report.summary.apiTotal;

  console.log(
    "\n" +
      (allPassed
        ? "✅ All performance tests passed!"
        : "❌ Some performance tests failed!"),
  );
  console.log(`\n📄 Full report saved to: performance-reports/`);

  return allPassed;
}

/**
 * Main execution
 */
async function main() {
  console.log("🏃 Starting Performance Tests\n");
  console.log(`Testing against: ${BASE_URL}\n`);

  try {
    // Check if Lighthouse is installed
    try {
      exec("npx lighthouse --version", (error) => {
        if (error) {
          console.log("Installing Lighthouse...");
        }
      });
    } catch (error) {
      // Lighthouse will be installed automatically by npx
    }

    // Run tests
    const lighthouseResults = await runLighthouseTests();
    const apiResults = await runAPITests();

    // Generate report
    const report = generateReport(lighthouseResults, apiResults);

    // Display summary
    const allPassed = displaySummary(report);

    // Exit with appropriate code
    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    console.error("❌ Performance test error:", error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { runLighthouseTests, runAPITests };
