#!/usr/bin/env node

/**
 * AI Service Performance Optimization Tool
 * Analyzes AI service response times, identifies bottlenecks, and implements optimization strategies
 */

const fs = require("fs");
const path = require("path");
const { promisify } = require("util");

const readFile = promisify(fs.readFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

class AIPerformanceOptimizer {
  constructor() {
    this.aiServices = new Map();
    this.apiEndpoints = new Map();
    this.cachingOpportunities = [];
    this.responseTimeAnalysis = new Map();
    this.promptOptimizations = [];
    this.rateLimitingAnalysis = new Map();
    this.errorPatterns = new Map();
  }

  async optimizeAIPerformance(rootDir) {
    console.log("🤖 Starting AI Service Performance Optimization...\n");

    try {
      // Phase 1: Analyze AI service implementations
      await this.analyzeAIServices(rootDir);

      // Phase 2: Analyze API endpoints and usage patterns
      await this.analyzeAPIEndpoints(rootDir);

      // Phase 3: Identify caching opportunities
      await this.identifyCachingOpportunities(rootDir);

      // Phase 4: Analyze response time patterns
      await this.analyzeResponseTimePatterns(rootDir);

      // Phase 5: Optimize prompts and token usage
      await this.optimizePromptEfficiency(rootDir);

      // Phase 6: Analyze rate limiting and error handling
      await this.analyzeRateLimitingAndErrors(rootDir);

      // Phase 7: Generate optimization recommendations
      this.generateOptimizationPlan();

      console.log(
        "✅ AI performance optimization analysis completed successfully!",
      );
    } catch (error) {
      console.error("❌ AI optimization analysis failed:", error.message);
      throw error;
    }
  }

  async analyzeAIServices(rootDir) {
    console.log("🔍 Analyzing AI service implementations...");

    const aiServiceDirs = ["lib/services", "lib/ai", "app/api/ai"];

    let totalServices = 0;
    const serviceMetrics = {
      openai: 0,
      caching: 0,
      errorHandling: 0,
      retryLogic: 0,
    };

    for (const dir of aiServiceDirs) {
      const dirPath = path.join(rootDir, dir);
      if (fs.existsSync(dirPath)) {
        const files = await this.getTypeScriptFiles(dirPath);

        for (const file of files) {
          try {
            const content = await readFile(file, "utf8");

            // Check if file contains AI service logic
            if (this.isAIServiceFile(content)) {
              totalServices++;
              const serviceAnalysis = this.analyzeAIService(
                content,
                file,
                rootDir,
              );

              this.aiServices.set(
                path.relative(rootDir, file),
                serviceAnalysis,
              );

              // Update metrics
              if (serviceAnalysis.usesOpenAI) serviceMetrics.openai++;
              if (serviceAnalysis.hasCaching) serviceMetrics.caching++;
              if (serviceAnalysis.hasErrorHandling)
                serviceMetrics.errorHandling++;
              if (serviceAnalysis.hasRetryLogic) serviceMetrics.retryLogic++;
            }
          } catch (error) {
            console.warn(`    ⚠️  Error analyzing ${file}: ${error.message}`);
          }
        }
      }
    }

    console.log(`    ✓ Analyzed ${totalServices} AI service files`);
    console.log(
      `    📊 OpenAI services: ${serviceMetrics.openai}, Cached: ${serviceMetrics.caching}, Error handling: ${serviceMetrics.errorHandling}\n`,
    );
  }

  async analyzeAPIEndpoints(rootDir) {
    console.log("🌐 Analyzing AI API endpoints and usage patterns...");

    const apiDir = path.join(rootDir, "app/api/ai");
    if (!fs.existsSync(apiDir)) {
      console.log(
        "    ⚠️  AI API directory not found, skipping API analysis\n",
      );
      return;
    }

    const routeFiles = await this.getRouteFiles(apiDir);
    let endpointCount = 0;

    for (const file of routeFiles) {
      try {
        const content = await readFile(file, "utf8");
        const endpointAnalysis = this.analyzeAPIEndpoint(
          content,
          file,
          rootDir,
        );

        if (endpointAnalysis) {
          endpointCount++;
          this.apiEndpoints.set(path.relative(rootDir, file), endpointAnalysis);
        }
      } catch (error) {
        console.warn(
          `    ⚠️  Error analyzing API endpoint ${file}: ${error.message}`,
        );
      }
    }

    console.log(`    ✓ Analyzed ${endpointCount} AI API endpoints`);

    // Analyze usage patterns
    const totalRequests = Array.from(this.apiEndpoints.values()).reduce(
      (sum, endpoint) => sum + endpoint.estimatedRequestVolume,
      0,
    );
    console.log(`    📊 Estimated total AI requests: ${totalRequests}/hour\n`);
  }

  async identifyCachingOpportunities(rootDir) {
    console.log("💾 Identifying AI response caching opportunities...");

    let cachingOpportunities = 0;
    const cacheTypes = { response: 0, prompt: 0, image: 0, embedding: 0 };

    for (const [filePath, serviceAnalysis] of this.aiServices) {
      const opportunities = this.analyzeCachingPotential(serviceAnalysis);

      opportunities.forEach((opportunity) => {
        cachingOpportunities++;
        cacheTypes[opportunity.type]++;

        this.cachingOpportunities.push({
          file: filePath,
          ...opportunity,
        });
      });
    }

    // Analyze existing caching implementation
    const cachingFiles = await this.findCachingFiles(rootDir);
    console.log(`    ✓ Found ${cachingOpportunities} caching opportunities`);
    console.log(
      `    📊 Types: ${cacheTypes.response} response, ${cacheTypes.prompt} prompt, ${cacheTypes.image} image, ${cacheTypes.embedding} embedding`,
    );
    console.log(`    🗄️  Existing cache files: ${cachingFiles.length}\n`);
  }

  async analyzeResponseTimePatterns(rootDir) {
    console.log("⏱️  Analyzing AI response time patterns...");

    const performancePatterns = {
      fast: 0, // < 1s
      medium: 0, // 1-5s
      slow: 0, // 5-15s
      verySlow: 0, // > 15s
    };

    for (const [filePath, serviceAnalysis] of this.aiServices) {
      const responseTime = this.estimateResponseTime(serviceAnalysis);

      if (responseTime < 1000) {
        performancePatterns.fast++;
      } else if (responseTime < 5000) {
        performancePatterns.medium++;
      } else if (responseTime < 15000) {
        performancePatterns.slow++;
      } else {
        performancePatterns.verySlow++;
      }

      this.responseTimeAnalysis.set(filePath, {
        estimatedTime: responseTime,
        bottlenecks: this.identifyBottlenecks(serviceAnalysis),
        optimizationPotential:
          this.calculateOptimizationPotential(serviceAnalysis),
        priority:
          responseTime > 5000 ? "high" : responseTime > 1000 ? "medium" : "low",
      });
    }

    console.log(
      `    ✓ Analyzed response patterns for ${this.aiServices.size} services`,
    );
    console.log(
      `    📊 Performance: ${performancePatterns.fast} fast, ${performancePatterns.medium} medium, ${performancePatterns.slow} slow, ${performancePatterns.verySlow} very slow`,
    );

    if (performancePatterns.slow + performancePatterns.verySlow > 0) {
      console.log(
        "    🚨 High priority: Found services with >5s response times",
      );
    }
    console.log("");
  }

  async optimizePromptEfficiency(rootDir) {
    console.log("📝 Analyzing prompt efficiency and token optimization...");

    const promptDirs = ["lib/ai/prompts", "lib/ai", "app/api/ai"];

    let totalPrompts = 0;
    let tokenOptimizations = 0;
    const promptMetrics = {
      oversized: 0,
      inefficient: 0,
      duplicated: 0,
      optimizable: 0,
    };

    for (const dir of promptDirs) {
      const dirPath = path.join(rootDir, dir);
      if (fs.existsSync(dirPath)) {
        const files = await this.getTypeScriptFiles(dirPath);

        for (const file of files) {
          try {
            const content = await readFile(file, "utf8");
            const prompts = this.extractPrompts(content);

            for (const prompt of prompts) {
              totalPrompts++;
              const optimization = this.analyzePromptEfficiency(
                prompt,
                file,
                rootDir,
              );

              if (optimization.hasOptimizations) {
                tokenOptimizations++;
                this.promptOptimizations.push({
                  file: path.relative(rootDir, file),
                  ...optimization,
                });

                // Update metrics
                if (optimization.issues.includes("oversized"))
                  promptMetrics.oversized++;
                if (optimization.issues.includes("inefficient"))
                  promptMetrics.inefficient++;
                if (optimization.issues.includes("duplicated"))
                  promptMetrics.duplicated++;
                if (optimization.issues.includes("optimizable"))
                  promptMetrics.optimizable++;
              }
            }
          } catch (error) {
            console.warn(
              `    ⚠️  Error analyzing prompts in ${file}: ${error.message}`,
            );
          }
        }
      }
    }

    console.log(`    ✓ Analyzed ${totalPrompts} AI prompts`);
    console.log(`    📊 Optimizations found: ${tokenOptimizations}`);
    console.log(
      `    🎯 Issues: ${promptMetrics.oversized} oversized, ${promptMetrics.inefficient} inefficient, ${promptMetrics.duplicated} duplicated\n`,
    );
  }

  async analyzeRateLimitingAndErrors(rootDir) {
    console.log("🚦 Analyzing rate limiting and error handling patterns...");

    let rateLimitingServices = 0;
    let errorHandlingServices = 0;
    const errorPatterns = { timeout: 0, rateLimit: 0, apiError: 0, network: 0 };

    for (const [filePath, serviceAnalysis] of this.aiServices) {
      // Analyze rate limiting implementation
      const rateLimiting = this.analyzeRateLimiting(serviceAnalysis);
      if (rateLimiting.implemented) {
        rateLimitingServices++;
      }

      this.rateLimitingAnalysis.set(filePath, rateLimiting);

      // Analyze error handling patterns
      const errorHandling = this.analyzeErrorHandling(serviceAnalysis);
      if (errorHandling.hasErrorHandling) {
        errorHandlingServices++;
      }

      errorHandling.patterns.forEach((pattern) => {
        if (errorPatterns.hasOwnProperty(pattern)) {
          errorPatterns[pattern]++;
        }
      });

      this.errorPatterns.set(filePath, errorHandling);
    }

    console.log(
      `    ✓ Rate limiting: ${rateLimitingServices}/${this.aiServices.size} services`,
    );
    console.log(
      `    ✓ Error handling: ${errorHandlingServices}/${this.aiServices.size} services`,
    );
    console.log(
      `    📊 Error patterns: ${errorPatterns.timeout} timeout, ${errorPatterns.rateLimit} rate limit, ${errorPatterns.apiError} API errors\n`,
    );
  }

  // Analysis helper methods

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
        } else if (item === "route.ts" || item === "route.tsx") {
          files.push(fullPath);
        }
      }
    };

    await scan(dir);
    return files;
  }

  isAIServiceFile(content) {
    const aiIndicators = [
      /openai/i,
      /gpt-/i,
      /ai.*service/i,
      /prompt/i,
      /completion/i,
      /embedding/i,
      /vision/i,
      /chat.*completion/i,
    ];

    return aiIndicators.some((pattern) => pattern.test(content));
  }

  analyzeAIService(content, filePath, rootDir) {
    const analysis = {
      file: path.relative(rootDir, filePath),
      usesOpenAI: /openai|gpt-|completion/i.test(content),
      hasCaching: /cache|redis|memory/i.test(content),
      hasErrorHandling: /try\s*{|catch\s*\(|throw/i.test(content),
      hasRetryLogic: /retry|attempt|backoff/i.test(content),
      hasRateLimiting: /rate.*limit|throttle|delay/i.test(content),
      complexity: this.calculateServiceComplexity(content),
      apiCalls: this.countAPICallPatterns(content),
      tokenUsage: this.estimateTokenUsage(content),
      responseTypes: this.identifyResponseTypes(content),
      optimizationScore: 0,
    };

    // Calculate optimization score
    analysis.optimizationScore = this.calculateOptimizationScore(analysis);

    return analysis;
  }

  analyzeAPIEndpoint(content, filePath, rootDir) {
    const methods = [];
    if (content.includes("export async function GET")) methods.push("GET");
    if (content.includes("export async function POST")) methods.push("POST");
    if (content.includes("export async function PUT")) methods.push("PUT");
    if (content.includes("export async function DELETE"))
      methods.push("DELETE");

    if (methods.length === 0) return null;

    const pathParts = filePath.split("/");
    const routePath =
      "/" +
      pathParts
        .slice(pathParts.indexOf("api") + 1)
        .filter((part) => part !== "route.ts" && part !== "route.tsx")
        .join("/");

    return {
      path: routePath,
      methods,
      complexity: this.calculateServiceComplexity(content),
      hasValidation: /zod|joi|yup|validate/i.test(content),
      hasRateLimiting: /rate.*limit|throttle/i.test(content),
      hasCaching: /cache|redis/i.test(content),
      estimatedRequestVolume: this.estimateRequestVolume(content),
      responseTime: this.estimateAPIResponseTime(content),
      optimizationPotential: this.calculateAPIOptimizationPotential(content),
    };
  }

  calculateServiceComplexity(content) {
    let score = 0;
    score += (content.match(/if\s*\(/g) || []).length;
    score += (content.match(/for\s*\(/g) || []).length * 2;
    score += (content.match(/await\s+/g) || []).length * 2;
    score += (content.match(/openai\.|gpt|completion/gi) || []).length * 3;
    score += (content.match(/fetch\(/g) || []).length * 2;
    return Math.min(score, 50);
  }

  countAPICallPatterns(content) {
    return (content.match(/fetch\(|axios\.|openai\./gi) || []).length;
  }

  estimateTokenUsage(content) {
    // Rough estimation based on content patterns
    const prompts = this.extractPrompts(content);
    return prompts.reduce((sum, prompt) => {
      return sum + Math.ceil(prompt.length / 4); // ~4 characters per token
    }, 0);
  }

  identifyResponseTypes(content) {
    const types = [];
    if (/completion|chat/i.test(content)) types.push("text");
    if (/vision|image/i.test(content)) types.push("vision");
    if (/embedding/i.test(content)) types.push("embedding");
    if (/function.*call/i.test(content)) types.push("function");
    return types;
  }

  calculateOptimizationScore(analysis) {
    let score = 10; // Start with perfect score

    if (!analysis.hasCaching) score -= 3;
    if (!analysis.hasErrorHandling) score -= 2;
    if (!analysis.hasRetryLogic) score -= 2;
    if (!analysis.hasRateLimiting) score -= 1;
    if (analysis.complexity > 20) score -= 2;
    if (analysis.tokenUsage > 2000) score -= 1;

    return Math.max(0, score);
  }

  analyzeCachingPotential(serviceAnalysis) {
    const opportunities = [];

    if (!serviceAnalysis.hasCaching) {
      if (serviceAnalysis.responseTypes.includes("text")) {
        opportunities.push({
          type: "response",
          priority: "high",
          estimatedSavings: "60-80% response time",
          implementation: "Redis-based response caching with TTL",
          cacheKey: "prompt hash + model parameters",
        });
      }

      if (serviceAnalysis.responseTypes.includes("embedding")) {
        opportunities.push({
          type: "embedding",
          priority: "high",
          estimatedSavings: "70-90% response time",
          implementation: "Vector cache for embeddings",
          cacheKey: "input text hash",
        });
      }

      if (serviceAnalysis.responseTypes.includes("vision")) {
        opportunities.push({
          type: "image",
          priority: "medium",
          estimatedSavings: "40-60% response time",
          implementation: "Image analysis result caching",
          cacheKey: "image hash + analysis type",
        });
      }
    }

    return opportunities;
  }

  estimateResponseTime(serviceAnalysis) {
    let baseTime = 500; // Base 500ms

    // Add time based on complexity
    baseTime += serviceAnalysis.complexity * 20;

    // Add time for API calls
    baseTime += serviceAnalysis.apiCalls * 800;

    // Add time based on token usage
    baseTime += serviceAnalysis.tokenUsage * 0.1;

    // Reduce time if caching is available
    if (serviceAnalysis.hasCaching) {
      baseTime *= 0.3; // 70% reduction with caching
    }

    return Math.round(baseTime);
  }

  identifyBottlenecks(serviceAnalysis) {
    const bottlenecks = [];

    if (serviceAnalysis.apiCalls > 3) {
      bottlenecks.push("multiple-api-calls");
    }

    if (serviceAnalysis.tokenUsage > 2000) {
      bottlenecks.push("high-token-usage");
    }

    if (!serviceAnalysis.hasCaching) {
      bottlenecks.push("no-caching");
    }

    if (!serviceAnalysis.hasRetryLogic) {
      bottlenecks.push("no-retry-logic");
    }

    if (serviceAnalysis.complexity > 25) {
      bottlenecks.push("high-complexity");
    }

    return bottlenecks;
  }

  calculateOptimizationPotential(serviceAnalysis) {
    let potential = 0;

    if (!serviceAnalysis.hasCaching) potential += 5;
    if (!serviceAnalysis.hasRetryLogic) potential += 2;
    if (serviceAnalysis.apiCalls > 2) potential += 3;
    if (serviceAnalysis.tokenUsage > 2000) potential += 2;
    if (serviceAnalysis.complexity > 25) potential += 2;

    return Math.min(potential, 10);
  }

  async findCachingFiles(rootDir) {
    const cacheFiles = [];
    const cachePatterns = ["*cache*", "*redis*"];

    for (const pattern of cachePatterns) {
      try {
        const files = await this.findFiles(rootDir, pattern);
        cacheFiles.push(...files);
      } catch (error) {
        // Continue if pattern matching fails
      }
    }

    return cacheFiles;
  }

  async findFiles(rootDir, pattern) {
    const files = [];

    const search = async (dir) => {
      if (!fs.existsSync(dir)) return;

      const items = await readdir(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stats = await stat(fullPath);

        if (stats.isDirectory()) {
          await search(fullPath);
        } else if (item.toLowerCase().includes(pattern.replace(/\*/g, ""))) {
          files.push(fullPath);
        }
      }
    };

    await search(rootDir);
    return files;
  }

  extractPrompts(content) {
    const prompts = [];

    // Template literals with AI prompts
    const templatePattern =
      /`[^`]{100,}[^`]*(?:gpt|ai|prompt|instruction|system|user)[^`]*`/gi;
    let match;
    while ((match = templatePattern.exec(content)) !== null) {
      prompts.push(match[0]);
    }

    // String literals with prompts
    const stringPattern =
      /"[^"]{100,}[^"]*(?:gpt|ai|prompt|instruction|system|user)[^"]*"/gi;
    while ((match = stringPattern.exec(content)) !== null) {
      prompts.push(match[0]);
    }

    return prompts;
  }

  analyzePromptEfficiency(prompt, filePath, rootDir) {
    const analysis = {
      prompt: prompt.substring(0, 200) + (prompt.length > 200 ? "..." : ""),
      length: prompt.length,
      estimatedTokens: Math.ceil(prompt.length / 4),
      issues: [],
      optimizations: [],
      hasOptimizations: false,
    };

    // Check for oversized prompts
    if (analysis.estimatedTokens > 2000) {
      analysis.issues.push("oversized");
      analysis.optimizations.push("Split into smaller, focused prompts");
    }

    // Check for inefficiencies
    if (prompt.includes("repeat") || prompt.includes("again")) {
      analysis.issues.push("inefficient");
      analysis.optimizations.push("Remove redundant instructions");
    }

    // Check for optimization opportunities
    if (
      prompt.length > 1000 &&
      !prompt.includes("specific") &&
      !prompt.includes("detailed")
    ) {
      analysis.issues.push("optimizable");
      analysis.optimizations.push(
        "Add specific constraints to reduce token usage",
      );
    }

    analysis.hasOptimizations = analysis.issues.length > 0;
    analysis.priority =
      analysis.estimatedTokens > 1500
        ? "high"
        : analysis.estimatedTokens > 800
          ? "medium"
          : "low";

    return analysis;
  }

  estimateRequestVolume(content) {
    // Rough estimation based on endpoint patterns
    if (content.includes("photos") || content.includes("images")) return 50;
    if (content.includes("chat") || content.includes("conversation"))
      return 100;
    if (content.includes("analysis") || content.includes("process")) return 25;
    return 10; // Default
  }

  estimateAPIResponseTime(content) {
    let time = 1000; // Base 1s

    if (content.includes("vision") || content.includes("image")) time += 2000;
    if (content.includes("completion") || content.includes("chat"))
      time += 1500;
    if (content.includes("embedding")) time += 500;

    return time;
  }

  calculateAPIOptimizationPotential(content) {
    let potential = 0;

    if (!content.includes("cache")) potential += 3;
    if (!content.includes("validate")) potential += 2;
    if (!content.includes("rate")) potential += 2;
    if (content.includes("await") && content.match(/await/g).length > 3)
      potential += 2;

    return Math.min(potential, 10);
  }

  analyzeRateLimiting(serviceAnalysis) {
    return {
      implemented: serviceAnalysis.hasRateLimiting,
      priority: serviceAnalysis.apiCalls > 2 ? "high" : "medium",
      recommendations: serviceAnalysis.hasRateLimiting
        ? ["Monitor rate limit effectiveness"]
        : [
            "Implement exponential backoff",
            "Add request queuing",
            "Set up rate limit monitoring",
          ],
    };
  }

  analyzeErrorHandling(serviceAnalysis) {
    const patterns = [];

    if (!serviceAnalysis.hasErrorHandling) {
      patterns.push("missing-error-handling");
    }

    if (!serviceAnalysis.hasRetryLogic) {
      patterns.push("no-retry-logic");
    }

    return {
      hasErrorHandling: serviceAnalysis.hasErrorHandling,
      patterns,
      recommendations: patterns.map((pattern) => {
        switch (pattern) {
          case "missing-error-handling":
            return "Add comprehensive try-catch blocks";
          case "no-retry-logic":
            return "Implement exponential backoff retry logic";
          default:
            return "Improve error handling";
        }
      }),
    };
  }

  generateOptimizationPlan() {
    console.log(
      "📋 Generating comprehensive AI performance optimization plan...",
    );

    const plan = {
      timestamp: new Date().toISOString(),
      summary: this.generateOptimizationSummary(),
      cachingStrategy: this.generateCachingStrategy(),
      responseTimeOptimizations: this.generateResponseTimeOptimizations(),
      promptOptimizations: this.generatePromptOptimizations(),
      rateLimitingStrategy: this.generateRateLimitingStrategy(),
      implementationPlan: this.generateImplementationPlan(),
      estimatedImprovements: this.calculateEstimatedImprovements(),
    };

    // Write detailed optimization plan
    const planPath = "ai-performance-optimization-plan.json";
    fs.writeFileSync(planPath, JSON.stringify(plan, null, 2));
    console.log(`  📊 Optimization plan saved to: ${planPath}`);

    // Write markdown summary
    this.generateMarkdownReport(plan);

    console.log(`\n🎯 AI Performance Optimization Summary:`);
    console.log(`  🤖 AI Services Analyzed: ${plan.summary.totalServices}`);
    console.log(
      `  💾 Caching Opportunities: ${plan.summary.cachingOpportunities}`,
    );
    console.log(
      `  📝 Prompt Optimizations: ${plan.summary.promptOptimizations}`,
    );
    console.log(
      `  ⚡ Estimated Improvement: ${plan.estimatedImprovements.averageResponseTime}% response time`,
    );
  }

  generateOptimizationSummary() {
    return {
      totalServices: this.aiServices.size,
      totalApiEndpoints: this.apiEndpoints.size,
      cachingOpportunities: this.cachingOpportunities.length,
      promptOptimizations: this.promptOptimizations.length,
      highPriorityOptimizations: this.countHighPriorityOptimizations(),
      averageOptimizationScore: this.calculateAverageOptimizationScore(),
      servicesWithoutCaching: this.countServicesWithoutCaching(),
      servicesWithoutErrorHandling: this.countServicesWithoutErrorHandling(),
    };
  }

  countHighPriorityOptimizations() {
    let count = 0;

    count += this.cachingOpportunities.filter(
      (opp) => opp.priority === "high",
    ).length;
    count += this.promptOptimizations.filter(
      (opt) => opt.priority === "high",
    ).length;
    count += Array.from(this.responseTimeAnalysis.values()).filter(
      (analysis) => analysis.priority === "high",
    ).length;

    return count;
  }

  calculateAverageOptimizationScore() {
    if (this.aiServices.size === 0) return 0;

    const totalScore = Array.from(this.aiServices.values()).reduce(
      (sum, service) => sum + service.optimizationScore,
      0,
    );

    return (totalScore / this.aiServices.size).toFixed(1);
  }

  countServicesWithoutCaching() {
    return Array.from(this.aiServices.values()).filter(
      (service) => !service.hasCaching,
    ).length;
  }

  countServicesWithoutErrorHandling() {
    return Array.from(this.aiServices.values()).filter(
      (service) => !service.hasErrorHandling,
    ).length;
  }

  generateCachingStrategy() {
    return {
      multiLevelCaching: {
        l1: "In-memory cache for frequent requests (Redis)",
        l2: "Persistent cache for computed results (Database)",
        l3: "CDN cache for static AI responses",
      },
      cacheKeys: {
        textCompletion: "hash(prompt + model + temperature + maxTokens)",
        imageAnalysis: "hash(imageData + analysisType + model)",
        embeddings: "hash(inputText + model)",
      },
      ttlStrategy: {
        textResponses: "1-6 hours based on prompt type",
        imageAnalysis: "24 hours",
        embeddings: "7 days (stable representations)",
      },
      invalidationRules: [
        "Model version changes",
        "Prompt template updates",
        "User context changes",
      ],
    };
  }

  generateResponseTimeOptimizations() {
    const slowServices = Array.from(this.responseTimeAnalysis.entries())
      .filter(([_, analysis]) => analysis.estimatedTime > 5000)
      .map(([file, analysis]) => ({
        file,
        currentTime: analysis.estimatedTime,
        bottlenecks: analysis.bottlenecks,
        optimizations: this.generateSpecificOptimizations(analysis.bottlenecks),
      }));

    return {
      slowServices,
      globalOptimizations: [
        "Implement request batching for bulk operations",
        "Add streaming responses for long-running tasks",
        "Use model routing based on complexity",
        "Implement background processing for non-urgent tasks",
      ],
    };
  }

  generateSpecificOptimizations(bottlenecks) {
    const optimizationMap = {
      "multiple-api-calls":
        "Implement request batching and parallel processing",
      "high-token-usage": "Optimize prompts and implement token budgeting",
      "no-caching": "Add multi-level response caching",
      "no-retry-logic": "Implement exponential backoff retry mechanism",
      "high-complexity": "Refactor into smaller, focused services",
    };

    return bottlenecks.map(
      (bottleneck) =>
        optimizationMap[bottleneck] || "General optimization needed",
    );
  }

  generatePromptOptimizations() {
    return {
      tokenReduction: {
        target: "20-40% token usage reduction",
        techniques: [
          "Remove redundant instructions",
          "Use specific constraints",
          "Implement prompt templates",
          "Add context-aware truncation",
        ],
      },
      promptCaching: {
        target: "System and instruction prompt caching",
        implementation: "Cache prompt prefixes with hash-based keys",
      },
      dynamicPrompts: {
        target: "Context-aware prompt selection",
        implementation: "Route to optimized prompts based on input complexity",
      },
    };
  }

  generateRateLimitingStrategy() {
    return {
      implementationLevels: {
        user: "Per-user rate limiting with generous defaults",
        endpoint: "Per-endpoint limits based on computational cost",
        global: "System-wide limits to protect infrastructure",
      },
      adaptiveRateLimiting: {
        description: "Adjust limits based on system load and response times",
        implementation: "Monitor queue depth and response latency",
      },
      priorityQueue: {
        description: "Priority-based request processing",
        levels: ["interactive", "batch", "background"],
      },
    };
  }

  generateImplementationPlan() {
    return {
      phase1: {
        name: "Immediate Optimizations (Week 1-2)",
        priority: "critical",
        tasks: [
          "Implement Redis caching for high-frequency AI requests",
          "Add retry logic with exponential backoff",
          "Optimize oversized prompts (>2000 tokens)",
          "Add basic rate limiting to protect against abuse",
        ],
        estimatedImpact: "40-60% response time improvement",
      },
      phase2: {
        name: "Advanced Caching & Optimization (Week 3-4)",
        priority: "high",
        tasks: [
          "Implement multi-level caching strategy",
          "Add prompt template optimization",
          "Implement request batching for bulk operations",
          "Add streaming responses for long-running tasks",
        ],
        estimatedImpact: "30-50% additional improvement",
      },
      phase3: {
        name: "Monitoring & Fine-tuning (Week 5-6)",
        priority: "medium",
        tasks: [
          "Set up comprehensive performance monitoring",
          "Implement adaptive rate limiting",
          "Add A/B testing for prompt optimizations",
          "Optimize model routing based on request complexity",
        ],
        estimatedImpact: "10-20% additional improvement plus monitoring",
      },
    };
  }

  calculateEstimatedImprovements() {
    // Calculate based on optimization opportunities
    let responseTimeImprovement = 0;
    let tokenUsageReduction = 0;
    let costSavings = 0;

    // Caching improvements
    const servicesWithoutCaching = this.countServicesWithoutCaching();
    responseTimeImprovement += servicesWithoutCaching * 60; // 60% improvement per service

    // Prompt optimizations
    const promptOptimizationsCount = this.promptOptimizations.length;
    tokenUsageReduction += promptOptimizationsCount * 25; // 25% reduction per optimization

    // Cost savings based on token reduction and caching
    costSavings = tokenUsageReduction * 0.3 + responseTimeImprovement * 0.2;

    return {
      averageResponseTime: Math.min(
        Math.round(responseTimeImprovement / Math.max(this.aiServices.size, 1)),
        80,
      ),
      tokenUsage: Math.min(
        Math.round(
          tokenUsageReduction / Math.max(this.promptOptimizations.length, 1),
        ),
        40,
      ),
      costSavings: Math.min(Math.round(costSavings), 50),
    };
  }

  generateMarkdownReport(plan) {
    const content = `# AI Service Performance Optimization Report

**Generated**: ${new Date().toLocaleString()}

## Executive Summary

- **AI Services Analyzed**: ${plan.summary.totalServices}
- **API Endpoints**: ${plan.summary.totalApiEndpoints}
- **Caching Opportunities**: ${plan.summary.cachingOpportunities}
- **Prompt Optimizations**: ${plan.summary.promptOptimizations}
- **Average Optimization Score**: ${plan.summary.averageOptimizationScore}/10
- **Services Without Caching**: ${plan.summary.servicesWithoutCaching}

## Performance Improvements

### Estimated Impact

- **Response Time**: ${plan.estimatedImprovements.averageResponseTime}% improvement
- **Token Usage**: ${plan.estimatedImprovements.tokenUsage}% reduction  
- **Cost Savings**: ${plan.estimatedImprovements.costSavings}% reduction

### Critical Optimizations

#### Caching Strategy Implementation

${this.cachingOpportunities
  .filter((opp) => opp.priority === "high")
  .slice(0, 5)
  .map(
    (opp, i) =>
      `${i + 1}. **${opp.file}** - ${opp.type} caching
   - Impact: ${opp.estimatedSavings}
   - Implementation: ${opp.implementation}`,
  )
  .join("\n\n")}

#### Prompt Optimizations

${this.promptOptimizations
  .filter((opt) => opt.priority === "high")
  .slice(0, 5)
  .map(
    (opt, i) =>
      `${i + 1}. **${opt.file}** (${opt.estimatedTokens} tokens)
   - Issues: ${opt.issues.join(", ")}
   - Optimizations: ${opt.optimizations.join(", ")}`,
  )
  .join("\n\n")}

## Implementation Plan

### ${plan.implementationPlan.phase1.name}
**Priority**: ${plan.implementationPlan.phase1.priority}
**Impact**: ${plan.implementationPlan.phase1.estimatedImpact}

${plan.implementationPlan.phase1.tasks.map((task) => `- ${task}`).join("\n")}

### ${plan.implementationPlan.phase2.name}
**Priority**: ${plan.implementationPlan.phase2.priority}  
**Impact**: ${plan.implementationPlan.phase2.estimatedImpact}

${plan.implementationPlan.phase2.tasks.map((task) => `- ${task}`).join("\n")}

### ${plan.implementationPlan.phase3.name}
**Priority**: ${plan.implementationPlan.phase3.priority}
**Impact**: ${plan.implementationPlan.phase3.estimatedImpact}

${plan.implementationPlan.phase3.tasks.map((task) => `- ${task}`).join("\n")}

## Caching Strategy

### Multi-Level Architecture

- **L1 Cache**: ${plan.cachingStrategy.multiLevelCaching.l1}
- **L2 Cache**: ${plan.cachingStrategy.multiLevelCaching.l2}
- **L3 Cache**: ${plan.cachingStrategy.multiLevelCaching.l3}

### TTL Strategy

- **Text Responses**: ${plan.cachingStrategy.ttlStrategy.textResponses}
- **Image Analysis**: ${plan.cachingStrategy.ttlStrategy.imageAnalysis}
- **Embeddings**: ${plan.cachingStrategy.ttlStrategy.embeddings}

## Success Metrics

- **Cache Hit Ratio**: Target >85% for AI responses
- **Average Response Time**: Target 50% reduction for cached requests
- **Token Usage**: Target 25% reduction through prompt optimization
- **API Cost**: Target 30% reduction through caching and optimization
- **Error Rate**: Maintain <0.1% with improved error handling

## Next Steps

1. Implement Phase 1 optimizations (critical impact)
2. Set up performance monitoring and alerting
3. Begin A/B testing optimized prompts
4. Deploy multi-level caching infrastructure

---

*AI optimization report generated by EstimatePro AI Performance Optimizer*
`;

    fs.writeFileSync("ai-performance-optimization.md", content);
    console.log(
      `  📋 Optimization report saved to: ai-performance-optimization.md`,
    );
  }
}

// Run the AI performance optimization
if (require.main === module) {
  const optimizer = new AIPerformanceOptimizer();
  optimizer.optimizeAIPerformance(process.cwd()).catch((error) => {
    console.error("❌ AI performance optimization failed:", error.message);
    process.exit(1);
  });
}

module.exports = AIPerformanceOptimizer;
