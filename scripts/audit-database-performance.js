#!/usr/bin/env node

/**
 * Database Query Performance Audit Tool
 * Analyzes database query patterns, identifies performance bottlenecks, and provides optimization recommendations
 */

const fs = require("fs");
const path = require("path");
const { promisify } = require("util");

const readFile = promisify(fs.readFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

class DatabasePerformanceAuditor {
  constructor() {
    this.queryPatterns = new Map();
    this.performanceMetrics = new Map();
    this.optimizationOpportunities = [];
    this.nPlusOneRisks = [];
    this.indexingRecommendations = [];
    this.connectionPooling = new Map();
    this.transactionAnalysis = new Map();
  }

  async auditDatabase(rootDir) {
    console.log("🗄️  Starting Database Query Performance Audit...\n");

    try {
      // Phase 1: Query pattern analysis
      await this.analyzeQueryPatterns(rootDir);

      // Phase 2: N+1 query detection
      await this.detectNPlusOneQueries(rootDir);

      // Phase 3: Connection pooling analysis
      await this.analyzeConnectionPooling(rootDir);

      // Phase 4: Transaction performance analysis
      await this.analyzeTransactionPatterns(rootDir);

      // Phase 5: Database schema analysis
      await this.analyzeDatabaseSchema(rootDir);

      // Phase 6: Indexing recommendations
      await this.generateIndexingRecommendations(rootDir);

      // Phase 7: Generate comprehensive audit report
      this.generateAuditReport();

      console.log("✅ Database performance audit completed successfully!");
    } catch (error) {
      console.error("❌ Database audit failed:", error.message);
      throw error;
    }
  }

  async analyzeQueryPatterns(rootDir) {
    console.log("🔍 Analyzing database query patterns...");

    const directories = [
      "lib/services",
      "app/api",
      "lib/supabase",
      "components",
      "hooks",
    ];

    let totalQueries = 0;
    const complexityDistribution = { simple: 0, medium: 0, complex: 0 };

    for (const dir of directories) {
      const dirPath = path.join(rootDir, dir);
      if (fs.existsSync(dirPath)) {
        const files = await this.getTypeScriptFiles(dirPath);

        for (const file of files) {
          try {
            const content = await readFile(file, "utf8");
            const queries = this.extractQueries(content);

            for (const query of queries) {
              totalQueries++;
              const analysis = this.analyzeQuery(query, file);

              // Categorize by complexity
              if (analysis.complexity <= 3) {
                complexityDistribution.simple++;
              } else if (analysis.complexity <= 7) {
                complexityDistribution.medium++;
              } else {
                complexityDistribution.complex++;
              }

              // Store query analysis
              const queryKey = `${path.basename(file)}_${totalQueries}`;
              this.queryPatterns.set(queryKey, {
                file: path.relative(rootDir, file),
                query:
                  query.substring(0, 200) + (query.length > 200 ? "..." : ""),
                ...analysis,
              });
            }
          } catch (error) {
            console.warn(`    ⚠️  Error analyzing ${file}: ${error.message}`);
          }
        }
      }
    }

    console.log(`    ✓ Analyzed ${totalQueries} database queries`);
    console.log(
      `    📊 Complexity: ${complexityDistribution.simple} simple, ${complexityDistribution.medium} medium, ${complexityDistribution.complex} complex\n`,
    );
  }

  async detectNPlusOneQueries(rootDir) {
    console.log("🔄 Detecting N+1 query patterns...");

    const serviceFiles = await this.getTypeScriptFiles(
      path.join(rootDir, "lib/services"),
    );
    const componentFiles = await this.getTypeScriptFiles(
      path.join(rootDir, "components"),
    );
    const allFiles = [...serviceFiles, ...componentFiles];

    let nPlusOneCount = 0;

    for (const file of allFiles) {
      try {
        const content = await readFile(file, "utf8");
        const risks = this.identifyNPlusOnePatterns(content, file, rootDir);

        this.nPlusOneRisks.push(...risks);
        nPlusOneCount += risks.length;
      } catch (error) {
        console.warn(`    ⚠️  Error analyzing ${file}: ${error.message}`);
      }
    }

    console.log(`    ✓ Found ${nPlusOneCount} potential N+1 query patterns`);
    if (nPlusOneCount > 0) {
      console.log(
        "    🚨 High priority: N+1 queries can severely impact performance",
      );
    }
    console.log("");
  }

  async analyzeConnectionPooling(rootDir) {
    console.log("🏊 Analyzing database connection pooling...");

    const supabaseFiles = await this.getTypeScriptFiles(
      path.join(rootDir, "lib/supabase"),
    );

    for (const file of supabaseFiles) {
      try {
        const content = await readFile(file, "utf8");
        const poolingAnalysis = this.analyzeConnectionPool(
          content,
          file,
          rootDir,
        );

        this.connectionPooling.set(path.basename(file), poolingAnalysis);
      } catch (error) {
        console.warn(`    ⚠️  Error analyzing ${file}: ${error.message}`);
      }
    }

    const totalConnections = Array.from(this.connectionPooling.values()).reduce(
      (sum, analysis) => sum + analysis.connectionCount,
      0,
    );

    console.log(
      `    ✓ Analyzed ${this.connectionPooling.size} connection files`,
    );
    console.log(`    📊 Total connection patterns: ${totalConnections}\n`);
  }

  async analyzeTransactionPatterns(rootDir) {
    console.log("💳 Analyzing database transaction patterns...");

    const serviceFiles = await this.getTypeScriptFiles(
      path.join(rootDir, "lib/services"),
    );

    let transactionCount = 0;
    const transactionTypes = { explicit: 0, implicit: 0, bulk: 0 };

    for (const file of serviceFiles) {
      try {
        const content = await readFile(file, "utf8");
        const transactions = this.identifyTransactions(content, file, rootDir);

        transactions.forEach((transaction) => {
          transactionCount++;
          transactionTypes[transaction.type]++;

          const transactionKey = `${path.basename(file)}_${transaction.line}`;
          this.transactionAnalysis.set(transactionKey, transaction);
        });
      } catch (error) {
        console.warn(`    ⚠️  Error analyzing ${file}: ${error.message}`);
      }
    }

    console.log(`    ✓ Analyzed ${transactionCount} transaction patterns`);
    console.log(
      `    📊 Types: ${transactionTypes.explicit} explicit, ${transactionTypes.implicit} implicit, ${transactionTypes.bulk} bulk\n`,
    );
  }

  async analyzeDatabaseSchema(rootDir) {
    console.log("🏗️  Analyzing database schema patterns...");

    // Look for schema files and migrations
    const schemaPatterns = [
      "sql/**/*.sql",
      "migrations/**/*.sql",
      "lib/types/database.ts",
      "types/database.ts",
    ];

    let schemaFiles = [];
    for (const pattern of schemaPatterns) {
      const matches = await this.findFiles(rootDir, pattern);
      schemaFiles.push(...matches);
    }

    const schemaAnalysis = {
      tables: new Set(),
      relationships: [],
      indexes: [],
      constraints: [],
    };

    for (const file of schemaFiles) {
      try {
        const content = await readFile(file, "utf8");
        this.extractSchemaInfo(content, schemaAnalysis);
      } catch (error) {
        console.warn(
          `    ⚠️  Error analyzing schema ${file}: ${error.message}`,
        );
      }
    }

    this.performanceMetrics.set("schema", {
      tableCount: schemaAnalysis.tables.size,
      relationshipCount: schemaAnalysis.relationships.length,
      indexCount: schemaAnalysis.indexes.length,
      constraintCount: schemaAnalysis.constraints.length,
    });

    console.log(
      `    ✓ Found ${schemaAnalysis.tables.size} tables with ${schemaAnalysis.relationships.length} relationships`,
    );
    console.log(
      `    📊 Indexes: ${schemaAnalysis.indexes.length}, Constraints: ${schemaAnalysis.constraints.length}\n`,
    );
  }

  async generateIndexingRecommendations(rootDir) {
    console.log("🗂️  Generating indexing recommendations...");

    // Analyze query patterns to suggest indexes
    const indexableColumns = new Map();
    const joinPatterns = new Map();

    for (const [queryKey, queryAnalysis] of this.queryPatterns) {
      // Extract WHERE clauses
      const whereColumns = this.extractWhereColumns(queryAnalysis.query);
      whereColumns.forEach((column) => {
        const count = indexableColumns.get(column) || 0;
        indexableColumns.set(column, count + 1);
      });

      // Extract JOIN patterns
      const joins = this.extractJoinPatterns(queryAnalysis.query);
      joins.forEach((join) => {
        const count = joinPatterns.get(join) || 0;
        joinPatterns.set(join, count + 1);
      });
    }

    // Generate recommendations based on frequency
    for (const [column, frequency] of indexableColumns) {
      if (frequency >= 3) {
        // Column used in 3+ queries
        this.indexingRecommendations.push({
          type: "single-column",
          column,
          frequency,
          priority: frequency >= 5 ? "high" : "medium",
          estimatedImpact: this.calculateIndexImpact(frequency),
          sql: `CREATE INDEX idx_${column.replace(/\./g, "_")} ON ${this.extractTableFromColumn(column)} (${column.split(".").pop()});`,
        });
      }
    }

    // Generate composite index recommendations
    for (const [joinPattern, frequency] of joinPatterns) {
      if (frequency >= 2) {
        this.indexingRecommendations.push({
          type: "composite",
          pattern: joinPattern,
          frequency,
          priority: frequency >= 4 ? "high" : "medium",
          estimatedImpact: this.calculateIndexImpact(frequency * 2),
          sql: this.generateCompositeIndexSQL(joinPattern),
        });
      }
    }

    console.log(
      `    ✓ Generated ${this.indexingRecommendations.length} indexing recommendations`,
    );
    console.log(
      `    🎯 High priority: ${this.indexingRecommendations.filter((r) => r.priority === "high").length}\n`,
    );
  }

  // Query analysis helper methods

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

  async findFiles(rootDir, pattern) {
    // Simple glob-like pattern matching
    const files = [];
    const parts = pattern.split("/");

    const search = async (currentDir, patternIndex) => {
      if (patternIndex >= parts.length) return;

      const currentPattern = parts[patternIndex];

      if (!fs.existsSync(currentDir)) return;

      const items = await readdir(currentDir);

      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stats = await stat(fullPath);

        if (
          stats.isDirectory() &&
          (currentPattern === "**" || item === currentPattern)
        ) {
          if (currentPattern === "**") {
            await search(fullPath, patternIndex); // Stay at same pattern level
            await search(fullPath, patternIndex + 1); // Advance pattern
          } else {
            await search(fullPath, patternIndex + 1);
          }
        } else if (stats.isFile() && patternIndex === parts.length - 1) {
          if (currentPattern.includes("*")) {
            const regex = new RegExp(currentPattern.replace(/\*/g, ".*"));
            if (regex.test(item)) {
              files.push(fullPath);
            }
          } else if (item === currentPattern) {
            files.push(fullPath);
          }
        }
      }
    };

    await search(rootDir, 0);
    return files;
  }

  extractQueries(content) {
    const queries = [];

    // Supabase query patterns
    const supabasePatterns = [
      /supabase\.from\(['"`]([^'"`]+)['"`]\)[^;]+/g,
      /\.select\([^)]*\)[^;]*/g,
      /\.insert\([^)]*\)[^;]*/g,
      /\.update\([^)]*\)[^;]*/g,
      /\.delete\([^)]*\)[^;]*/g,
      /\.rpc\([^)]*\)[^;]*/g,
    ];

    // Raw SQL patterns
    const sqlPatterns = [
      /`[^`]*(?:SELECT|INSERT|UPDATE|DELETE)[^`]*`/gi,
      /'[^']*(?:SELECT|INSERT|UPDATE|DELETE)[^']*'/gi,
      /"[^"]*(?:SELECT|INSERT|UPDATE|DELETE)[^"]*"/gi,
    ];

    [...supabasePatterns, ...sqlPatterns].forEach((pattern) => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        queries.push(match[0]);
      }
    });

    return queries;
  }

  analyzeQuery(query, filePath) {
    let complexity = 0;
    let operationType = "unknown";
    let tables = [];
    let estimatedLatency = 50; // Base latency in ms

    // Determine operation type
    if (query.includes("select") || query.includes("SELECT")) {
      operationType = "select";
      complexity += 1;
    } else if (query.includes("insert") || query.includes("INSERT")) {
      operationType = "insert";
      complexity += 2;
      estimatedLatency += 20;
    } else if (query.includes("update") || query.includes("UPDATE")) {
      operationType = "update";
      complexity += 3;
      estimatedLatency += 30;
    } else if (query.includes("delete") || query.includes("DELETE")) {
      operationType = "delete";
      complexity += 4;
      estimatedLatency += 25;
    }

    // Complexity factors
    const complexityFactors = [
      { pattern: /JOIN/gi, score: 2, latency: 20 },
      { pattern: /WHERE/gi, score: 1, latency: 10 },
      { pattern: /ORDER BY/gi, score: 1, latency: 15 },
      { pattern: /GROUP BY/gi, score: 2, latency: 25 },
      { pattern: /HAVING/gi, score: 2, latency: 20 },
      { pattern: /UNION/gi, score: 3, latency: 30 },
      { pattern: /CASE/gi, score: 2, latency: 15 },
      { pattern: /EXISTS/gi, score: 2, latency: 20 },
      { pattern: /IN\s*\(/gi, score: 1, latency: 10 },
      { pattern: /LIKE/gi, score: 1, latency: 15 },
    ];

    complexityFactors.forEach((factor) => {
      const matches = query.match(factor.pattern);
      if (matches) {
        complexity += matches.length * factor.score;
        estimatedLatency += matches.length * factor.latency;
      }
    });

    // Extract table names
    const tableMatches = query.match(
      /from\(['"`]([^'"`]+)['"`]\)|FROM\s+(\w+)/gi,
    );
    if (tableMatches) {
      tables = tableMatches.map((match) => {
        const cleanMatch = match.replace(/from\(['"`]|['"`]\)|FROM\s+/gi, "");
        return cleanMatch.trim();
      });
    }

    return {
      operationType,
      complexity,
      estimatedLatency,
      tables,
      hasJoins: /JOIN/i.test(query),
      hasSubqueries: /\([^)]*SELECT/i.test(query),
      hasAggregates: /(COUNT|SUM|AVG|MAX|MIN)\(/i.test(query),
      optimizationPotential: this.calculateOptimizationPotential(
        complexity,
        query,
      ),
    };
  }

  calculateOptimizationPotential(complexity, query) {
    let potential = 0;

    if (complexity > 7) potential += 3; // High complexity queries
    if (query.includes("SELECT *")) potential += 2; // Avoid SELECT *
    if (/WHERE.*LIKE.*%.*%/.test(query)) potential += 2; // Avoid full wildcard LIKE
    if (!query.includes("LIMIT") && query.includes("SELECT")) potential += 1; // Missing LIMIT
    if (query.split("JOIN").length > 3) potential += 2; // Too many JOINs

    return Math.min(potential, 5); // Cap at 5
  }

  identifyNPlusOnePatterns(content, filePath, rootDir) {
    const risks = [];

    // Look for loops with database queries inside
    const loopPatterns = [
      /for\s*\([^)]*\)\s*{[^}]*(?:supabase\.|await.*select|\.from\()/gi,
      /while\s*\([^)]*\)\s*{[^}]*(?:supabase\.|await.*select|\.from\()/gi,
      /\.forEach\([^)]*\)\s*{[^}]*(?:supabase\.|await.*select|\.from\()/gi,
      /\.map\([^)]*\)\s*{[^}]*(?:supabase\.|await.*select|\.from\()/gi,
    ];

    loopPatterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const lineNumber = content.substring(0, match.index).split("\n").length;

        risks.push({
          file: path.relative(rootDir, filePath),
          line: lineNumber,
          pattern: match[0].substring(0, 100) + "...",
          type: "potential-n-plus-one",
          severity: "high",
          recommendation: "Consider using batch queries or JOIN operations",
          estimatedImpact: "Could cause exponential performance degradation",
        });
      }
    });

    // Look for sequential awaits in loops
    const sequentialAwaitPattern =
      /(?:for|while|forEach|map)[^{]*{[^}]*await[^}]*await/gi;
    let match;
    while ((match = sequentialAwaitPattern.exec(content)) !== null) {
      const lineNumber = content.substring(0, match.index).split("\n").length;

      risks.push({
        file: path.relative(rootDir, filePath),
        line: lineNumber,
        pattern: match[0].substring(0, 100) + "...",
        type: "sequential-await-in-loop",
        severity: "medium",
        recommendation: "Consider using Promise.all() for parallel execution",
        estimatedImpact: "Unnecessarily slow sequential processing",
      });
    }

    return risks;
  }

  analyzeConnectionPool(content, filePath, rootDir) {
    const analysis = {
      file: path.relative(rootDir, filePath),
      connectionCount: 0,
      hasPooling: false,
      poolConfiguration: null,
      recommendations: [],
    };

    // Count connection instances
    analysis.connectionCount = (
      content.match(/createClient|new\s+Client|supabase/g) || []
    ).length;

    // Check for pooling configuration
    if (content.includes("pool") || content.includes("Pool")) {
      analysis.hasPooling = true;

      // Extract pool configuration
      const poolConfigMatch = content.match(/pool\s*:\s*{[^}]+}/gi);
      if (poolConfigMatch) {
        analysis.poolConfiguration = poolConfigMatch[0];
      }
    }

    // Generate recommendations
    if (analysis.connectionCount > 5 && !analysis.hasPooling) {
      analysis.recommendations.push({
        type: "add-connection-pooling",
        priority: "high",
        description: "High connection count without pooling detected",
        implementation:
          "Implement connection pooling to manage database connections efficiently",
      });
    }

    if (content.includes("createClient") && !content.includes("pool")) {
      analysis.recommendations.push({
        type: "optimize-connection-creation",
        priority: "medium",
        description: "Multiple client creations without pooling",
        implementation:
          "Use singleton pattern or connection pooling for database clients",
      });
    }

    return analysis;
  }

  identifyTransactions(content, filePath, rootDir) {
    const transactions = [];

    // Explicit transactions
    const explicitPatterns = [
      /\.transaction\(/g,
      /BEGIN[\s;]/gi,
      /COMMIT[\s;]/gi,
      /ROLLBACK[\s;]/gi,
    ];

    explicitPatterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const lineNumber = content.substring(0, match.index).split("\n").length;
        transactions.push({
          file: path.relative(rootDir, filePath),
          line: lineNumber,
          type: "explicit",
          pattern: match[0],
          complexity: this.assessTransactionComplexity(content, match.index),
        });
      }
    });

    // Bulk operations (implicit transactions)
    const bulkPatterns = [
      /\.insertMany\(/g,
      /\.updateMany\(/g,
      /\.deleteMany\(/g,
      /\.upsert\(/g,
    ];

    bulkPatterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const lineNumber = content.substring(0, match.index).split("\n").length;
        transactions.push({
          file: path.relative(rootDir, filePath),
          line: lineNumber,
          type: "bulk",
          pattern: match[0],
          complexity: 2,
        });
      }
    });

    return transactions;
  }

  assessTransactionComplexity(content, matchIndex) {
    const transactionBlock = this.extractTransactionBlock(content, matchIndex);
    let complexity = 1;

    // Count operations in transaction
    const operations = (
      transactionBlock.match(/\.(insert|update|delete|select)/g) || []
    ).length;
    complexity += operations;

    // Check for nested operations
    if (transactionBlock.includes("await")) {
      complexity += (transactionBlock.match(/await/g) || []).length;
    }

    return Math.min(complexity, 10);
  }

  extractTransactionBlock(content, startIndex) {
    // Simple block extraction - look for matching braces
    let braceCount = 0;
    let inString = false;
    let stringChar = null;
    let block = "";

    for (let i = startIndex; i < content.length; i++) {
      const char = content[i];

      if (!inString && (char === '"' || char === "'")) {
        inString = true;
        stringChar = char;
      } else if (inString && char === stringChar && content[i - 1] !== "\\") {
        inString = false;
        stringChar = null;
      }

      if (!inString) {
        if (char === "{") braceCount++;
        if (char === "}") braceCount--;
      }

      block += char;

      if (braceCount === 0 && block.length > 20) break;
    }

    return block;
  }

  extractSchemaInfo(content, schemaAnalysis) {
    // Extract table names
    const tableMatches = content.match(
      /CREATE TABLE\s+(\w+)|Table['"`](\w+)['"`]/gi,
    );
    if (tableMatches) {
      tableMatches.forEach((match) => {
        const tableName = match
          .replace(/CREATE TABLE\s+|Table['"`]|['"`]/gi, "")
          .trim();
        schemaAnalysis.tables.add(tableName);
      });
    }

    // Extract indexes
    const indexMatches = content.match(/CREATE INDEX\s+\w+\s+ON\s+\w+/gi);
    if (indexMatches) {
      schemaAnalysis.indexes.push(...indexMatches);
    }

    // Extract foreign key relationships
    const fkMatches = content.match(
      /FOREIGN KEY\s*\([^)]+\)\s*REFERENCES\s+\w+\s*\([^)]+\)/gi,
    );
    if (fkMatches) {
      schemaAnalysis.relationships.push(...fkMatches);
    }
  }

  extractWhereColumns(query) {
    const columns = [];
    const wherePattern = /WHERE\s+([^=<>!\s]+)\s*[=<>!]/gi;

    let match;
    while ((match = wherePattern.exec(query)) !== null) {
      columns.push(match[1].trim());
    }

    return columns;
  }

  extractJoinPatterns(query) {
    const patterns = [];
    const joinPattern = /JOIN\s+(\w+)\s+ON\s+([^=]+)=([^=]+)/gi;

    let match;
    while ((match = joinPattern.exec(query)) !== null) {
      patterns.push(`${match[2].trim()}-${match[3].trim()}`);
    }

    return patterns;
  }

  calculateIndexImpact(frequency) {
    if (frequency >= 10) return "high";
    if (frequency >= 5) return "medium";
    return "low";
  }

  extractTableFromColumn(column) {
    // Simple heuristic: assume table.column format
    if (column.includes(".")) {
      return column.split(".")[0];
    }
    return "table"; // Default fallback
  }

  generateCompositeIndexSQL(joinPattern) {
    const [left, right] = joinPattern.split("-");
    return `-- Composite index for join pattern: ${joinPattern}\n-- CREATE INDEX idx_composite_${left.replace(/\./g, "_")}_${right.replace(/\./g, "_")} ON table (${left}, ${right});`;
  }

  generateAuditReport() {
    console.log(
      "📄 Generating comprehensive database performance audit report...",
    );

    const report = {
      timestamp: new Date().toISOString(),
      summary: this.generateAuditSummary(),
      queryAnalysis: {
        totalQueries: this.queryPatterns.size,
        patterns: Object.fromEntries(this.queryPatterns),
        complexityDistribution: this.calculateComplexityDistribution(),
      },
      nPlusOneRisks: {
        count: this.nPlusOneRisks.length,
        risks: this.nPlusOneRisks,
      },
      connectionPooling: Object.fromEntries(this.connectionPooling),
      transactionAnalysis: Object.fromEntries(this.transactionAnalysis),
      indexingRecommendations: this.indexingRecommendations,
      optimizationPlan: this.generateOptimizationPlan(),
      performanceMetrics: Object.fromEntries(this.performanceMetrics),
    };

    // Write detailed audit report
    const reportPath = "database-performance-audit.json";
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`  📊 Detailed audit report saved to: ${reportPath}`);

    // Write markdown summary
    this.generateMarkdownReport(report);

    console.log(`\n🎯 Database Performance Audit Summary:`);
    console.log(`  🗄️  Total Queries Analyzed: ${report.summary.totalQueries}`);
    console.log(`  🚨 N+1 Query Risks: ${report.summary.nPlusOneRisks}`);
    console.log(
      `  📈 Optimization Opportunities: ${report.summary.optimizationOpportunities}`,
    );
    console.log(
      `  🗂️  Indexing Recommendations: ${report.summary.indexingRecommendations}`,
    );
  }

  generateAuditSummary() {
    return {
      totalQueries: this.queryPatterns.size,
      nPlusOneRisks: this.nPlusOneRisks.length,
      connectionPoolingFiles: this.connectionPooling.size,
      transactionPatterns: this.transactionAnalysis.size,
      indexingRecommendations: this.indexingRecommendations.length,
      optimizationOpportunities: this.calculateOptimizationOpportunities(),
      averageQueryComplexity: this.calculateAverageComplexity(),
      highRiskQueries: this.countHighRiskQueries(),
    };
  }

  calculateComplexityDistribution() {
    const distribution = { simple: 0, medium: 0, complex: 0 };

    for (const [_, query] of this.queryPatterns) {
      if (query.complexity <= 3) {
        distribution.simple++;
      } else if (query.complexity <= 7) {
        distribution.medium++;
      } else {
        distribution.complex++;
      }
    }

    return distribution;
  }

  calculateOptimizationOpportunities() {
    let opportunities = 0;

    for (const [_, query] of this.queryPatterns) {
      opportunities += query.optimizationPotential;
    }

    opportunities += this.nPlusOneRisks.length * 3; // N+1 queries are high impact
    opportunities +=
      this.indexingRecommendations.filter((r) => r.priority === "high").length *
      2;

    return opportunities;
  }

  calculateAverageComplexity() {
    if (this.queryPatterns.size === 0) return 0;

    const totalComplexity = Array.from(this.queryPatterns.values()).reduce(
      (sum, query) => sum + query.complexity,
      0,
    );

    return (totalComplexity / this.queryPatterns.size).toFixed(2);
  }

  countHighRiskQueries() {
    return Array.from(this.queryPatterns.values()).filter(
      (query) => query.complexity > 7 || query.optimizationPotential > 3,
    ).length;
  }

  generateOptimizationPlan() {
    return {
      phase1: {
        name: "Immediate Fixes (Week 1)",
        priority: "critical",
        tasks: [
          "Address all identified N+1 query patterns",
          "Implement missing database indexes for high-frequency queries",
          "Add connection pooling where needed",
        ],
        estimatedImpact: "50-80% query performance improvement",
      },
      phase2: {
        name: "Query Optimization (Week 2-3)",
        priority: "high",
        tasks: [
          "Optimize complex queries (complexity > 7)",
          "Add query result caching for frequently accessed data",
          "Implement bulk operations for multiple record processing",
        ],
        estimatedImpact: "30-50% overall database performance improvement",
      },
      phase3: {
        name: "Architecture Improvements (Week 4-6)",
        priority: "medium",
        tasks: [
          "Implement read replicas for read-heavy operations",
          "Add database monitoring and alerting",
          "Optimize transaction boundaries and reduce lock contention",
        ],
        estimatedImpact: "20-30% system scalability improvement",
      },
    };
  }

  generateMarkdownReport(report) {
    const content = `# Database Performance Audit Report

**Generated**: ${new Date().toLocaleString()}

## Executive Summary

- **Total Queries Analyzed**: ${report.summary.totalQueries}
- **N+1 Query Risks**: ${report.summary.nPlusOneRisks}
- **Average Query Complexity**: ${report.summary.averageQueryComplexity}
- **High Risk Queries**: ${report.summary.highRiskQueries}
- **Optimization Opportunities**: ${report.summary.optimizationOpportunities}
- **Indexing Recommendations**: ${report.summary.indexingRecommendations}

## Critical Issues

### N+1 Query Patterns (${report.nPlusOneRisks.count})

${report.nPlusOneRisks.risks
  .slice(0, 5)
  .map(
    (risk, i) =>
      `${i + 1}. **${risk.file}:${risk.line}** (${risk.severity})
   - Pattern: \`${risk.pattern.substring(0, 80)}...\`
   - Recommendation: ${risk.recommendation}
   - Impact: ${risk.estimatedImpact}`,
  )
  .join("\n\n")}

### High Priority Index Recommendations

${report.indexingRecommendations
  .filter((r) => r.priority === "high")
  .slice(0, 5)
  .map(
    (rec, i) =>
      `${i + 1}. **${rec.type === "single-column" ? rec.column : rec.pattern}** (${rec.frequency} uses)
   - Impact: ${rec.estimatedImpact}
   - SQL: \`${rec.sql}\``,
  )
  .join("\n\n")}

## Query Analysis

### Complexity Distribution

- **Simple Queries**: ${report.queryAnalysis.complexityDistribution.simple}
- **Medium Complexity**: ${report.queryAnalysis.complexityDistribution.medium}  
- **Complex Queries**: ${report.queryAnalysis.complexityDistribution.complex}

### Connection Pooling Status

${Object.entries(report.connectionPooling)
  .map(
    ([file, analysis]) =>
      `- **${file}**: ${analysis.connectionCount} connections, ${analysis.hasPooling ? "✅" : "❌"} pooling`,
  )
  .join("\n")}

## Implementation Plan

### ${report.optimizationPlan.phase1.name}
**Priority**: ${report.optimizationPlan.phase1.priority}
**Impact**: ${report.optimizationPlan.phase1.estimatedImpact}

${report.optimizationPlan.phase1.tasks.map((task) => `- ${task}`).join("\n")}

### ${report.optimizationPlan.phase2.name}
**Priority**: ${report.optimizationPlan.phase2.priority}
**Impact**: ${report.optimizationPlan.phase2.estimatedImpact}

${report.optimizationPlan.phase2.tasks.map((task) => `- ${task}`).join("\n")}

### ${report.optimizationPlan.phase3.name}
**Priority**: ${report.optimizationPlan.phase3.priority}
**Impact**: ${report.optimizationPlan.phase3.estimatedImpact}

${report.optimizationPlan.phase3.tasks.map((task) => `- ${task}`).join("\n")}

## Success Metrics

- **Query Response Time**: Target 50% improvement for complex queries
- **N+1 Elimination**: 100% of identified patterns resolved
- **Index Hit Ratio**: Maintain >95% index utilization
- **Connection Efficiency**: Reduce connection overhead by 30%

## Next Steps

1. Prioritize N+1 query fixes (critical impact)
2. Implement high-priority indexes
3. Add connection pooling optimization
4. Set up database performance monitoring

---

*Database audit generated by EstimatePro Database Performance Auditor*
`;

    fs.writeFileSync("database-performance-audit.md", content);
    console.log(`  📋 Audit summary saved to: database-performance-audit.md`);
  }
}

// Run the database audit
if (require.main === module) {
  const auditor = new DatabasePerformanceAuditor();
  auditor.auditDatabase(process.cwd()).catch((error) => {
    console.error("❌ Database audit failed:", error.message);
    process.exit(1);
  });
}

module.exports = DatabasePerformanceAuditor;
