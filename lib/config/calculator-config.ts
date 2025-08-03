import { z } from "zod";

/**
 * Centralized calculator configuration system
 * Provides consistent settings, validation rules, and behavior across all service calculators
 */

// Base configuration schema that all calculators must implement
export const baseCalculatorConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.enum([
    "cleaning",
    "pressure-washing",
    "restoration",
    "specialty",
  ]),
  version: z.string(),
  enabled: z.boolean(),
  requiresImages: z.boolean(),
  supportsFacadeAnalysis: z.boolean(),
  minimumFields: z.array(z.string()),
  debounceMs: z.number().min(100).max(2000),
  validationRules: z.object({
    minArea: z.number().min(0),
    maxArea: z.number().min(1),
    minHeight: z.number().min(0),
    maxHeight: z.number().min(1),
    allowZeroValues: z.boolean(),
  }),
  rateLimit: z.object({
    maxRequests: z.number().min(1),
    windowMs: z.number().min(1000),
  }),
  performance: z.object({
    enableCaching: z.boolean(),
    cacheTimeoutMs: z.number().min(1000),
    enableAnalytics: z.boolean(),
  }),
});

export type CalculatorConfig = z.infer<typeof baseCalculatorConfigSchema>;

// Default configuration that can be overridden per calculator
const defaultConfig: Partial<CalculatorConfig> = {
  enabled: true,
  requiresImages: false,
  supportsFacadeAnalysis: false,
  debounceMs: 300,
  validationRules: {
    minArea: 1,
    maxArea: 1000000,
    minHeight: 1,
    maxHeight: 500,
    allowZeroValues: false,
  },
  rateLimit: {
    maxRequests: 30,
    windowMs: 60000,
  },
  performance: {
    enableCaching: true,
    cacheTimeoutMs: 300000, // 5 minutes
    enableAnalytics: true,
  },
};

// Service calculator configurations
export const calculatorConfigs: Record<string, CalculatorConfig> = {
  windowCleaning: {
    ...defaultConfig,
    id: "window-cleaning",
    name: "Window Cleaning",
    description: "Professional window cleaning calculations",
    category: "cleaning",
    version: "2.1.0",
    minimumFields: ["building_height", "window_count", "window_type"],
    supportsFacadeAnalysis: true,
  } as CalculatorConfig,

  pressureWashing: {
    ...defaultConfig,
    id: "pressure-washing",
    name: "Pressure Washing",
    description: "Pressure washing service calculations",
    category: "pressure-washing",
    version: "2.0.0",
    minimumFields: ["surface_area", "surface_type", "pressure_level"],
    validationRules: {
      ...defaultConfig.validationRules!,
      maxArea: 50000, // Larger areas for pressure washing
    },
  } as CalculatorConfig,

  facadeAnalysis: {
    ...defaultConfig,
    id: "facade-analysis",
    name: "AI Facade Analysis",
    description: "AI-powered building facade analysis and measurement",
    category: "specialty",
    version: "3.0.0",
    requiresImages: true,
    supportsFacadeAnalysis: true,
    minimumFields: ["building_address", "building_type", "images"],
    debounceMs: 500, // Longer debounce for AI processing
    rateLimit: {
      maxRequests: 10, // More restrictive for AI calls
      windowMs: 60000,
    },
    performance: {
      enableCaching: true,
      cacheTimeoutMs: 1800000, // 30 minutes for AI results
      enableAnalytics: true,
    },
  } as CalculatorConfig,

  softWashing: {
    ...defaultConfig,
    id: "soft-washing",
    name: "Soft Washing",
    description: "Soft washing service calculations",
    category: "cleaning",
    version: "1.5.0",
    minimumFields: ["surface_area", "surface_material", "cleaning_solution"],
  } as CalculatorConfig,

  glassRestoration: {
    ...defaultConfig,
    id: "glass-restoration",
    name: "Glass Restoration",
    description: "Glass and frame restoration calculations",
    category: "restoration",
    version: "1.3.0",
    minimumFields: ["glass_area", "restoration_type", "damage_level"],
    supportsFacadeAnalysis: true,
  } as CalculatorConfig,
};

/**
 * Get configuration for a specific calculator
 */
export function getCalculatorConfig(calculatorId: string): CalculatorConfig {
  const config = calculatorConfigs[calculatorId];
  if (!config) {
    throw new Error(`Calculator configuration not found for: ${calculatorId}`);
  }

  // Validate configuration at runtime
  const validated = baseCalculatorConfigSchema.parse(config);
  return validated;
}

/**
 * Get all enabled calculator configurations
 */
export function getEnabledCalculators(): Record<string, CalculatorConfig> {
  return Object.fromEntries(
    Object.entries(calculatorConfigs).filter(([, config]) => config.enabled),
  );
}

/**
 * Update calculator configuration (for dynamic configuration)
 */
export function updateCalculatorConfig(
  calculatorId: string,
  updates: Partial<CalculatorConfig>,
): void {
  const existingConfig = calculatorConfigs[calculatorId];
  if (!existingConfig) {
    throw new Error(`Calculator not found: ${calculatorId}`);
  }

  const updatedConfig = { ...existingConfig, ...updates };
  const validated = baseCalculatorConfigSchema.parse(updatedConfig);
  calculatorConfigs[calculatorId] = validated;
}

/**
 * Validate calculator data against its configuration rules
 */
export function validateCalculatorData(
  calculatorId: string,
  data: Record<string, any>,
): { isValid: boolean; errors: string[] } {
  const config = getCalculatorConfig(calculatorId);
  const errors: string[] = [];

  // Check required fields
  for (const field of config.minimumFields) {
    if (!data[field] || data[field] === "") {
      errors.push(`Required field missing: ${field}`);
    }
  }

  // Validate area constraints if present
  if (data.surface_area || data.total_area) {
    const area = data.surface_area || data.total_area;
    if (area < config.validationRules.minArea) {
      errors.push(
        `Area too small: minimum ${config.validationRules.minArea} sq ft`,
      );
    }
    if (area > config.validationRules.maxArea) {
      errors.push(
        `Area too large: maximum ${config.validationRules.maxArea} sq ft`,
      );
    }
  }

  // Validate height constraints if present
  if (data.building_height || data.height) {
    const height = data.building_height || data.height;
    if (height < config.validationRules.minHeight) {
      errors.push(
        `Height too small: minimum ${config.validationRules.minHeight} ft`,
      );
    }
    if (height > config.validationRules.maxHeight) {
      errors.push(
        `Height too large: maximum ${config.validationRules.maxHeight} ft`,
      );
    }
  }

  // Check for zero values if not allowed
  if (!config.validationRules.allowZeroValues) {
    const numericFields = Object.entries(data).filter(
      ([, value]) => typeof value === "number" && value === 0,
    );
    if (numericFields.length > 0) {
      errors.push("Zero values not allowed for numeric fields");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get performance settings for a calculator
 */
export function getCalculatorPerformanceConfig(calculatorId: string) {
  const config = getCalculatorConfig(calculatorId);
  return {
    debounceMs: config.debounceMs,
    enableCaching: config.performance.enableCaching,
    cacheTimeoutMs: config.performance.cacheTimeoutMs,
    enableAnalytics: config.performance.enableAnalytics,
    rateLimit: config.rateLimit,
  };
}

/**
 * Check if calculator supports specific features
 */
export function getCalculatorFeatures(calculatorId: string) {
  const config = getCalculatorConfig(calculatorId);
  return {
    requiresImages: config.requiresImages,
    supportsFacadeAnalysis: config.supportsFacadeAnalysis,
    hasValidationRules: config.validationRules !== undefined,
    hasRateLimit: config.rateLimit !== undefined,
  };
}
