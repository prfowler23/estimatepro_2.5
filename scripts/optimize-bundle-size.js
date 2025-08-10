#!/usr/bin/env node

/**
 * Bundle Size Optimization Tool
 * Analyzes bundle composition, identifies optimization opportunities, and implements code splitting strategies
 */

const fs = require("fs");
const path = require("path");
const { promisify } = require("util");

const readFile = promisify(fs.readFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

class BundleSizeOptimizer {
  constructor() {
    this.bundleAnalysis = new Map();
    this.dependencyGraph = new Map();
    this.lazyLoadCandidates = [];
    this.codeSplittingOpportunities = [];
    this.importOptimizations = [];
    this.treeshakingOpportunities = [];
    this.duplicateAnalysis = new Map();
  }

  async optimizeBundles(rootDir) {
    console.log("📦 Starting Bundle Size Optimization Analysis...\n");

    try {
      // Phase 1: Deep bundle composition analysis
      await this.analyzebundleComposition(rootDir);

      // Phase 2: Dependency graph analysis
      await this.analyzeDependencyGraph(rootDir);

      // Phase 3: Identify lazy loading opportunities
      await this.identifyLazyLoadingOpportunities(rootDir);

      // Phase 4: Code splitting analysis
      await this.analyzeCodeSplittingOpportunities(rootDir);

      // Phase 5: Import optimization analysis
      await this.analyzeImportOptimizations(rootDir);

      // Phase 6: Tree shaking opportunities
      await this.identifyTreeshakingOpportunities(rootDir);

      // Phase 7: Duplicate code analysis
      await this.analyzeDuplicateCode(rootDir);

      // Phase 8: Generate optimization plan
      this.generateOptimizationPlan();

      console.log("✅ Bundle optimization analysis completed successfully!");
    } catch (error) {
      console.error("❌ Bundle optimization analysis failed:", error.message);
      throw error;
    }
  }

  async analyzebundleComposition(rootDir) {
    console.log("🔍 Analyzing detailed bundle composition...");

    const directories = [
      { name: "components", path: "components", type: "ui" },
      { name: "pages", path: "app", type: "pages" },
      { name: "services", path: "lib/services", type: "business-logic" },
      { name: "utilities", path: "lib/utils", type: "utilities" },
      { name: "hooks", path: "hooks", type: "react-hooks" },
      { name: "contexts", path: "contexts", type: "state-management" },
      { name: "types", path: "lib/types", type: "type-definitions" },
    ];

    for (const dir of directories) {
      const dirPath = path.join(rootDir, dir.path);
      if (fs.existsSync(dirPath)) {
        await this.analyzeDirectory(dirPath, dir.name, dir.type);
      }
    }

    console.log(`  ✓ Analyzed ${this.bundleAnalysis.size} directories\n`);
  }

  async analyzeDirectory(dirPath, dirName, dirType) {
    const files = await this.getTypeScriptFiles(dirPath);
    let totalSize = 0;
    const fileAnalysis = [];
    const largeFiles = [];
    const complexFiles = [];

    for (const file of files) {
      try {
        const content = await readFile(file, "utf8");
        const stats = await stat(file);

        const analysis = {
          file: path.relative(dirPath, file),
          size: stats.size,
          lines: content.split("\n").length,
          imports: this.analyzeImports(content),
          exports: this.analyzeExports(content),
          complexity: this.calculateFileComplexity(content),
          bundleImpact: this.calculateBundleImpact(content, stats.size),
          lazyLoadable: this.assessLazyLoadability(content, file),
          treeshakable: this.assessTreeshakability(content),
          duplicateRisk: this.assessDuplicationRisk(content),
          optimizationScore: 0, // Will be calculated later
        };

        // Identify optimization opportunities
        if (stats.size > 15000) largeFiles.push(analysis); // >15KB
        if (analysis.complexity > 50) complexFiles.push(analysis);

        fileAnalysis.push(analysis);
        totalSize += stats.size;
      } catch (error) {
        console.warn(`    ⚠️  Error analyzing ${file}: ${error.message}`);
      }
    }

    // Calculate optimization scores
    fileAnalysis.forEach((file) => {
      file.optimizationScore = this.calculateOptimizationScore(file);
    });

    this.bundleAnalysis.set(dirName, {
      type: dirType,
      totalSize,
      fileCount: files.length,
      averageSize: totalSize / files.length,
      files: fileAnalysis.sort(
        (a, b) => b.optimizationScore - a.optimizationScore,
      ),
      largeFiles: largeFiles.sort((a, b) => b.size - a.size),
      complexFiles: complexFiles.sort((a, b) => b.complexity - a.complexity),
      optimizationPotential:
        this.calculateDirectoryOptimizationPotential(fileAnalysis),
      recommendations: this.generateDirectoryRecommendations(
        fileAnalysis,
        dirType,
      ),
    });

    console.log(
      `    ✓ ${dirName}: ${files.length} files, ${(totalSize / 1024).toFixed(1)}KB, ${largeFiles.length} large files`,
    );
  }

  async analyzeDependencyGraph(rootDir) {
    console.log("🔗 Analyzing dependency graph for bundle splitting...");

    const allFiles = await this.getAllTypeScriptFiles(rootDir);

    // Build comprehensive dependency graph
    for (const file of allFiles) {
      try {
        const content = await readFile(file, "utf8");
        const relativePath = path.relative(rootDir, file);

        const dependencies = this.extractDependencies(content);
        const dependents = [];

        // Find files that depend on this file
        for (const otherFile of allFiles) {
          if (otherFile !== file) {
            const otherContent = await readFile(otherFile, "utf8");
            const otherRelativePath = path.relative(rootDir, otherFile);

            if (
              this.fileImportsFile(
                otherContent,
                relativePath,
                otherRelativePath,
              )
            ) {
              dependents.push(otherRelativePath);
            }
          }
        }

        this.dependencyGraph.set(relativePath, {
          dependencies: dependencies.internal,
          dependents,
          externalDeps: dependencies.external,
          isShared: dependents.length > 2,
          isLeaf: dependencies.internal.length === 0,
          criticalityScore: this.calculateCriticalityScore(
            dependencies,
            dependents,
          ),
        });
      } catch (error) {
        console.warn(
          `    ⚠️  Error analyzing dependencies for ${file}: ${error.message}`,
        );
      }
    }

    console.log(
      `    ✓ Built dependency graph for ${this.dependencyGraph.size} files\n`,
    );
  }

  async identifyLazyLoadingOpportunities(rootDir) {
    console.log("⚡ Identifying lazy loading opportunities...");

    const componentDirs = ["components", "app"];
    let totalOpportunities = 0;

    for (const dirName of componentDirs) {
      const dirPath = path.join(rootDir, dirName);
      if (!fs.existsSync(dirPath)) continue;

      const files = await this.getTypeScriptFiles(dirPath);

      for (const file of files) {
        try {
          const content = await readFile(file, "utf8");
          const relativePath = path.relative(rootDir, file);

          if (this.canBeLazyLoaded(content, file)) {
            const opportunity = {
              file: relativePath,
              type: this.determineLazyLoadType(content, file),
              impact: this.calculateLazyLoadImpact(content),
              implementation: this.generateLazyLoadImplementation(
                content,
                file,
              ),
              priority: this.calculateLazyLoadPriority(content, file),
              estimatedSaving: this.estimateLazyLoadSaving(content),
            };

            this.lazyLoadCandidates.push(opportunity);
            totalOpportunities++;
          }
        } catch (error) {
          console.warn(
            `    ⚠️  Error analyzing lazy load for ${file}: ${error.message}`,
          );
        }
      }
    }

    // Sort by priority
    this.lazyLoadCandidates.sort((a, b) => b.priority - a.priority);

    console.log(
      `    ✓ Found ${totalOpportunities} lazy loading opportunities\n`,
    );
  }

  async analyzeCodeSplittingOpportunities(rootDir) {
    console.log("✂️  Analyzing code splitting opportunities...");

    // Analyze route-based splitting
    await this.analyzeRouteSplitting(path.join(rootDir, "app"));

    // Analyze vendor splitting
    await this.analyzeVendorSplitting(rootDir);

    // Analyze feature-based splitting
    await this.analyzeFeatureSplitting(rootDir);

    // Analyze shared chunk opportunities
    await this.analyzeSharedChunks(rootDir);

    console.log(
      `    ✓ Identified ${this.codeSplittingOpportunities.length} code splitting opportunities\n`,
    );
  }

  async analyzeImportOptimizations(rootDir) {
    console.log("📤 Analyzing import optimizations...");

    const allFiles = await this.getAllTypeScriptFiles(rootDir);

    for (const file of allFiles) {
      try {
        const content = await readFile(file, "utf8");
        const relativePath = path.relative(rootDir, file);

        const optimizations = this.analyzeFileImports(content, relativePath);

        if (optimizations.length > 0) {
          this.importOptimizations.push({
            file: relativePath,
            optimizations,
            impact: this.calculateImportOptimizationImpact(optimizations),
            priority: this.calculateImportOptimizationPriority(optimizations),
          });
        }
      } catch (error) {
        console.warn(
          `    ⚠️  Error analyzing imports for ${file}: ${error.message}`,
        );
      }
    }

    // Sort by impact
    this.importOptimizations.sort((a, b) => b.impact - a.impact);

    console.log(
      `    ✓ Found ${this.importOptimizations.length} import optimization opportunities\n`,
    );
  }

  async identifyTreeshakingOpportunities(rootDir) {
    console.log("🌲 Identifying tree shaking opportunities...");

    const libraryUsage = new Map();
    const allFiles = await this.getAllTypeScriptFiles(rootDir);

    for (const file of allFiles) {
      try {
        const content = await readFile(file, "utf8");
        const imports = this.extractImports(content);

        imports.forEach((imp) => {
          if (!imp.startsWith(".") && !imp.startsWith("@/")) {
            if (!libraryUsage.has(imp)) {
              libraryUsage.set(imp, {
                files: [],
                usedExports: new Set(),
                totalSize: 0,
              });
            }

            const usage = libraryUsage.get(imp);
            usage.files.push(path.relative(rootDir, file));

            // Analyze what's actually used from the library
            const usedExports = this.extractUsedExports(content, imp);
            usedExports.forEach((exp) => usage.usedExports.add(exp));
          }
        });
      } catch (error) {
        console.warn(
          `    ⚠️  Error analyzing treeshaking for ${file}: ${error.message}`,
        );
      }
    }

    // Analyze each library for tree shaking potential
    for (const [library, usage] of libraryUsage) {
      const opportunity = this.analyzeLibraryTreeshaking(library, usage);
      if (opportunity.potential > 0) {
        this.treeshakingOpportunities.push(opportunity);
      }
    }

    // Sort by potential savings
    this.treeshakingOpportunities.sort((a, b) => b.potential - a.potential);

    console.log(
      `    ✓ Analyzed ${libraryUsage.size} libraries for tree shaking\n`,
    );
  }

  async analyzeDuplicateCode(rootDir) {
    console.log("🔄 Analyzing duplicate code patterns...");

    const allFiles = await this.getAllTypeScriptFiles(rootDir);
    const codeHashes = new Map();
    const duplicatePatterns = [];

    for (const file of allFiles) {
      try {
        const content = await readFile(file, "utf8");
        const relativePath = path.relative(rootDir, file);

        // Analyze function-level duplication
        const functions = this.extractFunctions(content);

        functions.forEach((func) => {
          const hash = this.hashCode(func.body);

          if (!codeHashes.has(hash)) {
            codeHashes.set(hash, []);
          }

          codeHashes.get(hash).push({
            file: relativePath,
            function: func.name,
            size: func.body.length,
            lines: func.body.split("\n").length,
          });
        });
      } catch (error) {
        console.warn(
          `    ⚠️  Error analyzing duplicates for ${file}: ${error.message}`,
        );
      }
    }

    // Find actual duplicates
    for (const [hash, occurrences] of codeHashes) {
      if (occurrences.length > 1 && occurrences[0].size > 200) {
        duplicatePatterns.push({
          hash,
          occurrences,
          totalWaste: occurrences.reduce((sum, occ) => sum + occ.size, 0),
          deduplicationPotential:
            this.calculateDeduplicationPotential(occurrences),
        });
      }
    }

    // Sort by waste potential
    duplicatePatterns.sort((a, b) => b.totalWaste - a.totalWaste);

    this.duplicateAnalysis.set("patterns", duplicatePatterns);

    console.log(
      `    ✓ Found ${duplicatePatterns.length} duplicate code patterns\n`,
    );
  }

  // Helper methods for detailed analysis

  async getTypeScriptFiles(dir) {
    const files = [];

    const scan = async (currentDir) => {
      if (!fs.existsSync(currentDir)) return;

      const items = await readdir(currentDir);

      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stats = await stat(fullPath);

        if (
          stats.isDirectory() &&
          !item.startsWith(".") &&
          item !== "node_modules"
        ) {
          await scan(fullPath);
        } else if (
          (item.endsWith(".ts") || item.endsWith(".tsx")) &&
          !item.endsWith(".d.ts")
        ) {
          files.push(fullPath);
        }
      }
    };

    await scan(dir);
    return files;
  }

  async getAllTypeScriptFiles(rootDir) {
    const directories = ["components", "app", "lib", "hooks", "contexts"];
    const allFiles = [];

    for (const dir of directories) {
      const dirPath = path.join(rootDir, dir);
      if (fs.existsSync(dirPath)) {
        const files = await this.getTypeScriptFiles(dirPath);
        allFiles.push(...files);
      }
    }

    return allFiles;
  }

  analyzeImports(content) {
    const importRegex =
      /import\s+(?:{[^}]+}|\*\s+as\s+\w+|\w+)?\s*from\s+['"]([^'"]+)['"]/g;
    const imports = [];
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      imports.push({
        module: match[1],
        isExternal: !match[1].startsWith(".") && !match[1].startsWith("@/"),
        isDynamic: content.includes(`import("${match[1]}")`),
        hasDefaultImport: /import\s+\w+\s+from/.test(match[0]),
        hasNamedImports: /import\s+{[^}]+}\s+from/.test(match[0]),
        hasNamespaceImport: /import\s+\*\s+as\s+\w+\s+from/.test(match[0]),
      });
    }

    return imports;
  }

  analyzeExports(content) {
    const exports = [];

    // Named exports
    const namedExportRegex =
      /export\s+(?:const|function|class|interface|type)\s+(\w+)/g;
    let match;
    while ((match = namedExportRegex.exec(content)) !== null) {
      exports.push({ name: match[1], type: "named", isDefault: false });
    }

    // Default export
    if (content.includes("export default")) {
      exports.push({ name: "default", type: "default", isDefault: true });
    }

    // Re-exports
    const reExportRegex = /export\s+\*\s+from\s+['"]([^'"]+)['"]/g;
    while ((match = reExportRegex.exec(content)) !== null) {
      exports.push({ name: "*", type: "re-export", module: match[1] });
    }

    return exports;
  }

  calculateFileComplexity(content) {
    let score = 0;

    // Cyclomatic complexity indicators
    score += (content.match(/if\s*\(/g) || []).length;
    score += (content.match(/switch\s*\(/g) || []).length;
    score += (content.match(/for\s*\(/g) || []).length;
    score += (content.match(/while\s*\(/g) || []).length;
    score += (content.match(/catch\s*\(/g) || []).length;
    score += (content.match(/&&|\|\|/g) || []).length;

    // React complexity
    score += (content.match(/useState|useEffect|useCallback|useMemo/g) || [])
      .length;

    // Large inline objects/arrays
    score += (content.match(/\{[^}]{100,}\}/g) || []).length;
    score += (content.match(/\[[^\]]{100,}\]/g) || []).length;

    return score;
  }

  calculateBundleImpact(content, fileSize) {
    let impact = fileSize / 1024; // Base impact in KB

    // Heavy imports increase impact
    impact +=
      (content.match(/import.*from\s+['"](?!\.)[^'"]+['"]/g) || []).length * 5;

    // Large inline data structures
    impact += (content.match(/\{[^}]{200,}\}/g) || []).length * 10;

    // Unused code patterns
    if (content.includes("// TODO") || content.includes("// FIXME")) {
      impact += 5;
    }

    return impact;
  }

  assessLazyLoadability(content, filePath) {
    const fileName = path.basename(filePath);

    // Positive indicators
    let score = 0;
    if (content.includes("export default")) score += 3;
    if (fileName.includes("Modal") || fileName.includes("Dialog")) score += 2;
    if (fileName.includes("Chart") || fileName.includes("Graph")) score += 2;
    if (fileName.includes("Editor")) score += 2;
    if (content.includes("React.lazy") || content.includes("dynamic"))
      score -= 5; // Already lazy

    // Negative indicators
    if (content.includes("useEffect") && content.includes("[]")) score -= 1; // Side effects
    if (fileName.startsWith("use") && fileName.endsWith(".ts")) score -= 5; // Hooks
    if (content.includes("createContext")) score -= 3; // Context providers

    return score > 2;
  }

  assessTreeshakability(content) {
    // Files with named exports are more tree-shakable
    const namedExports = (
      content.match(/export\s+(?:const|function|class)/g) || []
    ).length;
    const reExports = (content.match(/export\s+\*/g) || []).length;
    const sideEffects =
      content.includes("window.") ||
      content.includes("document.") ||
      content.includes("localStorage");

    return {
      score: namedExports * 2 - reExports - (sideEffects ? 5 : 0),
      namedExports,
      reExports,
      hasSideEffects: sideEffects,
    };
  }

  assessDuplicationRisk(content) {
    // Look for patterns that are commonly duplicated
    let risk = 0;

    // Common utility patterns
    risk += (content.match(/const\s+\w+\s*=\s*\([^)]*\)\s*=>/g) || []).length;
    risk += (content.match(/interface\s+\w+\s*{[^}]+}/g) || []).length;

    // Error handling patterns
    risk += (content.match(/try\s*{[^}]+}\s*catch/g) || []).length;

    // Validation patterns
    risk += (content.match(/\.length\s*>\s*\d+|\.test\(/g) || []).length;

    return risk;
  }

  calculateOptimizationScore(file) {
    let score = 0;

    // Size impact
    score += Math.min(file.size / 1000, 20); // Max 20 points for size

    // Complexity impact
    score += Math.min(file.complexity / 5, 15); // Max 15 points for complexity

    // Bundle impact
    score += Math.min(file.bundleImpact / 10, 10); // Max 10 points for bundle impact

    // Optimization potential
    if (file.lazyLoadable) score += 15;
    if (file.treeshakable.score > 5) score += 10;
    if (file.duplicateRisk > 3) score += 8;

    return Math.min(score, 100);
  }

  calculateDirectoryOptimizationPotential(files) {
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    const lazyLoadableSize = files
      .filter((f) => f.lazyLoadable)
      .reduce((sum, f) => sum + f.size, 0);
    const optimizableSize = files
      .filter((f) => f.optimizationScore > 50)
      .reduce((sum, f) => sum + f.size, 0);

    return {
      totalOptimizable: optimizableSize,
      lazyLoadable: lazyLoadableSize,
      percentage: (optimizableSize / totalSize) * 100,
      fileCount: files.filter((f) => f.optimizationScore > 50).length,
    };
  }

  generateDirectoryRecommendations(files, dirType) {
    const recommendations = [];

    // Type-specific recommendations
    switch (dirType) {
      case "ui":
        recommendations.push("Implement component-level code splitting");
        recommendations.push("Use React.lazy for modal and dialog components");
        break;
      case "pages":
        recommendations.push("Implement route-based code splitting");
        recommendations.push("Use dynamic imports for page components");
        break;
      case "business-logic":
        recommendations.push("Split large services into smaller modules");
        recommendations.push(
          "Use dynamic imports for heavy computational modules",
        );
        break;
    }

    // Size-based recommendations
    const largeFiles = files.filter((f) => f.size > 15000);
    if (largeFiles.length > 0) {
      recommendations.push(
        `Break down ${largeFiles.length} large files (>15KB)`,
      );
    }

    return recommendations;
  }

  extractDependencies(content) {
    const internal = [];
    const external = [];

    const importRegex = /import.*from\s+['"]([^'"]+)['"]/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      const dep = match[1];
      if (dep.startsWith(".") || dep.startsWith("@/")) {
        internal.push(dep);
      } else {
        external.push(dep);
      }
    }

    return { internal, external };
  }

  fileImportsFile(content, targetPath, importerPath) {
    const targetFile = targetPath.replace(/\.(ts|tsx)$/, "");
    const importerDir = path.dirname(importerPath);

    // Calculate relative path from importer to target
    const relativePath = path.relative(importerDir, targetFile);

    return (
      content.includes(`from "./${relativePath}"`) ||
      content.includes(`from "../${relativePath}"`) ||
      content.includes(`from "@/${targetFile}"`)
    );
  }

  calculateCriticalityScore(dependencies, dependents) {
    // Files with many dependents are more critical
    let score = dependents.length * 3;

    // Files with many dependencies are less critical (leaf nodes)
    score -= dependencies.internal.length;

    // External dependencies add some criticality
    score += dependencies.external.length * 0.5;

    return Math.max(0, score);
  }

  canBeLazyLoaded(content, filePath) {
    return this.assessLazyLoadability(content, filePath);
  }

  determineLazyLoadType(content, filePath) {
    const fileName = path.basename(filePath);

    if (fileName.includes("Modal") || fileName.includes("Dialog"))
      return "modal";
    if (fileName.includes("Chart") || fileName.includes("Graph"))
      return "chart";
    if (fileName.includes("Editor")) return "editor";
    if (content.includes("export default") && content.includes("function"))
      return "component";

    return "module";
  }

  calculateLazyLoadImpact(content) {
    const fileSize = content.length;
    const imports = (content.match(/import/g) || []).length;

    // Estimate bundle impact based on size and imports
    return Math.min(fileSize / 1000 + imports * 2, 50);
  }

  generateLazyLoadImplementation(content, filePath) {
    const fileName = path.basename(filePath, path.extname(filePath));
    const isReactComponent =
      content.includes("export default") &&
      (content.includes("function") || content.includes("const"));

    if (isReactComponent) {
      return {
        type: "react-lazy",
        implementation: `const ${fileName} = React.lazy(() => import('./${fileName}'));`,
        wrapper: `<Suspense fallback={<Loading />}><${fileName} /></Suspense>`,
      };
    } else {
      return {
        type: "dynamic-import",
        implementation: `const ${fileName} = await import('./${fileName}');`,
      };
    }
  }

  calculateLazyLoadPriority(content, filePath) {
    let priority = this.calculateLazyLoadImpact(content);

    // Boost priority for certain patterns
    const fileName = path.basename(filePath);
    if (fileName.includes("Modal")) priority += 10;
    if (fileName.includes("Chart")) priority += 8;
    if (fileName.includes("Editor")) priority += 8;

    return priority;
  }

  estimateLazyLoadSaving(content) {
    // Estimate bytes saved by lazy loading
    const baseSize = content.length;
    const importCount = (content.match(/import/g) || []).length;

    return baseSize + importCount * 500; // Rough estimate
  }

  async analyzeRouteSplitting(appDir) {
    if (!fs.existsSync(appDir)) return;

    const routes = await this.findRouteFiles(appDir);

    for (const route of routes) {
      const content = await readFile(route, "utf8");
      const size = content.length;

      if (size > 5000) {
        // Routes larger than 5KB
        this.codeSplittingOpportunities.push({
          type: "route-splitting",
          file: route,
          size,
          recommendation: "Implement route-based code splitting",
          implementation: this.generateRouteSplittingImplementation(route),
          priority: Math.min(size / 1000, 20),
        });
      }
    }
  }

  async analyzeVendorSplitting(rootDir) {
    const packageJsonPath = path.join(rootDir, "package.json");
    if (!fs.existsSync(packageJsonPath)) return;

    const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
    const dependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    // Identify heavy libraries that should be split
    const heavyLibraries = [
      "react",
      "react-dom",
      "next",
      "lodash",
      "moment",
      "chart.js",
      "three",
      "d3",
      "@supabase/supabase-js",
    ];

    const presentHeavyLibs = heavyLibraries.filter((lib) => dependencies[lib]);

    if (presentHeavyLibs.length > 0) {
      this.codeSplittingOpportunities.push({
        type: "vendor-splitting",
        libraries: presentHeavyLibs,
        recommendation: "Split vendor libraries into separate chunks",
        implementation:
          this.generateVendorSplittingImplementation(presentHeavyLibs),
        priority: presentHeavyLibs.length * 3,
      });
    }
  }

  async analyzeFeatureSplitting(rootDir) {
    const featureDirs = ["components", "lib/services"];

    for (const featureDir of featureDirs) {
      const dirPath = path.join(rootDir, featureDir);
      if (!fs.existsSync(dirPath)) continue;

      const subdirs = await this.getSubdirectories(dirPath);

      for (const subdir of subdirs) {
        const files = await this.getTypeScriptFiles(subdir);
        const totalSize = await this.calculateDirectorySize(files);

        if (totalSize > 20000) {
          // Features larger than 20KB
          this.codeSplittingOpportunities.push({
            type: "feature-splitting",
            feature: path.basename(subdir),
            size: totalSize,
            fileCount: files.length,
            recommendation: "Implement feature-based code splitting",
            priority: Math.min(totalSize / 5000, 15),
          });
        }
      }
    }
  }

  async analyzeSharedChunks(rootDir) {
    // Analyze which modules are imported by multiple entry points
    const sharedModules = new Map();

    for (const [filePath, deps] of this.dependencyGraph) {
      deps.dependencies.forEach((dep) => {
        if (!sharedModules.has(dep)) {
          sharedModules.set(dep, new Set());
        }
        sharedModules.get(dep).add(filePath);
      });
    }

    // Find modules used by multiple files
    for (const [module, users] of sharedModules) {
      if (users.size > 2) {
        this.codeSplittingOpportunities.push({
          type: "shared-chunk",
          module,
          usedBy: Array.from(users),
          userCount: users.size,
          recommendation: "Extract into shared chunk",
          priority: users.size * 2,
        });
      }
    }
  }

  analyzeFileImports(content, filePath) {
    const optimizations = [];

    // Check for barrel imports that could be optimized
    const barrelImportRegex =
      /import\s+{[^}]+}\s+from\s+['"]([^'"]+\/index)['"]/g;
    let match;

    while ((match = barrelImportRegex.exec(content)) !== null) {
      optimizations.push({
        type: "barrel-import",
        module: match[1],
        recommendation:
          "Import directly from specific modules to improve tree shaking",
        impact: 5,
      });
    }

    // Check for unused imports
    const importRegex =
      /import\s+(?:{([^}]+)}|\*\s+as\s+(\w+)|(\w+))\s+from\s+['"]([^'"]+)['"]/g;
    while ((match = importRegex.exec(content)) !== null) {
      const namedImports = match[1];
      const namespaceImport = match[2];
      const defaultImport = match[3];
      const module = match[4];

      if (namedImports) {
        const imports = namedImports.split(",").map((imp) => imp.trim());
        const unused = imports.filter(
          (imp) =>
            !new RegExp(`\\b${imp}\\b`).test(
              content.slice(match.index + match[0].length),
            ),
        );

        if (unused.length > 0) {
          optimizations.push({
            type: "unused-import",
            module,
            unusedImports: unused,
            recommendation: "Remove unused imports",
            impact: unused.length * 2,
          });
        }
      }
    }

    // Check for heavy library imports
    const heavyLibraryRegex =
      /import.*from\s+['"](lodash|moment|chart\.js|three)['"]/g;
    while ((match = heavyLibraryRegex.exec(content)) !== null) {
      optimizations.push({
        type: "heavy-library",
        module: match[1],
        recommendation: "Use tree-shakable alternative or dynamic import",
        impact: 10,
      });
    }

    return optimizations;
  }

  calculateImportOptimizationImpact(optimizations) {
    return optimizations.reduce((sum, opt) => sum + opt.impact, 0);
  }

  calculateImportOptimizationPriority(optimizations) {
    const impact = this.calculateImportOptimizationImpact(optimizations);
    const complexity = optimizations.length;

    return impact + complexity * 0.5;
  }

  analyzeLibraryTreeshaking(library, usage) {
    const knownTreeshakable = [
      "lodash",
      "ramda",
      "date-fns",
      "rxjs",
      "@mui/material",
      "antd",
      "react-router",
    ];

    const knownNonTreeshakable = ["moment", "jquery", "bootstrap"];

    let potential = 0;
    let recommendations = [];

    if (knownTreeshakable.includes(library)) {
      potential = usage.files.length * 10; // High potential
      recommendations.push("Use named imports for better tree shaking");

      if (library === "lodash") {
        recommendations.push(
          "Consider using lodash-es for better tree shaking",
        );
      }
    } else if (knownNonTreeshakable.includes(library)) {
      potential = 0;
      recommendations.push("Consider lighter alternatives");
    } else {
      // Analyze based on usage patterns
      const totalExports = usage.usedExports.size;
      if (totalExports < 5 && usage.files.length > 1) {
        potential = usage.files.length * 5;
        recommendations.push(
          "Library appears to have good tree shaking potential",
        );
      }
    }

    return {
      library,
      potential,
      usage: usage.files.length,
      usedExports: Array.from(usage.usedExports),
      recommendations,
    };
  }

  extractImports(content) {
    const imports = [];
    const importRegex = /import.*from\s+['"]([^'"]+)['"]/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    return imports;
  }

  extractUsedExports(content, library) {
    const usedExports = [];

    // Look for named imports
    const namedImportRegex = new RegExp(
      `import\\s+{([^}]+)}\\s+from\\s+['"]${library.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}['"]`,
      "g",
    );
    const match = namedImportRegex.exec(content);

    if (match) {
      const imports = match[1].split(",").map((imp) => imp.trim());
      usedExports.push(...imports);
    }

    return usedExports;
  }

  extractFunctions(content) {
    const functions = [];

    // Function declarations
    const funcRegex =
      /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\([^)]*\)\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g;
    let match;

    while ((match = funcRegex.exec(content)) !== null) {
      functions.push({
        name: match[1],
        body: match[2],
        type: "function",
      });
    }

    // Arrow functions
    const arrowRegex =
      /(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g;
    while ((match = arrowRegex.exec(content)) !== null) {
      functions.push({
        name: match[1],
        body: match[2],
        type: "arrow",
      });
    }

    return functions;
  }

  hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }

  calculateDeduplicationPotential(occurrences) {
    const totalSize = occurrences.reduce((sum, occ) => sum + occ.size, 0);
    const wastedSize = totalSize - occurrences[0].size; // Keep one instance

    return {
      wastedBytes: wastedSize,
      savings: Math.floor((wastedSize / totalSize) * 100),
      extractionRecommendation:
        this.generateExtractionRecommendation(occurrences),
    };
  }

  generateExtractionRecommendation(occurrences) {
    const functionName = occurrences[0].function;
    const fileCount = occurrences.length;

    if (functionName.includes("validate")) {
      return `Extract validation logic into shared utility module`;
    } else if (functionName.includes("format")) {
      return `Extract formatting logic into shared utility module`;
    } else if (functionName.includes("handle") || functionName.includes("on")) {
      return `Extract event handling logic into shared hook`;
    } else {
      return `Extract common functionality into shared module (used in ${fileCount} files)`;
    }
  }

  // Additional helper methods for file operations

  async findRouteFiles(appDir) {
    const routes = [];

    const scan = async (currentDir) => {
      const items = await readdir(currentDir);

      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stats = await stat(fullPath);

        if (stats.isDirectory()) {
          await scan(fullPath);
        } else if (item === "page.tsx" || item === "layout.tsx") {
          routes.push(fullPath);
        }
      }
    };

    await scan(appDir);
    return routes;
  }

  generateRouteSplittingImplementation(routePath) {
    const routeName = path.basename(path.dirname(routePath));

    return {
      type: "next-dynamic",
      implementation: `const ${routeName}Page = dynamic(() => import('./${routeName}/page'), {
  loading: () => <PageSkeleton />,
  ssr: false
});`,
    };
  }

  generateVendorSplittingImplementation(libraries) {
    return {
      type: "webpack-config",
      implementation: `
// next.config.js
module.exports = {
  webpack: (config) => {
    config.optimization.splitChunks.cacheGroups = {
      vendor: {
        test: /[\\/]node_modules[\\/](${libraries.join("|")})[\\/]/,
        name: 'vendors',
        chunks: 'all',
      },
    };
    return config;
  },
};`,
    };
  }

  async getSubdirectories(dirPath) {
    const subdirs = [];
    const items = await readdir(dirPath);

    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stats = await stat(fullPath);

      if (stats.isDirectory() && !item.startsWith(".")) {
        subdirs.push(fullPath);
      }
    }

    return subdirs;
  }

  async calculateDirectorySize(files) {
    let totalSize = 0;

    for (const file of files) {
      try {
        const stats = await stat(file);
        totalSize += stats.size;
      } catch (error) {
        // Skip files that can't be read
      }
    }

    return totalSize;
  }

  generateOptimizationPlan() {
    console.log("📋 Generating comprehensive bundle optimization plan...");

    const plan = {
      timestamp: new Date().toISOString(),
      summary: this.generateOptimizationDataSummary(),
      quickWins: this.identifyQuickWins(),
      mediumEffortTasks: this.identifyMediumEffortTasks(),
      majorRefactoring: this.identifyMajorRefactoring(),
      implementation: this.generateImplementationPlan(),
      estimatedSavings: this.calculateEstimatedSavings(),
    };

    // Write comprehensive optimization plan
    const planPath = "bundle-optimization-plan.json";
    fs.writeFileSync(planPath, JSON.stringify(plan, null, 2));
    console.log(`  📊 Optimization plan saved to: ${planPath}`);

    // Write markdown summary
    this.generateOptimizationMarkdownSummary(plan);

    console.log(`\n🎯 Bundle Optimization Summary:`);
    console.log(
      `  📦 Current Bundle Size: ${(plan.summary.currentSize / 1024).toFixed(1)}KB`,
    );
    console.log(
      `  🎯 Potential Savings: ${(plan.estimatedSavings.totalSavings / 1024).toFixed(1)}KB`,
    );
    console.log(
      `  📈 Optimization Opportunities: ${plan.summary.totalOpportunities}`,
    );
    console.log(`  🚀 Quick Wins Available: ${plan.quickWins.length}`);
  }

  generateOptimizationDataSummary() {
    let currentSize = 0;
    let totalOpportunities = 0;

    for (const [_, analysis] of this.bundleAnalysis) {
      currentSize += analysis.totalSize;
      totalOpportunities += analysis.optimizationPotential.fileCount;
    }

    return {
      currentSize,
      totalOpportunities,
      lazyLoadCandidates: this.lazyLoadCandidates.length,
      codeSplittingOpportunities: this.codeSplittingOpportunities.length,
      importOptimizations: this.importOptimizations.length,
      treeshakingOpportunities: this.treeshakingOpportunities.length,
      duplicatePatterns: this.duplicateAnalysis.get("patterns")?.length || 0,
    };
  }

  identifyQuickWins() {
    const quickWins = [];

    // High-impact lazy loading opportunities
    const topLazyLoadCandidates = this.lazyLoadCandidates
      .filter((candidate) => candidate.priority > 15)
      .slice(0, 5);

    quickWins.push(
      ...topLazyLoadCandidates.map((candidate) => ({
        type: "lazy-loading",
        target: candidate.file,
        effort: "low",
        impact: "high",
        estimatedSaving: candidate.estimatedSaving,
        implementation: candidate.implementation,
      })),
    );

    // Import optimizations
    const topImportOptimizations = this.importOptimizations
      .filter((opt) => opt.priority > 10)
      .slice(0, 3);

    quickWins.push(
      ...topImportOptimizations.map((opt) => ({
        type: "import-optimization",
        target: opt.file,
        effort: "low",
        impact: "medium",
        optimizations: opt.optimizations,
      })),
    );

    return quickWins;
  }

  identifyMediumEffortTasks() {
    const mediumTasks = [];

    // Code splitting opportunities
    const codeSplittingTasks = this.codeSplittingOpportunities
      .filter((opp) => opp.priority > 10)
      .slice(0, 5);

    mediumTasks.push(
      ...codeSplittingTasks.map((opp) => ({
        type: "code-splitting",
        target: opp.file || opp.feature || opp.type,
        effort: "medium",
        impact: "high",
        recommendation: opp.recommendation,
        implementation: opp.implementation,
      })),
    );

    // Tree shaking optimizations
    const treeshakingTasks = this.treeshakingOpportunities
      .filter((opp) => opp.potential > 15)
      .slice(0, 3);

    mediumTasks.push(
      ...treeshakingTasks.map((opp) => ({
        type: "tree-shaking",
        target: opp.library,
        effort: "medium",
        impact: "medium",
        recommendations: opp.recommendations,
      })),
    );

    return mediumTasks;
  }

  identifyMajorRefactoring() {
    const majorTasks = [];

    // Large file refactoring
    for (const [dirName, analysis] of this.bundleAnalysis) {
      const largeFiles = analysis.largeFiles.filter(
        (file) => file.size > 25000,
      );

      if (largeFiles.length > 0) {
        majorTasks.push({
          type: "file-splitting",
          directory: dirName,
          effort: "high",
          impact: "high",
          targets: largeFiles.map((f) => f.file),
          totalSize: largeFiles.reduce((sum, f) => sum + f.size, 0),
        });
      }
    }

    // Duplicate code elimination
    const duplicatePatterns = this.duplicateAnalysis.get("patterns") || [];
    const majorDuplicates = duplicatePatterns.filter(
      (pattern) => pattern.totalWaste > 5000,
    );

    if (majorDuplicates.length > 0) {
      majorTasks.push({
        type: "duplicate-elimination",
        effort: "high",
        impact: "medium",
        patterns: majorDuplicates.length,
        totalWaste: majorDuplicates.reduce((sum, p) => sum + p.totalWaste, 0),
      });
    }

    return majorTasks;
  }

  generateImplementationPlan() {
    return {
      phase1: {
        name: "Quick Wins (Week 1)",
        effort: "low",
        tasks: [
          "Implement lazy loading for modal and dialog components",
          "Remove unused imports from high-impact files",
          "Optimize barrel imports for better tree shaking",
        ],
        estimatedSaving: "200-400KB",
      },
      phase2: {
        name: "Code Splitting (Week 2-3)",
        effort: "medium",
        tasks: [
          "Implement route-based code splitting",
          "Set up vendor chunk splitting",
          "Add dynamic imports for large feature modules",
        ],
        estimatedSaving: "500-800KB",
      },
      phase3: {
        name: "Architecture Optimization (Week 4-5)",
        effort: "high",
        tasks: [
          "Break down large files into smaller modules",
          "Eliminate duplicate code patterns",
          "Optimize tree shaking for heavy libraries",
        ],
        estimatedSaving: "300-600KB",
      },
    };
  }

  calculateEstimatedSavings() {
    let totalSavings = 0;

    // Lazy loading savings
    const lazyLoadSavings = this.lazyLoadCandidates.reduce(
      (sum, candidate) => sum + candidate.estimatedSaving,
      0,
    );
    totalSavings += lazyLoadSavings;

    // Code splitting savings (estimated 20-40% of affected code)
    const codeSplittingSavings = this.codeSplittingOpportunities.reduce(
      (sum, opp) => {
        const size = opp.size || 10000; // Default estimate
        return sum + size * 0.3; // 30% average saving
      },
      0,
    );
    totalSavings += codeSplittingSavings;

    // Import optimization savings
    const importSavings = this.importOptimizations.reduce(
      (sum, opt) => sum + opt.impact * 100,
      0,
    ); // 100 bytes per impact point
    totalSavings += importSavings;

    // Tree shaking savings
    const treeshakingSavings = this.treeshakingOpportunities.reduce(
      (sum, opp) => sum + opp.potential * 200,
      0,
    ); // 200 bytes per potential point
    totalSavings += treeshakingSavings;

    // Duplicate elimination savings
    const duplicatePatterns = this.duplicateAnalysis.get("patterns") || [];
    const duplicateSavings = duplicatePatterns.reduce(
      (sum, pattern) => sum + pattern.deduplicationPotential.wastedBytes,
      0,
    );
    totalSavings += duplicateSavings;

    return {
      totalSavings,
      breakdown: {
        lazyLoading: lazyLoadSavings,
        codeSplitting: codeSplittingSavings,
        importOptimization: importSavings,
        treeshaking: treeshakingSavings,
        duplicateElimination: duplicateSavings,
      },
    };
  }

  generateOptimizationMarkdownSummary(plan) {
    const content = `# Bundle Size Optimization Plan

**Generated**: ${new Date().toLocaleString()}

## Executive Summary

- **Current Bundle Size**: ${(plan.summary.currentSize / 1024).toFixed(1)}KB
- **Estimated Savings**: ${(plan.estimatedSavings.totalSavings / 1024).toFixed(1)}KB (${Math.round((plan.estimatedSavings.totalSavings / plan.summary.currentSize) * 100)}%)
- **Total Opportunities**: ${plan.summary.totalOpportunities}
- **Quick Wins Available**: ${plan.quickWins.length}

## Optimization Breakdown

### Lazy Loading Opportunities
- **Candidates**: ${plan.summary.lazyLoadCandidates}
- **Estimated Savings**: ${(plan.estimatedSavings.breakdown.lazyLoading / 1024).toFixed(1)}KB

### Code Splitting Opportunities  
- **Opportunities**: ${plan.summary.codeSplittingOpportunities}
- **Estimated Savings**: ${(plan.estimatedSavings.breakdown.codeSplitting / 1024).toFixed(1)}KB

### Import Optimizations
- **Files to Optimize**: ${plan.summary.importOptimizations}
- **Estimated Savings**: ${(plan.estimatedSavings.breakdown.importOptimization / 1024).toFixed(1)}KB

### Tree Shaking Potential
- **Libraries to Optimize**: ${plan.summary.treeshakingOpportunities}
- **Estimated Savings**: ${(plan.estimatedSavings.breakdown.treeshaking / 1024).toFixed(1)}KB

### Duplicate Code Elimination
- **Patterns Found**: ${plan.summary.duplicatePatterns}
- **Estimated Savings**: ${(plan.estimatedSavings.breakdown.duplicateElimination / 1024).toFixed(1)}KB

## Implementation Phases

### ${plan.implementation.phase1.name}
**Effort**: ${plan.implementation.phase1.effort}
**Estimated Savings**: ${plan.implementation.phase1.estimatedSaving}

${plan.implementation.phase1.tasks.map((task) => `- ${task}`).join("\n")}

### ${plan.implementation.phase2.name}
**Effort**: ${plan.implementation.phase2.effort}
**Estimated Savings**: ${plan.implementation.phase2.estimatedSaving}

${plan.implementation.phase2.tasks.map((task) => `- ${task}`).join("\n")}

### ${plan.implementation.phase3.name}
**Effort**: ${plan.implementation.phase3.effort}
**Estimated Savings**: ${plan.implementation.phase3.estimatedSaving}

${plan.implementation.phase3.tasks.map((task) => `- ${task}`).join("\n")}

## Quick Wins (Priority Implementation)

${plan.quickWins
  .slice(0, 5)
  .map(
    (win, i) =>
      `${i + 1}. **${win.target}** (${win.type})
   - Effort: ${win.effort}
   - Impact: ${win.impact}
   - Savings: ${win.estimatedSaving ? (win.estimatedSaving / 1024).toFixed(1) + "KB" : "TBD"}`,
  )
  .join("\n\n")}

## Success Metrics

- **Bundle Size Reduction**: Target 20-40% reduction
- **Initial Load Time**: Improve by 30-50%
- **Code Splitting Effectiveness**: >70% of routes lazy-loaded
- **Tree Shaking Optimization**: >90% unused code eliminated

## Next Steps

1. Begin with Phase 1 quick wins
2. Set up bundle analysis monitoring
3. Implement automated bundle size regression testing
4. Monitor performance impact of optimizations

---
*Optimization plan generated by EstimatePro Bundle Size Optimizer*
`;

    fs.writeFileSync("bundle-optimization-summary.md", content);
    console.log(
      `  📋 Optimization summary saved to: bundle-optimization-summary.md`,
    );
  }
}

// Run the bundle optimization analysis
if (require.main === module) {
  const optimizer = new BundleSizeOptimizer();
  optimizer.optimizeBundles(process.cwd()).catch((error) => {
    console.error("❌ Bundle optimization analysis failed:", error.message);
    process.exit(1);
  });
}

module.exports = BundleSizeOptimizer;
