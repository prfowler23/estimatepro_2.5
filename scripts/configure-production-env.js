#!/usr/bin/env node

/**
 * Production Environment Configuration Script
 * Sets up environment variables for newly implemented EstimatePro features
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");

class ProductionEnvConfigurator {
  constructor() {
    this.envLocalPath = path.join(__dirname, "..", ".env.local");
    this.envExamplePath = path.join(__dirname, "..", ".env.example");
    this.currentConfig = {};
    this.newConfig = {};
    this.changes = [];

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  log(message, type = "info") {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: "🔧",
      success: "✅",
      warning: "⚠️",
      error: "❌",
      config: "⚙️",
    }[type];

    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async prompt(question, defaultValue = "") {
    return new Promise((resolve) => {
      const prompt = defaultValue
        ? `${question} (default: ${defaultValue}): `
        : `${question}: `;

      this.rl.question(prompt, (answer) => {
        resolve(answer.trim() || defaultValue);
      });
    });
  }

  loadCurrentConfig() {
    this.log("Loading current environment configuration...");

    if (fs.existsSync(this.envLocalPath)) {
      const envContent = fs.readFileSync(this.envLocalPath, "utf8");
      const lines = envContent.split("\n");

      for (const line of lines) {
        if (line.trim() && !line.startsWith("#")) {
          const [key, ...valueParts] = line.split("=");
          if (key && valueParts.length > 0) {
            this.currentConfig[key.trim()] = valueParts.join("=").trim();
          }
        }
      }

      this.log(
        `Loaded ${Object.keys(this.currentConfig).length} existing environment variables`,
        "success",
      );
    } else {
      this.log("No existing .env.local file found", "warning");
    }
  }

  async configureNewFeatureFlags() {
    this.log(
      "Configuring feature flags for newly implemented features...",
      "config",
    );

    const newFeatures = [
      {
        key: "NEXT_PUBLIC_ENABLE_AI_ASSISTANT",
        name: "AI Assistant",
        description: "Enable the AI-powered assistant feature",
        defaultValue: "true",
        production: "true",
      },
      {
        key: "NEXT_PUBLIC_ENABLE_VENDOR_MANAGEMENT",
        name: "Vendor Management System",
        description: "Enable vendor/supplier management functionality",
        defaultValue: "true",
        production: "true",
      },
      {
        key: "NEXT_PUBLIC_ENABLE_PILOT_CERTIFICATION",
        name: "Pilot Certification System",
        description: "Enable drone pilot certification tracking",
        defaultValue: "true",
        production: "true",
      },
      {
        key: "NEXT_PUBLIC_ENABLE_MONITORING",
        name: "Application Monitoring",
        description: "Enable Sentry error and performance monitoring",
        defaultValue: "true",
        production: "true",
      },
      {
        key: "NEXT_PUBLIC_ENABLE_COLLABORATION",
        name: "Real-time Collaboration",
        description: "Enable collaborative estimation features",
        defaultValue: "true",
        production: "true",
      },
      {
        key: "NEXT_PUBLIC_ENABLE_MOBILE_NAV",
        name: "Mobile Navigation",
        description: "Enable mobile-optimized bottom navigation",
        defaultValue: "true",
        production: "true",
      },
      {
        key: "NEXT_PUBLIC_ENABLE_ANALYTICS",
        name: "Enhanced Analytics",
        description: "Enable advanced analytics and reporting",
        defaultValue: "true",
        production: "true",
      },
    ];

    for (const feature of newFeatures) {
      const currentValue = this.currentConfig[feature.key];

      this.log(`\n📋 Feature: ${feature.name}`);
      this.log(`   Description: ${feature.description}`);

      if (currentValue) {
        this.log(`   Current value: ${currentValue}`);
        const keep = await this.prompt(
          `Keep current value for ${feature.key}?`,
          "y",
        );

        if (keep.toLowerCase() === "y" || keep.toLowerCase() === "yes") {
          this.newConfig[feature.key] = currentValue;
          continue;
        }
      }

      const value = await this.prompt(
        `Enable ${feature.name} in production?`,
        feature.production,
      );

      this.newConfig[feature.key] = value;

      if (currentValue !== value) {
        this.changes.push(
          `${feature.key}: ${currentValue || "unset"} → ${value}`,
        );
      }
    }
  }

  async configureSentryMonitoring() {
    this.log("\n🔍 Configuring Sentry Error Monitoring...", "config");

    const sentryVars = [
      {
        key: "SENTRY_DSN",
        name: "Sentry DSN",
        description: "Sentry Data Source Name for error tracking",
        required: false,
        sensitive: true,
      },
      {
        key: "NEXT_PUBLIC_SENTRY_DSN",
        name: "Public Sentry DSN",
        description: "Public Sentry DSN for client-side error tracking",
        required: false,
        sensitive: true,
      },
      {
        key: "SENTRY_ORG",
        name: "Sentry Organization",
        description: "Sentry organization identifier",
        required: false,
      },
      {
        key: "SENTRY_PROJECT",
        name: "Sentry Project",
        description: "Sentry project identifier",
        required: false,
      },
    ];

    for (const variable of sentryVars) {
      const currentValue = this.currentConfig[variable.key];

      if (currentValue && variable.sensitive) {
        this.log(`✓ ${variable.name} is already configured`);
        this.newConfig[variable.key] = currentValue;
        continue;
      }

      this.log(`\n📝 ${variable.name}`);
      this.log(`   ${variable.description}`);

      if (variable.required) {
        let value;
        do {
          value = await this.prompt(`Enter ${variable.name} (required)`);
        } while (!value.trim());
        this.newConfig[variable.key] = value;
      } else {
        const value = await this.prompt(
          `Enter ${variable.name} (optional, press enter to skip)`,
          currentValue || "",
        );

        if (value.trim()) {
          this.newConfig[variable.key] = value;
          if (currentValue !== value) {
            this.changes.push(
              `${variable.key}: ${currentValue ? "updated" : "new"}`,
            );
          }
        }
      }
    }
  }

  async configurePerformanceSettings() {
    this.log("\n⚡ Configuring Performance Settings...", "config");

    const performanceVars = [
      {
        key: "AI_CACHE_TTL",
        name: "AI Cache TTL",
        description: "AI response cache time-to-live in seconds",
        defaultValue: "3600",
      },
      {
        key: "AI_RATE_LIMIT_PER_MINUTE",
        name: "AI Rate Limit",
        description: "Maximum AI API calls per minute",
        defaultValue: "100",
      },
      {
        key: "CACHE_TTL",
        name: "General Cache TTL",
        description: "General cache time-to-live in seconds",
        defaultValue: "1800",
      },
      {
        key: "DATABASE_MAX_CONNECTIONS",
        name: "Database Connection Pool Size",
        description: "Maximum database connections",
        defaultValue: "20",
      },
    ];

    for (const variable of performanceVars) {
      const currentValue = this.currentConfig[variable.key];

      this.log(`\n📊 ${variable.name}: ${variable.description}`);

      const value = await this.prompt(
        `Set ${variable.name}`,
        currentValue || variable.defaultValue,
      );

      this.newConfig[variable.key] = value;

      if (currentValue !== value) {
        this.changes.push(
          `${variable.key}: ${currentValue || "unset"} → ${value}`,
        );
      }
    }
  }

  async configureSecuritySettings() {
    this.log("\n🔒 Configuring Security Settings...", "config");

    const securityVars = [
      {
        key: "RATE_LIMIT_ENABLED",
        name: "Rate Limiting",
        description: "Enable API rate limiting",
        defaultValue: "true",
      },
      {
        key: "CSRF_PROTECTION_ENABLED",
        name: "CSRF Protection",
        description: "Enable CSRF protection",
        defaultValue: "true",
      },
      {
        key: "SECURE_HEADERS_ENABLED",
        name: "Security Headers",
        description: "Enable security headers",
        defaultValue: "true",
      },
      {
        key: "NEXT_PUBLIC_DEBUG",
        name: "Debug Mode",
        description: "Enable debug mode (should be false in production)",
        defaultValue: "false",
        production: "false",
      },
    ];

    for (const variable of securityVars) {
      const currentValue = this.currentConfig[variable.key];

      this.log(`\n🛡️ ${variable.name}: ${variable.description}`);

      const value = await this.prompt(
        `Configure ${variable.name}`,
        currentValue || variable.production || variable.defaultValue,
      );

      this.newConfig[variable.key] = value;

      if (currentValue !== value) {
        this.changes.push(
          `${variable.key}: ${currentValue || "unset"} → ${value}`,
        );
      }
    }
  }

  generateEnvFile() {
    this.log("\nGenerating .env.local file...", "config");

    // Merge current config with new config
    const finalConfig = { ...this.currentConfig, ...this.newConfig };

    // Generate file content with organized sections
    let envContent = `# EstimatePro Production Environment Configuration
# Generated on ${new Date().toISOString()}
# WARNING: This file contains sensitive information - never commit to version control

# ===== CORE SERVICES =====
# Supabase Configuration
${this.formatEnvVar(finalConfig, "NEXT_PUBLIC_SUPABASE_URL")}
${this.formatEnvVar(finalConfig, "NEXT_PUBLIC_SUPABASE_ANON_KEY")}
${this.formatEnvVar(finalConfig, "SUPABASE_SERVICE_ROLE_KEY")}

# OpenAI Configuration  
${this.formatEnvVar(finalConfig, "OPENAI_API_KEY")}

# Email Configuration
${this.formatEnvVar(finalConfig, "RESEND_API_KEY")}
${this.formatEnvVar(finalConfig, "EMAIL_FROM")}

# Application Configuration
${this.formatEnvVar(finalConfig, "NEXT_PUBLIC_APP_URL")}
${this.formatEnvVar(finalConfig, "NEXT_PUBLIC_APP_NAME")}
${this.formatEnvVar(finalConfig, "NEXT_PUBLIC_APP_VERSION")}

# ===== FEATURE FLAGS =====
# Core Features
${this.formatEnvVar(finalConfig, "NEXT_PUBLIC_ENABLE_AI")}
${this.formatEnvVar(finalConfig, "NEXT_PUBLIC_ENABLE_3D")}
${this.formatEnvVar(finalConfig, "NEXT_PUBLIC_ENABLE_DRONE")}
${this.formatEnvVar(finalConfig, "NEXT_PUBLIC_ENABLE_WEATHER")}
${this.formatEnvVar(finalConfig, "NEXT_PUBLIC_ENABLE_GUIDED_FLOW")}

# Newly Implemented Features
${this.formatEnvVar(finalConfig, "NEXT_PUBLIC_ENABLE_AI_ASSISTANT")}
${this.formatEnvVar(finalConfig, "NEXT_PUBLIC_ENABLE_VENDOR_MANAGEMENT")}
${this.formatEnvVar(finalConfig, "NEXT_PUBLIC_ENABLE_PILOT_CERTIFICATION")}
${this.formatEnvVar(finalConfig, "NEXT_PUBLIC_ENABLE_MONITORING")}
${this.formatEnvVar(finalConfig, "NEXT_PUBLIC_ENABLE_COLLABORATION")}
${this.formatEnvVar(finalConfig, "NEXT_PUBLIC_ENABLE_MOBILE_NAV")}
${this.formatEnvVar(finalConfig, "NEXT_PUBLIC_ENABLE_ANALYTICS")}

# ===== MONITORING & LOGGING =====
# Sentry Configuration
${this.formatEnvVar(finalConfig, "SENTRY_DSN")}
${this.formatEnvVar(finalConfig, "NEXT_PUBLIC_SENTRY_DSN")}
${this.formatEnvVar(finalConfig, "SENTRY_ORG")}
${this.formatEnvVar(finalConfig, "SENTRY_PROJECT")}

# ===== PERFORMANCE SETTINGS =====
${this.formatEnvVar(finalConfig, "AI_CACHE_TTL")}
${this.formatEnvVar(finalConfig, "AI_RATE_LIMIT_PER_MINUTE")}
${this.formatEnvVar(finalConfig, "CACHE_TTL")}
${this.formatEnvVar(finalConfig, "DATABASE_MAX_CONNECTIONS")}

# ===== SECURITY SETTINGS =====
${this.formatEnvVar(finalConfig, "RATE_LIMIT_ENABLED")}
${this.formatEnvVar(finalConfig, "CSRF_PROTECTION_ENABLED")}
${this.formatEnvVar(finalConfig, "SECURE_HEADERS_ENABLED")}
${this.formatEnvVar(finalConfig, "NEXT_PUBLIC_DEBUG")}

# Environment
NODE_ENV=production
`;

    return envContent;
  }

  formatEnvVar(config, key) {
    const value = config[key];
    if (value === undefined || value === null) {
      return `# ${key}=`;
    }
    return `${key}=${value}`;
  }

  async saveConfiguration() {
    this.log("\n💾 Saving configuration...");

    const envContent = this.generateEnvFile();

    // Create backup of existing file
    if (fs.existsSync(this.envLocalPath)) {
      const backupPath = `${this.envLocalPath}.backup.${Date.now()}`;
      fs.copyFileSync(this.envLocalPath, backupPath);
      this.log(`Backup created: ${backupPath}`, "success");
    }

    // Write new configuration
    fs.writeFileSync(this.envLocalPath, envContent);
    this.log(`Configuration saved to ${this.envLocalPath}`, "success");

    // Update .env.example if needed
    await this.updateEnvExample(envContent);
  }

  async updateEnvExample(envContent) {
    this.log("Updating .env.example file...");

    // Create sanitized version for .env.example
    const exampleContent = envContent
      .split("\n")
      .map((line) => {
        if (line.includes("=") && !line.startsWith("#")) {
          const [key] = line.split("=");
          return `${key}=your_${key.toLowerCase().replace(/next_public_|_/g, "_")}`;
        }
        return line;
      })
      .join("\n");

    fs.writeFileSync(this.envExamplePath, exampleContent);
    this.log(".env.example updated", "success");
  }

  generateSummaryReport() {
    this.log("\n" + "=".repeat(60));
    this.log("PRODUCTION ENVIRONMENT CONFIGURATION REPORT", "success");
    this.log("=".repeat(60));

    if (this.changes.length > 0) {
      this.log("Changes made:", "config");
      this.changes.forEach((change) => this.log(`  ✓ ${change}`, "success"));
    } else {
      this.log("No changes made - all configuration was up to date", "info");
    }

    this.log("\n📋 Next steps:");
    this.log("  1. Review the generated .env.local file");
    this.log("  2. Ensure all sensitive values are properly set");
    this.log("  3. Test the application with new configuration");
    this.log("  4. Deploy to production environment");
    this.log("  5. Monitor application logs for any issues");

    this.log("\n⚠️  Security reminders:");
    this.log("  • Never commit .env.local to version control");
    this.log("  • Store sensitive keys in secure environment");
    this.log("  • Regularly rotate API keys and tokens");
    this.log("  • Monitor for any exposed credentials");
  }

  async configure() {
    try {
      this.log("Starting production environment configuration...");
      this.log("=".repeat(60));

      // Load current configuration
      this.loadCurrentConfig();

      // Configure each section
      await this.configureNewFeatureFlags();
      await this.configureSentryMonitoring();
      await this.configurePerformanceSettings();
      await this.configureSecuritySettings();

      // Save configuration
      await this.saveConfiguration();

      // Generate report
      this.generateSummaryReport();

      this.log(
        "\n🎉 Production environment configuration completed!",
        "success",
      );
    } catch (error) {
      this.log(`Configuration failed: ${error.message}`, "error");
      process.exit(1);
    } finally {
      this.rl.close();
    }
  }
}

// CLI execution
if (require.main === module) {
  const configurator = new ProductionEnvConfigurator();

  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
EstimatePro Production Environment Configurator

Usage:
  node configure-production-env.js [options]

Options:
  --help, -h     Show this help message
  --auto         Use default values for all settings
  
Features Configured:
  • AI Assistant integration
  • Vendor management system
  • Pilot certification system  
  • Real-time collaboration
  • Enhanced monitoring and analytics
  • Security and performance settings
  
The script will:
  1. Load existing configuration
  2. Prompt for new feature settings
  3. Configure monitoring and security
  4. Generate production-ready .env.local
  5. Create backup of existing configuration
    `);
    process.exit(0);
  }

  if (args.includes("--auto")) {
    console.log("🤖 AUTO MODE - Using default production values");
    // TODO: Implement auto configuration mode
    process.exit(0);
  }

  configurator.configure().catch((error) => {
    console.error("Unexpected configuration error:", error);
    process.exit(1);
  });
}

module.exports = ProductionEnvConfigurator;
