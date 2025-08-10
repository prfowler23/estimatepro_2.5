#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { promisify } = require("util");

const readFile = promisify(fs.readFile);

/**
 * EstimatePro Migration Readiness Assessment
 *
 * Evaluates migration readiness across multiple dimensions:
 * - Next.js 15 compatibility and App Router readiness
 * - TypeScript strict mode compliance
 * - Modern dependency compatibility
 * - React 18+ features and patterns
 * - Database schema migration requirements
 * - Infrastructure modernization opportunities
 *
 * Generates migration plan with risk assessment and timelines.
 */
class MigrationReadinessAssessment {
  constructor() {
    this.migrationAreas = {
      nextjs: { ready: false, issues: [], opportunities: [] },
      typescript: { ready: false, issues: [], opportunities: [] },
      react: { ready: false, issues: [], opportunities: [] },
      dependencies: { ready: false, issues: [], opportunities: [] },
      database: { ready: false, issues: [], opportunities: [] },
      infrastructure: { ready: false, issues: [], opportunities: [] },
    };
    this.fileAnalysis = new Map();
    this.packageInfo = null;
    this.tsconfigInfo = null;
  }

  async assessMigrationReadiness(rootDir) {
    console.log("🚀 Starting Migration Readiness Assessment...\n");

    try {
      // Phase 1: Analyze current project configuration
      await this.analyzeProjectConfiguration(rootDir);

      // Phase 2: Assess Next.js readiness
      await this.assessNextJsReadiness(rootDir);

      // Phase 3: Evaluate TypeScript modernization
      await this.assessTypeScriptReadiness(rootDir);

      // Phase 4: Check React patterns and compatibility
      await this.assessReactReadiness(rootDir);

      // Phase 5: Analyze dependency compatibility
      await this.assessDependencyCompatibility(rootDir);

      // Phase 6: Database migration assessment
      await this.assessDatabaseMigration(rootDir);

      // Phase 7: Infrastructure modernization evaluation
      await this.assessInfrastructureModernization(rootDir);

      // Phase 8: Generate migration plan and timeline
      this.generateMigrationPlan();

      console.log("✅ Migration readiness assessment completed successfully!");
    } catch (error) {
      console.error("❌ Migration assessment failed:", error.message);
      throw error;
    }
  }

  async analyzeProjectConfiguration(rootDir) {
    console.log("📋 Analyzing project configuration...");

    try {
      // Load package.json
      const packagePath = path.join(rootDir, "package.json");
      if (fs.existsSync(packagePath)) {
        this.packageInfo = JSON.parse(await readFile(packagePath, "utf8"));
      }

      // Load tsconfig.json
      const tsconfigPath = path.join(rootDir, "tsconfig.json");
      if (fs.existsSync(tsconfigPath)) {
        this.tsconfigInfo = JSON.parse(await readFile(tsconfigPath, "utf8"));
      }

      console.log("    ✓ Project configuration loaded");
    } catch (error) {
      console.error("    ❌ Error analyzing configuration:", error.message);
    }
  }

  async assessNextJsReadiness(rootDir) {
    console.log("⚛️  Assessing Next.js 15 readiness...");

    const assessment = this.migrationAreas.nextjs;
    let readinessScore = 0;

    // Check current Next.js version
    const nextVersion =
      this.packageInfo?.dependencies?.next ||
      this.packageInfo?.devDependencies?.next;
    if (nextVersion) {
      const majorVersion = parseInt(
        nextVersion.replace(/[^\d.]/g, "").split(".")[0],
      );

      if (majorVersion >= 15) {
        assessment.opportunities.push("Already on Next.js 15 or higher");
        readinessScore += 30;
      } else if (majorVersion >= 13) {
        assessment.opportunities.push("On Next.js 13+ with App Router support");
        readinessScore += 20;
      } else {
        assessment.issues.push(
          `Legacy Next.js version ${nextVersion} - requires major upgrade`,
        );
      }
    } else {
      assessment.issues.push("Next.js dependency not found");
    }

    // Check for App Router usage
    const appDirPath = path.join(rootDir, "app");
    if (fs.existsSync(appDirPath)) {
      assessment.opportunities.push("Already using App Router architecture");
      readinessScore += 25;

      // Analyze App Router structure
      const appFiles = await this.getTypeScriptFiles(appDirPath);
      let appRouterCompliance = 0;

      for (const file of appFiles.slice(0, 10)) {
        try {
          const content = await readFile(file, "utf8");

          // Check for modern App Router patterns
          if (
            /export default function|export default async function/.test(
              content,
            )
          ) {
            appRouterCompliance++;
          }

          // Check for legacy patterns that need updating
          if (
            /getServerSideProps|getStaticProps|getInitialProps/.test(content)
          ) {
            assessment.issues.push(
              `Legacy data fetching in ${path.relative(rootDir, file)}`,
            );
          }

          // Check for proper metadata API usage
          if (
            /metadata\s*:/i.test(content) ||
            /generateMetadata/.test(content)
          ) {
            assessment.opportunities.push("Using modern metadata API");
          }
        } catch (error) {
          console.warn(`      ⚠️  Error analyzing ${file}: ${error.message}`);
        }
      }

      if (appRouterCompliance > appFiles.length * 0.8) {
        assessment.opportunities.push("High App Router compliance rate");
        readinessScore += 15;
      }
    } else {
      assessment.issues.push("Not using App Router - major migration required");

      // Check for Pages Router
      const pagesDirPath = path.join(rootDir, "pages");
      if (fs.existsSync(pagesDirPath)) {
        assessment.issues.push("Using legacy Pages Router");
      }
    }

    // Check for modern Next.js features
    if (this.packageInfo?.dependencies?.["@next/font"]) {
      assessment.opportunities.push("Using Next.js Font optimization");
      readinessScore += 5;
    }

    if (this.packageInfo?.dependencies?.["next/image"]) {
      assessment.opportunities.push("Using Next.js Image optimization");
      readinessScore += 5;
    }

    // Check for configuration modernization needs
    const nextConfigPath = path.join(rootDir, "next.config.js");
    if (fs.existsSync(nextConfigPath)) {
      try {
        const configContent = await readFile(nextConfigPath, "utf8");

        if (/experimental/.test(configContent)) {
          assessment.issues.push(
            "Using experimental features - may need updating",
          );
        }

        if (/webpack/.test(configContent)) {
          assessment.issues.push(
            "Custom webpack configuration - review compatibility",
          );
        }
      } catch (error) {
        console.warn(
          `      ⚠️  Error analyzing next.config.js: ${error.message}`,
        );
      }
    }

    assessment.ready = readinessScore >= 60;
    console.log(
      `    📊 Next.js readiness score: ${readinessScore}/100 - ${assessment.ready ? "✅ Ready" : "⚠️  Needs work"}`,
    );
  }

  async assessTypeScriptReadiness(rootDir) {
    console.log("🔷 Assessing TypeScript modernization readiness...");

    const assessment = this.migrationAreas.typescript;
    let readinessScore = 0;

    // Check TypeScript version
    const tsVersion =
      this.packageInfo?.devDependencies?.typescript ||
      this.packageInfo?.dependencies?.typescript;
    if (tsVersion) {
      const majorVersion = parseInt(
        tsVersion.replace(/[^\d.]/g, "").split(".")[0],
      );

      if (majorVersion >= 5) {
        assessment.opportunities.push("Using modern TypeScript 5.x");
        readinessScore += 20;
      } else if (majorVersion >= 4) {
        assessment.opportunities.push(
          "Using TypeScript 4.x - upgrade available",
        );
        readinessScore += 15;
      } else {
        assessment.issues.push(`Legacy TypeScript version ${tsVersion}`);
      }
    }

    // Analyze tsconfig.json
    if (this.tsconfigInfo) {
      const compilerOptions = this.tsconfigInfo.compilerOptions || {};

      // Check strict mode
      if (compilerOptions.strict === true) {
        assessment.opportunities.push("TypeScript strict mode enabled");
        readinessScore += 20;
      } else {
        assessment.issues.push("TypeScript strict mode not enabled");

        // Check individual strict options
        const strictChecks = [
          "noImplicitAny",
          "strictNullChecks",
          "strictFunctionTypes",
          "strictBindCallApply",
          "noImplicitReturns",
          "noImplicitThis",
        ];

        const enabledStrictChecks = strictChecks.filter(
          (check) => compilerOptions[check] === true,
        );
        if (enabledStrictChecks.length > 3) {
          assessment.opportunities.push("Partial strict mode compliance");
          readinessScore += 10;
        }
      }

      // Check modern features
      if (
        compilerOptions.target === "ES2020" ||
        compilerOptions.target === "ES2022"
      ) {
        assessment.opportunities.push("Using modern ES target");
        readinessScore += 10;
      } else {
        assessment.issues.push(
          `Legacy compilation target: ${compilerOptions.target || "not specified"}`,
        );
      }

      // Check module system
      if (
        compilerOptions.module === "ESNext" ||
        compilerOptions.module === "ES2022"
      ) {
        assessment.opportunities.push("Using modern module system");
        readinessScore += 5;
      }
    } else {
      assessment.issues.push("No tsconfig.json found");
    }

    // Analyze type usage in codebase
    const typeScriptFiles = await this.getTypeScriptFiles(rootDir);
    let typedFilesCount = 0;
    let anyUsageCount = 0;

    for (const file of typeScriptFiles.slice(0, 50)) {
      // Sample first 50 files
      try {
        const content = await readFile(file, "utf8");

        // Check for proper typing
        if (/:\s*\w+[\w\[\]<>|&\s]*[^=]/.test(content)) {
          typedFilesCount++;
        }

        // Count any usage
        const anyMatches = content.match(/:\s*any\b/g);
        if (anyMatches) {
          anyUsageCount += anyMatches.length;
        }
      } catch (error) {
        console.warn(`      ⚠️  Error analyzing ${file}: ${error.message}`);
      }
    }

    const typedFilesRatio =
      typedFilesCount / Math.min(typeScriptFiles.length, 50);
    if (typedFilesRatio > 0.8) {
      assessment.opportunities.push("High TypeScript adoption rate");
      readinessScore += 15;
    } else if (typedFilesRatio > 0.5) {
      assessment.opportunities.push("Moderate TypeScript usage");
      readinessScore += 10;
    } else {
      assessment.issues.push("Low TypeScript adoption in codebase");
    }

    if (anyUsageCount > 50) {
      assessment.issues.push(
        `High 'any' usage (${anyUsageCount} instances) - needs type safety improvement`,
      );
    } else if (anyUsageCount > 10) {
      assessment.issues.push(
        `Moderate 'any' usage (${anyUsageCount} instances)`,
      );
    } else {
      assessment.opportunities.push("Minimal 'any' usage - good type safety");
      readinessScore += 10;
    }

    assessment.ready = readinessScore >= 60;
    console.log(
      `    📊 TypeScript readiness score: ${readinessScore}/100 - ${assessment.ready ? "✅ Ready" : "⚠️  Needs work"}`,
    );
  }

  async assessReactReadiness(rootDir) {
    console.log("⚛️  Assessing React patterns and compatibility...");

    const assessment = this.migrationAreas.react;
    let readinessScore = 0;

    // Check React version
    const reactVersion = this.packageInfo?.dependencies?.react;
    if (reactVersion) {
      const majorVersion = parseInt(
        reactVersion.replace(/[^\d.]/g, "").split(".")[0],
      );

      if (majorVersion >= 18) {
        assessment.opportunities.push("Using React 18+ with modern features");
        readinessScore += 25;
      } else if (majorVersion >= 17) {
        assessment.opportunities.push(
          "Using React 17 - upgrade to 18 available",
        );
        readinessScore += 20;
      } else {
        assessment.issues.push(
          `Legacy React version ${reactVersion} - needs upgrade`,
        );
      }
    }

    // Analyze React component patterns
    const componentDirs = ["components", "app", "pages"];
    let modernPatternCount = 0;
    let legacyPatternCount = 0;
    let totalComponents = 0;

    for (const dir of componentDirs) {
      const dirPath = path.join(rootDir, dir);
      if (fs.existsSync(dirPath)) {
        const files = await this.getTypeScriptFiles(dirPath);

        for (const file of files.slice(0, 30)) {
          try {
            const content = await readFile(file, "utf8");
            totalComponents++;

            // Modern patterns
            if (/const\s+\w+\s*=\s*\([^)]*\)\s*=>/i.test(content)) {
              modernPatternCount++;
            }

            if (/useState|useEffect|useCallback|useMemo/i.test(content)) {
              modernPatternCount++;
            }

            if (/forwardRef|memo\(/i.test(content)) {
              modernPatternCount++;
            }

            // Legacy patterns
            if (/class\s+\w+\s+extends\s+.*Component/i.test(content)) {
              legacyPatternCount++;
            }

            if (
              /componentDidMount|componentWillMount|componentWillReceiveProps/i.test(
                content,
              )
            ) {
              legacyPatternCount++;
            }
          } catch (error) {
            console.warn(`      ⚠️  Error analyzing ${file}: ${error.message}`);
          }
        }
      }
    }

    const modernRatio = modernPatternCount / Math.max(totalComponents, 1);
    if (modernRatio > 0.8) {
      assessment.opportunities.push("High adoption of modern React patterns");
      readinessScore += 20;
    } else if (modernRatio > 0.5) {
      assessment.opportunities.push("Moderate use of modern React patterns");
      readinessScore += 15;
    } else {
      assessment.issues.push("Low adoption of modern React patterns");
    }

    if (legacyPatternCount > totalComponents * 0.2) {
      assessment.issues.push(
        `${legacyPatternCount} legacy class components need conversion`,
      );
    } else {
      assessment.opportunities.push("Minimal legacy React patterns");
      readinessScore += 10;
    }

    // Check for React 18+ features
    const sampleFile = path.join(rootDir, "app", "layout.tsx");
    if (fs.existsSync(sampleFile)) {
      try {
        const content = await readFile(sampleFile, "utf8");

        if (/createRoot|hydrateRoot/i.test(content)) {
          assessment.opportunities.push("Using React 18 root APIs");
          readinessScore += 10;
        }

        if (/Suspense/i.test(content)) {
          assessment.opportunities.push("Using React Suspense");
          readinessScore += 5;
        }
      } catch (error) {
        // Silent fail for optional analysis
      }
    }

    // Check for state management modernization
    const stateManagementDeps = [
      "zustand",
      "@reduxjs/toolkit",
      "jotai",
      "valtio",
    ];
    const hasModernStateManagement = stateManagementDeps.some(
      (dep) =>
        this.packageInfo?.dependencies?.[dep] ||
        this.packageInfo?.devDependencies?.[dep],
    );

    if (hasModernStateManagement) {
      assessment.opportunities.push("Using modern state management");
      readinessScore += 10;
    } else if (
      this.packageInfo?.dependencies?.redux &&
      !this.packageInfo?.dependencies?.["@reduxjs/toolkit"]
    ) {
      assessment.issues.push("Using legacy Redux - consider Redux Toolkit");
    }

    assessment.ready = readinessScore >= 60;
    console.log(
      `    📊 React readiness score: ${readinessScore}/100 - ${assessment.ready ? "✅ Ready" : "⚠️  Needs work"}`,
    );
  }

  async assessDependencyCompatibility(rootDir) {
    console.log("📦 Assessing dependency compatibility...");

    const assessment = this.migrationAreas.dependencies;
    let readinessScore = 0;

    if (!this.packageInfo) {
      assessment.issues.push("No package.json found");
      assessment.ready = false;
      return;
    }

    const dependencies = {
      ...this.packageInfo.dependencies,
      ...this.packageInfo.devDependencies,
    };

    // Define modern dependency targets
    const modernDependencies = {
      tailwindcss: "^3.0.0",
      "@types/react": "^18.0.0",
      "@types/node": "^18.0.0",
      eslint: "^8.0.0",
      typescript: "^5.0.0",
      "framer-motion": "^10.0.0",
      "@radix-ui/react-dialog": "^1.0.0",
    };

    // Check for outdated dependencies
    let upToDateCount = 0;
    let outdatedCount = 0;
    let securityRiskCount = 0;

    const dependencyChecks = [
      // Critical dependencies
      { name: "react", minVersion: "18.0.0", current: dependencies.react },
      { name: "next", minVersion: "13.0.0", current: dependencies.next },
      {
        name: "typescript",
        minVersion: "4.5.0",
        current: dependencies.typescript,
      },

      // UI/Styling
      {
        name: "tailwindcss",
        minVersion: "3.0.0",
        current: dependencies.tailwindcss,
      },
      {
        name: "framer-motion",
        minVersion: "8.0.0",
        current: dependencies["framer-motion"],
      },

      // Development tools
      { name: "eslint", minVersion: "8.0.0", current: dependencies.eslint },
      {
        name: "@types/react",
        minVersion: "18.0.0",
        current: dependencies["@types/react"],
      },
    ];

    for (const dep of dependencyChecks) {
      if (dep.current) {
        const currentMajor = parseInt(
          dep.current.replace(/[^\d.]/g, "").split(".")[0],
        );
        const minMajor = parseInt(dep.minVersion.split(".")[0]);

        if (currentMajor >= minMajor) {
          upToDateCount++;
          assessment.opportunities.push(`${dep.name} is up-to-date`);
        } else {
          outdatedCount++;
          assessment.issues.push(
            `${dep.name} v${dep.current} - recommend upgrading to v${dep.minVersion}+`,
          );
        }
      } else {
        assessment.issues.push(`Missing dependency: ${dep.name}`);
      }
    }

    // Check for known security vulnerabilities
    const potentiallyVulnerableDeps = [
      "node-sass", // deprecated in favor of sass
      "request", // deprecated
      "babel-core", // should be @babel/core
    ];

    for (const dep of potentiallyVulnerableDeps) {
      if (dependencies[dep]) {
        securityRiskCount++;
        assessment.issues.push(`Deprecated/vulnerable dependency: ${dep}`);
      }
    }

    // Calculate readiness score
    const totalChecked = dependencyChecks.length;
    const upToDateRatio = upToDateCount / totalChecked;

    if (upToDateRatio > 0.8) {
      readinessScore += 40;
    } else if (upToDateRatio > 0.6) {
      readinessScore += 30;
    } else {
      readinessScore += 20;
    }

    if (securityRiskCount === 0) {
      assessment.opportunities.push("No known security vulnerabilities");
      readinessScore += 20;
    } else {
      assessment.issues.push(
        `${securityRiskCount} security vulnerabilities found`,
      );
    }

    // Check for modern development tools
    const modernDevTools = [
      "prettier",
      "@typescript-eslint/parser",
      "husky",
      "lint-staged",
    ];
    const hasModernDevTools = modernDevTools.filter(
      (tool) => dependencies[tool],
    ).length;

    if (hasModernDevTools > 2) {
      assessment.opportunities.push("Good modern development tooling");
      readinessScore += 15;
    }

    // Check dependency count (bundle size consideration)
    const totalDeps = Object.keys(dependencies).length;
    if (totalDeps > 150) {
      assessment.issues.push(
        `High dependency count (${totalDeps}) - consider pruning`,
      );
    } else {
      assessment.opportunities.push("Reasonable dependency count");
      readinessScore += 10;
    }

    assessment.ready = readinessScore >= 60;
    console.log(
      `    📊 Dependency readiness score: ${readinessScore}/100 - ${assessment.ready ? "✅ Ready" : "⚠️  Needs work"}`,
    );
    console.log(
      `    📈 Dependencies: ${upToDateCount} up-to-date, ${outdatedCount} outdated, ${securityRiskCount} security risks`,
    );
  }

  async assessDatabaseMigration(rootDir) {
    console.log("🗄️  Assessing database migration readiness...");

    const assessment = this.migrationAreas.database;
    let readinessScore = 0;

    // Check for database configuration
    const supabaseConfigPaths = [
      "lib/supabase/client.ts",
      "lib/supabase/server.ts",
      "lib/supabase/admin.ts",
    ];

    let supabaseConfigCount = 0;
    for (const configPath of supabaseConfigPaths) {
      if (fs.existsSync(path.join(rootDir, configPath))) {
        supabaseConfigCount++;
      }
    }

    if (supabaseConfigCount >= 2) {
      assessment.opportunities.push("Modern Supabase configuration detected");
      readinessScore += 20;
    } else if (supabaseConfigCount > 0) {
      assessment.issues.push(
        "Partial Supabase configuration - needs completion",
      );
    } else {
      assessment.issues.push("No Supabase configuration found");
    }

    // Check for migration scripts
    const migrationDirs = [
      "migrations",
      "supabase/migrations",
      "sql/migrations",
    ];
    let hasMigrations = false;

    for (const migrationDir of migrationDirs) {
      const dirPath = path.join(rootDir, migrationDir);
      if (fs.existsSync(dirPath)) {
        const migrationFiles = fs
          .readdirSync(dirPath)
          .filter((f) => f.endsWith(".sql"));
        if (migrationFiles.length > 0) {
          hasMigrations = true;
          assessment.opportunities.push(
            `${migrationFiles.length} migration files found`,
          );
          readinessScore += 15;
          break;
        }
      }
    }

    if (!hasMigrations) {
      assessment.issues.push("No database migration files found");
    }

    // Check for RLS (Row Level Security) usage
    const serviceFiles = await this.getTypeScriptFiles(
      path.join(rootDir, "lib/services"),
    );
    let rlsUsageCount = 0;

    for (const file of serviceFiles.slice(0, 20)) {
      try {
        const content = await readFile(file, "utf8");

        if (/\.rls\(\)|RLS|row.*level.*security/i.test(content)) {
          rlsUsageCount++;
        }
      } catch (error) {
        console.warn(`      ⚠️  Error analyzing ${file}: ${error.message}`);
      }
    }

    if (rlsUsageCount > 0) {
      assessment.opportunities.push("Row Level Security implementation found");
      readinessScore += 15;
    } else {
      assessment.issues.push("No RLS usage detected - security consideration");
    }

    // Check for database optimization patterns
    const hasConnectionPooling = fs.existsSync(
      path.join(rootDir, "lib/supabase/connection-pool.ts"),
    );
    if (hasConnectionPooling) {
      assessment.opportunities.push("Database connection pooling implemented");
      readinessScore += 10;
    } else {
      assessment.issues.push(
        "No connection pooling - performance consideration",
      );
    }

    // Check for type safety with database
    const hasGeneratedTypes =
      fs.existsSync(path.join(rootDir, "types/database.ts")) ||
      fs.existsSync(path.join(rootDir, "lib/database.types.ts"));

    if (hasGeneratedTypes) {
      assessment.opportunities.push("Database type definitions found");
      readinessScore += 15;
    } else {
      assessment.issues.push(
        "No database type definitions - type safety concern",
      );
    }

    // Check for transaction support
    let hasTransactionSupport = false;
    const transactionFiles = [
      "lib/utils/database-transactions.ts",
      "lib/services/transaction-service.ts",
    ];

    for (const txFile of transactionFiles) {
      if (fs.existsSync(path.join(rootDir, txFile))) {
        hasTransactionSupport = true;
        break;
      }
    }

    if (hasTransactionSupport) {
      assessment.opportunities.push("Transaction support implemented");
      readinessScore += 10;
    } else {
      assessment.issues.push("No transaction support - data consistency risk");
    }

    assessment.ready = readinessScore >= 60;
    console.log(
      `    📊 Database readiness score: ${readinessScore}/100 - ${assessment.ready ? "✅ Ready" : "⚠️  Needs work"}`,
    );
  }

  async assessInfrastructureModernization(rootDir) {
    console.log("🏗️  Assessing infrastructure modernization opportunities...");

    const assessment = this.migrationAreas.infrastructure;
    let readinessScore = 0;

    // Check for containerization
    const dockerFiles = ["Dockerfile", "docker-compose.yml", ".dockerignore"];
    const dockerFilesFound = dockerFiles.filter((file) =>
      fs.existsSync(path.join(rootDir, file)),
    ).length;

    if (dockerFilesFound >= 2) {
      assessment.opportunities.push("Docker containerization ready");
      readinessScore += 15;
    } else if (dockerFilesFound > 0) {
      assessment.issues.push("Partial Docker setup - needs completion");
    } else {
      assessment.issues.push("No containerization - deployment consideration");
    }

    // Check for CI/CD configuration
    const cicdPaths = [
      ".github/workflows",
      ".gitlab-ci.yml",
      "azure-pipelines.yml",
    ];
    let hasCICD = false;

    for (const cicdPath of cicdPaths) {
      if (fs.existsSync(path.join(rootDir, cicdPath))) {
        hasCICD = true;
        assessment.opportunities.push("CI/CD pipeline detected");
        readinessScore += 15;
        break;
      }
    }

    if (!hasCICD) {
      assessment.issues.push(
        "No CI/CD pipeline - deployment automation needed",
      );
    }

    // Check for monitoring and observability
    const monitoringIndicators = [
      "lib/monitoring",
      "lib/analytics",
      "components/monitoring",
    ];

    let monitoringScore = 0;
    for (const indicator of monitoringIndicators) {
      if (fs.existsSync(path.join(rootDir, indicator))) {
        monitoringScore++;
      }
    }

    if (monitoringScore >= 2) {
      assessment.opportunities.push("Monitoring infrastructure in place");
      readinessScore += 10;
    } else {
      assessment.issues.push(
        "Limited monitoring - observability needs improvement",
      );
    }

    // Check for environment configuration
    const envFiles = [".env.local", ".env.example", ".env.production"];
    const envFilesFound = envFiles.filter((file) =>
      fs.existsSync(path.join(rootDir, file)),
    ).length;

    if (envFilesFound >= 2) {
      assessment.opportunities.push(
        "Environment configuration well-structured",
      );
      readinessScore += 10;
    } else {
      assessment.issues.push("Environment configuration needs improvement");
    }

    // Check for security configurations
    const securityFiles = ["lib/security", "lib/validation", "middleware.ts"];

    let securityScore = 0;
    for (const secFile of securityFiles) {
      if (fs.existsSync(path.join(rootDir, secFile))) {
        securityScore++;
      }
    }

    if (securityScore >= 2) {
      assessment.opportunities.push("Security infrastructure implemented");
      readinessScore += 15;
    } else {
      assessment.issues.push("Security infrastructure needs strengthening");
    }

    // Check for performance optimization infrastructure
    const perfFiles = [
      "lib/performance",
      "lib/cache",
      "lib/utils/retry-logic.ts",
    ];

    let perfScore = 0;
    for (const perfFile of perfFiles) {
      if (fs.existsSync(path.join(rootDir, perfFile))) {
        perfScore++;
      }
    }

    if (perfScore >= 2) {
      assessment.opportunities.push(
        "Performance optimization infrastructure ready",
      );
      readinessScore += 10;
    } else {
      assessment.issues.push("Performance infrastructure needs development");
    }

    // Check for PWA capabilities
    const pwaFiles = ["public/manifest.json", "lib/pwa", "components/pwa"];

    const pwaFilesFound = pwaFiles.filter((file) =>
      fs.existsSync(path.join(rootDir, file)),
    ).length;

    if (pwaFilesFound >= 2) {
      assessment.opportunities.push("PWA infrastructure implemented");
      readinessScore += 10;
    } else {
      assessment.issues.push("PWA capabilities not fully implemented");
    }

    assessment.ready = readinessScore >= 60;
    console.log(
      `    📊 Infrastructure readiness score: ${readinessScore}/100 - ${assessment.ready ? "✅ Ready" : "⚠️  Needs work"}`,
    );
  }

  generateMigrationPlan() {
    console.log("📋 Generating comprehensive migration plan...");

    const migrationPlan = {
      timestamp: new Date().toISOString(),
      overallReadiness: this.calculateOverallReadiness(),
      migrationPhases: this.createMigrationPhases(),
      riskAssessment: this.assessMigrationRisks(),
      timeline: this.calculateMigrationTimeline(),
      resourceRequirements: this.calculateMigrationResources(),
      detailedAssessment: this.migrationAreas,
    };

    // Save JSON plan
    fs.writeFileSync(
      "migration-readiness-assessment.json",
      JSON.stringify(migrationPlan, null, 2),
    );

    // Generate markdown report
    this.generateMigrationReport(migrationPlan);

    console.log(
      "  📊 Migration plan saved to: migration-readiness-assessment.json",
    );
    console.log(
      "  📋 Migration report saved to: migration-readiness-assessment.md",
    );
  }

  calculateOverallReadiness() {
    const areas = Object.keys(this.migrationAreas);
    const readyCount = areas.filter(
      (area) => this.migrationAreas[area].ready,
    ).length;
    const readinessPercentage = (readyCount / areas.length) * 100;

    return {
      percentage: Math.round(readinessPercentage),
      readyAreas: readyCount,
      totalAreas: areas.length,
      status:
        readinessPercentage >= 80
          ? "Ready"
          : readinessPercentage >= 60
            ? "Mostly Ready"
            : readinessPercentage >= 40
              ? "Needs Work"
              : "Not Ready",
    };
  }

  createMigrationPhases() {
    return {
      phase1: {
        name: "Foundation Modernization (Weeks 1-3)",
        priority: "critical",
        tasks: [
          ...this.getHighPriorityIssues(),
          "Upgrade to Next.js 15 and React 18",
          "Enable TypeScript strict mode",
          "Update critical dependencies",
          "Implement database connection pooling",
        ],
        blockers: this.getCriticalBlockers(),
        estimatedWeeks: 3,
      },
      phase2: {
        name: "Architecture Modernization (Weeks 4-7)",
        priority: "high",
        tasks: [
          "Migrate to App Router fully",
          "Modernize React component patterns",
          "Implement comprehensive type safety",
          "Add infrastructure monitoring",
          "Set up CI/CD pipeline",
        ],
        dependencies: ["phase1"],
        estimatedWeeks: 4,
      },
      phase3: {
        name: "Advanced Features & Optimization (Weeks 8-10)",
        priority: "medium",
        tasks: [
          "Implement advanced React 18 features",
          "Add PWA enhancements",
          "Set up advanced monitoring",
          "Performance optimization integration",
          "Security hardening",
        ],
        dependencies: ["phase1", "phase2"],
        estimatedWeeks: 3,
      },
    };
  }

  getHighPriorityIssues() {
    const highPriority = [];

    for (const [area, assessment] of Object.entries(this.migrationAreas)) {
      const criticalIssues = assessment.issues.filter(
        (issue) =>
          issue.includes("Legacy") ||
          issue.includes("deprecated") ||
          issue.includes("security") ||
          issue.includes("strict mode"),
      );

      highPriority.push(...criticalIssues);
    }

    return highPriority.slice(0, 8); // Top 8 critical issues
  }

  getCriticalBlockers() {
    const blockers = [];

    if (!this.migrationAreas.nextjs.ready) {
      blockers.push("Next.js upgrade required");
    }

    if (!this.migrationAreas.typescript.ready) {
      blockers.push("TypeScript modernization required");
    }

    if (!this.migrationAreas.dependencies.ready) {
      blockers.push("Critical dependency updates required");
    }

    return blockers;
  }

  assessMigrationRisks() {
    return {
      technicalRisks: [
        {
          risk: "Breaking changes in Next.js 15 App Router migration",
          probability: "medium",
          impact: "high",
          mitigation: "Incremental migration with feature flags",
        },
        {
          risk: "TypeScript strict mode breaking existing code",
          probability: "high",
          impact: "medium",
          mitigation: "Gradual strict mode enablement with targeted fixes",
        },
        {
          risk: "Dependency conflicts during upgrades",
          probability: "medium",
          impact: "medium",
          mitigation: "Staged dependency updates with testing",
        },
      ],
      businessRisks: [
        {
          risk: "Feature development slowdown during migration",
          probability: "high",
          impact: "medium",
          mitigation:
            "Parallel development streams with dedicated migration team",
        },
      ],
    };
  }

  calculateMigrationTimeline() {
    const phases = this.createMigrationPhases();
    const totalWeeks = Object.values(phases).reduce(
      (sum, phase) => sum + phase.estimatedWeeks,
      0,
    );

    return {
      totalDuration: `${totalWeeks} weeks`,
      phases: Object.entries(phases).map(([key, phase]) => ({
        phase: key,
        name: phase.name,
        weeks: phase.estimatedWeeks,
        priority: phase.priority,
      })),
      milestones: [
        { week: 3, milestone: "Foundation modernization complete" },
        { week: 7, milestone: "Architecture modernization complete" },
        { week: 10, milestone: "Full modernization deployment" },
      ],
    };
  }

  calculateMigrationResources() {
    return {
      teamRequirements: {
        phase1: { developers: 2, specialists: ["Next.js", "TypeScript"] },
        phase2: {
          developers: 3,
          specialists: ["React", "Architecture", "Infrastructure"],
        },
        phase3: {
          developers: 2,
          specialists: ["Performance", "Security", "DevOps"],
        },
      },
      skillsNeeded: [
        "Next.js 15 App Router migration",
        "TypeScript strict mode implementation",
        "React 18 modern patterns",
        "Database migration strategies",
        "Infrastructure modernization",
      ],
      budgetEstimate: {
        development: "$25,000 - $45,000",
        infrastructure: "$500 - $1,500/month",
        tooling: "$200 - $800/month",
      },
    };
  }

  generateMigrationReport(plan) {
    const content = `# EstimatePro Migration Readiness Assessment

**Generated**: ${new Date().toLocaleString()}
**Overall Readiness**: ${plan.overallReadiness.percentage}% (${plan.overallReadiness.status})

## Executive Summary

Migration readiness assessment across ${plan.overallReadiness.totalAreas} key areas:
- **Ready Areas**: ${plan.overallReadiness.readyAreas}/${plan.overallReadiness.totalAreas}
- **Estimated Timeline**: ${plan.timeline.totalDuration}
- **Budget Estimate**: ${plan.resourceRequirements.budgetEstimate.development}

## Readiness Assessment by Area

${Object.entries(plan.detailedAssessment)
  .map(
    ([area, assessment]) => `
### ${area.charAt(0).toUpperCase() + area.slice(1)}
**Status**: ${assessment.ready ? "✅ Ready" : "⚠️  Needs Work"}

#### Opportunities
${assessment.opportunities.map((opp) => `- ${opp}`).join("\\n")}

#### Issues to Address
${assessment.issues.map((issue) => `- ${issue}`).join("\\n")}
`,
  )
  .join("\\n")}

## Migration Phases

${Object.entries(plan.migrationPhases)
  .map(
    ([phaseKey, phase]) => `
### ${phase.name}
**Duration**: ${phase.estimatedWeeks} weeks  
**Priority**: ${phase.priority}

#### Key Tasks
${phase.tasks.map((task) => `- ${task}`).join("\\n")}

${
  phase.blockers
    ? `#### Critical Blockers
${phase.blockers.map((blocker) => `- ${blocker}`).join("\\n")}`
    : ""
}

${
  phase.dependencies
    ? `#### Dependencies
${phase.dependencies.map((dep) => `- ${dep}`).join("\\n")}`
    : ""
}
`,
  )
  .join("\\n")}

## Risk Assessment

### Technical Risks
${plan.riskAssessment.technicalRisks
  .map(
    (risk) => `
#### ${risk.risk}
- **Probability**: ${risk.probability}
- **Impact**: ${risk.impact}
- **Mitigation**: ${risk.mitigation}
`,
  )
  .join("\\n")}

### Business Risks  
${plan.riskAssessment.businessRisks
  .map(
    (risk) => `
#### ${risk.risk}
- **Probability**: ${risk.probability}
- **Impact**: ${risk.impact}
- **Mitigation**: ${risk.mitigation}
`,
  )
  .join("\\n")}

## Resource Requirements

### Team Requirements
${Object.entries(plan.resourceRequirements.teamRequirements)
  .map(
    ([phase, req]) => `
#### ${phase.toUpperCase()}
- **Developers**: ${req.developers}
- **Specialists**: ${req.specialists.join(", ")}
`,
  )
  .join("\\n")}

### Skills Needed
${plan.resourceRequirements.skillsNeeded.map((skill) => `- ${skill}`).join("\\n")}

### Budget Estimates
- **Development**: ${plan.resourceRequirements.budgetEstimate.development}
- **Infrastructure**: ${plan.resourceRequirements.budgetEstimate.infrastructure}
- **Tooling**: ${plan.resourceRequirements.budgetEstimate.tooling}

## Timeline & Milestones

**Total Duration**: ${plan.timeline.totalDuration}

### Phase Schedule
${plan.timeline.phases.map((phase) => `- **${phase.name}**: ${phase.weeks} weeks (${phase.priority} priority)`).join("\\n")}

### Key Milestones
${plan.timeline.milestones.map((milestone) => `- **Week ${milestone.week}**: ${milestone.milestone}`).join("\\n")}

## Next Steps

1. **Immediate Actions (Week 1)**:
   - Address critical blockers
   - Set up migration branch/environment
   - Begin Next.js and TypeScript upgrades

2. **Short-term Goals (Weeks 2-4)**:
   - Complete foundation modernization
   - Begin App Router migration
   - Update critical dependencies

3. **Long-term Strategy (Weeks 5-10)**:
   - Complete architecture modernization
   - Add advanced features and optimizations
   - Implement comprehensive monitoring

## Conclusion

EstimatePro shows **${plan.overallReadiness.status.toLowerCase()}** migration readiness with ${plan.overallReadiness.percentage}% of areas prepared for modernization. The phased approach minimizes risk while maximizing benefit, with clear milestones and resource allocation.

**Key Success Factors**:
- Dedicated migration team to avoid feature development conflicts
- Incremental approach with feature flags and rollback capability
- Comprehensive testing at each phase
- Stakeholder communication and expectation management

---

*Migration readiness assessment generated by EstimatePro Architectural Assessment*
`;

    fs.writeFileSync("migration-readiness-assessment.md", content);
  }

  async getTypeScriptFiles(dir) {
    const files = [];

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (
          entry.isDirectory() &&
          !entry.name.startsWith(".") &&
          entry.name !== "node_modules"
        ) {
          files.push(...(await this.getTypeScriptFiles(fullPath)));
        } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.warn(`    ⚠️  Error reading directory ${dir}: ${error.message}`);
    }

    return files;
  }
}

// Run the migration readiness assessment
if (require.main === module) {
  const assessment = new MigrationReadinessAssessment();
  assessment.assessMigrationReadiness(process.cwd()).catch((error) => {
    console.error("❌ Migration readiness assessment failed:", error.message);
    process.exit(1);
  });
}

module.exports = MigrationReadinessAssessment;
