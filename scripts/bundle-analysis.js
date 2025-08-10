#!/usr/bin/env node

/**
 * Bundle Analysis Script
 * Analyzes bundle sizes and provides optimization recommendations
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Color codes for output
const colors = {
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
};

// Size thresholds (in KB)
const thresholds = {
  small: 50,
  medium: 250,
  large: 500,
  critical: 1000,
};

function formatSize(bytes) {
  const sizes = ["B", "KB", "MB", "GB"];
  if (bytes === 0) return "0 B";
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
}

function getSizeCategory(sizeKB) {
  if (sizeKB < thresholds.small) return { color: colors.green, label: "SMALL" };
  if (sizeKB < thresholds.medium)
    return { color: colors.blue, label: "MEDIUM" };
  if (sizeKB < thresholds.large)
    return { color: colors.yellow, label: "LARGE" };
  return { color: colors.red, label: "CRITICAL" };
}

function analyzeFile(filePath) {
  const stats = fs.statSync(filePath);
  const sizeKB = stats.size / 1024;
  const category = getSizeCategory(sizeKB);

  return {
    path: filePath,
    size: stats.size,
    sizeKB,
    category,
  };
}

function findLargeFiles(
  dir,
  extensions = [".js", ".ts", ".tsx", ".jsx"],
  minSizeKB = 10,
) {
  const files = [];

  function scanDir(currentDir) {
    if (
      currentDir.includes("node_modules") ||
      currentDir.includes(".git") ||
      currentDir.includes(".next")
    ) {
      return;
    }

    const entries = fs.readdirSync(currentDir);

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        scanDir(fullPath);
      } else if (extensions.some((ext) => entry.endsWith(ext))) {
        const analysis = analyzeFile(fullPath);
        if (analysis.sizeKB >= minSizeKB) {
          files.push(analysis);
        }
      }
    }
  }

  scanDir(dir);
  return files.sort((a, b) => b.size - a.size);
}

function analyzeImages() {
  console.log(`\n${colors.bold}📸 IMAGE ANALYSIS${colors.reset}`);
  console.log("================================");

  const publicDir = "./public";
  if (!fs.existsSync(publicDir)) {
    console.log("Public directory not found");
    return [];
  }

  const imageExtensions = [
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".svg",
    ".webp",
    ".ico",
  ];
  const images = findLargeFiles(publicDir, imageExtensions, 1); // 1KB minimum

  let totalSize = 0;
  const optimizationOpportunities = [];

  console.log("\nLargest images:");
  images.slice(0, 10).forEach((img, index) => {
    const relativePath = path.relative(".", img.path);
    console.log(
      `${index + 1}. ${img.category.color}${relativePath}${colors.reset} - ${formatSize(img.size)}`,
    );

    totalSize += img.size;

    // Check for optimization opportunities
    if (img.path.endsWith(".png") && img.sizeKB > 50) {
      optimizationOpportunities.push({
        file: relativePath,
        issue: "Large PNG - consider WebP/AVIF",
        potentialSaving: `~${Math.round(img.sizeKB * 0.4)}KB`,
      });
    }

    if (img.path.endsWith(".jpg") && img.sizeKB > 100) {
      optimizationOpportunities.push({
        file: relativePath,
        issue: "Large JPEG - reduce quality or convert to WebP",
        potentialSaving: `~${Math.round(img.sizeKB * 0.3)}KB`,
      });
    }
  });

  console.log(`\nTotal image size: ${formatSize(totalSize)}`);

  if (optimizationOpportunities.length > 0) {
    console.log(`\n${colors.yellow}Optimization opportunities:${colors.reset}`);
    optimizationOpportunities.forEach((opp) => {
      console.log(`• ${opp.file}: ${opp.issue} (save ${opp.potentialSaving})`);
    });
  }

  return images;
}

function analyzeComponents() {
  console.log(`\n${colors.bold}⚛️  COMPONENT ANALYSIS${colors.reset}`);
  console.log("================================");

  const componentsDir = "./components";
  if (!fs.existsSync(componentsDir)) {
    console.log("Components directory not found");
    return [];
  }

  const components = findLargeFiles(componentsDir, [".tsx", ".jsx"], 5); // 5KB minimum

  console.log("\nLargest components:");
  components.slice(0, 10).forEach((comp, index) => {
    const relativePath = path.relative(".", comp.path);
    console.log(
      `${index + 1}. ${comp.category.color}${relativePath}${colors.reset} - ${formatSize(comp.size)}`,
    );
  });

  // Find components that might benefit from code splitting
  const largeSingleFiles = components.filter((c) => c.sizeKB > 20);
  if (largeSingleFiles.length > 0) {
    console.log(`\n${colors.yellow}Code splitting candidates:${colors.reset}`);
    largeSingleFiles.slice(0, 5).forEach((comp) => {
      const relativePath = path.relative(".", comp.path);
      console.log(`• ${relativePath} (${formatSize(comp.size)})`);
    });
  }

  return components;
}

function analyzeLibFiles() {
  console.log(`\n${colors.bold}📚 LIBRARY/UTILITIES ANALYSIS${colors.reset}`);
  console.log("================================");

  const libDir = "./lib";
  if (!fs.existsSync(libDir)) {
    console.log("Lib directory not found");
    return [];
  }

  const libFiles = findLargeFiles(libDir, [".ts", ".tsx", ".js"], 3); // 3KB minimum

  console.log("\nLargest library files:");
  libFiles.slice(0, 10).forEach((file, index) => {
    const relativePath = path.relative(".", file.path);
    console.log(
      `${index + 1}. ${file.category.color}${relativePath}${colors.reset} - ${formatSize(file.size)}`,
    );
  });

  return libFiles;
}

function generateReport() {
  console.log(`\n${colors.bold}📊 OPTIMIZATION RECOMMENDATIONS${colors.reset}`);
  console.log("================================");

  const recommendations = [
    {
      category: "Images",
      items: [
        "Convert large PNG files to WebP/AVIF format",
        "Implement responsive images with srcset",
        "Use blur placeholders for better loading experience",
        "Enable image compression in Next.js config",
      ],
    },
    {
      category: "Components",
      items: [
        "Split large components (>20KB) into smaller modules",
        "Implement dynamic imports for non-critical components",
        "Use React.lazy for route-level code splitting",
        "Extract reusable logic into custom hooks",
      ],
    },
    {
      category: "Bundle Size",
      items: [
        "Analyze bundle with webpack-bundle-analyzer",
        "Remove unused dependencies",
        "Use tree shaking for icon libraries",
        "Implement route-based code splitting",
      ],
    },
    {
      category: "Performance",
      items: [
        "Enable compression in production",
        "Implement preloading for critical resources",
        "Use service worker for caching",
        "Optimize third-party script loading",
      ],
    },
  ];

  recommendations.forEach((rec) => {
    console.log(`\n${colors.blue}${rec.category}:${colors.reset}`);
    rec.items.forEach((item) => {
      console.log(`  • ${item}`);
    });
  });
}

function checkBuildOutput() {
  console.log(`\n${colors.bold}🏗️  BUILD OUTPUT ANALYSIS${colors.reset}`);
  console.log("================================");

  const buildDir = "./.next";
  if (!fs.existsSync(buildDir)) {
    console.log('No build output found. Run "npm run build" first.');
    return;
  }

  const staticDir = path.join(buildDir, "static");
  if (fs.existsSync(staticDir)) {
    const chunks = findLargeFiles(staticDir, [".js"], 10); // 10KB minimum

    console.log("\nLargest JavaScript chunks:");
    chunks.slice(0, 10).forEach((chunk, index) => {
      const relativePath = path.relative(buildDir, chunk.path);
      console.log(
        `${index + 1}. ${chunk.category.color}${relativePath}${colors.reset} - ${formatSize(chunk.size)}`,
      );
    });

    const totalJSSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
    console.log(`\nTotal JavaScript size: ${formatSize(totalJSSize)}`);

    // Check for large chunks
    const largeChunks = chunks.filter((c) => c.sizeKB > 500);
    if (largeChunks.length > 0) {
      console.log(`\n${colors.red}⚠️  Large chunks detected:${colors.reset}`);
      largeChunks.forEach((chunk) => {
        const relativePath = path.relative(buildDir, chunk.path);
        console.log(`• ${relativePath} - Consider code splitting`);
      });
    }
  }
}

function main() {
  console.log(`${colors.bold}🔍 EstimatePro Bundle Analysis${colors.reset}`);
  console.log("==============================\n");

  try {
    analyzeImages();
    analyzeComponents();
    analyzeLibFiles();
    checkBuildOutput();
    generateReport();

    console.log(`\n${colors.green}✅ Analysis complete!${colors.reset}`);
    console.log("\nNext steps:");
    console.log('1. Run "npm run build" to generate production bundles');
    console.log(
      '2. Run "ANALYZE=true npm run build" for detailed bundle analysis',
    );
    console.log("3. Implement image optimization recommendations");
    console.log("4. Consider code splitting for large components\n");
  } catch (error) {
    console.error(
      `${colors.red}Error during analysis:${colors.reset}`,
      error.message,
    );
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  analyzeImages,
  analyzeComponents,
  analyzeLibFiles,
  formatSize,
  getSizeCategory,
};
