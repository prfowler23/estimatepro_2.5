#!/usr/bin/env node
/**
 * EstimatePro Technical Debt Prioritization Matrix
 *
 * Comprehensive technical debt analysis tool that synthesizes findings from all
 * previous analyses to prioritize technical debt remediation based on impact,
 * effort, and risk factors.
 */

const fs = require("fs");
const path = require("path");

class TechnicalDebtAnalyzer {
  constructor() {
    this.rootDir = process.cwd();
    this.analysisResults = {};
    this.debtItems = [];
    this.prioritizationMatrix = {};

    // Load previous analysis results
    this.loadPreviousAnalyses();

    // Initialize debt categories
    this.debtCategories = {
      architecture: {
        weight: 0.3,
        description: "System design and structure issues",
      },
      performance: {
        weight: 0.25,
        description: "Performance bottlenecks and optimization opportunities",
      },
      maintainability: {
        weight: 0.2,
        description: "Code quality and maintainability issues",
      },
      security: {
        weight: 0.15,
        description: "Security vulnerabilities and compliance gaps",
      },
      scalability: {
        weight: 0.1,
        description: "Scalability limitations and constraints",
      },
    };

    // Effort estimation factors
    this.effortFactors = {
      complexity: { low: 1, medium: 3, high: 5, critical: 8 },
      scope: { file: 1, module: 2, service: 4, system: 6 },
      dependencies: { none: 1, few: 2, many: 3, critical: 4 },
      testing: { minimal: 1, moderate: 2, extensive: 3, comprehensive: 4 },
    };

    // Impact scoring criteria
    this.impactCriteria = {
      userExperience: { low: 1, medium: 2, high: 3, critical: 4 },
      businessValue: { low: 1, medium: 2, high: 3, critical: 4 },
      developerProductivity: { low: 1, medium: 2, high: 3, critical: 4 },
      technicalRisk: { low: 1, medium: 2, high: 3, critical: 4 },
      maintenanceCost: { low: 1, medium: 2, high: 3, critical: 4 },
    };
  }

  loadPreviousAnalyses() {
    try {
      // Load service dependency analysis
      const serviceDepsPath = path.join(
        this.rootDir,
        "service-dependency-analysis.json",
      );
      if (fs.existsSync(serviceDepsPath)) {
        this.analysisResults.serviceDependencies = JSON.parse(
          fs.readFileSync(serviceDepsPath, "utf8"),
        );
      }

      // Load bundle optimization analysis
      const bundlePath = path.join(
        this.rootDir,
        "bundle-optimization-analysis.json",
      );
      if (fs.existsSync(bundlePath)) {
        this.analysisResults.bundleOptimization = JSON.parse(
          fs.readFileSync(bundlePath, "utf8"),
        );
      }

      // Load database performance audit
      const dbPath = path.join(this.rootDir, "database-performance-audit.json");
      if (fs.existsSync(dbPath)) {
        this.analysisResults.databasePerformance = JSON.parse(
          fs.readFileSync(dbPath, "utf8"),
        );
      }

      // Load AI performance analysis
      const aiPath = path.join(this.rootDir, "ai-performance-analysis.json");
      if (fs.existsSync(aiPath)) {
        this.analysisResults.aiPerformance = JSON.parse(
          fs.readFileSync(aiPath, "utf8"),
        );
      }

      // Load real-time performance analysis
      const realtimePath = path.join(
        this.rootDir,
        "realtime-performance-analysis.json",
      );
      if (fs.existsSync(realtimePath)) {
        this.analysisResults.realtimePerformance = JSON.parse(
          fs.readFileSync(realtimePath, "utf8"),
        );
      }

      // Load migration readiness
      const migrationPath = path.join(
        this.rootDir,
        "migration-readiness-assessment.json",
      );
      if (fs.existsSync(migrationPath)) {
        this.analysisResults.migrationReadiness = JSON.parse(
          fs.readFileSync(migrationPath, "utf8"),
        );
      }

      console.log(
        `📊 Loaded ${Object.keys(this.analysisResults).length} previous analyses`,
      );
    } catch (error) {
      console.warn(
        "⚠️  Warning: Could not load some previous analyses:",
        error.message,
      );
    }
  }

  async analyzeCodebase() {
    console.log("🔍 Analyzing codebase for technical debt patterns...");

    const analysis = {
      fileCount: 0,
      debtPatterns: {
        duplicateCode: 0,
        complexFunctions: 0,
        longParameterLists: 0,
        largeClasses: 0,
        godObjects: 0,
        deadCode: 0,
        todoComments: 0,
        magicNumbers: 0,
        deepNesting: 0,
        longMethods: 0,
      },
      typeScriptIssues: {
        anyTypes: 0,
        noImplicitAny: 0,
        strictNullChecks: 0,
        unusedVariables: 0,
      },
      importIssues: {
        circularImports: 0,
        unusedImports: 0,
        relativeImports: 0,
        dynamicImports: 0,
      },
    };

    // Analyze TypeScript/JavaScript files
    await this.walkDirectory(this.rootDir, async (filePath) => {
      if (this.isAnalyzableFile(filePath)) {
        analysis.fileCount++;
        await this.analyzeFile(filePath, analysis);
      }
    });

    return analysis;
  }

  async walkDirectory(dir, callback) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      // Skip node_modules, .git, build directories
      if (entry.isDirectory() && !this.shouldSkipDirectory(entry.name)) {
        await this.walkDirectory(fullPath, callback);
      } else if (entry.isFile()) {
        await callback(fullPath);
      }
    }
  }

  shouldSkipDirectory(dirName) {
    const skipDirs = [
      "node_modules",
      ".git",
      ".next",
      "build",
      "dist",
      "coverage",
      ".vercel",
      ".vscode",
      "public",
      "__tests__",
      ".cursor",
    ];
    return skipDirs.includes(dirName) || dirName.startsWith(".");
  }

  isAnalyzableFile(filePath) {
    const ext = path.extname(filePath);
    return [".ts", ".tsx", ".js", ".jsx"].includes(ext);
  }

  async analyzeFile(filePath, analysis) {
    try {
      const content = fs.readFileSync(filePath, "utf8");
      const lines = content.split("\n");

      // Analyze code patterns
      this.analyzeCodePatterns(content, lines, analysis, filePath);
      this.analyzeTypeScriptIssues(content, analysis);
      this.analyzeImportIssues(content, analysis, filePath);
    } catch (error) {
      // Skip files that can't be read
    }
  }

  analyzeCodePatterns(content, lines, analysis, filePath) {
    // TODO comments
    const todoMatches = content.match(/\/\/\s*TODO|\/\*\s*TODO|\*\s*TODO/gi);
    if (todoMatches) {
      analysis.debtPatterns.todoComments += todoMatches.length;
    }

    // Magic numbers
    const magicNumberMatches = content.match(/\b\d{2,}\b/g);
    if (magicNumberMatches) {
      analysis.debtPatterns.magicNumbers += magicNumberMatches.filter(
        (num) => !["100", "200", "300", "400", "500"].includes(num),
      ).length;
    }

    // Deep nesting (simplified detection)
    const deepNestingMatches = content.match(/\s{12,}\w/g);
    if (deepNestingMatches) {
      analysis.debtPatterns.deepNesting += deepNestingMatches.length;
    }

    // Long methods (>50 lines)
    const functionMatches = content.match(
      /(?:function|=>|\w+\s*\([^)]*\)\s*{)/g,
    );
    if (functionMatches) {
      const functions = content.split(/(?:function|=>)/);
      analysis.debtPatterns.longMethods += functions.filter(
        (func) => func.split("\n").length > 50,
      ).length;
    }

    // Complex functions (high cyclomatic complexity indicators)
    const complexityIndicators = content.match(
      /\b(if|else|switch|for|while|catch|&&|\|\|)\b/g,
    );
    if (complexityIndicators && complexityIndicators.length > 20) {
      analysis.debtPatterns.complexFunctions++;
    }

    // Large classes (>500 lines)
    if (lines.length > 500 && content.includes("class ")) {
      analysis.debtPatterns.largeClasses++;
    }

    // God objects (classes with many methods)
    const methodMatches = content.match(/\s+\w+\s*\([^)]*\)\s*{/g);
    if (
      methodMatches &&
      methodMatches.length > 15 &&
      content.includes("class ")
    ) {
      analysis.debtPatterns.godObjects++;
    }
  }

  analyzeTypeScriptIssues(content, analysis) {
    // Any types
    const anyMatches = content.match(/:\s*any\b/g);
    if (anyMatches) {
      analysis.typeScriptIssues.anyTypes += anyMatches.length;
    }

    // Unused variables (simplified detection)
    const unusedMatches = content.match(
      /const\s+\w+\s*=.*?;[\s\S]*?(?=const|\n\n|$)/g,
    );
    if (unusedMatches) {
      analysis.typeScriptIssues.unusedVariables += unusedMatches.filter(
        (match) => {
          const varName = match.match(/const\s+(\w+)/)?.[1];
          return (
            varName &&
            !content.includes(varName + ".") &&
            !content.includes(varName + "(")
          );
        },
      ).length;
    }
  }

  analyzeImportIssues(content, analysis, filePath) {
    // Relative imports
    const relativeImports = content.match(/import.*from\s+['"][./]/g);
    if (relativeImports) {
      analysis.importIssues.relativeImports += relativeImports.length;
    }

    // Dynamic imports
    const dynamicImports = content.match(/import\s*\(/g);
    if (dynamicImports) {
      analysis.importIssues.dynamicImports += dynamicImports.length;
    }

    // Unused imports (simplified detection)
    const importMatches = content.match(/import\s+(?:{[^}]+}|\w+)\s+from/g);
    if (importMatches) {
      analysis.importIssues.unusedImports += importMatches.filter((imp) => {
        const imported =
          imp.match(/import\s+(?:{([^}]+)}|(\w+))/)?.[1] ||
          imp.match(/import\s+(?:{([^}]+)}|(\w+))/)?.[2];
        if (imported) {
          const names = imported.includes(",")
            ? imported.split(",").map((n) => n.trim())
            : [imported];
          return names.some(
            (name) => !content.slice(imp.length).includes(name),
          );
        }
        return false;
      }).length;
    }
  }

  synthesizeDebtItems() {
    console.log("🔄 Synthesizing technical debt items from all analyses...");

    const debtItems = [];

    // Architecture debt from service dependencies
    if (this.analysisResults.serviceDependencies) {
      const services = this.analysisResults.serviceDependencies.analysis || {};

      // High complexity services
      Object.entries(services).forEach(([name, service]) => {
        if (service.complexity && service.complexity > 7) {
          debtItems.push({
            id: `arch_complexity_${name}`,
            category: "architecture",
            title: `High complexity service: ${name}`,
            description: `Service has complexity score of ${service.complexity}, indicating architectural debt`,
            impact: this.calculateImpact({
              userExperience: service.publicInterface ? "high" : "medium",
              businessValue: "medium",
              developerProductivity: "high",
              technicalRisk: "high",
              maintenanceCost: "high",
            }),
            effort: this.calculateEffort({
              complexity: "high",
              scope: "service",
              dependencies: service.dependencies?.length > 5 ? "many" : "few",
              testing: "extensive",
            }),
            source: "service_dependency_analysis",
            affectedFiles: service.files || [],
            metrics: {
              complexity: service.complexity,
              dependencies: service.dependencies?.length || 0,
            },
          });
        }
      });
    }

    // Performance debt from bundle analysis
    if (this.analysisResults.bundleOptimization) {
      const bundle = this.analysisResults.bundleOptimization;

      // Large bundle opportunities
      if (bundle.opportunities?.codeSplitting?.length > 0) {
        debtItems.push({
          id: "perf_bundle_size",
          category: "performance",
          title: "Bundle size optimization opportunities",
          description: `${bundle.opportunities.codeSplitting.length} code splitting opportunities identified`,
          impact: this.calculateImpact({
            userExperience: "high",
            businessValue: "medium",
            developerProductivity: "low",
            technicalRisk: "medium",
            maintenanceCost: "medium",
          }),
          effort: this.calculateEffort({
            complexity: "medium",
            scope: "system",
            dependencies: "many",
            testing: "moderate",
          }),
          source: "bundle_optimization_analysis",
          affectedFiles: bundle.opportunities.codeSplitting.map(
            (opp) => opp.file,
          ),
          metrics: {
            potentialSavings: bundle.summary?.potentialSavings || 0,
            opportunities: bundle.opportunities.codeSplitting.length,
          },
        });
      }

      // Lazy loading opportunities
      if (bundle.opportunities?.lazyLoading?.length > 0) {
        debtItems.push({
          id: "perf_lazy_loading",
          category: "performance",
          title: "Lazy loading implementation needed",
          description: `${bundle.opportunities.lazyLoading.length} components need lazy loading`,
          impact: this.calculateImpact({
            userExperience: "high",
            businessValue: "medium",
            developerProductivity: "low",
            technicalRisk: "low",
            maintenanceCost: "low",
          }),
          effort: this.calculateEffort({
            complexity: "low",
            scope: "module",
            dependencies: "few",
            testing: "minimal",
          }),
          source: "bundle_optimization_analysis",
          affectedFiles: bundle.opportunities.lazyLoading.map(
            (opp) => opp.file,
          ),
          metrics: {
            components: bundle.opportunities.lazyLoading.length,
          },
        });
      }
    }

    // Database performance debt
    if (this.analysisResults.databasePerformance) {
      const db = this.analysisResults.databasePerformance;

      // N+1 query patterns
      if (db.queryPatterns?.nPlusOneIssues?.length > 0) {
        debtItems.push({
          id: "perf_n_plus_one_queries",
          category: "performance",
          title: "N+1 query patterns need optimization",
          description: `${db.queryPatterns.nPlusOneIssues.length} N+1 query patterns detected`,
          impact: this.calculateImpact({
            userExperience: "high",
            businessValue: "high",
            developerProductivity: "medium",
            technicalRisk: "medium",
            maintenanceCost: "high",
          }),
          effort: this.calculateEffort({
            complexity: "medium",
            scope: "service",
            dependencies: "moderate",
            testing: "extensive",
          }),
          source: "database_performance_audit",
          affectedFiles: db.queryPatterns.nPlusOneIssues.map(
            (issue) => issue.file,
          ),
          metrics: {
            patterns: db.queryPatterns.nPlusOneIssues.length,
          },
        });
      }

      // Missing indexes
      if (db.indexOptimization?.recommendations?.length > 0) {
        debtItems.push({
          id: "perf_missing_indexes",
          category: "performance",
          title: "Database indexing optimization needed",
          description: `${db.indexOptimization.recommendations.length} indexing recommendations`,
          impact: this.calculateImpact({
            userExperience: "high",
            businessValue: "high",
            developerProductivity: "low",
            technicalRisk: "low",
            maintenanceCost: "medium",
          }),
          effort: this.calculateEffort({
            complexity: "low",
            scope: "system",
            dependencies: "few",
            testing: "moderate",
          }),
          source: "database_performance_audit",
          affectedFiles: [],
          metrics: {
            recommendations: db.indexOptimization.recommendations.length,
          },
        });
      }
    }

    // AI performance debt
    if (this.analysisResults.aiPerformance) {
      const ai = this.analysisResults.aiPerformance;

      // Caching opportunities
      if (ai.cachingOpportunities?.high?.length > 0) {
        debtItems.push({
          id: "perf_ai_caching",
          category: "performance",
          title: "AI response caching implementation",
          description: `${ai.cachingOpportunities.high.length} high-priority caching opportunities`,
          impact: this.calculateImpact({
            userExperience: "high",
            businessValue: "high",
            developerProductivity: "medium",
            technicalRisk: "medium",
            maintenanceCost: "medium",
          }),
          effort: this.calculateEffort({
            complexity: "medium",
            scope: "service",
            dependencies: "moderate",
            testing: "extensive",
          }),
          source: "ai_performance_analysis",
          affectedFiles: ai.cachingOpportunities.high.map((opp) => opp.file),
          metrics: {
            opportunities: ai.cachingOpportunities.high.length,
            potentialSavings: ai.estimatedImprovements?.responseTime || 0,
          },
        });
      }

      // Prompt optimization
      if (ai.promptOptimization?.oversized?.length > 0) {
        debtItems.push({
          id: "perf_prompt_optimization",
          category: "performance",
          title: "AI prompt optimization needed",
          description: `${ai.promptOptimization.oversized.length} oversized prompts need optimization`,
          impact: this.calculateImpact({
            userExperience: "medium",
            businessValue: "high",
            developerProductivity: "low",
            technicalRisk: "low",
            maintenanceCost: "high",
          }),
          effort: this.calculateEffort({
            complexity: "low",
            scope: "module",
            dependencies: "few",
            testing: "minimal",
          }),
          source: "ai_performance_analysis",
          affectedFiles: ai.promptOptimization.oversized.map((opp) => opp.file),
          metrics: {
            oversizedPrompts: ai.promptOptimization.oversized.length,
          },
        });
      }
    }

    // Real-time performance debt
    if (this.analysisResults.realtimePerformance) {
      const rt = this.analysisResults.realtimePerformance;

      // High frequency updates
      if (rt.updatePatterns?.highFrequency?.length > 0) {
        debtItems.push({
          id: "perf_realtime_frequency",
          category: "performance",
          title: "Real-time update frequency optimization",
          description: `${rt.updatePatterns.highFrequency.length} services with high-frequency updates`,
          impact: this.calculateImpact({
            userExperience: "high",
            businessValue: "medium",
            developerProductivity: "medium",
            technicalRisk: "medium",
            maintenanceCost: "high",
          }),
          effort: this.calculateEffort({
            complexity: "medium",
            scope: "service",
            dependencies: "moderate",
            testing: "extensive",
          }),
          source: "realtime_performance_analysis",
          affectedFiles: rt.updatePatterns.highFrequency.map(
            (pattern) => pattern.file,
          ),
          metrics: {
            services: rt.updatePatterns.highFrequency.length,
          },
        });
      }
    }

    // Migration readiness debt
    if (this.analysisResults.migrationReadiness) {
      const migration = this.analysisResults.migrationReadiness;

      // TypeScript issues
      if (migration.detailedAssessment?.typescript?.issues?.length > 0) {
        debtItems.push({
          id: "tech_typescript_modernization",
          category: "maintainability",
          title: "TypeScript modernization needed",
          description: `${migration.detailedAssessment.typescript.issues.length} TypeScript issues need addressing`,
          impact: this.calculateImpact({
            userExperience: "low",
            businessValue: "medium",
            developerProductivity: "high",
            technicalRisk: "high",
            maintenanceCost: "high",
          }),
          effort: this.calculateEffort({
            complexity: "medium",
            scope: "system",
            dependencies: "many",
            testing: "comprehensive",
          }),
          source: "migration_readiness_assessment",
          affectedFiles: [],
          metrics: {
            issues: migration.detailedAssessment.typescript.issues.length,
          },
        });
      }

      // Infrastructure gaps
      if (migration.detailedAssessment?.infrastructure?.issues?.length > 0) {
        debtItems.push({
          id: "infra_modernization",
          category: "scalability",
          title: "Infrastructure modernization required",
          description: `${migration.detailedAssessment.infrastructure.issues.length} infrastructure issues`,
          impact: this.calculateImpact({
            userExperience: "medium",
            businessValue: "high",
            developerProductivity: "high",
            technicalRisk: "critical",
            maintenanceCost: "high",
          }),
          effort: this.calculateEffort({
            complexity: "high",
            scope: "system",
            dependencies: "critical",
            testing: "comprehensive",
          }),
          source: "migration_readiness_assessment",
          affectedFiles: [],
          metrics: {
            issues: migration.detailedAssessment.infrastructure.issues.length,
          },
        });
      }
    }

    this.debtItems = debtItems;
    console.log(`📋 Synthesized ${debtItems.length} technical debt items`);

    return debtItems;
  }

  calculateImpact(criteria) {
    const weights = {
      userExperience: 0.3,
      businessValue: 0.25,
      developerProductivity: 0.2,
      technicalRisk: 0.15,
      maintenanceCost: 0.1,
    };

    let totalScore = 0;
    let totalWeight = 0;

    Object.entries(criteria).forEach(([criterion, level]) => {
      if (
        this.impactCriteria[criterion] &&
        this.impactCriteria[criterion][level]
      ) {
        const score = this.impactCriteria[criterion][level];
        const weight = weights[criterion] || 0;
        totalScore += score * weight;
        totalWeight += weight;
      }
    });

    return totalWeight > 0
      ? Math.round((totalScore / totalWeight) * 100) / 100
      : 0;
  }

  calculateEffort(factors) {
    let totalScore = 0;
    let factorCount = 0;

    Object.entries(factors).forEach(([factor, level]) => {
      if (this.effortFactors[factor] && this.effortFactors[factor][level]) {
        totalScore += this.effortFactors[factor][level];
        factorCount++;
      }
    });

    return factorCount > 0
      ? Math.round((totalScore / factorCount) * 100) / 100
      : 0;
  }

  createPrioritizationMatrix() {
    console.log("📊 Creating prioritization matrix...");

    // Calculate priority scores for each debt item
    const prioritizedItems = this.debtItems.map((item) => {
      const categoryWeight = this.debtCategories[item.category]?.weight || 0.1;
      const priorityScore =
        (item.impact * 0.7 + (5 - item.effort) * 0.3) * categoryWeight;

      return {
        ...item,
        priorityScore: Math.round(priorityScore * 100) / 100,
        category: item.category,
        categoryWeight: categoryWeight,
      };
    });

    // Sort by priority score (highest first)
    prioritizedItems.sort((a, b) => b.priorityScore - a.priorityScore);

    // Create priority tiers
    const matrix = {
      critical: prioritizedItems.filter((item) => item.priorityScore >= 2.5),
      high: prioritizedItems.filter(
        (item) => item.priorityScore >= 2.0 && item.priorityScore < 2.5,
      ),
      medium: prioritizedItems.filter(
        (item) => item.priorityScore >= 1.5 && item.priorityScore < 2.0,
      ),
      low: prioritizedItems.filter((item) => item.priorityScore < 1.5),
    };

    // Calculate category breakdown
    const categoryBreakdown = {};
    Object.keys(this.debtCategories).forEach((category) => {
      categoryBreakdown[category] = {
        total: prioritizedItems.filter((item) => item.category === category)
          .length,
        critical: matrix.critical.filter((item) => item.category === category)
          .length,
        high: matrix.high.filter((item) => item.category === category).length,
        medium: matrix.medium.filter((item) => item.category === category)
          .length,
        low: matrix.low.filter((item) => item.category === category).length,
      };
    });

    this.prioritizationMatrix = {
      matrix,
      categoryBreakdown,
      totalItems: prioritizedItems.length,
      prioritizedItems,
    };

    return this.prioritizationMatrix;
  }

  generateImplementationPlan() {
    console.log("📋 Generating implementation plan...");

    const { matrix } = this.prioritizationMatrix;

    const phases = [
      {
        name: "Critical Debt Resolution (Weeks 1-4)",
        priority: "critical",
        items: matrix.critical,
        estimatedWeeks: 4,
        parallelizable: false,
        description:
          "Address critical technical debt items that pose immediate risks",
      },
      {
        name: "High Priority Optimizations (Weeks 5-8)",
        priority: "high",
        items: matrix.high,
        estimatedWeeks: 4,
        parallelizable: true,
        description:
          "Implement high-impact performance and architecture improvements",
      },
      {
        name: "Medium Priority Enhancements (Weeks 9-12)",
        priority: "medium",
        items: matrix.medium,
        estimatedWeeks: 4,
        parallelizable: true,
        description: "Address maintainability and scalability improvements",
      },
      {
        name: "Low Priority Cleanup (Weeks 13-16)",
        priority: "low",
        items: matrix.low,
        estimatedWeeks: 4,
        parallelizable: true,
        description:
          "Complete remaining technical debt items as capacity allows",
      },
    ];

    // Calculate resource requirements
    let totalEffort = 0;
    phases.forEach((phase) => {
      const phaseEffort = phase.items.reduce(
        (sum, item) => sum + item.effort,
        0,
      );
      phase.effort = phaseEffort;
      totalEffort += phaseEffort;
    });

    // Generate recommendations
    const recommendations = this.generateRecommendations();

    const implementationPlan = {
      phases,
      totalEffort,
      estimatedDuration: "16 weeks",
      resourceRequirements: this.calculateResourceRequirements(phases),
      recommendations,
      riskAssessment: this.assessImplementationRisks(phases),
    };

    return implementationPlan;
  }

  generateRecommendations() {
    const recommendations = {
      immediate: [],
      strategic: [],
      preventive: [],
    };

    // Immediate recommendations based on critical items
    this.prioritizationMatrix.matrix.critical.forEach((item) => {
      if (item.impact >= 3.0) {
        recommendations.immediate.push({
          title: `Address ${item.title}`,
          description: item.description,
          rationale: `Critical impact (${item.impact}) requires immediate attention`,
          effort: item.effort,
          timeline: "1-2 weeks",
        });
      }
    });

    // Strategic recommendations for architecture
    const archItems = this.debtItems.filter(
      (item) => item.category === "architecture",
    );
    if (archItems.length > 0) {
      recommendations.strategic.push({
        title: "Implement Service Architecture Refactoring",
        description: `${archItems.length} architectural debt items require systematic refactoring`,
        rationale:
          "Architectural debt compounds over time and affects all future development",
        effort: archItems.reduce((sum, item) => sum + item.effort, 0),
        timeline: "4-8 weeks",
      });
    }

    // Preventive recommendations
    recommendations.preventive.push({
      title: "Establish Technical Debt Monitoring",
      description: "Implement automated technical debt detection and reporting",
      rationale: "Prevent debt accumulation through continuous monitoring",
      effort: 2,
      timeline: "2-3 weeks",
    });

    recommendations.preventive.push({
      title: "Code Quality Gates",
      description:
        "Implement quality gates in CI/CD pipeline to prevent debt introduction",
      rationale:
        "Proactive debt prevention is more cost-effective than reactive resolution",
      effort: 3,
      timeline: "2-4 weeks",
    });

    return recommendations;
  }

  calculateResourceRequirements(phases) {
    const skills = {
      frontend: 0,
      backend: 0,
      database: 0,
      infrastructure: 0,
      architecture: 0,
    };

    // Analyze skills needed based on debt categories and sources
    phases.forEach((phase) => {
      phase.items.forEach((item) => {
        switch (item.category) {
          case "performance":
            if (item.source.includes("bundle")) skills.frontend += 1;
            if (item.source.includes("database")) skills.database += 1;
            if (item.source.includes("ai")) skills.backend += 1;
            break;
          case "architecture":
            skills.architecture += 1;
            skills.backend += 0.5;
            break;
          case "scalability":
            skills.infrastructure += 1;
            skills.architecture += 0.5;
            break;
        }
      });
    });

    return {
      teamSize: Math.ceil(Math.max(...Object.values(skills)) / 2),
      skillRequirements: skills,
      estimatedCost: {
        development: "$50,000 - $85,000",
        infrastructure: "$300 - $800/month",
        tooling: "$200 - $500/month",
      },
      timeline: "16 weeks with dedicated team",
      rampUpTime: "2 weeks for team onboarding",
    };
  }

  assessImplementationRisks(phases) {
    return {
      technical: [
        {
          risk: "Service refactoring breaking existing functionality",
          probability: "medium",
          impact: "high",
          mitigation:
            "Comprehensive testing and gradual rollout with feature flags",
        },
        {
          risk: "Database optimization causing performance degradation",
          probability: "low",
          impact: "high",
          mitigation:
            "Implement during maintenance windows with rollback plans",
        },
        {
          risk: "Bundle optimization breaking build pipeline",
          probability: "medium",
          impact: "medium",
          mitigation: "Incremental changes with automated testing",
        },
      ],
      business: [
        {
          risk: "Resource allocation conflicts with feature development",
          probability: "high",
          impact: "medium",
          mitigation: "Dedicated technical debt team with clear priorities",
        },
        {
          risk: "Extended timeline due to discovery of additional debt",
          probability: "medium",
          impact: "low",
          mitigation: "Buffer time included in estimates and phased approach",
        },
      ],
      operational: [
        {
          risk: "Team burnout from debt remediation focus",
          probability: "low",
          impact: "medium",
          mitigation:
            "Balance debt work with feature development and celebrate wins",
        },
      ],
    };
  }

  async generateReports() {
    console.log("📄 Generating technical debt prioritization reports...");

    const timestamp = new Date().toISOString();
    const summary = {
      timestamp,
      totalDebtItems: this.debtItems.length,
      prioritizationMatrix: this.prioritizationMatrix,
      implementationPlan: this.generateImplementationPlan(),
      codebaseAnalysis: await this.analyzeCodebase(),
    };

    // Generate JSON report
    const jsonReport = {
      ...summary,
      metadata: {
        generatedBy: "EstimatePro Technical Debt Analyzer",
        version: "1.0",
        analysisScope: "Complete codebase and previous assessments",
        methodology: "Impact-Effort prioritization with category weighting",
      },
    };

    // Generate Markdown report
    const markdownReport = this.generateMarkdownReport(summary);

    // Save reports
    const jsonPath = path.join(
      this.rootDir,
      "technical-debt-prioritization.json",
    );
    const markdownPath = path.join(
      this.rootDir,
      "technical-debt-prioritization.md",
    );

    fs.writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2));
    fs.writeFileSync(markdownPath, markdownReport);

    console.log(`✅ Reports generated:`);
    console.log(`   📄 ${markdownPath}`);
    console.log(`   📊 ${jsonPath}`);

    return { jsonPath, markdownPath, summary };
  }

  generateMarkdownReport(summary) {
    const { prioritizationMatrix, implementationPlan, codebaseAnalysis } =
      summary;
    const { matrix, categoryBreakdown } = prioritizationMatrix;

    let report = `# EstimatePro Technical Debt Prioritization Matrix

**Generated**: ${new Date(summary.timestamp).toLocaleString()}
**Total Debt Items**: ${summary.totalDebtItems}

## Executive Summary

Technical debt prioritization analysis across ${summary.totalDebtItems} identified debt items:

### Priority Distribution
- **Critical**: ${matrix.critical.length} items (immediate action required)
- **High**: ${matrix.high.length} items (significant impact, schedule soon)
- **Medium**: ${matrix.medium.length} items (moderate priority)
- **Low**: ${matrix.low.length} items (address as capacity allows)

### Category Breakdown
`;

    Object.entries(categoryBreakdown).forEach(([category, breakdown]) => {
      const categoryInfo = this.debtCategories[category];
      report += `
#### ${category.charAt(0).toUpperCase() + category.slice(1)} (Weight: ${categoryInfo.weight})
${categoryInfo.description}
- **Total**: ${breakdown.total} items
- **Critical**: ${breakdown.critical} • **High**: ${breakdown.high} • **Medium**: ${breakdown.medium} • **Low**: ${breakdown.low}
`;
    });

    report += `
## Detailed Prioritization Matrix

`;

    ["critical", "high", "medium", "low"].forEach((priority) => {
      const items = matrix[priority];
      if (items.length === 0) return;

      report += `
### ${priority.charAt(0).toUpperCase() + priority.slice(1)} Priority (${items.length} items)

| Item | Category | Impact | Effort | Score | Description |
|------|----------|---------|---------|-------|-------------|
`;

      items.forEach((item) => {
        report += `| ${item.title} | ${item.category} | ${item.impact} | ${item.effort} | ${item.priorityScore} | ${item.description} |
`;
      });
    });

    report += `
## Implementation Roadmap

**Total Effort**: ${implementationPlan.totalEffort} story points
**Estimated Duration**: ${implementationPlan.estimatedDuration}

`;

    implementationPlan.phases.forEach((phase, index) => {
      report += `
### Phase ${index + 1}: ${phase.name}
**Priority**: ${phase.priority}  
**Duration**: ${phase.estimatedWeeks} weeks  
**Effort**: ${phase.effort} story points  
**Parallelizable**: ${phase.parallelizable ? "Yes" : "No"}

${phase.description}

#### Key Items (${phase.items.length} total)
`;

      phase.items.slice(0, 5).forEach((item) => {
        report += `- **${item.title}** (Impact: ${item.impact}, Effort: ${item.effort})
  - ${item.description}
`;
      });

      if (phase.items.length > 5) {
        report += `- ... and ${phase.items.length - 5} more items
`;
      }
    });

    report += `
## Resource Requirements

### Team Requirements
- **Team Size**: ${implementationPlan.resourceRequirements.teamSize} developers
- **Timeline**: ${implementationPlan.resourceRequirements.timeline}
- **Ramp-up**: ${implementationPlan.resourceRequirements.rampUpTime}

### Skill Requirements
`;

    Object.entries(
      implementationPlan.resourceRequirements.skillRequirements,
    ).forEach(([skill, need]) => {
      if (need > 0) {
        report += `- **${skill.charAt(0).toUpperCase() + skill.slice(1)}**: ${need} FTE
`;
      }
    });

    report += `
### Budget Estimates
- **Development**: ${implementationPlan.resourceRequirements.estimatedCost.development}
- **Infrastructure**: ${implementationPlan.resourceRequirements.estimatedCost.infrastructure}
- **Tooling**: ${implementationPlan.resourceRequirements.estimatedCost.tooling}

## Recommendations

### Immediate Actions (Next 1-2 weeks)
`;

    implementationPlan.recommendations.immediate.forEach((rec) => {
      report += `
#### ${rec.title}
${rec.description}

**Rationale**: ${rec.rationale}  
**Effort**: ${rec.effort} story points  
**Timeline**: ${rec.timeline}
`;
    });

    report += `
### Strategic Initiatives
`;

    implementationPlan.recommendations.strategic.forEach((rec) => {
      report += `
#### ${rec.title}
${rec.description}

**Rationale**: ${rec.rationale}  
**Effort**: ${rec.effort} story points  
**Timeline**: ${rec.timeline}
`;
    });

    report += `
### Preventive Measures
`;

    implementationPlan.recommendations.preventive.forEach((rec) => {
      report += `
#### ${rec.title}
${rec.description}

**Rationale**: ${rec.rationale}  
**Effort**: ${rec.effort} story points  
**Timeline**: ${rec.timeline}
`;
    });

    report += `
## Risk Assessment

### Technical Risks
`;

    implementationPlan.riskAssessment.technical.forEach((risk) => {
      report += `
#### ${risk.risk}
- **Probability**: ${risk.probability}
- **Impact**: ${risk.impact}
- **Mitigation**: ${risk.mitigation}
`;
    });

    report += `
### Business Risks
`;

    implementationPlan.riskAssessment.business.forEach((risk) => {
      report += `
#### ${risk.risk}
- **Probability**: ${risk.probability}
- **Impact**: ${risk.impact}
- **Mitigation**: ${risk.mitigation}
`;
    });

    report += `
## Codebase Analysis Summary

**Files Analyzed**: ${codebaseAnalysis.fileCount}

### Debt Patterns Detected
- **TODO Comments**: ${codebaseAnalysis.debtPatterns.todoComments}
- **Magic Numbers**: ${codebaseAnalysis.debtPatterns.magicNumbers}
- **Deep Nesting**: ${codebaseAnalysis.debtPatterns.deepNesting}
- **Long Methods**: ${codebaseAnalysis.debtPatterns.longMethods}
- **Complex Functions**: ${codebaseAnalysis.debtPatterns.complexFunctions}
- **Large Classes**: ${codebaseAnalysis.debtPatterns.largeClasses}
- **God Objects**: ${codebaseAnalysis.debtPatterns.godObjects}

### TypeScript Issues
- **Any Types**: ${codebaseAnalysis.typeScriptIssues.anyTypes}
- **Unused Variables**: ${codebaseAnalysis.typeScriptIssues.unusedVariables}

### Import Issues
- **Relative Imports**: ${codebaseAnalysis.importIssues.relativeImports}
- **Dynamic Imports**: ${codebaseAnalysis.importIssues.dynamicImports}
- **Unused Imports**: ${codebaseAnalysis.importIssues.unusedImports}

## Next Steps

1. **Immediate Actions (This Week)**:
   - Review and approve critical priority items
   - Allocate dedicated team for technical debt resolution
   - Set up monitoring and tracking systems

2. **Short-term Goals (Next Month)**:
   - Begin Phase 1: Critical Debt Resolution
   - Establish debt prevention measures
   - Set up automated quality gates

3. **Long-term Strategy (Next Quarter)**:
   - Complete high and medium priority items
   - Implement continuous debt monitoring
   - Establish debt management culture and processes

## Success Metrics

### Technical Metrics
- Reduction in technical debt score by 70%
- Improvement in code quality metrics
- Decreased time to implement new features

### Business Metrics  
- Improved developer productivity (25% target)
- Reduced maintenance costs (30% target)
- Faster time to market for new features

---

*Technical debt prioritization analysis generated by EstimatePro Architectural Assessment*
`;

    return report;
  }
}

// Main execution
async function main() {
  console.log("🚀 Starting Technical Debt Prioritization Analysis...\n");

  try {
    const analyzer = new TechnicalDebtAnalyzer();

    // Synthesize debt items from previous analyses
    await analyzer.synthesizeDebtItems();

    // Create prioritization matrix
    analyzer.createPrioritizationMatrix();

    // Generate comprehensive reports
    const results = await analyzer.generateReports();

    console.log("\n✨ Technical Debt Prioritization Analysis Complete!");
    console.log(
      `📊 Priority Matrix: ${results.summary.totalDebtItems} items analyzed`,
    );
    console.log(
      `📋 Implementation Plan: ${results.summary.implementationPlan.phases.length} phases over ${results.summary.implementationPlan.estimatedDuration}`,
    );
    console.log(
      `💰 Estimated Cost: ${results.summary.implementationPlan.resourceRequirements.estimatedCost.development}`,
    );
  } catch (error) {
    console.error("❌ Error during analysis:", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { TechnicalDebtAnalyzer };
