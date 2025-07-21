import {
  validateEnvWithWarnings,
  validateClientSideEnv,
  validateClientEnv,
} from "./env-validation";

/**
 * Performs client-side startup validations
 * Safe to run in the browser
 */
export function performClientStartupValidation(): void {
  try {
    console.log("🚀 Starting client-side validation...");

    // 1. Validate client-side environment variables
    const config = validateClientEnv();

    // 2. Validate client-side environment security
    validateClientSideEnv();

    // 3. Check client-side feature flag consistency
    validateClientFeatureFlags(config);

    console.log("✅ Client-side validation passed");
  } catch (error) {
    console.error("❌ Client-side validation failed:", error.message);
    if (process.env.NODE_ENV === "production") {
      throw error; // Fail fast in production
    } else {
      console.warn(
        "⚠️  Continuing in development mode despite validation errors",
      );
    }
  }
}

/**
 * Performs all startup validations (server-side)
 * Should be called when the application starts on the server
 */
export function performStartupValidation(): void {
  try {
    console.log("🚀 Starting server-side validation...");

    // 1. Validate environment variables
    const config = validateEnvWithWarnings();

    // 2. Validate client-side environment security
    validateClientSideEnv();

    // 3. Check for required services
    validateRequiredServices(config);

    // 4. Check feature flag consistency
    validateFeatureFlags(config);

    console.log("✅ All server-side validations passed");
  } catch (error) {
    console.error("❌ Server-side validation failed:", error.message);
    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    } else {
      console.warn(
        "⚠️  Continuing in development mode despite validation errors",
      );
    }
  }
}

/**
 * Validates that required services are properly configured
 */
function validateRequiredServices(config: any): void {
  const errors: string[] = [];

  // Check Supabase configuration
  if (!config.NEXT_PUBLIC_SUPABASE_URL.includes("supabase.co")) {
    errors.push("Supabase URL appears to be invalid");
  }

  // Check OpenAI configuration
  if (
    config.NEXT_PUBLIC_ENABLE_AI &&
    !config.OPENAI_API_KEY.startsWith("sk-")
  ) {
    errors.push("OpenAI API key is required when AI features are enabled");
  }

  // Check email configuration
  if (!config.EMAIL_FROM.includes("@")) {
    errors.push("Email FROM address must be a valid email");
  }

  if (errors.length > 0) {
    throw new Error(`Service validation failed:\n${errors.join("\n")}`);
  }

  console.log("✅ Required services validation passed");
}

/**
 * Validates client-side feature flag consistency
 */
function validateClientFeatureFlags(config: any): void {
  const warnings: string[] = [];

  // Check client-side feature flag consistency
  if (config.NEXT_PUBLIC_DEBUG && process.env.NODE_ENV === "production") {
    warnings.push("Debug mode enabled in production environment");
  }

  if (warnings.length > 0) {
    console.warn("⚠️  Client-side feature flag warnings:");
    warnings.forEach((warning) => console.warn(`   - ${warning}`));
  } else {
    console.log("✅ Client-side feature flags validation passed");
  }
}

/**
 * Validates feature flag consistency (server-side)
 */
function validateFeatureFlags(config: any): void {
  const warnings: string[] = [];

  // Check feature flag consistency
  if (config.NEXT_PUBLIC_ENABLE_AI && !config.OPENAI_API_KEY) {
    warnings.push("AI features enabled but OpenAI API key not configured");
  }

  if (config.NEXT_PUBLIC_ENABLE_WEATHER && !config.WEATHER_API_KEY) {
    warnings.push(
      "Weather features enabled but Weather API key not configured",
    );
  }

  if (config.NEXT_PUBLIC_DEBUG && process.env.NODE_ENV === "production") {
    warnings.push("Debug mode enabled in production environment");
  }

  if (warnings.length > 0) {
    console.warn("⚠️  Feature flag warnings:");
    warnings.forEach((warning) => console.warn(`   - ${warning}`));
  } else {
    console.log("✅ Feature flags validation passed");
  }
}

/**
 * Validates database connectivity (async)
 */
export async function validateDatabaseConnection(): Promise<void> {
  try {
    // This will be implemented once we have the database client
    console.log("🔍 Validating database connection...");

    // For now, just check if the URL is accessible
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error("Supabase URL not configured");
    }

    // Simple connectivity check
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: "GET",
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
      },
    });

    if (!response.ok && response.status !== 401) {
      // 401 is expected without proper auth
      throw new Error(`Database connection failed: ${response.status}`);
    }

    console.log("✅ Database connection validation passed");
  } catch (error) {
    console.error("❌ Database connection validation failed:", error.message);
    throw error;
  }
}

/**
 * Validates AI service connectivity (async)
 */
export async function validateAIServiceConnection(): Promise<void> {
  const config = validateEnvWithWarnings(true);

  if (!config.NEXT_PUBLIC_ENABLE_AI) {
    console.log("ℹ️  AI features disabled, skipping AI service validation");
    return;
  }

  try {
    console.log("🔍 Validating AI service connection...");

    // Simple API key validation
    const apiKey = config.OPENAI_API_KEY;
    if (!apiKey || !apiKey.startsWith("sk-")) {
      throw new Error("Invalid OpenAI API key format");
    }

    console.log("✅ AI service validation passed");
  } catch (error) {
    console.error("❌ AI service validation failed:", error.message);
    throw error;
  }
}

/**
 * Runs all async validations
 */
export async function performAsyncValidations(): Promise<void> {
  try {
    console.log("🔍 Running async validations...");

    await Promise.all([
      validateDatabaseConnection(),
      validateAIServiceConnection(),
    ]);

    console.log("✅ All async validations passed");
  } catch (error) {
    console.error("❌ Async validation failed:", error.message);

    if (process.env.NODE_ENV === "production") {
      throw error;
    } else {
      console.warn(
        "⚠️  Continuing in development mode despite async validation errors",
      );
    }
  }
}
