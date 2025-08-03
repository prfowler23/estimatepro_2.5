#!/usr/bin/env node

/**
 * Bundle Size Tracking Script
 *
 * This script tracks bundle sizes after builds and stores them for monitoring.
 * It integrates with the performance monitoring system.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Configuration
const BUILD_DIR = path.join(process.cwd(), ".next");
const STATIC_DIR = path.join(BUILD_DIR, "static");
const SERVER_DIR = path.join(BUILD_DIR, "server");
const METRICS_FILE = path.join(process.cwd(), "bundle-metrics.json");
const HISTORY_FILE = path.join(process.cwd(), "bundle-history.json");

// Size thresholds (in KB)
const THRESHOLDS = {
  totalSize: 5000, // 5MB total
  jsSize: 2000, // 2MB JS
  cssSize: 500, // 500KB CSS
  pageSize: 300, // 300KB per page
  chunkSize: 200, // 200KB per chunk
};

function formatBytes(bytes) {
  const kb = bytes / 1024;
  return `${kb.toFixed(2)} KB`;
}

function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    return 0;
  }
}

function getDirectorySize(dirPath) {
  let totalSize = 0;

  try {
    const files = fs.readdirSync(dirPath);

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);

      if (stats.isDirectory()) {
        totalSize += getDirectorySize(filePath);
      } else {
        totalSize += stats.size;
      }
    }
  } catch (error) {
    // Directory doesn't exist
  }

  return totalSize;
}

function analyzeBundle() {
  console.log("📊 Analyzing bundle sizes...\n");

  const metrics = {
    timestamp: new Date().toISOString(),
    buildId: process.env.BUILD_ID || "unknown",
    bundles: {
      js: {},
      css: {},
      pages: {},
      chunks: {},
    },
    totals: {
      js: 0,
      css: 0,
      static: 0,
      server: 0,
      total: 0,
    },
    warnings: [],
  };

  // Check if build directory exists
  if (!fs.existsSync(BUILD_DIR)) {
    console.error('❌ Build directory not found. Run "npm run build" first.');
    process.exit(1);
  }

  // Analyze static files
  if (fs.existsSync(STATIC_DIR)) {
    const staticDirs = fs.readdirSync(STATIC_DIR);

    for (const dir of staticDirs) {
      const dirPath = path.join(STATIC_DIR, dir);

      if (fs.statSync(dirPath).isDirectory()) {
        const dirSize = getDirectorySize(dirPath);

        if (dir === "css") {
          metrics.totals.css = dirSize;

          // Analyze individual CSS files
          const cssFiles = fs.readdirSync(dirPath);
          for (const cssFile of cssFiles) {
            if (cssFile.endsWith(".css")) {
              const size = getFileSize(path.join(dirPath, cssFile));
              metrics.bundles.css[cssFile] = size;
            }
          }
        } else if (dir === "chunks") {
          // Analyze chunks
          const chunkFiles = fs.readdirSync(dirPath);
          for (const chunkFile of chunkFiles) {
            if (chunkFile.endsWith(".js")) {
              const size = getFileSize(path.join(dirPath, chunkFile));
              metrics.bundles.chunks[chunkFile] = size;
              metrics.totals.js += size;

              // Check chunk size threshold
              if (size > THRESHOLDS.chunkSize * 1024) {
                metrics.warnings.push({
                  type: "large-chunk",
                  file: chunkFile,
                  size: size,
                  threshold: THRESHOLDS.chunkSize * 1024,
                });
              }
            }
          }
        }

        metrics.totals.static += dirSize;
      }
    }
  }

  // Analyze server bundles
  if (fs.existsSync(SERVER_DIR)) {
    metrics.totals.server = getDirectorySize(SERVER_DIR);

    // Analyze page bundles
    const pagesDir = path.join(SERVER_DIR, "app");
    if (fs.existsSync(pagesDir)) {
      function analyzePages(dir, prefix = "") {
        const items = fs.readdirSync(dir);

        for (const item of items) {
          const itemPath = path.join(dir, item);
          const stats = fs.statSync(itemPath);

          if (stats.isDirectory()) {
            analyzePages(itemPath, path.join(prefix, item));
          } else if (item === "page.js") {
            const size = stats.size;
            const pageName = prefix || "index";
            metrics.bundles.pages[pageName] = size;

            // Check page size threshold
            if (size > THRESHOLDS.pageSize * 1024) {
              metrics.warnings.push({
                type: "large-page",
                page: pageName,
                size: size,
                threshold: THRESHOLDS.pageSize * 1024,
              });
            }
          }
        }
      }

      analyzePages(pagesDir);
    }
  }

  // Calculate total
  metrics.totals.total = metrics.totals.static + metrics.totals.server;

  // Check total size threshold
  if (metrics.totals.total > THRESHOLDS.totalSize * 1024) {
    metrics.warnings.push({
      type: "large-total",
      size: metrics.totals.total,
      threshold: THRESHOLDS.totalSize * 1024,
    });
  }

  // Check JS size threshold
  if (metrics.totals.js > THRESHOLDS.jsSize * 1024) {
    metrics.warnings.push({
      type: "large-js",
      size: metrics.totals.js,
      threshold: THRESHOLDS.jsSize * 1024,
    });
  }

  // Check CSS size threshold
  if (metrics.totals.css > THRESHOLDS.cssSize * 1024) {
    metrics.warnings.push({
      type: "large-css",
      size: metrics.totals.css,
      threshold: THRESHOLDS.cssSize * 1024,
    });
  }

  return metrics;
}

function saveMetrics(metrics) {
  // Save current metrics
  fs.writeFileSync(METRICS_FILE, JSON.stringify(metrics, null, 2));

  // Update history
  let history = [];
  if (fs.existsSync(HISTORY_FILE)) {
    history = JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8"));
  }

  // Add current metrics to history
  history.push({
    timestamp: metrics.timestamp,
    buildId: metrics.buildId,
    totals: metrics.totals,
    warningCount: metrics.warnings.length,
  });

  // Keep only last 30 builds
  if (history.length > 30) {
    history = history.slice(-30);
  }

  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

function displayResults(metrics) {
  console.log("📦 Bundle Size Report");
  console.log("====================\n");

  console.log("📊 Totals:");
  console.log(`  Total Size: ${formatBytes(metrics.totals.total)}`);
  console.log(`  JavaScript: ${formatBytes(metrics.totals.js)}`);
  console.log(`  CSS: ${formatBytes(metrics.totals.css)}`);
  console.log(`  Static: ${formatBytes(metrics.totals.static)}`);
  console.log(`  Server: ${formatBytes(metrics.totals.server)}`);

  if (metrics.bundles.pages && Object.keys(metrics.bundles.pages).length > 0) {
    console.log("\n📄 Page Sizes:");
    const sortedPages = Object.entries(metrics.bundles.pages)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10); // Top 10 largest pages

    for (const [page, size] of sortedPages) {
      console.log(`  ${page}: ${formatBytes(size)}`);
    }
  }

  if (
    metrics.bundles.chunks &&
    Object.keys(metrics.bundles.chunks).length > 0
  ) {
    console.log("\n📦 Largest Chunks:");
    const sortedChunks = Object.entries(metrics.bundles.chunks)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10); // Top 10 largest chunks

    for (const [chunk, size] of sortedChunks) {
      console.log(`  ${chunk}: ${formatBytes(size)}`);
    }
  }

  if (metrics.warnings.length > 0) {
    console.log("\n⚠️  Warnings:");
    for (const warning of metrics.warnings) {
      switch (warning.type) {
        case "large-total":
          console.log(
            `  ❌ Total bundle size (${formatBytes(warning.size)}) exceeds threshold (${formatBytes(warning.threshold)})`,
          );
          break;
        case "large-js":
          console.log(
            `  ❌ JavaScript size (${formatBytes(warning.size)}) exceeds threshold (${formatBytes(warning.threshold)})`,
          );
          break;
        case "large-css":
          console.log(
            `  ❌ CSS size (${formatBytes(warning.size)}) exceeds threshold (${formatBytes(warning.threshold)})`,
          );
          break;
        case "large-page":
          console.log(
            `  ⚠️  Page "${warning.page}" (${formatBytes(warning.size)}) exceeds threshold (${formatBytes(warning.threshold)})`,
          );
          break;
        case "large-chunk":
          console.log(
            `  ⚠️  Chunk "${warning.file}" (${formatBytes(warning.size)}) exceeds threshold (${formatBytes(warning.threshold)})`,
          );
          break;
      }
    }
  } else {
    console.log("\n✅ All bundle sizes within thresholds!");
  }

  // Compare with previous build
  if (fs.existsSync(HISTORY_FILE)) {
    const history = JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8"));
    if (history.length > 1) {
      const previous = history[history.length - 2];
      const current = metrics.totals;

      console.log("\n📈 Size Changes:");
      const totalDiff = current.total - previous.totals.total;
      const jsDiff = current.js - previous.totals.js;
      const cssDiff = current.css - previous.totals.css;

      console.log(
        `  Total: ${totalDiff > 0 ? "+" : ""}${formatBytes(totalDiff)}`,
      );
      console.log(
        `  JavaScript: ${jsDiff > 0 ? "+" : ""}${formatBytes(jsDiff)}`,
      );
      console.log(`  CSS: ${cssDiff > 0 ? "+" : ""}${formatBytes(cssDiff)}`);
    }
  }

  console.log("\n📊 Metrics saved to:", METRICS_FILE);
  console.log("📈 History saved to:", HISTORY_FILE);
}

// Main execution
function main() {
  try {
    const metrics = analyzeBundle();
    saveMetrics(metrics);
    displayResults(metrics);

    // Exit with error if there are critical warnings
    const hasCriticalWarnings = metrics.warnings.some(
      (w) => w.type === "large-total" || w.type === "large-js",
    );

    if (hasCriticalWarnings) {
      console.log("\n❌ Build exceeds size limits!");
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Error analyzing bundle:", error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { analyzeBundle, saveMetrics };
