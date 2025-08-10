#!/usr/bin/env node

/**
 * Real-Time System Performance Tuning Tool
 * Analyzes and optimizes real-time systems including live pricing, session recovery, and WebSocket connections
 */

const fs = require("fs");
const path = require("path");
const { promisify } = require("util");

const readFile = promisify(fs.readFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

class RealTimePerformanceTuner {
  constructor() {
    this.realTimeServices = new Map();
    this.webSocketConnections = new Map();
    this.stateManagement = new Map();
    this.performanceMetrics = new Map();
    this.optimizationTargets = [];
    this.cachingStrategies = new Map();
    this.memoryOptimizations = [];
  }

  async tuneRealTimePerformance(rootDir) {
    console.log("⚡ Starting Real-Time System Performance Tuning...\n");

    try {
      // Phase 1: Analyze real-time services
      await this.analyzeRealTimeServices(rootDir);

      // Phase 2: Analyze WebSocket and connection patterns
      await this.analyzeConnectionPatterns(rootDir);

      // Phase 3: Analyze state management efficiency
      await this.analyzeStateManagement(rootDir);

      // Phase 4: Identify memory and performance bottlenecks
      await this.identifyPerformanceBottlenecks(rootDir);

      // Phase 5: Optimize caching strategies for real-time data
      await this.optimizeRealTimeCaching(rootDir);

      // Phase 6: Analyze session and data persistence
      await this.analyzeDataPersistence(rootDir);

      // Phase 7: Generate comprehensive tuning recommendations
      this.generateTuningPlan();

      console.log(
        "✅ Real-time performance tuning analysis completed successfully!",
      );
    } catch (error) {
      console.error("❌ Real-time tuning analysis failed:", error.message);
      throw error;
    }
  }

  async analyzeRealTimeServices(rootDir) {
    console.log("⚡ Analyzing real-time service implementations...");

    const realTimeServiceDirs = ["lib/services", "hooks", "components"];

    let totalServices = 0;
    const serviceMetrics = {
      realTimePricing: 0,
      sessionRecovery: 0,
      autoSave: 0,
      liveUpdates: 0,
      webSocket: 0,
    };

    for (const dir of realTimeServiceDirs) {
      const dirPath = path.join(rootDir, dir);
      if (fs.existsSync(dirPath)) {
        const files = await this.getTypeScriptFiles(dirPath);

        for (const file of files) {
          try {
            const content = await readFile(file, "utf8");

            if (this.isRealTimeServiceFile(content)) {
              totalServices++;
              const serviceAnalysis = this.analyzeRealTimeService(
                content,
                file,
                rootDir,
              );

              this.realTimeServices.set(
                path.relative(rootDir, file),
                serviceAnalysis,
              );

              // Update metrics
              if (serviceAnalysis.type.includes("pricing"))
                serviceMetrics.realTimePricing++;
              if (serviceAnalysis.type.includes("session"))
                serviceMetrics.sessionRecovery++;
              if (serviceAnalysis.type.includes("autosave"))
                serviceMetrics.autoSave++;
              if (serviceAnalysis.type.includes("live"))
                serviceMetrics.liveUpdates++;
              if (serviceAnalysis.hasWebSocket) serviceMetrics.webSocket++;
            }
          } catch (error) {
            console.warn(`    ⚠️  Error analyzing ${file}: ${error.message}`);
          }
        }
      }
    }

    console.log(`    ✓ Analyzed ${totalServices} real-time service files`);
    console.log(
      `    📊 Services: ${serviceMetrics.realTimePricing} pricing, ${serviceMetrics.sessionRecovery} session, ${serviceMetrics.autoSave} auto-save, ${serviceMetrics.liveUpdates} live updates\n`,
    );
  }

  async analyzeConnectionPatterns(rootDir) {
    console.log("🔌 Analyzing WebSocket and connection patterns...");

    // Look for WebSocket usage patterns
    const wsPatterns = [
      /WebSocket|websocket|ws\./gi,
      /socket\.io|socketio/gi,
      /Server-Sent Events|EventSource/gi,
      /long.*polling|polling/gi,
    ];

    let connectionServices = 0;
    const connectionTypes = { websocket: 0, polling: 0, sse: 0 };

    for (const [filePath, serviceAnalysis] of this.realTimeServices) {
      try {
        const fullPath = path.join(rootDir, filePath);
        const content = await readFile(fullPath, "utf8");

        const connectionAnalysis = this.analyzeConnectionPattern(
          content,
          filePath,
        );
        if (connectionAnalysis.hasConnections) {
          connectionServices++;
          this.webSocketConnections.set(filePath, connectionAnalysis);

          connectionAnalysis.types.forEach((type) => {
            if (connectionTypes.hasOwnProperty(type)) {
              connectionTypes[type]++;
            }
          });
        }
      } catch (error) {
        console.warn(
          `    ⚠️  Error analyzing connection patterns in ${filePath}: ${error.message}`,
        );
      }
    }

    console.log(
      `    ✓ Analyzed ${connectionServices} services with real-time connections`,
    );
    console.log(
      `    📊 Connection types: ${connectionTypes.websocket} WebSocket, ${connectionTypes.polling} polling, ${connectionTypes.sse} SSE\n`,
    );
  }

  async analyzeStateManagement(rootDir) {
    console.log("🗄️  Analyzing state management efficiency...");

    const stateManagementFiles = ["lib/stores", "hooks", "contexts"];

    let totalStores = 0;
    const stateMetrics = {
      zustand: 0,
      context: 0,
      localStorage: 0,
      sessionStorage: 0,
      memoryLeaks: 0,
    };

    for (const dir of stateManagementFiles) {
      const dirPath = path.join(rootDir, dir);
      if (fs.existsSync(dirPath)) {
        const files = await this.getTypeScriptFiles(dirPath);

        for (const file of files) {
          try {
            const content = await readFile(file, "utf8");
            const stateAnalysis = this.analyzeStateManagement(
              content,
              file,
              rootDir,
            );

            if (stateAnalysis.hasStateManagement) {
              totalStores++;
              this.stateManagement.set(
                path.relative(rootDir, file),
                stateAnalysis,
              );

              // Update metrics
              if (stateAnalysis.storeType.includes("zustand"))
                stateMetrics.zustand++;
              if (stateAnalysis.storeType.includes("context"))
                stateMetrics.context++;
              if (stateAnalysis.hasLocalStorage) stateMetrics.localStorage++;
              if (stateAnalysis.hasSessionStorage)
                stateMetrics.sessionStorage++;
              if (stateAnalysis.hasMemoryLeakRisk) stateMetrics.memoryLeaks++;
            }
          } catch (error) {
            console.warn(
              `    ⚠️  Error analyzing state management in ${file}: ${error.message}`,
            );
          }
        }
      }
    }

    console.log(
      `    ✓ Analyzed ${totalStores} state management implementations`,
    );
    console.log(
      `    📊 Types: ${stateMetrics.zustand} Zustand, ${stateMetrics.context} Context, ${stateMetrics.localStorage} localStorage`,
    );
    if (stateMetrics.memoryLeaks > 0) {
      console.log(
        `    🚨 Memory leak risks: ${stateMetrics.memoryLeaks} files`,
      );
    }
    console.log("");
  }

  async identifyPerformanceBottlenecks(rootDir) {
    console.log(
      "🔍 Identifying performance bottlenecks and optimization targets...",
    );

    let highFrequencyUpdates = 0;
    let unboundedGrowth = 0;
    let inefficientRendering = 0;

    for (const [filePath, serviceAnalysis] of this.realTimeServices) {
      const bottlenecks = this.identifyServiceBottlenecks(serviceAnalysis);

      if (bottlenecks.length > 0) {
        this.optimizationTargets.push({
          file: filePath,
          service: serviceAnalysis,
          bottlenecks,
          priority: this.calculateOptimizationPriority(
            bottlenecks,
            serviceAnalysis,
          ),
          estimatedImpact: this.estimateOptimizationImpact(bottlenecks),
        });

        // Count bottleneck types
        bottlenecks.forEach((bottleneck) => {
          if (bottleneck.type === "high-frequency-updates")
            highFrequencyUpdates++;
          if (bottleneck.type === "unbounded-growth") unboundedGrowth++;
          if (bottleneck.type === "inefficient-rendering")
            inefficientRendering++;
        });
      }
    }

    console.log(
      `    ✓ Found ${this.optimizationTargets.length} services requiring optimization`,
    );
    console.log(
      `    📊 Bottlenecks: ${highFrequencyUpdates} high-frequency, ${unboundedGrowth} unbounded growth, ${inefficientRendering} inefficient rendering\n`,
    );
  }

  async optimizeRealTimeCaching(rootDir) {
    console.log("💾 Optimizing caching strategies for real-time data...");

    let cachingOpportunities = 0;
    const cacheStrategies = {
      temporal: 0, // Time-based caching
      delta: 0, // Delta compression
      sliding: 0, // Sliding window
      predictive: 0, // Predictive prefetching
    };

    for (const [filePath, serviceAnalysis] of this.realTimeServices) {
      const cachingStrategy = this.analyzeCachingStrategy(serviceAnalysis);

      if (cachingStrategy.hasOptimizations) {
        cachingOpportunities++;
        this.cachingStrategies.set(filePath, cachingStrategy);

        cachingStrategy.strategies.forEach((strategy) => {
          if (cacheStrategies.hasOwnProperty(strategy)) {
            cacheStrategies[strategy]++;
          }
        });
      }
    }

    console.log(
      `    ✓ Identified ${cachingOpportunities} caching optimization opportunities`,
    );
    console.log(
      `    📊 Strategies: ${cacheStrategies.temporal} temporal, ${cacheStrategies.delta} delta, ${cacheStrategies.sliding} sliding window\n`,
    );
  }

  async analyzeDataPersistence(rootDir) {
    console.log("💽 Analyzing session and data persistence patterns...");

    const persistenceMetrics = {
      autoSaveFrequency: [],
      sessionRecoveryEfficiency: 0,
      dataConsistency: 0,
      conflictResolution: 0,
    };

    for (const [filePath, serviceAnalysis] of this.realTimeServices) {
      if (serviceAnalysis.type.includes("autosave")) {
        const frequency = this.extractAutoSaveFrequency(serviceAnalysis);
        if (frequency) {
          persistenceMetrics.autoSaveFrequency.push(frequency);
        }
      }

      if (serviceAnalysis.type.includes("session")) {
        persistenceMetrics.sessionRecoveryEfficiency++;
      }

      if (serviceAnalysis.hasDataValidation) {
        persistenceMetrics.dataConsistency++;
      }

      if (serviceAnalysis.hasConflictResolution) {
        persistenceMetrics.conflictResolution++;
      }
    }

    const avgAutoSaveFreq =
      persistenceMetrics.autoSaveFrequency.length > 0
        ? persistenceMetrics.autoSaveFrequency.reduce((a, b) => a + b, 0) /
          persistenceMetrics.autoSaveFrequency.length
        : 0;

    console.log(`    ✓ Analyzed data persistence patterns`);
    console.log(
      `    📊 Auto-save frequency: ${avgAutoSaveFreq.toFixed(1)}ms average, Session recovery: ${persistenceMetrics.sessionRecoveryEfficiency} services\n`,
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

  isRealTimeServiceFile(content) {
    const realTimeIndicators = [
      /real.*time|realtime/i,
      /live.*price|pricing.*service/i,
      /session.*recovery|auto.*save/i,
      /websocket|ws\.|socket\.io/i,
      /setInterval|setTimeout/i,
      /useEffect.*\[\]/i, // Real-time effects
      /subscription|subscribe/i,
      /polling|long.*poll/i,
    ];

    return realTimeIndicators.some((pattern) => pattern.test(content));
  }

  analyzeRealTimeService(content, filePath, rootDir) {
    const analysis = {
      file: path.relative(rootDir, filePath),
      type: this.identifyServiceType(content),
      hasWebSocket: /websocket|ws\.|socket\.io/i.test(content),
      hasPolling: /setInterval|polling/i.test(content),
      hasSubscription: /subscription|subscribe/i.test(content),
      updateFrequency: this.estimateUpdateFrequency(content),
      stateComplexity: this.calculateStateComplexity(content),
      memoryUsage: this.estimateMemoryUsage(content),
      hasErrorHandling: /try\s*{|catch\s*\(|throw/i.test(content),
      hasRateLimiting: /throttle|debounce|rate.*limit/i.test(content),
      hasDataValidation: /validate|schema|zod/i.test(content),
      hasConflictResolution: /conflict|merge|resolve/i.test(content),
      performanceRisk: 0,
    };

    analysis.performanceRisk = this.calculatePerformanceRisk(analysis);

    return analysis;
  }

  identifyServiceType(content) {
    const types = [];

    if (/real.*time.*pric|pricing.*service|live.*price/i.test(content)) {
      types.push("pricing");
    }

    if (/session.*recovery|recover.*session/i.test(content)) {
      types.push("session");
    }

    if (/auto.*save|save.*automatic/i.test(content)) {
      types.push("autosave");
    }

    if (/live.*update|real.*time.*update/i.test(content)) {
      types.push("live");
    }

    return types;
  }

  estimateUpdateFrequency(content) {
    // Extract timing patterns
    const intervalMatches = content.match(/setInterval\([^,]+,\s*(\d+)/g);
    const timeoutMatches = content.match(/setTimeout\([^,]+,\s*(\d+)/g);

    const intervals = [];

    if (intervalMatches) {
      intervalMatches.forEach((match) => {
        const time = parseInt(match.match(/(\d+)/)[1]);
        intervals.push(time);
      });
    }

    if (timeoutMatches) {
      timeoutMatches.forEach((match) => {
        const time = parseInt(match.match(/(\d+)/)[1]);
        intervals.push(time);
      });
    }

    if (intervals.length === 0) return 1000; // Default 1 second

    return Math.min(...intervals); // Return most frequent update
  }

  calculateStateComplexity(content) {
    let complexity = 0;

    // Count state variables
    complexity += (content.match(/useState|useRef|useReducer/g) || []).length;
    complexity += (content.match(/create\(|set\(/g) || []).length; // Zustand stores
    complexity += (content.match(/localStorage|sessionStorage/g) || []).length;
    complexity += (content.match(/useEffect/g) || []).length;

    return Math.min(complexity, 20);
  }

  estimateMemoryUsage(content) {
    let memoryEstimate = 1024; // Base 1KB

    // Add memory for state variables
    const stateVars = (content.match(/useState|useRef|create\(/g) || []).length;
    memoryEstimate += stateVars * 100; // 100 bytes per state variable

    // Add memory for intervals/timeouts
    const timers = (content.match(/setInterval|setTimeout/g) || []).length;
    memoryEstimate += timers * 50; // 50 bytes per timer

    // Add memory for large data structures
    if (content.includes("Map") || content.includes("Set")) {
      memoryEstimate += 500;
    }

    if (content.includes("array") || content.includes("Array")) {
      memoryEstimate += 200;
    }

    return memoryEstimate;
  }

  calculatePerformanceRisk(analysis) {
    let risk = 0;

    if (analysis.updateFrequency < 100) risk += 4; // Very frequent updates
    if (analysis.updateFrequency < 500) risk += 2; // Frequent updates
    if (analysis.stateComplexity > 10) risk += 3; // Complex state
    if (analysis.memoryUsage > 5000) risk += 2; // High memory usage
    if (!analysis.hasRateLimiting) risk += 2; // No rate limiting
    if (!analysis.hasErrorHandling) risk += 1; // No error handling

    return Math.min(risk, 10);
  }

  analyzeConnectionPattern(content, filePath) {
    const analysis = {
      file: filePath,
      hasConnections: false,
      types: [],
      connectionCount: 0,
      hasConnectionPooling: false,
      hasReconnection: false,
      hasHeartbeat: false,
      optimizations: [],
    };

    // Check for different connection types
    if (/WebSocket|websocket|ws\./i.test(content)) {
      analysis.types.push("websocket");
      analysis.hasConnections = true;
      analysis.connectionCount += (
        content.match(/new WebSocket|ws\./g) || []
      ).length;
    }

    if (/polling|setInterval.*fetch/i.test(content)) {
      analysis.types.push("polling");
      analysis.hasConnections = true;
      analysis.connectionCount += (
        content.match(/setInterval.*fetch/g) || []
      ).length;
    }

    if (/EventSource|Server-Sent/i.test(content)) {
      analysis.types.push("sse");
      analysis.hasConnections = true;
      analysis.connectionCount += (
        content.match(/new EventSource/g) || []
      ).length;
    }

    // Check for optimizations
    analysis.hasConnectionPooling = /pool|Pool/i.test(content);
    analysis.hasReconnection = /reconnect|retry.*connect/i.test(content);
    analysis.hasHeartbeat = /heartbeat|ping|keepalive/i.test(content);

    // Generate optimization recommendations
    if (analysis.hasConnections) {
      if (!analysis.hasReconnection) {
        analysis.optimizations.push("Add automatic reconnection logic");
      }
      if (!analysis.hasHeartbeat && analysis.types.includes("websocket")) {
        analysis.optimizations.push("Implement heartbeat/ping mechanism");
      }
      if (analysis.connectionCount > 3 && !analysis.hasConnectionPooling) {
        analysis.optimizations.push("Implement connection pooling");
      }
    }

    return analysis;
  }

  analyzeStateManagement(content, filePath, rootDir) {
    const analysis = {
      file: filePath ? path.relative(rootDir, filePath) : "unknown",
      hasStateManagement: false,
      storeType: [],
      stateCount: 0,
      hasLocalStorage: false,
      hasSessionStorage: false,
      hasMemoryLeakRisk: false,
      optimizations: [],
    };

    // Check for state management patterns
    if (/useState|useReducer|useRef/i.test(content)) {
      analysis.hasStateManagement = true;
      analysis.storeType.push("react");
      analysis.stateCount += (
        content.match(/useState|useReducer|useRef/g) || []
      ).length;
    }

    if (/create\(|zustand/i.test(content)) {
      analysis.hasStateManagement = true;
      analysis.storeType.push("zustand");
      analysis.stateCount += (content.match(/create\(/g) || []).length;
    }

    if (/createContext|useContext/i.test(content)) {
      analysis.hasStateManagement = true;
      analysis.storeType.push("context");
      analysis.stateCount += (content.match(/createContext/g) || []).length;
    }

    analysis.hasLocalStorage = /localStorage/i.test(content);
    analysis.hasSessionStorage = /sessionStorage/i.test(content);

    // Check for memory leak risks
    const hasUnboundedArrays =
      /\.push\(|\.concat\(/i.test(content) &&
      !/\.slice\(|\.splice\(/i.test(content);
    const hasUncleanedTimers =
      /setInterval|setTimeout/i.test(content) &&
      !/clearInterval|clearTimeout/i.test(content);
    const hasUncleanedSubscriptions =
      /subscribe|addEventListener/i.test(content) &&
      !/unsubscribe|removeEventListener/i.test(content);

    analysis.hasMemoryLeakRisk =
      hasUnboundedArrays || hasUncleanedTimers || hasUncleanedSubscriptions;

    // Generate optimization recommendations
    if (analysis.hasMemoryLeakRisk) {
      if (hasUnboundedArrays)
        analysis.optimizations.push("Implement bounds checking for arrays");
      if (hasUncleanedTimers)
        analysis.optimizations.push("Add cleanup for timers in useEffect");
      if (hasUncleanedSubscriptions)
        analysis.optimizations.push("Add unsubscribe logic");
    }

    if (analysis.stateCount > 10) {
      analysis.optimizations.push("Consider state consolidation");
    }

    return analysis;
  }

  identifyServiceBottlenecks(serviceAnalysis) {
    const bottlenecks = [];

    // High frequency updates
    if (serviceAnalysis.updateFrequency < 100) {
      bottlenecks.push({
        type: "high-frequency-updates",
        severity: "high",
        description: `Updates every ${serviceAnalysis.updateFrequency}ms`,
        recommendation: "Implement debouncing or throttling",
      });
    }

    // High state complexity
    if (serviceAnalysis.stateComplexity > 10) {
      bottlenecks.push({
        type: "complex-state",
        severity: "medium",
        description: `${serviceAnalysis.stateComplexity} state variables`,
        recommendation: "Consider state normalization or decomposition",
      });
    }

    // High memory usage
    if (serviceAnalysis.memoryUsage > 5000) {
      bottlenecks.push({
        type: "high-memory-usage",
        severity: "medium",
        description: `Estimated ${serviceAnalysis.memoryUsage} bytes memory usage`,
        recommendation: "Implement memory optimization strategies",
      });
    }

    // Missing optimizations
    if (!serviceAnalysis.hasRateLimiting) {
      bottlenecks.push({
        type: "no-rate-limiting",
        severity: "medium",
        description: "No rate limiting or throttling detected",
        recommendation: "Add throttling/debouncing for updates",
      });
    }

    return bottlenecks;
  }

  calculateOptimizationPriority(bottlenecks, serviceAnalysis) {
    let priority = 0;

    bottlenecks.forEach((bottleneck) => {
      switch (bottleneck.severity) {
        case "high":
          priority += 3;
          break;
        case "medium":
          priority += 2;
          break;
        case "low":
          priority += 1;
          break;
      }
    });

    // Boost priority for frequently updated services
    if (serviceAnalysis.updateFrequency < 500) {
      priority += 2;
    }

    return priority > 7
      ? "critical"
      : priority > 4
        ? "high"
        : priority > 2
          ? "medium"
          : "low";
  }

  estimateOptimizationImpact(bottlenecks) {
    let impact = 0;

    bottlenecks.forEach((bottleneck) => {
      switch (bottleneck.type) {
        case "high-frequency-updates":
          impact += 40; // 40% performance improvement
          break;
        case "complex-state":
          impact += 20;
          break;
        case "high-memory-usage":
          impact += 25;
          break;
        case "no-rate-limiting":
          impact += 15;
          break;
        default:
          impact += 10;
      }
    });

    return Math.min(impact, 80); // Cap at 80% improvement
  }

  analyzeCachingStrategy(serviceAnalysis) {
    const analysis = {
      hasOptimizations: false,
      strategies: [],
      estimatedImpact: 0,
      recommendations: [],
    };

    // Temporal caching for frequent updates
    if (serviceAnalysis.updateFrequency < 1000) {
      analysis.hasOptimizations = true;
      analysis.strategies.push("temporal");
      analysis.recommendations.push(
        "Implement temporal caching with short TTL",
      );
      analysis.estimatedImpact += 30;
    }

    // Delta compression for state updates
    if (serviceAnalysis.stateComplexity > 5) {
      analysis.hasOptimizations = true;
      analysis.strategies.push("delta");
      analysis.recommendations.push("Use delta compression for state updates");
      analysis.estimatedImpact += 20;
    }

    // Sliding window for pricing data
    if (serviceAnalysis.type.includes("pricing")) {
      analysis.hasOptimizations = true;
      analysis.strategies.push("sliding");
      analysis.recommendations.push(
        "Implement sliding window cache for pricing calculations",
      );
      analysis.estimatedImpact += 25;
    }

    analysis.estimatedImpact = Math.min(analysis.estimatedImpact, 70);

    return analysis;
  }

  extractAutoSaveFrequency(serviceAnalysis) {
    // Return the update frequency as auto-save frequency
    return serviceAnalysis.updateFrequency || null;
  }

  generateTuningPlan() {
    console.log(
      "📋 Generating comprehensive real-time performance tuning plan...",
    );

    const plan = {
      timestamp: new Date().toISOString(),
      summary: this.generateTuningSummary(),
      optimizationTargets: this.optimizationTargets.sort(
        (a, b) =>
          this.priorityToNumber(b.priority) - this.priorityToNumber(a.priority),
      ),
      cachingStrategy: this.generateCachingStrategy(),
      stateOptimizations: this.generateStateOptimizations(),
      connectionOptimizations: this.generateConnectionOptimizations(),
      memoryOptimizations: this.generateMemoryOptimizations(),
      implementationPlan: this.generateImplementationPlan(),
      performanceTargets: this.generatePerformanceTargets(),
    };

    // Write detailed tuning plan
    const planPath = "realtime-performance-tuning-plan.json";
    fs.writeFileSync(planPath, JSON.stringify(plan, null, 2));
    console.log(`  📊 Tuning plan saved to: ${planPath}`);

    // Write markdown summary
    this.generateMarkdownReport(plan);

    console.log(`\n🎯 Real-Time Performance Tuning Summary:`);
    console.log(`  ⚡ Services Analyzed: ${plan.summary.totalServices}`);
    console.log(
      `  🎯 Optimization Targets: ${plan.summary.optimizationTargets}`,
    );
    console.log(`  🚨 Critical Priority: ${plan.summary.criticalPriority}`);
    console.log(
      `  📊 Estimated Improvement: ${plan.summary.estimatedImprovement}% overall performance`,
    );
  }

  priorityToNumber(priority) {
    const map = { critical: 4, high: 3, medium: 2, low: 1 };
    return map[priority] || 0;
  }

  generateTuningSummary() {
    const criticalTargets = this.optimizationTargets.filter(
      (target) => target.priority === "critical",
    ).length;
    const highTargets = this.optimizationTargets.filter(
      (target) => target.priority === "high",
    ).length;

    const avgImpact =
      this.optimizationTargets.length > 0
        ? this.optimizationTargets.reduce(
            (sum, target) => sum + target.estimatedImpact,
            0,
          ) / this.optimizationTargets.length
        : 0;

    return {
      totalServices: this.realTimeServices.size,
      optimizationTargets: this.optimizationTargets.length,
      criticalPriority: criticalTargets,
      highPriority: highTargets,
      cachingOpportunities: this.cachingStrategies.size,
      memoryOptimizations: this.memoryOptimizations.length,
      estimatedImprovement: Math.round(avgImpact),
    };
  }

  generateCachingStrategy() {
    return {
      temporal: {
        description: "Time-based caching for frequently updated data",
        implementation: "Redis with short TTL (100-1000ms)",
        useCase: "Real-time pricing calculations",
      },
      delta: {
        description: "Delta compression for state updates",
        implementation: "Track and transmit only changed properties",
        useCase: "Complex state objects with partial updates",
      },
      sliding: {
        description: "Sliding window cache for time-series data",
        implementation:
          "Maintain fixed-size buffer with oldest data expiration",
        useCase: "Pricing history and trend analysis",
      },
      predictive: {
        description: "Predictive prefetching based on usage patterns",
        implementation: "ML-based prediction of likely next requests",
        useCase: "User workflow optimization",
      },
    };
  }

  generateStateOptimizations() {
    const optimizations = [];

    for (const [filePath, stateAnalysis] of this.stateManagement) {
      if (stateAnalysis.hasMemoryLeakRisk || stateAnalysis.stateCount > 10) {
        optimizations.push({
          file: filePath,
          issues: this.getStateIssues(stateAnalysis),
          recommendations: stateAnalysis.optimizations,
          priority: stateAnalysis.hasMemoryLeakRisk ? "high" : "medium",
        });
      }
    }

    return optimizations;
  }

  getStateIssues(stateAnalysis) {
    const issues = [];

    if (stateAnalysis.hasMemoryLeakRisk) issues.push("Memory leak risk");
    if (stateAnalysis.stateCount > 10) issues.push("Complex state management");
    if (stateAnalysis.hasLocalStorage && stateAnalysis.hasSessionStorage)
      issues.push("Mixed storage types");

    return issues;
  }

  generateConnectionOptimizations() {
    const optimizations = [];

    for (const [filePath, connectionAnalysis] of this.webSocketConnections) {
      if (connectionAnalysis.optimizations.length > 0) {
        optimizations.push({
          file: filePath,
          connectionTypes: connectionAnalysis.types,
          currentOptimizations:
            this.getCurrentOptimizations(connectionAnalysis),
          recommendations: connectionAnalysis.optimizations,
          priority: connectionAnalysis.connectionCount > 3 ? "high" : "medium",
        });
      }
    }

    return optimizations;
  }

  getCurrentOptimizations(connectionAnalysis) {
    const optimizations = [];

    if (connectionAnalysis.hasConnectionPooling)
      optimizations.push("Connection pooling");
    if (connectionAnalysis.hasReconnection)
      optimizations.push("Auto-reconnection");
    if (connectionAnalysis.hasHeartbeat)
      optimizations.push("Heartbeat mechanism");

    return optimizations;
  }

  generateMemoryOptimizations() {
    const optimizations = [];

    for (const [filePath, serviceAnalysis] of this.realTimeServices) {
      if (serviceAnalysis.memoryUsage > 3000) {
        optimizations.push({
          file: filePath,
          currentUsage: serviceAnalysis.memoryUsage,
          optimizations: [
            "Implement object pooling for frequently created objects",
            "Add memory cleanup in component unmount",
            "Use WeakMap/WeakSet for temporary references",
            "Implement data structure size limits",
          ],
          estimatedSaving: Math.round(serviceAnalysis.memoryUsage * 0.3), // 30% reduction
        });
      }
    }

    this.memoryOptimizations = optimizations;
    return optimizations;
  }

  generateImplementationPlan() {
    return {
      phase1: {
        name: "Critical Performance Fixes (Week 1)",
        priority: "critical",
        tasks: [
          "Implement debouncing for high-frequency updates (<100ms)",
          "Add memory leak fixes for unbounded arrays and timers",
          "Optimize state management in complex components",
          "Add rate limiting to prevent performance degradation",
        ],
        estimatedImpact: "40-60% performance improvement for critical services",
      },
      phase2: {
        name: "Caching & Connection Optimization (Week 2-3)",
        priority: "high",
        tasks: [
          "Implement temporal caching for real-time pricing",
          "Add delta compression for state updates",
          "Optimize WebSocket connection management",
          "Implement sliding window caches for time-series data",
        ],
        estimatedImpact: "25-40% additional performance improvement",
      },
      phase3: {
        name: "Advanced Optimizations (Week 4-5)",
        priority: "medium",
        tasks: [
          "Add predictive prefetching for user workflows",
          "Implement advanced memory optimization strategies",
          "Set up real-time performance monitoring",
          "Fine-tune auto-save frequencies based on user patterns",
        ],
        estimatedImpact: "15-25% additional optimization plus monitoring",
      },
    };
  }

  generatePerformanceTargets() {
    return {
      responseTime: {
        realTimePricing: "Target: <50ms calculation time",
        sessionRecovery: "Target: <200ms recovery initialization",
        autoSave: "Target: <100ms save operation",
      },
      memoryUsage: {
        target: "Reduce memory usage by 30% through optimization",
        monitoring: "Set up alerts for >10MB per real-time service",
      },
      updateFrequency: {
        target:
          "Optimize update frequencies to balance responsiveness and performance",
        thresholds: "Critical: <100ms, Warning: <500ms, Optimal: 500-2000ms",
      },
      caching: {
        hitRatio: "Target: >80% cache hit ratio for pricing calculations",
        latency: "Target: <10ms cache retrieval time",
      },
    };
  }

  generateMarkdownReport(plan) {
    const content = `# Real-Time System Performance Tuning Report

**Generated**: ${new Date().toLocaleString()}

## Executive Summary

- **Real-Time Services Analyzed**: ${plan.summary.totalServices}
- **Optimization Targets**: ${plan.summary.optimizationTargets}
- **Critical Priority Issues**: ${plan.summary.criticalPriority}
- **High Priority Issues**: ${plan.summary.highPriority}
- **Caching Opportunities**: ${plan.summary.cachingOpportunities}
- **Estimated Performance Improvement**: ${plan.summary.estimatedImprovement}%

## Critical Optimization Targets

${plan.optimizationTargets
  .filter((target) => target.priority === "critical")
  .slice(0, 5)
  .map(
    (target, i) =>
      `${i + 1}. **${target.file}** (${target.priority} priority)
   - Service Type: ${target.service.type.join(", ")}
   - Update Frequency: ${target.service.updateFrequency}ms
   - Bottlenecks: ${target.bottlenecks.map((b) => b.type).join(", ")}
   - Estimated Impact: ${target.estimatedImpact}% improvement`,
  )
  .join("\n\n")}

## Performance Bottlenecks Analysis

### High-Frequency Updates
Services updating faster than 100ms require immediate optimization with debouncing or throttling.

### State Management Issues  
${plan.stateOptimizations.length} files have state management issues requiring optimization.

### Memory Usage Concerns
${plan.memoryOptimizations.length} services have elevated memory usage requiring optimization.

## Optimization Strategies

### Caching Implementation

#### Temporal Caching
- **Use Case**: ${plan.cachingStrategy.temporal.useCase}
- **Implementation**: ${plan.cachingStrategy.temporal.implementation}

#### Delta Compression
- **Use Case**: ${plan.cachingStrategy.delta.useCase}  
- **Implementation**: ${plan.cachingStrategy.delta.implementation}

#### Sliding Window
- **Use Case**: ${plan.cachingStrategy.sliding.useCase}
- **Implementation**: ${plan.cachingStrategy.sliding.implementation}

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

## Performance Targets

### Response Time Goals
- **Real-Time Pricing**: ${plan.performanceTargets.responseTime.realTimePricing}
- **Session Recovery**: ${plan.performanceTargets.responseTime.sessionRecovery}
- **Auto-Save**: ${plan.performanceTargets.responseTime.autoSave}

### Memory Optimization
- **Target**: ${plan.performanceTargets.memoryUsage.target}
- **Monitoring**: ${plan.performanceTargets.memoryUsage.monitoring}

### Caching Performance
- **Hit Ratio**: ${plan.performanceTargets.caching.hitRatio}
- **Latency**: ${plan.performanceTargets.caching.latency}

## Success Metrics

- **Real-time responsiveness**: <100ms for pricing calculations
- **Memory efficiency**: 30% reduction in memory usage
- **Cache effectiveness**: >80% hit ratio for frequent operations  
- **System stability**: Zero memory leaks in production
- **User experience**: Sub-second auto-save and session recovery

## Next Steps

1. Implement critical fixes for high-frequency update services
2. Deploy temporal caching for real-time pricing calculations
3. Add comprehensive memory leak prevention
4. Set up real-time performance monitoring and alerting

---

*Real-time tuning report generated by EstimatePro Real-Time Performance Tuner*
`;

    fs.writeFileSync("realtime-performance-tuning.md", content);
    console.log(`  📋 Tuning report saved to: realtime-performance-tuning.md`);
  }
}

// Run the real-time performance tuning
if (require.main === module) {
  const tuner = new RealTimePerformanceTuner();
  tuner.tuneRealTimePerformance(process.cwd()).catch((error) => {
    console.error("❌ Real-time performance tuning failed:", error.message);
    process.exit(1);
  });
}

module.exports = RealTimePerformanceTuner;
