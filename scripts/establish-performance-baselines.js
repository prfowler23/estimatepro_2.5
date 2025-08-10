#!/usr/bin/env node

/**
 * Performance Baseline Establishment Tool
 * Measures current performance metrics for EstimatePro services and establishes baseline measurements
 */

const fs = require("fs");
const path = require("path");
const { promisify } = require("util");
const { performance } = require("perf_hooks");

const readFile = promisify(fs.readFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

class PerformanceBaselineEstablisher {
  constructor() {
    this.baselines = new Map();
    this.metrics = new Map();
    this.bundleAnalysis = new Map();
    this.queryPerformance = new Map();
    this.serviceHealth = new Map();
  }

  async establishBaselines(rootDir) {
    console.log("📊 Establishing Performance Baselines for EstimatePro...\n");

    try {
      // Phase 1: Bundle size analysis
      await this.analyzeBundleSizes(rootDir);

      // Phase 2: Service complexity baselines
      await this.establishServiceComplexityBaselines(rootDir);

      // Phase 3: Database query pattern analysis
      await this.analyzeQueryPatterns(rootDir);

      // Phase 4: API endpoint performance estimation
      await this.analyzeAPIEndpointPerformance(rootDir);

      // Phase 5: Memory usage estimation
      await this.estimateMemoryUsage(rootDir);

      // Phase 6: Generate comprehensive baseline report
      this.generateBaselineReport();

      console.log(
        "✅ Performance baseline establishment completed successfully!",
      );
    } catch (error) {
      console.error("❌ Baseline establishment failed:", error.message);
      throw error;
    }
  }

  async analyzeBundleSizes(rootDir) {
    console.log(
      "📦 Analyzing bundle sizes and code splitting opportunities...",
    );

    const componentDirs = ["components", "app", "lib", "hooks", "contexts"];

    for (const dir of componentDirs) {
      const dirPath = path.join(rootDir, dir);
      if (fs.existsSync(dirPath)) {
        await this.analyzeBundleDirectory(dirPath, dir);
      }
    }

    console.log(
      `  📊 Analyzed ${this.bundleAnalysis.size} directories for bundle optimization\n`,
    );
  }

  async analyzeBundleDirectory(dirPath, dirName) {
    const files = await this.getTypeScriptFiles(dirPath);
    let totalSize = 0;
    const fileAnalysis = [];

    for (const file of files) {
      try {
        const content = await readFile(file, "utf8");
        const stats = await stat(file);

        const analysis = {
          file: path.relative(dirPath, file),
          size: stats.size,
          lines: content.split("\n").length,
          imports: this.countImports(content),
          exports: this.countExports(content),
          complexity: this.calculateBundleComplexity(content),
          lazyLoadable: this.isLazyLoadable(content),
          optimizationPotential: this.assessOptimizationPotential(content),
        };

        fileAnalysis.push(analysis);
        totalSize += stats.size;
      } catch (error) {
        console.warn(`    ⚠️  Error analyzing ${file}: ${error.message}`);
      }
    }

    this.bundleAnalysis.set(dirName, {
      totalSize,
      fileCount: files.length,
      averageSize: totalSize / files.length,
      files: fileAnalysis.sort((a, b) => b.size - a.size),
      lazyLoadCandidates: fileAnalysis.filter((f) => f.lazyLoadable).length,
      optimizationOpportunities: fileAnalysis.filter(
        (f) => f.optimizationPotential > 3,
      ).length,
    });

    console.log(
      `    ✓ ${dirName}: ${files.length} files, ${(totalSize / 1024).toFixed(1)}KB total`,
    );
  }

  async establishServiceComplexityBaselines(rootDir) {
    console.log("🔧 Establishing service performance complexity baselines...");

    const servicesDir = path.join(rootDir, "lib/services");
    if (!fs.existsSync(servicesDir)) {
      console.log(
        "  ⚠️  Services directory not found, skipping service analysis",
      );
      return;
    }

    const files = await this.getTypeScriptFiles(servicesDir);

    for (const file of files) {
      try {
        const content = await readFile(file, "utf8");
        const serviceName = path.basename(file, ".ts");

        const baseline = {
          name: serviceName,
          size: content.length,
          complexity: this.calculateServiceComplexity(content),
          asyncOperations: this.countAsyncOperations(content),
          databaseQueries: this.countDatabaseQueries(content),
          apiCalls: this.countAPICalls(content),
          errorHandling: this.assessErrorHandling(content),
          cachingOpportunities: this.identifyCachingOpportunities(content),
          performanceRisk: this.assessPerformanceRisk(content),
          estimatedResponseTime: this.estimateResponseTime(content),
          memoryFootprint: this.estimateMemoryFootprint(content),
        };

        this.serviceHealth.set(serviceName, baseline);
      } catch (error) {
        console.warn(
          `    ⚠️  Error analyzing service ${file}: ${error.message}`,
        );
      }
    }

    console.log(
      `    ✓ Established baselines for ${this.serviceHealth.size} services\n`,
    );
  }

  async analyzeQueryPatterns(rootDir) {
    console.log(
      "🗄️  Analyzing database query patterns and performance implications...",
    );

    const serviceFiles = await this.getTypeScriptFiles(
      path.join(rootDir, "lib/services"),
    );
    const apiFiles = await this.getTypeScriptFiles(
      path.join(rootDir, "app/api"),
    );

    const allFiles = [...serviceFiles, ...apiFiles];
    let totalQueries = 0;
    const queryPatterns = {
      simple: 0,
      complex: 0,
      joins: 0,
      aggregations: 0,
      nPlusOne: 0,
      transactions: 0,
    };

    for (const file of allFiles) {
      try {
        const content = await readFile(file, "utf8");
        const queries = this.extractQueryPatterns(content);

        queries.forEach((query) => {
          totalQueries++;
          if (query.includes("SELECT") && query.includes("JOIN")) {
            queryPatterns.joins++;
          }
          if (
            query.includes("COUNT") ||
            query.includes("SUM") ||
            query.includes("AVG")
          ) {
            queryPatterns.aggregations++;
          }
          if (this.isComplexQuery(query)) {
            queryPatterns.complex++;
          } else {
            queryPatterns.simple++;
          }
          if (query.includes("transaction") || query.includes("BEGIN")) {
            queryPatterns.transactions++;
          }
        });

        // Detect potential N+1 patterns
        if (this.hasNPlusOnePattern(content)) {
          queryPatterns.nPlusOne++;
        }
      } catch (error) {
        console.warn(
          `    ⚠️  Error analyzing queries in ${file}: ${error.message}`,
        );
      }
    }

    this.queryPerformance.set("patterns", {
      totalQueries,
      ...queryPatterns,
      optimizationPotential:
        queryPatterns.nPlusOne + queryPatterns.complex * 0.5,
      performanceRisk: this.calculateQueryPerformanceRisk(queryPatterns),
    });

    console.log(
      `    ✓ Analyzed ${totalQueries} database queries across ${allFiles.length} files\n`,
    );
  }

  async analyzeAPIEndpointPerformance(rootDir) {
    console.log("🌐 Analyzing API endpoint performance characteristics...");

    const apiDir = path.join(rootDir, "app/api");
    if (!fs.existsSync(apiDir)) {
      console.log("  ⚠️  API directory not found, skipping API analysis");
      return;
    }

    const routeFiles = await this.getRouteFiles(apiDir);
    const endpointAnalysis = [];

    for (const file of routeFiles) {
      try {
        const content = await readFile(file, "utf8");
        const endpoint = this.extractEndpointInfo(file, content);

        if (endpoint) {
          const performance = {
            ...endpoint,
            complexity: this.calculateEndpointComplexity(content),
            estimatedLatency: this.estimateEndpointLatency(content),
            scalabilityRisk: this.assessScalabilityRisk(content),
            cachingStrategy: this.suggestCachingStrategy(content),
            optimizationPriority: this.calculateOptimizationPriority(content),
          };

          endpointAnalysis.push(performance);
        }
      } catch (error) {
        console.warn(
          `    ⚠️  Error analyzing endpoint ${file}: ${error.message}`,
        );
      }
    }

    this.metrics.set("apiEndpoints", {
      totalEndpoints: endpointAnalysis.length,
      averageComplexity:
        endpointAnalysis.reduce((sum, ep) => sum + ep.complexity, 0) /
        endpointAnalysis.length,
      highRiskEndpoints: endpointAnalysis.filter((ep) => ep.scalabilityRisk > 7)
        .length,
      cachingOpportunities: endpointAnalysis.filter(
        (ep) => ep.cachingStrategy !== "none",
      ).length,
      endpoints: endpointAnalysis.sort(
        (a, b) => b.optimizationPriority - a.optimizationPriority,
      ),
    });

    console.log(`    ✓ Analyzed ${endpointAnalysis.length} API endpoints\n`);
  }

  async estimateMemoryUsage(rootDir) {
    console.log(
      "💾 Estimating memory usage patterns and optimization opportunities...",
    );

    const memoryProfile = {
      components: 0,
      services: 0,
      stores: 0,
      utilities: 0,
      total: 0,
    };

    const directories = [
      { name: "components", key: "components" },
      { name: "lib/services", key: "services" },
      { name: "lib/stores", key: "stores" },
      { name: "lib/utils", key: "utilities" },
    ];

    for (const dir of directories) {
      const dirPath = path.join(rootDir, dir.name);
      if (fs.existsSync(dirPath)) {
        const usage = await this.estimateDirectoryMemoryUsage(dirPath);
        memoryProfile[dir.key] = usage;
        memoryProfile.total += usage;
      }
    }

    // Calculate memory optimization opportunities
    const optimizations = {
      lazyLoadingPotential: this.calculateLazyLoadingPotential(),
      memoizationOpportunities: this.identifyMemoizationOpportunities(),
      bundleSplittingRecommendations:
        this.generateBundleSplittingRecommendations(),
      memoryLeakRisks: this.assessMemoryLeakRisks(),
    };

    this.metrics.set("memoryUsage", {
      profile: memoryProfile,
      optimizations,
      estimatedSavings: this.calculateEstimatedMemorySavings(optimizations),
    });

    console.log(
      `    ✓ Estimated total memory footprint: ${(memoryProfile.total / 1024 / 1024).toFixed(2)}MB\n`,
    );
  }

  // Helper methods for analysis

  async getTypeScriptFiles(dir) {
    const files = [];

    const scan = async (currentDir) => {
      if (!fs.existsSync(currentDir)) return;

      const items = await readdir(currentDir);

      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stats = await stat(fullPath);

        if (stats.isDirectory()) {
          await scan(fullPath);
        } else if (item.endsWith(".ts") || item.endsWith(".tsx")) {
          files.push(fullPath);
        }
      }
    };

    await scan(dir);
    return files;
  }

  async getRouteFiles(dir) {
    const files = [];

    const scan = async (currentDir) => {
      if (!fs.existsSync(currentDir)) return;

      const items = await readdir(currentDir);

      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stats = await stat(fullPath);

        if (stats.isDirectory()) {
          await scan(fullPath);
        } else if (item === "route.ts") {
          files.push(fullPath);
        }
      }
    };

    await scan(dir);
    return files;
  }

  countImports(content) {
    return (content.match(/import.*from/g) || []).length;
  }

  countExports(content) {
    return (content.match(/export/g) || []).length;
  }

  calculateBundleComplexity(content) {
    let score = 0;
    score += (content.match(/React\.lazy/g) || []).length * -2; // Lazy loading reduces complexity
    score += (content.match(/dynamic.*import/g) || []).length * -2; // Dynamic imports reduce complexity
    score += (content.match(/import.*\{[^}]{50,}\}/g) || []).length; // Large import destructuring
    score += (content.match(/export \* from/g) || []).length; // Re-exports
    return Math.max(0, score);
  }

  isLazyLoadable(content) {
    // Check if file can be lazy loaded
    const hasReactComponent =
      (content.includes("export default") && content.includes("function")) ||
      content.includes("const");
    const hasNoSideEffects =
      !content.includes("window.") &&
      !content.includes("document.") &&
      !content.includes("localStorage.");
    const isNotHook = !path.basename(content).startsWith("use");

    return hasReactComponent && hasNoSideEffects && isNotHook;
  }

  assessOptimizationPotential(content) {
    let score = 0;
    score += content.length > 10000 ? 3 : 0; // Large file size
    score += (content.match(/import.*lodash/g) || []).length; // Heavy library usage
    score += (content.match(/useState|useEffect/g) || []).length > 10 ? 2 : 0; // Many React hooks
    score += (content.match(/async.*await/g) || []).length > 5 ? 1 : 0; // Many async operations
    return score;
  }

  calculateServiceComplexity(content) {
    let score = 0;
    score += (content.match(/if\s*\(/g) || []).length;
    score += (content.match(/switch\s*\(/g) || []).length;
    score += (content.match(/for\s*\(/g) || []).length;
    score += (content.match(/while\s*\(/g) || []).length;
    score += (content.match(/catch\s*\(/g) || []).length;
    score += (content.match(/await\s+/g) || []).length * 2;
    score += (content.match(/supabase\./g) || []).length * 3;
    score += (content.match(/fetch\(/g) || []).length * 3;
    return score;
  }

  countAsyncOperations(content) {
    return (content.match(/await\s+/g) || []).length;
  }

  countDatabaseQueries(content) {
    return (
      content.match(/supabase\.(from|select|insert|update|delete|rpc)/g) || []
    ).length;
  }

  countAPICalls(content) {
    return (content.match(/fetch\(|axios\.|http\./g) || []).length;
  }

  assessErrorHandling(content) {
    const tryBlocks = (content.match(/try\s*{/g) || []).length;
    const catchBlocks = (content.match(/catch\s*\(/g) || []).length;
    const throwStatements = (content.match(/throw\s+/g) || []).length;

    return {
      tryBlocks,
      catchBlocks,
      throwStatements,
      coverage: catchBlocks / Math.max(tryBlocks, 1),
    };
  }

  identifyCachingOpportunities(content) {
    let opportunities = 0;
    opportunities += content.includes("expensive") ? 1 : 0;
    opportunities += (content.match(/map\(.*=>.*\)/g) || []).length > 5 ? 1 : 0;
    opportunities += content.includes("calculation") ? 1 : 0;
    opportunities += content.includes("analytics") ? 1 : 0;
    return opportunities;
  }

  assessPerformanceRisk(content) {
    let risk = 0;
    risk += content.length > 20000 ? 3 : content.length > 10000 ? 1 : 0;
    risk += (content.match(/await\s+/g) || []).length > 10 ? 2 : 0;
    risk +=
      (content.match(/forEach|map|filter|reduce/g) || []).length > 20 ? 2 : 0;
    risk += content.includes("recursive") ? 2 : 0;
    return Math.min(10, risk);
  }

  estimateResponseTime(content) {
    let baseTime = 50; // Base response time in ms
    baseTime += (content.match(/await\s+/g) || []).length * 20; // Each async operation
    baseTime += (content.match(/supabase\./g) || []).length * 30; // Each DB query
    baseTime += (content.match(/fetch\(/g) || []).length * 100; // Each API call
    baseTime += content.length > 20000 ? 100 : 0; // Large service penalty
    return baseTime;
  }

  estimateMemoryFootprint(content) {
    let memory = content.length; // Base memory is file size
    memory += (content.match(/new\s+\w+/g) || []).length * 1000; // Object instantiations
    memory += (content.match(/useState|useRef/g) || []).length * 100; // React state
    memory += (content.match(/Map|Set|Array|Object/g) || []).length * 200; // Data structures
    return memory;
  }

  extractQueryPatterns(content) {
    const patterns = [];

    // SQL-like patterns in Supabase calls
    const supabaseMatches = content.match(/supabase\.[^;]+/g) || [];
    patterns.push(...supabaseMatches);

    // Direct SQL patterns
    const sqlMatches =
      content.match(/`[^`]*(?:SELECT|INSERT|UPDATE|DELETE)[^`]*`/gi) || [];
    patterns.push(...sqlMatches);

    return patterns;
  }

  isComplexQuery(query) {
    const complexity = [
      query.includes("JOIN"),
      query.includes("GROUP BY"),
      query.includes("HAVING"),
      query.includes("UNION"),
      query.includes("CASE"),
      query.includes("EXISTS"),
    ].filter(Boolean).length;

    return complexity > 2;
  }

  hasNPlusOnePattern(content) {
    // Look for loops with database queries inside
    const loopWithQuery =
      /(?:for|while|forEach|map)\s*\([^)]*\)\s*[^{]*{\s*[^}]*(?:supabase\.|await.*select)/gi;
    return loopWithQuery.test(content);
  }

  calculateQueryPerformanceRisk(patterns) {
    let risk = 0;
    risk += patterns.nPlusOne * 5; // N+1 queries are high risk
    risk += patterns.complex * 2; // Complex queries medium risk
    risk += patterns.joins * 1; // Joins low-medium risk
    return Math.min(10, risk);
  }

  extractEndpointInfo(filePath, content) {
    const pathParts = filePath.split("/");
    const routePath =
      "/" +
      pathParts
        .slice(pathParts.indexOf("api") + 1)
        .filter((part) => part !== "route.ts")
        .map((part) =>
          part.startsWith("[") && part.endsWith("]")
            ? `:${part.slice(1, -1)}`
            : part,
        )
        .join("/");

    const methods = [];
    if (content.includes("export async function GET")) methods.push("GET");
    if (content.includes("export async function POST")) methods.push("POST");
    if (content.includes("export async function PUT")) methods.push("PUT");
    if (content.includes("export async function DELETE"))
      methods.push("DELETE");
    if (content.includes("export async function PATCH")) methods.push("PATCH");

    return methods.length > 0 ? { path: routePath, methods } : null;
  }

  calculateEndpointComplexity(content) {
    return this.calculateServiceComplexity(content);
  }

  estimateEndpointLatency(content) {
    return this.estimateResponseTime(content);
  }

  assessScalabilityRisk(content) {
    let risk = 0;
    risk +=
      (content.match(/forEach|for.*of|for.*in/g) || []).length > 5 ? 3 : 0;
    risk += content.includes("recursiv") ? 4 : 0;
    risk += (content.match(/supabase\./g) || []).length > 3 ? 2 : 0;
    risk += content.length > 15000 ? 2 : 0;
    return Math.min(10, risk);
  }

  suggestCachingStrategy(content) {
    if (
      content.includes("GET") &&
      !content.includes("user") &&
      !content.includes("session")
    ) {
      return "public";
    } else if (content.includes("analytics") || content.includes("metrics")) {
      return "private";
    } else if (content.includes("real-time") || content.includes("live")) {
      return "none";
    }
    return "conditional";
  }

  calculateOptimizationPriority(content) {
    let priority = 0;
    priority += this.assessScalabilityRisk(content);
    priority += this.calculateEndpointComplexity(content) / 10;
    priority += this.estimateEndpointLatency(content) / 100;
    return Math.min(10, priority);
  }

  async estimateDirectoryMemoryUsage(dirPath) {
    const files = await this.getTypeScriptFiles(dirPath);
    let totalUsage = 0;

    for (const file of files) {
      try {
        const content = await readFile(file, "utf8");
        totalUsage += this.estimateMemoryFootprint(content);
      } catch (error) {
        // Skip files that can't be read
      }
    }

    return totalUsage;
  }

  calculateLazyLoadingPotential() {
    let potential = 0;

    for (const [_, analysis] of this.bundleAnalysis) {
      potential += analysis.lazyLoadCandidates * 0.3; // 30% reduction per lazy loaded component
    }

    return potential;
  }

  identifyMemoizationOpportunities() {
    let opportunities = 0;

    for (const [_, service] of this.serviceHealth) {
      opportunities += service.cachingOpportunities;
    }

    return opportunities;
  }

  generateBundleSplittingRecommendations() {
    const recommendations = [];

    for (const [dirName, analysis] of this.bundleAnalysis) {
      if (analysis.totalSize > 50000) {
        // 50KB threshold
        recommendations.push({
          directory: dirName,
          currentSize: analysis.totalSize,
          recommendation: "Split into smaller chunks",
          potentialSaving: analysis.totalSize * 0.4,
        });
      }
    }

    return recommendations;
  }

  assessMemoryLeakRisks() {
    let risks = 0;

    for (const [_, service] of this.serviceHealth) {
      if (
        service.asyncOperations > 10 &&
        service.errorHandling.coverage < 0.8
      ) {
        risks++;
      }
    }

    return risks;
  }

  calculateEstimatedMemorySavings(optimizations) {
    let savings = 0;
    savings += optimizations.lazyLoadingPotential * 100000; // 100KB per lazy load opportunity
    savings += optimizations.memoizationOpportunities * 50000; // 50KB per memoization
    savings += optimizations.bundleSplittingRecommendations.reduce(
      (sum, rec) => sum + rec.potentialSaving,
      0,
    );
    return savings;
  }

  generateBaselineReport() {
    console.log("📄 Generating comprehensive performance baseline report...");

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalServices: this.serviceHealth.size,
        totalBundleSize: Array.from(this.bundleAnalysis.values()).reduce(
          (sum, analysis) => sum + analysis.totalSize,
          0,
        ),
        averageServiceComplexity:
          Array.from(this.serviceHealth.values()).reduce(
            (sum, service) => sum + service.complexity,
            0,
          ) / this.serviceHealth.size,
        totalMemoryFootprint:
          this.metrics.get("memoryUsage")?.profile.total || 0,
        highRiskServices: Array.from(this.serviceHealth.values()).filter(
          (service) => service.performanceRisk > 5,
        ).length,
        optimizationOpportunities:
          this.calculateTotalOptimizationOpportunities(),
      },
      baselines: {
        bundleAnalysis: Object.fromEntries(this.bundleAnalysis),
        serviceHealth: Object.fromEntries(this.serviceHealth),
        queryPerformance: Object.fromEntries(this.queryPerformance),
        apiEndpoints: this.metrics.get("apiEndpoints"),
        memoryUsage: this.metrics.get("memoryUsage"),
      },
      recommendations: this.generateOptimizationRecommendations(),
      implementationPlan: this.generateImplementationPlan(),
    };

    // Write detailed baseline report
    const reportPath = "performance-baseline-report.json";
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`  📊 Detailed baseline report saved to: ${reportPath}`);

    // Write markdown summary
    this.generateMarkdownSummary(report);

    console.log(`\n🎯 Performance Baseline Summary:`);
    console.log(
      `  📦 Total Bundle Size: ${(report.summary.totalBundleSize / 1024).toFixed(1)}KB`,
    );
    console.log(
      `  🔧 Average Service Complexity: ${report.summary.averageServiceComplexity.toFixed(1)}`,
    );
    console.log(
      `  💾 Estimated Memory Footprint: ${(report.summary.totalMemoryFootprint / 1024 / 1024).toFixed(2)}MB`,
    );
    console.log(`  ⚠️  High Risk Services: ${report.summary.highRiskServices}`);
    console.log(
      `  🎯 Optimization Opportunities: ${report.summary.optimizationOpportunities}`,
    );
  }

  calculateTotalOptimizationOpportunities() {
    let opportunities = 0;

    // Bundle optimization opportunities
    for (const [_, analysis] of this.bundleAnalysis) {
      opportunities += analysis.optimizationOpportunities;
    }

    // Service caching opportunities
    for (const [_, service] of this.serviceHealth) {
      opportunities += service.cachingOpportunities;
    }

    // API endpoint optimizations
    const apiMetrics = this.metrics.get("apiEndpoints");
    if (apiMetrics) {
      opportunities += apiMetrics.cachingOpportunities;
    }

    return opportunities;
  }

  generateOptimizationRecommendations() {
    const recommendations = [];

    // High priority service optimizations
    const criticalServices = Array.from(this.serviceHealth.entries())
      .filter(([_, service]) => service.performanceRisk > 7)
      .sort(([_, a], [__, b]) => b.performanceRisk - a.performanceRisk);

    for (const [name, service] of criticalServices) {
      recommendations.push({
        type: "service",
        priority: "high",
        target: name,
        issue: `High performance risk (${service.performanceRisk}/10)`,
        recommendation:
          service.complexity > 100
            ? "Break down into smaller services"
            : "Optimize async operations and caching",
        estimatedImpact: "30-50% response time improvement",
        effort: service.complexity > 100 ? "high" : "medium",
      });
    }

    // Bundle size optimizations
    const largeBundles = Array.from(this.bundleAnalysis.entries())
      .filter(([_, analysis]) => analysis.totalSize > 50000)
      .sort(([_, a], [__, b]) => b.totalSize - a.totalSize);

    for (const [dirName, analysis] of largeBundles) {
      recommendations.push({
        type: "bundle",
        priority: "medium",
        target: dirName,
        issue: `Large bundle size (${(analysis.totalSize / 1024).toFixed(1)}KB)`,
        recommendation: "Implement code splitting and lazy loading",
        estimatedImpact: "20-40% bundle size reduction",
        effort: "medium",
      });
    }

    // Query optimization opportunities
    const queryMetrics = this.queryPerformance.get("patterns");
    if (queryMetrics && queryMetrics.nPlusOne > 0) {
      recommendations.push({
        type: "database",
        priority: "high",
        target: "Query patterns",
        issue: `${queryMetrics.nPlusOne} potential N+1 query patterns detected`,
        recommendation: "Implement query consolidation and eager loading",
        estimatedImpact: "50-80% database query performance improvement",
        effort: "high",
      });
    }

    return recommendations.slice(0, 10); // Top 10 recommendations
  }

  generateImplementationPlan() {
    return {
      phase1: {
        name: "Quick Wins (Week 1-2)",
        focus: "Low effort, high impact optimizations",
        tasks: [
          "Implement caching for high-frequency API endpoints",
          "Add lazy loading for large components",
          "Optimize database query patterns in top 3 services",
        ],
      },
      phase2: {
        name: "Service Optimization (Week 3-4)",
        focus: "High-complexity service refactoring",
        tasks: [
          "Break down services with complexity > 100",
          "Implement service-level caching strategies",
          "Add performance monitoring and alerting",
        ],
      },
      phase3: {
        name: "Bundle Optimization (Week 5-6)",
        focus: "Code splitting and bundle size reduction",
        tasks: [
          "Implement dynamic imports for large modules",
          "Optimize webpack configuration",
          "Add bundle analysis monitoring",
        ],
      },
    };
  }

  generateMarkdownSummary(report) {
    const content = `# EstimatePro Performance Baseline Report

**Generated**: ${new Date().toLocaleString()}

## Executive Summary

- **Total Services Analyzed**: ${report.summary.totalServices}
- **Total Bundle Size**: ${(report.summary.totalBundleSize / 1024).toFixed(1)}KB
- **Average Service Complexity**: ${report.summary.averageServiceComplexity.toFixed(1)}
- **Estimated Memory Footprint**: ${(report.summary.totalMemoryFootprint / 1024 / 1024).toFixed(2)}MB
- **High Risk Services**: ${report.summary.highRiskServices}
- **Optimization Opportunities**: ${report.summary.optimizationOpportunities}

## Performance Targets

Based on baseline analysis, we recommend the following performance targets:

- **API Response Time**: <200ms (current avg: ${Array.from(this.serviceHealth.values()).reduce((sum, s) => sum + s.estimatedResponseTime, 0) / this.serviceHealth.size}ms)
- **Bundle Size**: <500KB initial load (current: ${(report.summary.totalBundleSize / 1024).toFixed(1)}KB)
- **Memory Usage**: <100MB on mobile (current estimate: ${(report.summary.totalMemoryFootprint / 1024 / 1024).toFixed(2)}MB)

## Top Optimization Recommendations

${report.recommendations
  .slice(0, 5)
  .map(
    (rec, i) =>
      `${i + 1}. **${rec.target}** (${rec.priority} priority)
   - Issue: ${rec.issue}
   - Recommendation: ${rec.recommendation}
   - Impact: ${rec.estimatedImpact}
   - Effort: ${rec.effort}`,
  )
  .join("\n\n")}

## Implementation Roadmap

### ${report.implementationPlan.phase1.name}
**Focus**: ${report.implementationPlan.phase1.focus}

${report.implementationPlan.phase1.tasks.map((task) => `- ${task}`).join("\n")}

### ${report.implementationPlan.phase2.name}
**Focus**: ${report.implementationPlan.phase2.focus}

${report.implementationPlan.phase2.tasks.map((task) => `- ${task}`).join("\n")}

### ${report.implementationPlan.phase3.name}
**Focus**: ${report.implementationPlan.phase3.focus}

${report.implementationPlan.phase3.tasks.map((task) => `- ${task}`).join("\n")}

## Next Steps

1. Review and validate baseline measurements
2. Set up continuous performance monitoring
3. Begin Phase 1 implementation
4. Establish performance regression testing

---
*Baseline established with EstimatePro Performance Analysis Tool*
`;

    fs.writeFileSync("performance-baseline-summary.md", content);
    console.log(
      `  📋 Markdown summary saved to: performance-baseline-summary.md`,
    );
  }
}

// Run the baseline establishment
if (require.main === module) {
  const establisher = new PerformanceBaselineEstablisher();
  establisher.establishBaselines(process.cwd()).catch((error) => {
    console.error(
      "❌ Performance baseline establishment failed:",
      error.message,
    );
    process.exit(1);
  });
}

module.exports = PerformanceBaselineEstablisher;
