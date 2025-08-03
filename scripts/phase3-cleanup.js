#!/usr/bin/env node

/**
 * Phase 3: Code Consolidation and Cleanup Script
 *
 * This script performs automated cleanup tasks:
 * 1. Removes confirmed duplicate files
 * 2. Logs consolidation opportunities
 * 3. Creates backup of deleted files
 */

const fs = require("fs");
const path = require("path");

// Files to delete (confirmed unused)
const filesToDelete = [
  // Already deleted manually:
  // 'lib/services/auto-save-service-optimized.ts',
  // 'lib/services/real-time-pricing-service-optimized.ts',
];

// Consolidation opportunities to log
const consolidationNeeded = [
  {
    category: "AI Endpoints",
    duplicates: [
      "app/api/ai/facade-analysis/route.ts",
      "app/api/ai/analyze-facade/route.ts",
    ],
    recommendation: "Merge into single facade-analysis endpoint",
  },
  {
    category: "Weather Services",
    duplicates: [
      "lib/services/weather-service.ts",
      "lib/weather/weather-service.ts",
      "lib/weather/enhanced-weather-service.ts",
      "lib/weather/weather-analysis-service.ts",
    ],
    recommendation:
      "Consolidate into single weather service with clear separation of concerns",
  },
  {
    category: "Analytics Services",
    duplicates: [
      "lib/services/analytics-service.ts",
      "lib/services/analytics-metrics-service.ts",
      "lib/analytics/enhanced-analytics-service.ts",
    ],
    recommendation: "Review purpose of each and consolidate if overlapping",
  },
];

console.log("🧹 Phase 3: Code Consolidation and Cleanup\n");

// Create backup directory
const backupDir = path.join(process.cwd(), ".backup-phase3");
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir);
  console.log(`✅ Created backup directory: ${backupDir}\n`);
}

// Delete unused files
console.log("📁 Deleting unused files...");
let deletedCount = 0;

filesToDelete.forEach((file) => {
  const filePath = path.join(process.cwd(), file);

  if (fs.existsSync(filePath)) {
    // Create backup
    const backupPath = path.join(backupDir, path.basename(file));
    fs.copyFileSync(filePath, backupPath);

    // Delete file
    fs.unlinkSync(filePath);
    console.log(`  ❌ Deleted: ${file}`);
    console.log(`     ↳ Backup saved to: ${backupPath}`);
    deletedCount++;
  }
});

if (deletedCount === 0) {
  console.log("  ✅ No files to delete (already cleaned)");
}

console.log(`\n📊 Deleted ${deletedCount} files\n`);

// Log consolidation recommendations
console.log("🔍 Consolidation Opportunities:\n");

consolidationNeeded.forEach((item, index) => {
  console.log(`${index + 1}. ${item.category}`);
  console.log("   Files:");
  item.duplicates.forEach((file) => {
    console.log(`   - ${file}`);
  });
  console.log(`   📝 Recommendation: ${item.recommendation}\n`);
});

// Check for common code patterns
console.log("🔎 Code Pattern Analysis:\n");

// Count console.log occurrences
const countPattern = (pattern, fileExtensions) => {
  const { execSync } = require("child_process");
  try {
    const extensions = fileExtensions.join(" -o -name ");
    const command = `find . -name "${extensions}" -not -path "./node_modules/*" -not -path "./.next/*" -exec grep -l "${pattern}" {} \\; | wc -l`;
    return parseInt(execSync(command, { encoding: "utf8" }).trim());
  } catch (error) {
    return 0;
  }
};

const patterns = [
  {
    name: "Console.log statements",
    pattern: "console\\.log",
    extensions: ["*.ts", "*.tsx"],
  },
  {
    name: "TODO comments",
    pattern: "TODO:",
    extensions: ["*.ts", "*.tsx"],
  },
  {
    name: "PHASE comments",
    pattern: "// PHASE",
    extensions: ["*.ts", "*.tsx"],
  },
];

patterns.forEach(({ name, pattern, extensions }) => {
  const count = countPattern(pattern, extensions);
  console.log(`- ${name}: ${count} occurrences`);
});

console.log("\n✅ Phase 3 cleanup analysis complete!");
console.log("\n📋 Next Steps:");
console.log("1. Review consolidation opportunities above");
console.log("2. Manually merge duplicate functionality");
console.log("3. Run ESLint to fix import issues");
console.log("4. Remove console.log statements from production code");
console.log("5. Address TODO comments\n");
