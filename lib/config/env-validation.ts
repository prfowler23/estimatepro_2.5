import { z } from "zod";

// Placeholder values that should be replaced
const PLACEHOLDER_VALUES = [
  "your-project-id.supabase.co",
  "your-actual-anon-key-here",
  "your-actual-service-role-key-here",
  "your-openai-api-key-here",
  "your-resend-api-key-here",
  "your-supabase-url-goes-here",
  "your-supabase-anon-key-goes-here",
];

/**
 * Custom validation function to check for placeholder values
 */
const isNotPlaceholder = (value: string, fieldName: string) => {
  if (PLACEHOLDER_VALUES.some((placeholder) => value.includes(placeholder))) {
    throw new Error(
      `${fieldName} contains placeholder value. Please update your .env.local file with actual credentials.`,
    );
  }
  return true;
};

/**
 * Environment variable validation schema
 * Validates all required and optional environment variables
 */
const envSchema = z.object({
  // Required Supabase Configuration
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url("Invalid Supabase URL")
    .startsWith("https://", "Supabase URL must use HTTPS")
    .refine((val) => isNotPlaceholder(val, "NEXT_PUBLIC_SUPABASE_URL"))
    .refine(
      (val) => val.includes("supabase.co"),
      "Must be a valid Supabase URL (*.supabase.co)",
    ),

  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(100, "Supabase anon key appears to be invalid")
    .startsWith("eyJ", "Supabase anon key must be a valid JWT")
    .refine((val) => isNotPlaceholder(val, "NEXT_PUBLIC_SUPABASE_ANON_KEY")),

  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(100, "Supabase service role key appears to be invalid")
    .startsWith("eyJ", "Supabase service role key must be a valid JWT")
    .refine((val) => isNotPlaceholder(val, "SUPABASE_SERVICE_ROLE_KEY")),

  // Required OpenAI Configuration
  OPENAI_API_KEY: z
    .string()
    .min(20, "OpenAI API key appears to be invalid")
    .startsWith("sk-", "OpenAI API key must start with sk-")
    .refine((val) => isNotPlaceholder(val, "OPENAI_API_KEY")),

  // Required Email Configuration
  RESEND_API_KEY: z
    .string()
    .min(10, "Resend API key appears to be invalid")
    .startsWith("re_", "Resend API key must start with re_")
    .refine((val) => isNotPlaceholder(val, "RESEND_API_KEY")),

  EMAIL_FROM: z.string().email("Invalid email address for EMAIL_FROM"),

  SUPPORT_TEAM_EMAIL: z.string().email().optional(),
  SUPPORT_SLACK_WEBHOOK_URL: z.string().url().optional(),

  // Application Configuration
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url("Invalid application URL")
    .default("http://localhost:3000"),

  NEXT_PUBLIC_APP_NAME: z
    .string()
    .min(1, "App name cannot be empty")
    .default("EstimatePro"),

  NEXT_PUBLIC_APP_VERSION: z
    .string()
    .regex(/^\d+\.\d+(\.\d+)?$/, "Version must be in format X.Y or X.Y.Z")
    .default("2.5"),

  // Feature Flags (optional)
  NEXT_PUBLIC_ENABLE_AI: z
    .string()
    .transform((val) => val === "true")
    .default("true"),

  NEXT_PUBLIC_ENABLE_3D: z
    .string()
    .transform((val) => val === "true")
    .default("false"),

  NEXT_PUBLIC_ENABLE_WEATHER: z
    .string()
    .transform((val) => val === "true")
    .default("true"),

  NEXT_PUBLIC_ENABLE_DRONE: z
    .string()
    .transform((val) => val === "true")
    .default("false"),

  NEXT_PUBLIC_ENABLE_GUIDED_FLOW: z
    .string()
    .transform((val) => val === "true")
    .default("true"),

  // New Flow Feature Flags
  NEXT_PUBLIC_NEW_ESTIMATE_FLOW: z
    .string()
    .transform((val) => val === "true")
    .default("false"),

  NEXT_PUBLIC_QUICK_ESTIMATE_MODE: z
    .string()
    .transform((val) => val === "true")
    .default("false"),

  NEXT_PUBLIC_LEGACY_FLOW_SUPPORT: z
    .string()
    .transform((val) => val === "true")
    .default("true"),

  NEXT_PUBLIC_DEBUG: z
    .string()
    .transform((val) => val === "true")
    .default("false"),

  // Optional: AI Configuration
  AI_CACHE_TTL: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => val > 0, "AI cache TTL must be positive")
    .default("3600"),

  AI_RATE_LIMIT_PER_MINUTE: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => val > 0, "AI rate limit must be positive")
    .default("100"),

  AI_MAX_RETRIES: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => val >= 0, "AI max retries must be non-negative")
    .default("3"),

  AI_ENABLE_CACHING: z
    .string()
    .transform((val) => val === "true")
    .default("true"),

  AI_ENABLE_LOGGING: z
    .string()
    .transform((val) => val === "true")
    .default("false"),

  // Optional: Performance & Reliability
  ENABLE_DATABASE_OPTIMIZATION: z
    .string()
    .transform((val) => val === "true")
    .default("true"),

  ENABLE_LAZY_LOADING: z
    .string()
    .transform((val) => val === "true")
    .default("true"),

  RETRY_ATTEMPTS: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => val >= 0, "Retry attempts must be non-negative")
    .default("3"),

  CACHE_TTL: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => val > 0, "Cache TTL must be positive")
    .default("1800"),

  // Optional: Security
  API_RATE_LIMIT_PER_MINUTE: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => val > 0, "API rate limit must be positive")
    .default("100"),

  API_RATE_LIMIT_WINDOW: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => val > 0, "API rate limit window must be positive")
    .default("60000"),

  // Optional: Monitoring
  ENABLE_ERROR_MONITORING: z
    .string()
    .transform((val) => val === "true")
    .default("false"),

  SENTRY_DSN: z
    .string()
    .url("Invalid Sentry DSN URL")
    .optional()
    .or(z.literal("")),

  ENABLE_PERFORMANCE_MONITORING: z
    .string()
    .transform((val) => val === "true")
    .default("false"),

  // Optional: Development
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // Facade Analysis Configuration
  FACADE_ANALYSIS_MODEL_VERSION: z
    .string()
    .regex(/^v\d+\.\d+$/, "Model version must be in format vX.Y")
    .default("v8.0"),

  AI_VISION_MODEL: z
    .string()
    .min(1, "AI vision model cannot be empty")
    .default("gpt-4-vision-preview"),

  MAX_IMAGE_SIZE_MB: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine(
      (val) => val > 0 && val <= 50,
      "Max image size must be between 1 and 50 MB",
    )
    .default("10"),

  CONFIDENCE_THRESHOLD: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine(
      (val) => val >= 0 && val <= 100,
      "Confidence threshold must be between 0 and 100",
    )
    .default("85"),

  NEXT_PUBLIC_ENABLE_FACADE_ANALYSIS: z
    .string()
    .transform((val) => val === "true")
    .default("true"),
});

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Validates environment variables and returns validated configuration
 * @throws {Error} If validation fails
 */
export function validateEnv(): EnvConfig {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.issues.map(
      (issue) => `${issue.path.join(".")}: ${issue.message}`,
    );

    throw new Error(
      `Environment validation failed:\n${errors.join("\n")}\n\n` +
        "Please check your .env.local file and ensure all required variables are set. " +
        "See .env.example for reference.",
    );
  }

  return result.data;
}

/**
 * Validates environment variables and logs warnings for missing optional vars
 * @param silent If true, suppresses console output
 */
export function validateEnvWithWarnings(silent = false): EnvConfig {
  try {
    const config = validateEnv();

    if (!silent) {
      console.log("✅ Environment validation passed");

      // Check for optional monitoring configuration
      if (
        !config.ENABLE_ERROR_MONITORING &&
        process.env.NODE_ENV === "production"
      ) {
        console.warn("⚠️  Error monitoring is disabled in production");
      }

      if (!config.SENTRY_DSN && config.ENABLE_ERROR_MONITORING) {
        console.warn("⚠️  Error monitoring enabled but no Sentry DSN provided");
      }

      if (config.NEXT_PUBLIC_DEBUG && process.env.NODE_ENV === "production") {
        console.warn("⚠️  Debug mode is enabled in production");
      }
    }

    return config;
  } catch (error) {
    console.error("❌ Environment validation failed:", error.message);
    throw error;
  }
}

/**
 * Get a specific environment variable with validation
 * @param key The environment variable key
 * @param defaultValue Default value if not found
 */
export function getEnvVar(key: keyof EnvConfig, defaultValue?: string): string {
  const config = validateEnv();
  return config[key]?.toString() || defaultValue || "";
}

/**
 * Check if we're in development mode
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === "development";
}

/**
 * Check if we're in production mode
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Check if we're in test mode
 */
export function isTest(): boolean {
  return process.env.NODE_ENV === "test";
}

/**
 * Get feature flag value
 */
export function getFeatureFlag(flag: string): boolean {
  const config = validateEnv();
  return Boolean(config[`NEXT_PUBLIC_${flag}` as keyof EnvConfig]);
}

/**
 * Client-side environment validation schema
 * Only validates variables that should be available in the browser
 */
const clientEnvSchema = z.object({
  // Required Client-side Supabase Configuration
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url("Invalid Supabase URL")
    .startsWith("https://", "Supabase URL must use HTTPS"),

  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(100, "Supabase anon key appears to be invalid")
    .startsWith("eyJ", "Supabase anon key must be a valid JWT"),

  // Application Configuration
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url("Invalid application URL")
    .default("http://localhost:3000"),

  NEXT_PUBLIC_APP_NAME: z
    .string()
    .min(1, "App name cannot be empty")
    .default("EstimatePro"),

  NEXT_PUBLIC_APP_VERSION: z
    .string()
    .regex(/^\d+\.\d+(\.\d+)?$/, "Version must be in format X.Y or X.Y.Z")
    .default("2.5"),

  // Feature Flags
  NEXT_PUBLIC_ENABLE_AI: z
    .string()
    .transform((val) => val === "true")
    .default("true"),

  NEXT_PUBLIC_ENABLE_3D: z
    .string()
    .transform((val) => val === "true")
    .default("false"),

  NEXT_PUBLIC_ENABLE_WEATHER: z
    .string()
    .transform((val) => val === "true")
    .default("true"),

  NEXT_PUBLIC_ENABLE_DRONE: z
    .string()
    .transform((val) => val === "true")
    .default("false"),

  NEXT_PUBLIC_ENABLE_GUIDED_FLOW: z
    .string()
    .transform((val) => val === "true")
    .default("true"),

  // New Flow Feature Flags
  NEXT_PUBLIC_NEW_ESTIMATE_FLOW: z
    .string()
    .transform((val) => val === "true")
    .default("false"),

  NEXT_PUBLIC_QUICK_ESTIMATE_MODE: z
    .string()
    .transform((val) => val === "true")
    .default("false"),

  NEXT_PUBLIC_LEGACY_FLOW_SUPPORT: z
    .string()
    .transform((val) => val === "true")
    .default("true"),

  NEXT_PUBLIC_DEBUG: z
    .string()
    .transform((val) => val === "true")
    .default("false"),

  NEXT_PUBLIC_ENABLE_FACADE_ANALYSIS: z
    .string()
    .transform((val) => val === "true")
    .default("true"),
});

export type ClientEnvConfig = z.infer<typeof clientEnvSchema>;

// Memoized client env config to prevent infinite re-renders
let cachedClientEnv: ClientEnvConfig | null = null;
let lastEnvHash: string | null = null;

/**
 * Validates only client-side environment variables
 * Safe to run in the browser
 * Memoized to prevent infinite re-renders in React components
 */
export function validateClientEnv(): ClientEnvConfig {
  // Create a hash of the current environment variables to detect changes
  const currentEnvHash = JSON.stringify({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
    NEXT_PUBLIC_ENABLE_AI: process.env.NEXT_PUBLIC_ENABLE_AI,
    NEXT_PUBLIC_ENABLE_3D: process.env.NEXT_PUBLIC_ENABLE_3D,
    NEXT_PUBLIC_ENABLE_WEATHER: process.env.NEXT_PUBLIC_ENABLE_WEATHER,
    NEXT_PUBLIC_ENABLE_DRONE: process.env.NEXT_PUBLIC_ENABLE_DRONE,
    NEXT_PUBLIC_ENABLE_GUIDED_FLOW: process.env.NEXT_PUBLIC_ENABLE_GUIDED_FLOW,
    NEXT_PUBLIC_NEW_ESTIMATE_FLOW: process.env.NEXT_PUBLIC_NEW_ESTIMATE_FLOW,
    NEXT_PUBLIC_QUICK_ESTIMATE_MODE:
      process.env.NEXT_PUBLIC_QUICK_ESTIMATE_MODE,
    NEXT_PUBLIC_LEGACY_FLOW_SUPPORT:
      process.env.NEXT_PUBLIC_LEGACY_FLOW_SUPPORT,
    NEXT_PUBLIC_DEBUG: process.env.NEXT_PUBLIC_DEBUG,
    NEXT_PUBLIC_ENABLE_FACADE_ANALYSIS:
      process.env.NEXT_PUBLIC_ENABLE_FACADE_ANALYSIS,
  });

  // Return cached config if environment hasn't changed
  if (cachedClientEnv && lastEnvHash === currentEnvHash) {
    return cachedClientEnv;
  }

  // In development, be more lenient with client-side validation
  // as Next.js environment variable injection timing can vary
  if (process.env.NODE_ENV === "development") {
    // Check if critical variables are missing
    const requiredVars = [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ];
    const missingVars = requiredVars.filter((varName) => !process.env[varName]);

    if (missingVars.length > 0) {
      // In development, be more lenient since timing issues are common
      if (process.env.NODE_ENV === "development") {
        console.debug(
          `⚠️ Environment variables not yet loaded: ${missingVars.join(", ")} - this is normal during development startup`,
        );
      } else {
        console.warn(
          `⚠️ Missing environment variables: ${missingVars.join(", ")}`,
        );
      }

      // Cache and return a minimal config for development
      const devConfig: ClientEnvConfig = {
        NEXT_PUBLIC_SUPABASE_URL:
          process.env.NEXT_PUBLIC_SUPABASE_URL ||
          "https://placeholder.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY:
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder_key",
        NEXT_PUBLIC_APP_URL:
          process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || "EstimatePro",
        NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION || "2.5",
        NEXT_PUBLIC_ENABLE_AI: process.env.NEXT_PUBLIC_ENABLE_AI === "true",
        NEXT_PUBLIC_ENABLE_3D: process.env.NEXT_PUBLIC_ENABLE_3D === "true",
        NEXT_PUBLIC_ENABLE_WEATHER:
          process.env.NEXT_PUBLIC_ENABLE_WEATHER === "true",
        NEXT_PUBLIC_ENABLE_DRONE:
          process.env.NEXT_PUBLIC_ENABLE_DRONE === "true",
        NEXT_PUBLIC_ENABLE_GUIDED_FLOW:
          process.env.NEXT_PUBLIC_ENABLE_GUIDED_FLOW !== "false",
        NEXT_PUBLIC_NEW_ESTIMATE_FLOW:
          process.env.NEXT_PUBLIC_NEW_ESTIMATE_FLOW === "true",
        NEXT_PUBLIC_QUICK_ESTIMATE_MODE:
          process.env.NEXT_PUBLIC_QUICK_ESTIMATE_MODE === "true",
        NEXT_PUBLIC_LEGACY_FLOW_SUPPORT:
          process.env.NEXT_PUBLIC_LEGACY_FLOW_SUPPORT !== "false",
        NEXT_PUBLIC_DEBUG: process.env.NEXT_PUBLIC_DEBUG === "true",
        NEXT_PUBLIC_ENABLE_FACADE_ANALYSIS:
          process.env.NEXT_PUBLIC_ENABLE_FACADE_ANALYSIS !== "false",
      };

      cachedClientEnv = devConfig;
      lastEnvHash = currentEnvHash;
      return devConfig;
    }
  }

  const result = clientEnvSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.issues.map(
      (issue) => `${issue.path.join(".")}: ${issue.message}`,
    );

    throw new Error(
      `Client environment validation failed:\n${errors.join("\n")}\n\n` +
        "Please check your .env.local file and ensure all NEXT_PUBLIC_ variables are set correctly.",
    );
  }

  // Cache the result
  cachedClientEnv = result.data;
  lastEnvHash = currentEnvHash;
  return result.data;
}

/**
 * Security check for sensitive environment variables
 * Ensures no sensitive data is exposed to the client
 */
export function validateClientSideEnv(): void {
  const clientSideKeys = Object.keys(process.env).filter((key) =>
    key.startsWith("NEXT_PUBLIC_"),
  );

  const sensitivePatterns = [
    /api[_-]?key/i,
    /secret/i,
    /private/i,
    /password/i,
    /token/i,
  ];

  for (const key of clientSideKeys) {
    if (sensitivePatterns.some((pattern) => pattern.test(key))) {
      console.warn(
        `⚠️  Potentially sensitive environment variable exposed to client: ${key}`,
      );
    }
  }
}

// Export the schema for testing purposes
export { envSchema };
