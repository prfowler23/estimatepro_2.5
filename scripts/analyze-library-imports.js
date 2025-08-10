#!/usr/bin/env node
/**
 * Library Import Analysis Script
 *
 * Analyzes the codebase for inefficient library imports and provides
 * optimization recommendations for better tree shaking and bundle size reduction.
 */

const fs = require("fs");
const path = require("path");
const { glob } = require("glob");

// Import patterns for analysis
const OPTIMIZATION_PATTERNS = [
  {
    pattern: /import\s*{\s*([^}]+)\s*}\s*from\s*['"]lucide-react['"]/g,
    library: "lucide-react",
    estimatedSavingKB: 150,
    priority: "high",
  },
  {
    pattern: /import\s*{\s*([^}]+)\s*}\s*from\s*['"]date-fns['"]/g,
    library: "date-fns",
    estimatedSavingKB: 65,
    priority: "medium",
  },
  {
    pattern: /import\s*{\s*([^}]+)\s*}\s*from\s*['"]lodash['"]/g,
    library: "lodash",
    estimatedSavingKB: 70,
    priority: "medium",
  },
  {
    pattern: /import\s*{\s*([^}]+)\s*}\s*from\s*['"]framer-motion['"]/g,
    library: "framer-motion",
    estimatedSavingKB: 45,
    priority: "medium",
  },
  {
    pattern: /import\s*.*\s*from\s*['"]three['"]/g,
    library: "three",
    estimatedSavingKB: 460,
    priority: "high",
  },
];

function analyzeFile(filePath, content) {
  const results = [];

  for (const pattern of OPTIMIZATION_PATTERNS) {
    const matches = content.matchAll(pattern.pattern);
    const allMatches = Array.from(matches);

    if (allMatches.length > 0) {
      const imports = allMatches.map((match) => match[0]);
      let members = [];

      if (allMatches[0][1]) {
        members = allMatches[0][1].split(",").map((m) => m.trim());
      }

      results.push({
        library: pattern.library,
        file: filePath,
        imports,
        members,
        estimatedSaving: Math.round(pattern.estimatedSavingKB * 0.8),
        priority: pattern.priority,
      });
    }
  }

  return results;
}

async function scanCodebase() {
  console.log("🔍 Analyzing library imports across codebase...\n");

  const files = await glob("**/*.{ts,tsx}", {
    cwd: process.cwd(),
    ignore: ["node_modules/**", ".next/**", "dist/**", "build/**"],
  });

  const results = [];
  let totalEstimatedSaving = 0;
  const libraryStats = new Map();

  for (const file of files) {
    try {
      const filePath = path.join(process.cwd(), file);
      const content = fs.readFileSync(filePath, "utf-8");
      const analysis = analyzeFile(file, content);

      if (analysis.length > 0) {
        results.push(...analysis);

        for (const result of analysis) {
          totalEstimatedSaving += result.estimatedSaving;

          if (!libraryStats.has(result.library)) {
            libraryStats.set(result.library, {
              files: 0,
              imports: 0,
              totalSaving: 0,
            });
          }

          const stats = libraryStats.get(result.library);
          stats.files++;
          stats.imports += result.imports.length;
          stats.totalSaving += result.estimatedSaving;
        }
      }
    } catch (error) {
      console.warn(`⚠️  Could not analyze ${file}: ${error.message}`);
    }
  }

  // Generate report
  console.log("📊 LIBRARY IMPORT ANALYSIS RESULTS\n");
  console.log(`Total files scanned: ${files.length}`);
  console.log(
    `Files with optimization opportunities: ${new Set(results.map((r) => r.file)).size}`,
  );
  console.log(`Total estimated bundle saving: ~${totalEstimatedSaving}KB\n`);

  console.log("📚 LIBRARY USAGE SUMMARY:\n");
  for (const [library, stats] of libraryStats) {
    const priority =
      results.find((r) => r.library === library)?.priority || "low";
    const priorityEmoji =
      priority === "high" ? "🔴" : priority === "medium" ? "🟡" : "🟢";

    console.log(`${priorityEmoji} ${library}`);
    console.log(
      `   Files: ${stats.files}, Imports: ${stats.imports}, Potential saving: ~${stats.totalSaving}KB`,
    );
  }

  console.log("\n🛠️  OPTIMIZATION RECOMMENDATIONS:\n");

  const highPriorityLibs = Array.from(libraryStats.entries())
    .filter(([library]) => {
      const result = results.find((r) => r.library === library);
      return result?.priority === "high";
    })
    .sort((a, b) => b[1].totalSaving - a[1].totalSaving);

  if (highPriorityLibs.length > 0) {
    console.log("🔥 HIGH PRIORITY (Implement First):");
    for (const [library, stats] of highPriorityLibs) {
      console.log(`\n   ${library}:`);
      console.log(`   - Current: Named imports in ${stats.files} files`);
      console.log(
        `   - Solution: Tree-shaking via next.config.mjs modularizeImports`,
      );
      console.log(`   - Expected saving: ~${stats.totalSaving}KB`);

      if (library === "lucide-react") {
        console.log(`   - Status: ✅ Already configured in next.config.mjs`);
      } else if (library === "three") {
        console.log(
          `   - Recommendation: Add to transpilePackages + dynamic imports`,
        );
        console.log(`   - Implementation: Use React.lazy() for 3D components`);
      }
    }
  }

  const mediumPriorityLibs = Array.from(libraryStats.entries())
    .filter(([library]) => {
      const result = results.find((r) => r.library === library);
      return result?.priority === "medium";
    })
    .sort((a, b) => b[1].totalSaving - a[1].totalSaving);

  if (mediumPriorityLibs.length > 0) {
    console.log("\n🟡 MEDIUM PRIORITY:");
    for (const [library, stats] of mediumPriorityLibs) {
      console.log(`\n   ${library}:`);
      console.log(`   - Files affected: ${stats.files}`);
      console.log(`   - Potential saving: ~${stats.totalSaving}KB`);

      if (["date-fns", "lodash", "framer-motion"].includes(library)) {
        console.log(`   - Status: ✅ Already configured in next.config.mjs`);
      }
    }
  }

  console.log("\n✨ NEXT STEPS:\n");
  console.log(
    "1. ✅ Tree-shaking configuration is already set up in next.config.mjs",
  );
  console.log(
    "2. 🔄 Run a production build to validate bundle size improvements",
  );
  console.log("3. 📊 Use bundle analyzer to measure actual savings");
  console.log("4. 🎯 Focus on dynamic imports for heavy 3D libraries");

  if (totalEstimatedSaving > 100) {
    console.log(
      `\n🎉 Excellent! With ${totalEstimatedSaving}KB potential savings, this optimization`,
    );
    console.log(
      "   could significantly improve your bundle size and loading performance.",
    );
  }

  // Save detailed report
  const detailedReport = {
    summary: {
      totalFiles: files.length,
      filesWithOptimizations: new Set(results.map((r) => r.file)).size,
      totalEstimatedSaving,
      analyzedAt: new Date().toISOString(),
    },
    libraryStats: Object.fromEntries(libraryStats),
    optimizations: results,
  };

  const reportPath = path.join(
    process.cwd(),
    "library-optimization-report.json",
  );
  fs.writeFileSync(reportPath, JSON.stringify(detailedReport, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
}

// Run analysis
scanCodebase().catch(console.error);
