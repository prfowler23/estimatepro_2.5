/**
 * Centralized Supabase configuration management
 * Handles environment variables, validation, and configuration settings
 */

import { z } from "zod";

/**
 * Environment variable schema for Supabase configuration
 */
const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("Invalid Supabase URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "Supabase anon key is required"),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, "Supabase service role key is required")
    .optional(),
});

/**
 * Validated environment configuration
 */
export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
  isProduction: boolean;
  isDevelopment: boolean;
  isTest: boolean;
}

/**
 * Connection pool configuration
 */
export interface PoolConfig {
  maxConnections: number;
  idleTimeout: number;
  connectionTimeout: number;
  minConnections: number;
  enableMonitoring: boolean;
  enableHealthChecks: boolean;
}

/**
 * Client configuration options
 */
export interface ClientConfig {
  auth: {
    persistSession: boolean;
    autoRefreshToken: boolean;
    detectSessionInUrl: boolean;
    flowType?: "implicit" | "pkce";
  };
  global?: {
    headers?: Record<string, string>;
  };
  db?: {
    schema?: "public"; // Constrained to "public" to match SupabaseClientOptions requirements
  };
  realtime?: {
    params?: {
      eventsPerSecond?: number;
    };
  };
}

/**
 * Default pool configuration values
 */
const DEFAULT_POOL_CONFIG: PoolConfig = {
  maxConnections: parseInt(process.env.SUPABASE_MAX_CONNECTIONS || "10"),
  minConnections: parseInt(process.env.SUPABASE_MIN_CONNECTIONS || "2"),
  idleTimeout: parseInt(process.env.SUPABASE_IDLE_TIMEOUT || "300000"), // 5 minutes
  connectionTimeout: parseInt(
    process.env.SUPABASE_CONNECTION_TIMEOUT || "10000",
  ), // 10 seconds
  enableMonitoring: process.env.SUPABASE_ENABLE_MONITORING === "true",
  enableHealthChecks: process.env.SUPABASE_ENABLE_HEALTH_CHECKS !== "false", // Default true
};

/**
 * Default client configuration for browser environments
 */
export const BROWSER_CLIENT_CONFIG: ClientConfig = {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
  },
  global: {
    headers: {
      "x-client-type": "browser",
    },
  },
};

/**
 * Default client configuration for server environments
 */
export const SERVER_CLIENT_CONFIG: ClientConfig = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      "x-client-type": "server",
    },
  },
};

/**
 * Default client configuration for admin/service role
 */
export const ADMIN_CLIENT_CONFIG: ClientConfig = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      "x-client-type": "admin",
      "x-connection-pooled": "true",
    },
  },
};

class SupabaseConfigManager {
  private static instance: SupabaseConfigManager;
  private config?: SupabaseConfig;
  private poolConfig: PoolConfig;
  private validated = false;

  private constructor() {
    this.poolConfig = DEFAULT_POOL_CONFIG;
  }

  /**
   * Get singleton instance of configuration manager
   */
  static getInstance(): SupabaseConfigManager {
    if (!SupabaseConfigManager.instance) {
      SupabaseConfigManager.instance = new SupabaseConfigManager();
    }
    return SupabaseConfigManager.instance;
  }

  /**
   * Validate and load configuration from environment variables
   * @throws {Error} If required environment variables are missing or invalid
   */
  loadConfig(): SupabaseConfig {
    if (this.config && this.validated) {
      return this.config;
    }

    try {
      // Validate environment variables
      const env = envSchema.parse({
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY:
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      });

      this.config = {
        url: env.NEXT_PUBLIC_SUPABASE_URL,
        anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
        isProduction: process.env.NODE_ENV === "production",
        isDevelopment: process.env.NODE_ENV === "development",
        isTest: process.env.NODE_ENV === "test",
      };

      this.validated = true;
      return this.config;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(", ");
        throw new Error(`Supabase configuration validation failed: ${issues}`);
      }
      throw error;
    }
  }

  /**
   * Get configuration or throw if not loaded
   */
  getConfig(): SupabaseConfig {
    if (!this.config || !this.validated) {
      return this.loadConfig();
    }
    return this.config;
  }

  /**
   * Get pool configuration
   */
  getPoolConfig(): PoolConfig {
    return this.poolConfig;
  }

  /**
   * Update pool configuration
   */
  updatePoolConfig(config: Partial<PoolConfig>): void {
    this.poolConfig = {
      ...this.poolConfig,
      ...config,
    };
  }

  /**
   * Check if service role key is available
   */
  hasServiceRoleKey(): boolean {
    const config = this.getConfig();
    return !!config.serviceRoleKey;
  }

  /**
   * Get appropriate client configuration based on environment
   */
  getClientConfig(type: "browser" | "server" | "admin"): ClientConfig {
    switch (type) {
      case "browser":
        return BROWSER_CLIENT_CONFIG;
      case "server":
        return SERVER_CLIENT_CONFIG;
      case "admin":
        return ADMIN_CLIENT_CONFIG;
      default:
        return SERVER_CLIENT_CONFIG;
    }
  }

  /**
   * Validate Supabase URL format
   */
  static isValidSupabaseUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return (
        parsed.protocol === "https:" &&
        (parsed.hostname.endsWith(".supabase.co") ||
          parsed.hostname.endsWith(".supabase.in") ||
          parsed.hostname === "localhost" ||
          parsed.hostname === "127.0.0.1")
      );
    } catch {
      return false;
    }
  }

  /**
   * Reset configuration (mainly for testing)
   */
  reset(): void {
    this.config = undefined;
    this.validated = false;
    this.poolConfig = DEFAULT_POOL_CONFIG;
  }
}

// Export singleton instance
export const supabaseConfig = SupabaseConfigManager.getInstance();

// Export convenience functions
export const getSupabaseConfig = () => supabaseConfig.getConfig();
export const getPoolConfig = () => supabaseConfig.getPoolConfig();
export const hasServiceRoleKey = () => supabaseConfig.hasServiceRoleKey();
export const getClientConfig = (type: "browser" | "server" | "admin") =>
  supabaseConfig.getClientConfig(type);
