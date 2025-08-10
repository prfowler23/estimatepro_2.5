import { z } from "zod";
import { MeasurementCategory } from "@/lib/types/measurements";

// Validation constants
const MIN_DIMENSION = 0.1;
const MAX_DIMENSION = 10000;
const MIN_QUANTITY = 1;
const MAX_QUANTITY = 1000;

// Measurement category enum for validation
const MeasurementCategorySchema = z.enum([
  "glass_windows",
  "glass_doors",
  "glass_storefront",
  "facade_brick",
  "facade_concrete",
  "facade_metal",
  "facade_stone",
  "flat_surface",
  "parking_spaces",
  "parking_deck",
  "retaining_wall",
  "inner_wall",
  "ceiling",
  "footprint",
] as const);

// Unit validation schema
const UnitSchema = z.enum(["ft", "sqft", "lf", "ea"] as const);

// Calculation type schema
const CalculationTypeSchema = z.enum(["area", "linear", "count"] as const);

// Base measurement entry schema
export const MeasurementEntrySchema = z.object({
  id: z.string().min(1, "ID is required"),
  category: MeasurementCategorySchema,
  description: z
    .string()
    .min(1, "Description is required")
    .max(200, "Description too long")
    .refine(
      (val) => {
        // Basic XSS prevention - no script tags or dangerous attributes
        const dangerousPatterns = /<script|javascript:|on\w+=/i;
        return !dangerousPatterns.test(val);
      },
      {
        message: "Invalid characters in description",
      },
    ),
  location: z
    .string()
    .min(1, "Location is required")
    .max(100, "Location too long")
    .refine(
      (val) => {
        const dangerousPatterns = /<script|javascript:|on\w+=/i;
        return !dangerousPatterns.test(val);
      },
      {
        message: "Invalid characters in location",
      },
    ),
  width: z
    .number()
    .min(MIN_DIMENSION, `Width must be at least ${MIN_DIMENSION}`)
    .max(MAX_DIMENSION, `Width cannot exceed ${MAX_DIMENSION}`)
    .finite("Width must be a valid number"),
  height: z
    .number()
    .min(MIN_DIMENSION, `Height must be at least ${MIN_DIMENSION}`)
    .max(MAX_DIMENSION, `Height cannot exceed ${MAX_DIMENSION}`)
    .finite("Height must be a valid number"),
  length: z
    .number()
    .min(MIN_DIMENSION, `Length must be at least ${MIN_DIMENSION}`)
    .max(MAX_DIMENSION, `Length cannot exceed ${MAX_DIMENSION}`)
    .finite("Length must be a valid number")
    .optional(),
  quantity: z
    .number()
    .int("Quantity must be a whole number")
    .min(MIN_QUANTITY, `Quantity must be at least ${MIN_QUANTITY}`)
    .max(MAX_QUANTITY, `Quantity cannot exceed ${MAX_QUANTITY}`),
  unit: UnitSchema,
  total: z
    .number()
    .min(0, "Total cannot be negative")
    .finite("Total must be a valid number"),
  notes: z
    .string()
    .max(500, "Notes too long")
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        const dangerousPatterns = /<script|javascript:|on\w+=/i;
        return !dangerousPatterns.test(val);
      },
      {
        message: "Invalid characters in notes",
      },
    ),
});

// Measurement entry update schema (partial updates allowed)
export const MeasurementEntryUpdateSchema =
  MeasurementEntrySchema.partial().extend({
    id: z.string().min(1, "ID is required"), // ID is always required
  });

// Bulk measurement operations schema
export const BulkMeasurementSchema = z.object({
  entries: z
    .array(MeasurementEntrySchema)
    .min(1, "At least one entry required"),
  services: z.array(z.string()).min(1, "At least one service required"),
});

// Measurement table props validation
export const MeasurementTablePropsSchema = z.object({
  category: z.string().min(1, "Category is required"),
  categoryLabel: z.string().min(1, "Category label is required"),
  entries: z.array(MeasurementEntrySchema),
  calculation: CalculationTypeSchema,
});

// Input sanitization helper
export function sanitizeInput(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+=/gi, "")
    .trim();
}

// Validation helper functions
export function validateMeasurementEntry(entry: unknown) {
  try {
    return {
      success: true,
      data: MeasurementEntrySchema.parse(entry),
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof z.ZodError ? error.format() : error,
    };
  }
}

export function validateMeasurementEntryUpdate(entry: unknown) {
  try {
    return {
      success: true,
      data: MeasurementEntryUpdateSchema.parse(entry),
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof z.ZodError ? error.format() : error,
    };
  }
}

// Boundary validation for dimensions
export function validateDimensions(
  width: number,
  height: number,
  length?: number,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (width <= 0 || width > MAX_DIMENSION) {
    errors.push(`Width must be between ${MIN_DIMENSION} and ${MAX_DIMENSION}`);
  }

  if (height <= 0 || height > MAX_DIMENSION) {
    errors.push(`Height must be between ${MIN_DIMENSION} and ${MAX_DIMENSION}`);
  }

  if (length !== undefined && (length <= 0 || length > MAX_DIMENSION)) {
    errors.push(`Length must be between ${MIN_DIMENSION} and ${MAX_DIMENSION}`);
  }

  // Check for reasonable aspect ratios
  const aspectRatio = width / height;
  if (aspectRatio > 100 || aspectRatio < 0.01) {
    errors.push("Dimension ratio appears unrealistic");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Service requirement validation
export function validateServiceRequirements(
  entries: unknown[],
  services: string[],
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate each entry
  const validEntries = entries.filter((entry) => {
    const result = validateMeasurementEntry(entry);
    if (!result.success) {
      errors.push(`Invalid measurement entry: ${JSON.stringify(result.error)}`);
      return false;
    }
    return true;
  });

  // Check service coverage
  const requiredCategories = new Set<MeasurementCategory>();

  // Map services to required categories (simplified)
  services.forEach((service) => {
    switch (service) {
      case "WC":
      case "GR":
        requiredCategories.add("glass_windows");
        requiredCategories.add("glass_doors");
        break;
      case "BWP":
      case "BWS":
      case "HBW":
        requiredCategories.add("facade_brick");
        requiredCategories.add("facade_concrete");
        break;
      // Add more mappings as needed
    }
  });

  const providedCategories = new Set(
    validEntries.map((entry: any) => entry.category),
  );

  requiredCategories.forEach((category) => {
    if (!providedCategories.has(category)) {
      warnings.push(`Missing measurements for ${category}`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// Export validation types
export type MeasurementEntryType = z.infer<typeof MeasurementEntrySchema>;
export type MeasurementEntryUpdateType = z.infer<
  typeof MeasurementEntryUpdateSchema
>;
export type BulkMeasurementType = z.infer<typeof BulkMeasurementSchema>;
