import { config } from "./index";
import { supabase } from "@/lib/supabase/client";

export interface StartupValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  missingConfig: string[];
  databaseStatus: "connected" | "disconnected" | "error";
  features: {
    [key: string]: boolean;
  };
}

export class StartupValidator {
  private static instance: StartupValidator;
  private validationResult: StartupValidationResult | null = null;

  static getInstance(): StartupValidator {
    if (!StartupValidator.instance) {
      StartupValidator.instance = new StartupValidator();
    }
    return StartupValidator.instance;
  }

  async validateStartup(): Promise<StartupValidationResult> {
    if (this.validationResult) {
      return this.validationResult;
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    const missingConfig: string[] = [];
    const features: { [key: string]: boolean } = {};

    // 1. Validate Environment Variables
    const envValidation = this.validateEnvironmentVariables();
    errors.push(...envValidation.errors);
    warnings.push(...envValidation.warnings);
    missingConfig.push(...envValidation.missingConfig);

    // 2. Validate Database Connection
    const dbStatus = await this.validateDatabaseConnection();

    // 3. Validate Feature Flags
    const featureValidation = this.validateFeatureFlags();
    Object.assign(features, featureValidation);

    // 4. Validate API Endpoints
    const apiValidation = await this.validateAPIEndpoints();
    errors.push(...apiValidation.errors);
    warnings.push(...apiValidation.warnings);

    this.validationResult = {
      isValid: errors.length === 0 && dbStatus !== "error",
      errors,
      warnings,
      missingConfig,
      databaseStatus: dbStatus,
      features,
    };

    return this.validationResult;
  }

  private validateEnvironmentVariables() {
    const errors: string[] = [];
    const warnings: string[] = [];
    const missingConfig: string[] = [];

    // Only check client-accessible (NEXT_PUBLIC_) variables when running client-side
    const requiredVars = [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ];

    const optionalClientVars = [
      "NEXT_PUBLIC_APP_URL",
      "NEXT_PUBLIC_APP_NAME",
      "NEXT_PUBLIC_APP_VERSION",
    ];

    // Check required variables (client-accessible only)
    for (const envVar of requiredVars) {
      if (!process.env[envVar]) {
        missingConfig.push(envVar);
        errors.push(`Missing required environment variable: ${envVar}`);
      }
    }

    // Check optional client variables
    for (const envVar of optionalClientVars) {
      if (!process.env[envVar]) {
        missingConfig.push(envVar);
        warnings.push(`Missing optional environment variable: ${envVar}`);
      }
    }

    return { errors, warnings, missingConfig };
  }

  private async validateDatabaseConnection(): Promise<
    "connected" | "disconnected" | "error"
  > {
    try {
      // Test basic connection
      const { data, error } = await supabase
        .from("estimates")
        .select("count")
        .limit(1);

      if (error) {
        console.warn("Database connection warning:", error.message);
        return "disconnected";
      }

      return "connected";
    } catch (error) {
      console.error("Database connection error:", error);
      return "error";
    }
  }

  private validateFeatureFlags() {
    const features: { [key: string]: boolean } = {};

    // Check each feature flag
    features.ai = config.features.ai;
    features.threeDimensional = config.features.threeDimensional;
    features.weather = config.features.weather;
    features.drone = config.features.drone;
    features.guidedFlow = config.features.guidedFlow;

    return features;
  }

  private async validateAPIEndpoints() {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Test Supabase connection
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        warnings.push(`Supabase auth warning: ${error.message}`);
      }
    } catch (error) {
      errors.push(`Supabase connection failed: ${error}`);
    }

    return { errors, warnings };
  }

  getValidationResult(): StartupValidationResult | null {
    return this.validationResult;
  }

  clearValidationResult() {
    this.validationResult = null;
  }
}

export const startupValidator = StartupValidator.getInstance();
