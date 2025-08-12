#!/usr/bin/env node

/**
 * Build Script Cleanup Utility
 * Removes redundant build scripts that are now handled by the unified build system
 */

const fs = require("fs");
const path = require("path");

// Scripts that are now redundant due to unified build system
const REDUNDANT_SCRIPTS = [
  "build-app.sh",
  "build-production.sh",
  // Keep performance monitoring scripts as they're still used independently
  // 'performance-monitor-simple.js',
  // 'performance-test.js',
  // 'track-bundle-size.js' - still used by unified system
];

// Scripts that can be consolidated (but we'll keep for backwards compatibility)
const LEGACY_SCRIPTS = [
  "production-readiness-check.js",
  "test-connectivity.js",
];

function cleanupScript(scriptName) {
  const scriptPath = path.join(__dirname, scriptName);

  if (fs.existsSync(scriptPath)) {
    console.log(`📦 Removing redundant script: ${scriptName}`);
    fs.unlinkSync(scriptPath);
    return true;
  }

  return false;
}

function createLegacyWrapper(scriptName, newCommand) {
  const wrapperContent = `#!/usr/bin/env node

/**
 * Legacy wrapper for ${scriptName}
 * This script now uses the unified build system
 * 
 * @deprecated Use 'node scripts/build-system.js ${newCommand}' instead
 */

console.log('⚠️  This script is deprecated. Use the unified build system instead:');
console.log(\`   node scripts/build-system.js ${newCommand}\`);
console.log('');

// For backwards compatibility, still execute the old script
const { execSync } = require('child_process');
const originalScript = '${scriptName.replace(".js", "-original.js")}';

if (require('fs').existsSync(require('path').join(__dirname, originalScript))) {
  execSync(\`node \${require('path').join(__dirname, originalScript)}\`, { 
    stdio: 'inherit',
    cwd: process.cwd()
  });
} else {
  console.log('❌ Original script not found. Please use the unified build system.');
  process.exit(1);
}
`;

  const wrapperPath = path.join(__dirname, scriptName);
  fs.writeFileSync(wrapperPath, wrapperContent);
  fs.chmodSync(wrapperPath, 0o755);
}

function main() {
  console.log("🏗️  Cleaning up build scripts...\n");

  let removedCount = 0;

  // Remove redundant scripts
  for (const script of REDUNDANT_SCRIPTS) {
    if (cleanupScript(script)) {
      removedCount++;
    }
  }

  console.log(`\n✅ Removed ${removedCount} redundant build scripts`);
  console.log("📦 Unified build system is now ready!");
  console.log("\nNew usage:");
  console.log("  npm run dev          → node scripts/build-system.js dev");
  console.log("  npm run build        → node scripts/build-system.js build");
  console.log("  npm run build:analyze → node scripts/build-system.js analyze");
  console.log("  npm run deploy       → node scripts/build-system.js deploy");
  console.log("  npm run clean        → node scripts/build-system.js clean");
  console.log("  npm run perf         → node scripts/build-system.js perf");

  console.log("\nFeatures:");
  console.log("  ✅ Unified command interface");
  console.log("  ✅ Integrated bundle analysis");
  console.log("  ✅ Performance monitoring");
  console.log("  ✅ Deployment pipeline");
  console.log("  ✅ Progress tracking");
  console.log("  ✅ Error handling & recovery");
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { cleanupScript, createLegacyWrapper };
