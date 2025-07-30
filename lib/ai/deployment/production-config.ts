/**
 * Production configuration for AI Assistant
 * Manages environment-specific settings and feature flags
 */

interface ProductionConfig {
  ai: {
    enabled: boolean;
    models: {
      primary: string[];
      fallback: string[];
    };
    features: {
      streaming: boolean;
      tools: boolean;
      contextMemory: boolean;
      advancedModels: boolean;
    };
    limits: {
      maxTokens: number;
      maxConversationLength: number;
      requestsPerMinute: number;
      requestsPerDay: number;
    };
    monitoring: {
      enabled: boolean;
      sampleRate: number;
      errorTracking: boolean;
      performanceTracking: boolean;
    };
    security: {
      contentFiltering: boolean;
      sensitiveDataMasking: boolean;
      auditLogging: boolean;
    };
  };
  deployment: {
    environment: "development" | "staging" | "production";
    region: string;
    cdn: {
      enabled: boolean;
      provider?: string;
    };
    scaling: {
      minInstances: number;
      maxInstances: number;
      targetCPU: number;
    };
  };
  features: {
    aiAssistant: boolean;
    facadeAnalysis: boolean;
    documentExtraction: boolean;
    competitiveIntelligence: boolean;
    riskAssessment: boolean;
    autoQuote: boolean;
  };
}

export class ProductionConfigManager {
  private static instance: ProductionConfigManager;
  private config: ProductionConfig;

  private constructor() {
    this.config = this.buildConfig();
  }

  static getInstance(): ProductionConfigManager {
    if (!ProductionConfigManager.instance) {
      ProductionConfigManager.instance = new ProductionConfigManager();
    }
    return ProductionConfigManager.instance;
  }

  private buildConfig(): ProductionConfig {
    const env = process.env.NODE_ENV || "development";
    const isProduction = env === "production";
    const isStaging = env === "staging";

    return {
      ai: {
        enabled: this.getEnvBoolean("AI_ENABLED", true),
        models: {
          primary: isProduction
            ? ["gpt-4-turbo-preview", "gpt-4"]
            : ["gpt-4-turbo-preview"],
          fallback: ["gpt-3.5-turbo-16k", "gpt-3.5-turbo"],
        },
        features: {
          streaming: this.getEnvBoolean("AI_STREAMING_ENABLED", true),
          tools: this.getEnvBoolean("AI_TOOLS_ENABLED", true),
          contextMemory: this.getEnvBoolean("AI_CONTEXT_MEMORY_ENABLED", true),
          advancedModels: this.getEnvBoolean(
            "AI_ADVANCED_MODELS_ENABLED",
            isProduction,
          ),
        },
        limits: {
          maxTokens: this.getEnvNumber(
            "AI_MAX_TOKENS",
            isProduction ? 2000 : 1000,
          ),
          maxConversationLength: this.getEnvNumber(
            "AI_MAX_CONVERSATION_LENGTH",
            100,
          ),
          requestsPerMinute: this.getEnvNumber(
            "AI_REQUESTS_PER_MINUTE",
            isProduction ? 60 : 30,
          ),
          requestsPerDay: this.getEnvNumber(
            "AI_REQUESTS_PER_DAY",
            isProduction ? 10000 : 1000,
          ),
        },
        monitoring: {
          enabled: this.getEnvBoolean("AI_MONITORING_ENABLED", isProduction),
          sampleRate: this.getEnvNumber(
            "AI_MONITORING_SAMPLE_RATE",
            isProduction ? 0.1 : 1.0,
          ),
          errorTracking: this.getEnvBoolean(
            "AI_ERROR_TRACKING_ENABLED",
            isProduction,
          ),
          performanceTracking: this.getEnvBoolean(
            "AI_PERFORMANCE_TRACKING_ENABLED",
            isProduction,
          ),
        },
        security: {
          contentFiltering: this.getEnvBoolean(
            "AI_CONTENT_FILTERING_ENABLED",
            true,
          ),
          sensitiveDataMasking: this.getEnvBoolean(
            "AI_SENSITIVE_DATA_MASKING_ENABLED",
            isProduction,
          ),
          auditLogging: this.getEnvBoolean(
            "AI_AUDIT_LOGGING_ENABLED",
            isProduction,
          ),
        },
      },
      deployment: {
        environment: env as "development" | "staging" | "production",
        region: process.env.VERCEL_REGION || "us-east-1",
        cdn: {
          enabled: this.getEnvBoolean("CDN_ENABLED", isProduction),
          provider: process.env.CDN_PROVIDER,
        },
        scaling: {
          minInstances: this.getEnvNumber(
            "MIN_INSTANCES",
            isProduction ? 2 : 1,
          ),
          maxInstances: this.getEnvNumber(
            "MAX_INSTANCES",
            isProduction ? 10 : 3,
          ),
          targetCPU: this.getEnvNumber("TARGET_CPU_PERCENT", 70),
        },
      },
      features: {
        aiAssistant: this.getEnvBoolean("FEATURE_AI_ASSISTANT", true),
        facadeAnalysis: this.getEnvBoolean("FEATURE_FACADE_ANALYSIS", true),
        documentExtraction: this.getEnvBoolean(
          "FEATURE_DOCUMENT_EXTRACTION",
          true,
        ),
        competitiveIntelligence: this.getEnvBoolean(
          "FEATURE_COMPETITIVE_INTELLIGENCE",
          isProduction,
        ),
        riskAssessment: this.getEnvBoolean(
          "FEATURE_RISK_ASSESSMENT",
          isProduction,
        ),
        autoQuote: this.getEnvBoolean("FEATURE_AUTO_QUOTE", isProduction),
      },
    };
  }

  private getEnvBoolean(key: string, defaultValue: boolean): boolean {
    const value = process.env[key];
    if (value === undefined) return defaultValue;
    return value.toLowerCase() === "true";
  }

  private getEnvNumber(key: string, defaultValue: number): number {
    const value = process.env[key];
    if (value === undefined) return defaultValue;
    const num = parseInt(value, 10);
    return isNaN(num) ? defaultValue : num;
  }

  getConfig(): ProductionConfig {
    return this.config;
  }

  isProduction(): boolean {
    return this.config.deployment.environment === "production";
  }

  isStaging(): boolean {
    return this.config.deployment.environment === "staging";
  }

  isDevelopment(): boolean {
    return this.config.deployment.environment === "development";
  }

  isFeatureEnabled(feature: keyof ProductionConfig["features"]): boolean {
    return this.config.features[feature];
  }

  getAIConfig() {
    return this.config.ai;
  }

  getDeploymentConfig() {
    return this.config.deployment;
  }

  /**
   * Validate configuration for production readiness
   */
  validateForProduction(): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required environment variables
    if (!process.env.OPENAI_API_KEY) {
      errors.push("OPENAI_API_KEY is required for production");
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      errors.push("NEXT_PUBLIC_SUPABASE_URL is required");
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      errors.push("NEXT_PUBLIC_SUPABASE_ANON_KEY is required");
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      errors.push("SUPABASE_SERVICE_ROLE_KEY is required");
    }

    // Validate AI configuration
    if (this.config.ai.limits.maxTokens > 4000) {
      warnings.push("AI max tokens is set very high, may increase costs");
    }

    if (this.config.ai.limits.requestsPerMinute > 100) {
      warnings.push(
        "AI requests per minute is very high, consider rate limiting",
      );
    }

    // Check security settings for production
    if (this.isProduction()) {
      if (!this.config.ai.security.contentFiltering) {
        errors.push("Content filtering must be enabled in production");
      }

      if (!this.config.ai.security.auditLogging) {
        warnings.push("Audit logging is recommended for production");
      }

      if (!this.config.ai.monitoring.enabled) {
        warnings.push("Monitoring should be enabled in production");
      }
    }

    // Check scaling configuration
    if (
      this.config.deployment.scaling.minInstances < 2 &&
      this.isProduction()
    ) {
      warnings.push("Consider at least 2 minimum instances for production");
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get environment-specific API endpoints
   */
  getAPIEndpoints() {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    return {
      ai: {
        assistant: `${baseUrl}/api/ai/assistant`,
        stream: `${baseUrl}/api/ai/assistant/stream`,
        tools: `${baseUrl}/api/ai/tools`,
        facadeAnalysis: `${baseUrl}/api/ai/facade-analysis`,
        documentExtraction: `${baseUrl}/api/ai/extract-documents`,
      },
      monitoring: {
        health: `${baseUrl}/api/health`,
        metrics: `${baseUrl}/api/metrics`,
      },
    };
  }

  /**
   * Export configuration for debugging (masks sensitive values)
   */
  exportConfig() {
    const config = JSON.parse(JSON.stringify(this.config));

    // Mask sensitive information
    const maskSensitive = (obj: any, path: string = "") => {
      for (const key in obj) {
        const fullPath = path ? `${path}.${key}` : key;
        if (typeof obj[key] === "object" && obj[key] !== null) {
          maskSensitive(obj[key], fullPath);
        } else if (
          key.toLowerCase().includes("key") ||
          key.toLowerCase().includes("secret")
        ) {
          obj[key] = "***MASKED***";
        }
      }
    };

    maskSensitive(config);
    return config;
  }
}

// Singleton instance
export const productionConfig = ProductionConfigManager.getInstance();

// Helper functions
export function isProductionEnvironment(): boolean {
  return productionConfig.isProduction();
}

export function getProductionAIConfig() {
  return productionConfig.getAIConfig();
}

export function validateProductionConfig() {
  return productionConfig.validateForProduction();
}
