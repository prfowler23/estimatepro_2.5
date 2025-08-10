#!/usr/bin/env node

/**
 * Route Optimization Analysis Script
 *
 * Analyzes route-level code splitting effectiveness and bundle impact
 * of the lazy loading implementation.
 */

const fs = require("fs");
const path = require("path");

console.log("\x1b[1m🚀 Route Optimization Analysis\x1b[0m");
console.log("==============================\n");

// ===========================================
// Route Analysis
// ===========================================

function analyzeRoutes() {
  console.log("\x1b[1m📍 ROUTE ANALYSIS\x1b[0m");
  console.log("================================\n");

  const appDir = path.join(process.cwd(), "app");
  const routeFiles = [];

  function findRouteFiles(dir) {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        findRouteFiles(fullPath);
      } else if (item === "page.tsx") {
        routeFiles.push(fullPath);
      }
    }
  }

  try {
    findRouteFiles(appDir);

    // Analyze each route file
    const routeAnalysis = routeFiles.map((filePath) => {
      const content = fs.readFileSync(filePath, "utf8");
      const relativePath = path.relative(process.cwd(), filePath);
      const routePath = relativePath
        .replace("app/", "/")
        .replace("/page.tsx", "")
        .replace(/\/\[[^\]]+\]/g, "/[dynamic]");

      const size = Buffer.byteLength(content, "utf8");

      // Check for lazy loading patterns
      const hasLazyLoading =
        content.includes("lazy(") || content.includes("dynamic(");
      const hasSuspense = content.includes("Suspense");
      const hasRouteOptimization =
        content.includes("useSmartNavigation") ||
        content.includes("route-optimization");

      // Count imports
      const imports = (content.match(/^import\s+.+$/gm) || []).length;

      return {
        path: routePath,
        filePath: relativePath,
        size,
        hasLazyLoading,
        hasSuspense,
        hasRouteOptimization,
        imports,
        priority: getPriority(routePath),
      };
    });

    // Sort by size
    routeAnalysis.sort((a, b) => b.size - a.size);

    console.log("Route files analyzed:");
    routeAnalysis.forEach((route, index) => {
      const sizeKB = (route.size / 1024).toFixed(2);
      const optimized =
        route.hasLazyLoading || route.hasRouteOptimization ? "✅" : "❌";
      const priority = route.priority;

      console.log(
        `${index + 1}. \x1b[32m${route.path}\x1b[0m - ${sizeKB} KB | ${optimized} | ${priority} priority`,
      );

      if (route.hasLazyLoading) {
        console.log(`   └─ Has lazy loading`);
      }
      if (route.hasRouteOptimization) {
        console.log(`   └─ Uses smart navigation`);
      }
      if (!route.hasLazyLoading && route.size > 5000) {
        console.log(`   └─ \x1b[33mRecommend: Add lazy loading\x1b[0m`);
      }
    });

    // Summary statistics
    const totalRoutes = routeAnalysis.length;
    const optimizedRoutes = routeAnalysis.filter(
      (r) => r.hasLazyLoading || r.hasRouteOptimization,
    ).length;
    const largeRoutes = routeAnalysis.filter((r) => r.size > 5000).length;
    const unoptimizedLargeRoutes = routeAnalysis.filter(
      (r) => r.size > 5000 && !r.hasLazyLoading,
    ).length;

    console.log(`\n\x1b[34mRoute Summary:\x1b[0m`);
    console.log(`• Total routes: ${totalRoutes}`);
    console.log(
      `• Optimized routes: ${optimizedRoutes} (${((optimizedRoutes / totalRoutes) * 100).toFixed(1)}%)`,
    );
    console.log(`• Large routes (>5KB): ${largeRoutes}`);
    console.log(`• Unoptimized large routes: ${unoptimizedLargeRoutes}`);

    return routeAnalysis;
  } catch (error) {
    console.log(`Error analyzing routes: ${error.message}`);
    return [];
  }
}

function getPriority(routePath) {
  const criticalRoutes = [
    "/dashboard",
    "/estimates",
    "/calculator",
    "/estimates/new/guided",
  ];
  const highRoutes = [
    "/ai-assistant",
    "/estimates/new",
    "/settings",
    "/analytics",
  ];
  const mediumRoutes = [
    "/ai-analytics",
    "/performance",
    "/audit",
    "/estimates/templates",
    "/3d-demo",
  ];

  if (criticalRoutes.includes(routePath)) return "critical";
  if (highRoutes.includes(routePath)) return "high";
  if (mediumRoutes.includes(routePath)) return "medium";
  return "low";
}

// ===========================================
// Lazy Loading Analysis
// ===========================================

function analyzeLazyLoading() {
  console.log("\n\x1b[1m⚛️  LAZY LOADING ANALYSIS\x1b[0m");
  console.log("================================\n");

  const lazyFiles = [
    "components/lazy-loading/route-lazy.tsx",
    "components/lazy-loading/dashboard-lazy.tsx",
    "components/lazy-loading/estimation-lazy.tsx",
    "components/lazy-loading/specialized-lazy.tsx",
  ];

  lazyFiles.forEach((file) => {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf8");
      const size = (Buffer.byteLength(content, "utf8") / 1024).toFixed(2);

      // Count lazy components
      const lazyComponents = (content.match(/export const Lazy\w+/g) || [])
        .length;
      const dynamicImports = (content.match(/dynamic\(/g) || []).length;

      console.log(`\x1b[32m${file}\x1b[0m - ${size} KB`);
      console.log(`  └─ Lazy components: ${lazyComponents}`);
      console.log(`  └─ Dynamic imports: ${dynamicImports}`);
    }
  });

  return lazyFiles.filter((file) =>
    fs.existsSync(path.join(process.cwd(), file)),
  ).length;
}

// ===========================================
// Bundle Size Estimation
// ===========================================

function estimateBundleSavings() {
  console.log("\n\x1b[1m📊 BUNDLE SIZE ESTIMATION\x1b[0m");
  console.log("================================\n");

  // Check if build output exists
  const buildDir = path.join(process.cwd(), ".next");
  if (!fs.existsSync(buildDir)) {
    console.log(
      '⚠️  No build output found. Run "npm run build" first for accurate analysis.',
    );
    return;
  }

  try {
    // Look for JavaScript chunks in the build output
    const staticDir = path.join(buildDir, "static", "chunks");
    if (fs.existsSync(staticDir)) {
      const chunks = fs
        .readdirSync(staticDir)
        .filter((file) => file.endsWith(".js"));

      console.log("JavaScript chunks found:");
      chunks.slice(0, 10).forEach((chunk, index) => {
        const chunkPath = path.join(staticDir, chunk);
        const stats = fs.statSync(chunkPath);
        const size = (stats.size / 1024).toFixed(2);
        console.log(`${index + 1}. ${chunk} - ${size} KB`);
      });

      const totalSize = chunks.reduce((total, chunk) => {
        const chunkPath = path.join(staticDir, chunk);
        const stats = fs.statSync(chunkPath);
        return total + stats.size;
      }, 0);

      console.log(
        `\nTotal chunk size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`,
      );

      // Estimate savings from lazy loading
      const estimatedSavings = totalSize * 0.3; // Conservative 30% reduction
      console.log(
        `Estimated savings from route optimization: ${(estimatedSavings / 1024 / 1024).toFixed(2)} MB`,
      );
    }
  } catch (error) {
    console.log(`Error analyzing build output: ${error.message}`);
  }
}

// ===========================================
// Optimization Recommendations
// ===========================================

function generateRecommendations(routeAnalysis) {
  console.log("\n\x1b[1m💡 OPTIMIZATION RECOMMENDATIONS\x1b[0m");
  console.log("================================\n");

  const recommendations = [];

  // Route-specific recommendations
  const unoptimizedLarge = routeAnalysis.filter(
    (r) => r.size > 5000 && !r.hasLazyLoading,
  );
  if (unoptimizedLarge.length > 0) {
    recommendations.push({
      type: "Route Optimization",
      priority: "High",
      message: `${unoptimizedLarge.length} large routes need lazy loading`,
      routes: unoptimizedLarge.map((r) => r.path),
    });
  }

  // Critical routes without smart navigation
  const criticalUnoptimized = routeAnalysis.filter(
    (r) => r.priority === "critical" && !r.hasRouteOptimization,
  );
  if (criticalUnoptimized.length > 0) {
    recommendations.push({
      type: "Smart Navigation",
      priority: "Medium",
      message: `${criticalUnoptimized.length} critical routes could benefit from smart navigation`,
      routes: criticalUnoptimized.map((r) => r.path),
    });
  }

  // High import count
  const heavyImports = routeAnalysis.filter((r) => r.imports > 15);
  if (heavyImports.length > 0) {
    recommendations.push({
      type: "Import Optimization",
      priority: "Medium",
      message: `${heavyImports.length} routes have heavy import counts (>15)`,
      routes: heavyImports.map((r) => r.path),
    });
  }

  recommendations.forEach((rec, index) => {
    console.log(
      `${index + 1}. \x1b[33m${rec.type}\x1b[0m (${rec.priority} priority)`,
    );
    console.log(`   ${rec.message}`);
    if (rec.routes && rec.routes.length <= 5) {
      console.log(`   Routes: ${rec.routes.join(", ")}`);
    }
    console.log("");
  });

  if (recommendations.length === 0) {
    console.log("🎉 All routes are well optimized!");
  }

  return recommendations;
}

// ===========================================
// Main Execution
// ===========================================

async function main() {
  const routeAnalysis = analyzeRoutes();
  const lazyModuleCount = analyzeLazyLoading();
  estimateBundleSavings();
  const recommendations = generateRecommendations(routeAnalysis);

  console.log("\n\x1b[32m✅ Route optimization analysis complete!\x1b[0m\n");

  console.log("Next steps:");
  console.log("1. Implement lazy loading for large unoptimized routes");
  console.log("2. Add smart navigation to critical routes");
  console.log(
    '3. Run "ANALYZE=true npm run build" for detailed bundle analysis',
  );
  console.log("4. Monitor route performance in production");
  console.log("5. Review and update route priority classifications");
}

if (require.main === module) {
  main().catch(console.error);
}
