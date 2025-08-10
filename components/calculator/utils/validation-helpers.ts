import { z } from "zod";

/**
 * Common validation rules for calculator forms
 */
export const validationRules = {
  // Numeric validations
  positiveNumber: z.number().positive("Must be a positive number"),
  nonNegativeNumber: z.number().nonnegative("Cannot be negative"),
  percentage: z
    .number()
    .min(0, "Cannot be less than 0%")
    .max(100, "Cannot be more than 100%"),
  currency: z
    .number()
    .nonnegative("Amount cannot be negative")
    .multipleOf(0.01),

  // String validations
  nonEmptyString: z.string().min(1, "Required field"),
  email: z.string().email("Invalid email address"),
  phone: z.string().regex(/^\+?[\d\s\-\(\)]+$/, "Invalid phone number"),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, "Invalid ZIP code"),

  // Date validations
  futureDate: z.date().refine((date) => date > new Date(), {
    message: "Date must be in the future",
  }),
  pastDate: z.date().refine((date) => date < new Date(), {
    message: "Date must be in the past",
  }),

  // Common business rules
  crewSize: z.number().int().min(1).max(20),
  shiftLength: z.number().min(1).max(24),
  squareFootage: z.number().positive().max(1000000),
  hourlyRate: z.number().min(15).max(500),
  markup: z.number().min(0).max(500),
};

/**
 * Common form field configurations
 */
export const formFieldConfigs = {
  squareFootage: {
    label: "Square Footage",
    placeholder: "Enter area in sq ft",
    description: "Total area to be serviced",
    type: "number",
    min: 1,
    step: 1,
  },
  linearFeet: {
    label: "Linear Feet",
    placeholder: "Enter length in feet",
    description: "Total linear measurement",
    type: "number",
    min: 1,
    step: 0.1,
  },
  hourlyRate: {
    label: "Hourly Rate",
    placeholder: "$0.00",
    description: "Rate per hour per worker",
    type: "number",
    min: 15,
    step: 0.5,
  },
  markup: {
    label: "Markup Percentage",
    placeholder: "0%",
    description: "Profit margin to add",
    type: "number",
    min: 0,
    max: 500,
    step: 5,
  },
  crewSize: {
    label: "Crew Size",
    placeholder: "Number of workers",
    description: "Total workers on the job",
    type: "number",
    min: 1,
    max: 20,
    step: 1,
  },
};

/**
 * Validation error messages
 */
export const errorMessages = {
  required: "This field is required",
  invalidNumber: "Please enter a valid number",
  outOfRange: (min: number, max: number) =>
    `Value must be between ${min} and ${max}`,
  tooLow: (min: number) => `Value must be at least ${min}`,
  tooHigh: (max: number) => `Value cannot exceed ${max}`,
  invalidFormat: "Invalid format",
  calculationError: "Unable to calculate. Please check your inputs.",
};

/**
 * Helper to create consistent validation schemas
 */
export function createBaseSchema() {
  return z.object({
    location: z.string().min(1, "Location is required"),
    crewSize: validationRules.crewSize,
    shiftLength: validationRules.shiftLength,
    hourlyRate: validationRules.hourlyRate,
    markup: validationRules.markup.optional().default(30),
  });
}

/**
 * Validate and sanitize numeric input
 */
export function sanitizeNumericInput(value: string): number | null {
  const cleaned = value.replace(/[^0-9.-]/g, "");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Format currency values consistently
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

/**
 * Format percentage values consistently
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * Check if a form field has errors
 */
export function hasFieldError(
  fieldName: string,
  errors: Record<string, any>,
): boolean {
  return fieldName.split(".").reduce((acc, key) => acc?.[key], errors) != null;
}

/**
 * Get field error message
 */
export function getFieldError(
  fieldName: string,
  errors: Record<string, any>,
): string | undefined {
  const error = fieldName.split(".").reduce((acc, key) => acc?.[key], errors);
  return error?.message;
}
