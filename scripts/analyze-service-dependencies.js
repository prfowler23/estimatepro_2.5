#!/usr/bin/env node

/**
 * Service Dependency Analysis Tool
 * Maps inter-service communication patterns and identifies optimization opportunities
 */

const fs = require("fs");
const path = require("path");
const { promisify } = require("util");

const readFile = promisify(fs.readFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

class ServiceDependencyAnalyzer {
  constructor() {
    this.services = new Map();
    this.dependencies = new Map();
    this.circularDeps = new Set();
    this.performanceIssues = [];
    this.optimizationOpportunities = [];
  }

  async analyzeProject(rootDir) {
    console.log("🔍 Starting Service Dependency Analysis...\n");

    // Phase 1: Discover all services
    await this.discoverServices(path.join(rootDir, "lib/services"));

    // Phase 2: Map dependencies
    await this.mapDependencies();

    // Phase 3: Analyze patterns
    this.analyzePatterns();

    // Phase 4: Generate reports
    this.generateReports();
  }

  async discoverServices(servicesDir) {
    console.log("📋 Discovering services...");

    const files = await this.getTypeScriptFiles(servicesDir);

    for (const file of files) {
      try {
        const content = await readFile(file, "utf8");
        const serviceInfo = this.extractServiceInfo(file, content);

        if (serviceInfo) {
          this.services.set(serviceInfo.name, serviceInfo);
          console.log(`  ✓ Found: ${serviceInfo.name} (${serviceInfo.type})`);
        }
      } catch (error) {
        console.warn(`  ⚠️  Error analyzing ${file}: ${error.message}`);
      }
    }

    console.log(`\n📊 Total services discovered: ${this.services.size}\n`);
  }

  async getTypeScriptFiles(dir) {
    const files = [];

    const scan = async (currentDir) => {
      const items = await readdir(currentDir);

      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stats = await stat(fullPath);

        if (stats.isDirectory()) {
          await scan(fullPath);
        } else if (item.endsWith(".ts") && !item.endsWith(".d.ts")) {
          files.push(fullPath);
        }
      }
    };

    await scan(dir);
    return files;
  }

  extractServiceInfo(filePath, content) {
    const fileName = path.basename(filePath, ".ts");

    // Skip non-service files
    if (!fileName.includes("service") && !fileName.includes("Service")) {
      return null;
    }

    const lines = content.split("\n");
    const imports = this.extractImports(content);
    const exports = this.extractExports(content);
    const classes = this.extractClasses(content);
    const methods = this.extractMethods(content);

    // Determine service type
    let serviceType = "unknown";
    if (fileName.includes("ai")) serviceType = "AI";
    else if (fileName.includes("analytics")) serviceType = "Analytics";
    else if (fileName.includes("estimate")) serviceType = "Business Logic";
    else if (fileName.includes("real-time") || fileName.includes("session"))
      serviceType = "Real-Time";
    else if (
      fileName.includes("performance") ||
      fileName.includes("monitoring")
    )
      serviceType = "Infrastructure";
    else if (fileName.includes("calculator")) serviceType = "Business Logic";
    else if (fileName.includes("workflow") || fileName.includes("validation"))
      serviceType = "Business Logic";
    else if (fileName.includes("auto-save") || fileName.includes("dependency"))
      serviceType = "Real-Time";
    else serviceType = "Domain Service";

    return {
      name: fileName,
      type: serviceType,
      filePath,
      imports,
      exports,
      classes,
      methods,
      size: content.length,
      complexity: this.calculateComplexity(content),
      dependencies: imports.filter((imp) => imp.includes("services/")),
      externalDeps: imports.filter(
        (imp) => !imp.includes("@/") && !imp.startsWith("."),
      ),
    };
  }

  extractImports(content) {
    const importRegex = /import.*from\s+["']([^"']+)["']/g;
    const imports = [];
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    return imports;
  }

  extractExports(content) {
    const exportRegex =
      /export\s+(class|function|const|interface|type)\s+(\w+)/g;
    const exports = [];
    let match;

    while ((match = exportRegex.exec(content)) !== null) {
      exports.push({ type: match[1], name: match[2] });
    }

    return exports;
  }

  extractClasses(content) {
    const classRegex = /class\s+(\w+)(?:\s+extends\s+(\w+))?/g;
    const classes = [];
    let match;

    while ((match = classRegex.exec(content)) !== null) {
      classes.push({ name: match[1], extends: match[2] || null });
    }

    return classes;
  }

  extractMethods(content) {
    const methodRegex = /(async\s+)?(\w+)\s*\([^)]*\)\s*:\s*([^{]+)/g;
    const methods = [];
    let match;

    while ((match = methodRegex.exec(content)) !== null) {
      methods.push({
        name: match[2],
        async: !!match[1],
        returnType: match[3].trim(),
      });
    }

    return methods;
  }

  calculateComplexity(content) {
    // Simple complexity score based on various factors
    let score = 0;

    // Count decision points
    score += (content.match(/if\s*\(/g) || []).length;
    score += (content.match(/switch\s*\(/g) || []).length;
    score += (content.match(/for\s*\(/g) || []).length;
    score += (content.match(/while\s*\(/g) || []).length;
    score += (content.match(/catch\s*\(/g) || []).length;

    // Count async operations
    score += (content.match(/await\s+/g) || []).length * 2;

    // Count database operations
    score += (content.match(/supabase\./g) || []).length * 3;

    // Count external API calls
    score += (content.match(/fetch\(/g) || []).length * 3;

    return score;
  }

  async mapDependencies() {
    console.log("🔗 Mapping service dependencies...");

    for (const [serviceName, service] of this.services) {
      const deps = new Set();

      // Direct service dependencies
      for (const dep of service.dependencies) {
        const depName = this.extractServiceNameFromPath(dep);
        if (depName && this.services.has(depName)) {
          deps.add(depName);
        }
      }

      // Indirect dependencies through imports
      for (const imp of service.imports) {
        if (imp.includes("@/lib/services/")) {
          const serviceName = path.basename(imp);
          if (this.services.has(serviceName)) {
            deps.add(serviceName);
          }
        }
      }

      this.dependencies.set(serviceName, Array.from(deps));

      if (deps.size > 0) {
        console.log(`  ${serviceName} → [${Array.from(deps).join(", ")}]`);
      }
    }

    console.log("\n");
  }

  extractServiceNameFromPath(importPath) {
    if (importPath.includes("/services/")) {
      return path.basename(importPath).replace(".ts", "");
    }
    return null;
  }

  analyzePatterns() {
    console.log("🔍 Analyzing communication patterns...\n");

    // 1. Detect circular dependencies
    this.detectCircularDependencies();

    // 2. Identify high-coupling services
    this.identifyHighCouplingServices();

    // 3. Find performance bottlenecks
    this.identifyPerformanceBottlenecks();

    // 4. Discover optimization opportunities
    this.identifyOptimizationOpportunities();
  }

  detectCircularDependencies() {
    const visited = new Set();
    const recursionStack = new Set();

    const hasCycle = (service, path = []) => {
      if (recursionStack.has(service)) {
        const cycle = path.slice(path.indexOf(service)).concat(service);
        this.circularDeps.add(cycle.join(" → "));
        return true;
      }

      if (visited.has(service)) {
        return false;
      }

      visited.add(service);
      recursionStack.add(service);

      const deps = this.dependencies.get(service) || [];
      for (const dep of deps) {
        if (hasCycle(dep, path.concat(service))) {
          return true;
        }
      }

      recursionStack.delete(service);
      return false;
    };

    for (const service of this.services.keys()) {
      if (!visited.has(service)) {
        hasCycle(service);
      }
    }

    if (this.circularDeps.size > 0) {
      console.log("⚠️  Circular Dependencies Detected:");
      for (const cycle of this.circularDeps) {
        console.log(`  🔄 ${cycle}`);
      }
    } else {
      console.log("✅ No circular dependencies found");
    }
    console.log("");
  }

  identifyHighCouplingServices() {
    const couplingScores = new Map();

    for (const [serviceName, service] of this.services) {
      const deps = this.dependencies.get(serviceName) || [];
      const dependents = Array.from(this.dependencies.entries())
        .filter(([_, deps]) => deps.includes(serviceName))
        .map(([name, _]) => name);

      const couplingScore = deps.length + dependents.length;
      couplingScores.set(serviceName, {
        score: couplingScore,
        dependencies: deps.length,
        dependents: dependents.length,
      });
    }

    const highCouplingServices = Array.from(couplingScores.entries())
      .filter(([_, data]) => data.score > 5)
      .sort(([_, a], [__, b]) => b.score - a.score);

    if (highCouplingServices.length > 0) {
      console.log("📊 High Coupling Services (>5 connections):");
      for (const [service, data] of highCouplingServices) {
        const serviceInfo = this.services.get(service);
        console.log(
          `  📈 ${service} (${serviceInfo.type}): ${data.score} connections`,
        );
        console.log(
          `     Dependencies: ${data.dependencies}, Dependents: ${data.dependents}`,
        );
      }
    } else {
      console.log("✅ All services have healthy coupling levels");
    }
    console.log("");
  }

  identifyPerformanceBottlenecks() {
    console.log("⚡ Performance Analysis:");

    const highComplexityServices = Array.from(this.services.entries())
      .filter(([_, service]) => service.complexity > 50)
      .sort(([_, a], [__, b]) => b.complexity - a.complexity);

    if (highComplexityServices.length > 0) {
      console.log("  🐌 High Complexity Services (>50):");
      for (const [name, service] of highComplexityServices) {
        console.log(`    ${name}: complexity ${service.complexity}`);
        this.performanceIssues.push({
          service: name,
          issue: "High complexity",
          score: service.complexity,
          suggestion: "Consider breaking down into smaller services",
        });
      }
    }

    const largeServices = Array.from(this.services.entries())
      .filter(([_, service]) => service.size > 10000)
      .sort(([_, a], [__, b]) => b.size - a.size);

    if (largeServices.length > 0) {
      console.log("  📦 Large Services (>10KB):");
      for (const [name, service] of largeServices) {
        const sizeKB = (service.size / 1024).toFixed(1);
        console.log(`    ${name}: ${sizeKB}KB`);
        this.performanceIssues.push({
          service: name,
          issue: "Large file size",
          score: service.size,
          suggestion: "Consider splitting into modules",
        });
      }
    }

    console.log("");
  }

  identifyOptimizationOpportunities() {
    console.log("🎯 Optimization Opportunities:");

    // 1. Services with many external dependencies
    const heavyExternalDeps = Array.from(this.services.entries())
      .filter(([_, service]) => service.externalDeps.length > 5)
      .sort(([_, a], [__, b]) => b.externalDeps.length - a.externalDeps.length);

    if (heavyExternalDeps.length > 0) {
      console.log("  📦 Heavy External Dependencies:");
      for (const [name, service] of heavyExternalDeps) {
        console.log(
          `    ${name}: ${service.externalDeps.length} external deps`,
        );
        this.optimizationOpportunities.push({
          service: name,
          opportunity: "Dependency consolidation",
          impact: "Bundle size reduction",
          effort: "Medium",
        });
      }
    }

    // 2. Services that could benefit from caching
    const cacheCandidates = Array.from(this.services.entries()).filter(
      ([_, service]) =>
        service.name.includes("analytics") ||
        service.name.includes("ai") ||
        service.name.includes("calculation"),
    );

    if (cacheCandidates.length > 0) {
      console.log("  🗄️  Caching Opportunities:");
      for (const [name, service] of cacheCandidates) {
        console.log(`    ${name}: Could benefit from enhanced caching`);
        this.optimizationOpportunities.push({
          service: name,
          opportunity: "Enhanced caching strategy",
          impact: "Response time improvement",
          effort: "Low",
        });
      }
    }

    // 3. Services that could be consolidated
    const servicesByType = new Map();
    for (const [name, service] of this.services) {
      if (!servicesByType.has(service.type)) {
        servicesByType.set(service.type, []);
      }
      servicesByType.get(service.type).push(name);
    }

    console.log("  🔄 Consolidation Opportunities:");
    for (const [type, services] of servicesByType) {
      if (services.length > 3) {
        console.log(
          `    ${type}: ${services.length} services could be consolidated`,
        );
        this.optimizationOpportunities.push({
          service: type,
          opportunity: "Service consolidation",
          impact: "Reduced complexity",
          effort: "High",
        });
      }
    }

    console.log("");
  }

  generateReports() {
    console.log("📋 Generating Service Dependency Report...\n");

    // Service Overview Report
    const overviewReport = {
      timestamp: new Date().toISOString(),
      summary: {
        totalServices: this.services.size,
        serviceTypes: this.getServiceTypeBreakdown(),
        totalDependencies: Array.from(this.dependencies.values()).flat().length,
        circularDependencies: this.circularDeps.size,
        performanceIssues: this.performanceIssues.length,
        optimizationOpportunities: this.optimizationOpportunities.length,
      },
      services: Array.from(this.services.entries()).map(([name, service]) => ({
        name,
        type: service.type,
        complexity: service.complexity,
        size: service.size,
        dependencies: this.dependencies.get(name) || [],
        dependencyCount: (this.dependencies.get(name) || []).length,
        externalDepsCount: service.externalDeps.length,
      })),
      dependencies: Object.fromEntries(this.dependencies),
      issues: {
        circularDependencies: Array.from(this.circularDeps),
        performanceIssues: this.performanceIssues,
        optimizationOpportunities: this.optimizationOpportunities,
      },
    };

    // Write detailed report
    const reportPath = "service-dependency-analysis.json";
    fs.writeFileSync(reportPath, JSON.stringify(overviewReport, null, 2));
    console.log(`📄 Detailed report saved to: ${reportPath}`);

    // Write summary report
    this.generateSummaryReport(overviewReport);
  }

  getServiceTypeBreakdown() {
    const breakdown = {};
    for (const service of this.services.values()) {
      breakdown[service.type] = (breakdown[service.type] || 0) + 1;
    }
    return breakdown;
  }

  generateSummaryReport(data) {
    const summaryPath = "service-dependency-summary.md";
    const content = `# Service Dependency Analysis Summary

Generated: ${new Date().toLocaleString()}

## Overview
- **Total Services**: ${data.summary.totalServices}
- **Total Dependencies**: ${data.summary.totalDependencies}
- **Circular Dependencies**: ${data.summary.circularDependencies}
- **Performance Issues**: ${data.summary.performanceIssues}
- **Optimization Opportunities**: ${data.summary.optimizationOpportunities}

## Service Types
${Object.entries(data.summary.serviceTypes)
  .map(([type, count]) => `- **${type}**: ${count} services`)
  .join("\n")}

## Top Services by Complexity
${data.services
  .sort((a, b) => b.complexity - a.complexity)
  .slice(0, 10)
  .map(
    (service, i) =>
      `${i + 1}. **${service.name}** (${service.type}): ${service.complexity}`,
  )
  .join("\n")}

## High Coupling Services
${data.services
  .filter((s) => s.dependencyCount > 3)
  .sort((a, b) => b.dependencyCount - a.dependencyCount)
  .map(
    (service) =>
      `- **${service.name}**: ${service.dependencyCount} dependencies`,
  )
  .join("\n")}

${
  data.issues.circularDependencies.length > 0
    ? `
## ⚠️ Circular Dependencies
${data.issues.circularDependencies.map((dep) => `- \`${dep}\``).join("\n")}
`
    : "## ✅ No Circular Dependencies Found"
}

## 🎯 Top Optimization Opportunities
${data.issues.optimizationOpportunities
  .slice(0, 5)
  .map(
    (opp, i) =>
      `${i + 1}. **${opp.service}**: ${opp.opportunity} (${opp.impact}, ${opp.effort} effort)`,
  )
  .join("\n")}

## Performance Issues
${
  data.issues.performanceIssues.length > 0
    ? data.issues.performanceIssues
        .map(
          (issue) =>
            `- **${issue.service}**: ${issue.issue} (${issue.suggestion})`,
        )
        .join("\n")
    : "No significant performance issues detected."
}

---
*Analysis completed with EstimatePro Service Dependency Analyzer*
`;

    fs.writeFileSync(summaryPath, content);
    console.log(`📊 Summary report saved to: ${summaryPath}`);

    console.log("\n🎉 Service dependency analysis completed successfully!");
  }
}

// Run the analysis
if (require.main === module) {
  const analyzer = new ServiceDependencyAnalyzer();
  analyzer.analyzeProject(process.cwd()).catch((error) => {
    console.error("❌ Analysis failed:", error.message);
    process.exit(1);
  });
}

module.exports = ServiceDependencyAnalyzer;
