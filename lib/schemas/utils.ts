/**
 * Schema validation utilities and helpers
 * Provides reusable validation functions, transformers, and error formatters
 */

import { z } from "zod";
import DOMPurify from "isomorphic-dompurify";

/**
 * Enhanced validation result type
 */
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
  warnings?: string[];
}

/**
 * Structured validation error
 */
export interface ValidationError {
  path: string;
  message: string;
  code?: string;
  context?: Record<string, any>;
}

/**
 * Generic request validation with enhanced error handling
 */
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): ValidationResult<T> {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: ValidationError[] = error.errors.map((err) => ({
        path: err.path.join("."),
        message: err.message,
        code: err.code,
        context: {
          expected: (err as any).expected,
          received: (err as any).received,
          validation: (err as any).validation,
        },
      }));
      return { success: false, errors };
    }
    return {
      success: false,
      errors: [
        { path: "", message: "Validation failed", code: "UNKNOWN_ERROR" },
      ],
    };
  }
}

/**
 * Safe parsing with default value fallback
 */
export function safeParse<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  defaultValue: T,
): T {
  const result = schema.safeParse(data);
  return result.success ? result.data : defaultValue;
}

/**
 * Batch validation for multiple items
 */
export function batchValidate<T>(
  schema: z.ZodSchema<T>,
  items: unknown[],
): ValidationResult<T[]> {
  const validItems: T[] = [];
  const allErrors: ValidationError[] = [];

  items.forEach((item, index) => {
    const result = validateRequest(schema, item);
    if (result.success && result.data) {
      validItems.push(result.data);
    } else if (result.errors) {
      allErrors.push(
        ...result.errors.map((err) => ({
          ...err,
          path: `[${index}].${err.path}`,
        })),
      );
    }
  });

  return {
    success: allErrors.length === 0,
    data: validItems,
    errors: allErrors.length > 0 ? allErrors : undefined,
  };
}

// ============================================
// Transform Functions
// ============================================

/**
 * Normalize phone number to E.164 format
 */
export function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, "");

  // Handle US phone numbers (assume US if 10 digits without country code)
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  // Already has country code
  if (digits.length === 11 && digits[0] === "1") {
    return `+${digits}`;
  }

  // Return with + if not already present
  return digits.startsWith("+") ? digits : `+${digits}`;
}

/**
 * Normalize email address (lowercase, trim whitespace)
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Ensure URL has protocol
 */
export function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

/**
 * Convert string to proper case
 */
export function toProperCase(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Truncate string with ellipsis
 */
export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength - 3)}...`;
}

// ============================================
// Sanitization Functions
// ============================================

/**
 * Enhanced string sanitization with XSS protection
 */
export function sanitizeString(input: string): string {
  // Use DOMPurify for comprehensive XSS protection
  const cleaned = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });

  // Additional cleanup
  return cleaned
    .trim()
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // Remove control characters
    .replace(/\s+/g, " "); // Normalize whitespace
}

/**
 * Sanitize HTML content (allow basic formatting)
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "p", "br", "ul", "ol", "li"],
    ALLOWED_ATTR: [],
  });
}

/**
 * Deep sanitize object recursively
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = {} as T;

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      sanitized[key as keyof T] = value;
    } else if (typeof value === "string") {
      sanitized[key as keyof T] = sanitizeString(value) as T[keyof T];
    } else if (Array.isArray(value)) {
      sanitized[key as keyof T] = value.map((item) =>
        typeof item === "string"
          ? sanitizeString(item)
          : typeof item === "object" && item !== null
            ? sanitizeObject(item)
            : item,
      ) as T[keyof T];
    } else if (typeof value === "object") {
      sanitized[key as keyof T] = sanitizeObject(value) as T[keyof T];
    } else {
      sanitized[key as keyof T] = value;
    }
  }

  return sanitized;
}

/**
 * Remove sensitive data from object
 */
export function removeSensitiveData<T extends Record<string, any>>(
  obj: T,
  sensitiveKeys: string[] = ["password", "token", "secret", "apiKey", "ssn"],
): Partial<T> {
  const cleaned = { ...obj };

  for (const key of Object.keys(cleaned)) {
    if (
      sensitiveKeys.some((sensitive) => key.toLowerCase().includes(sensitive))
    ) {
      delete cleaned[key];
    }
  }

  return cleaned;
}

// ============================================
// Custom Zod Validators
// ============================================

/**
 * Create a trimmed string schema
 */
export const trimmedString = () => z.string().transform((val) => val.trim());

/**
 * Create a normalized email schema
 */
export const normalizedEmail = () =>
  z.string().email("Invalid email format").transform(normalizeEmail);

/**
 * Create a normalized phone schema
 */
export const normalizedPhone = () =>
  z
    .string()
    .regex(/^\+?[\d\s\-\(\)]+$/, "Invalid phone number format")
    .transform(normalizePhoneNumber);

/**
 * Create a normalized URL schema
 */
export const normalizedUrl = () =>
  z.string().url("Invalid URL format").transform(normalizeUrl);

/**
 * Create a sanitized string schema
 */
export const sanitizedString = () => z.string().transform(sanitizeString);

/**
 * Create a date string schema that validates ISO format
 */
export const isoDateString = () =>
  z.string().datetime({ message: "Invalid date format (ISO 8601 required)" });

/**
 * Create a percentage schema (0-100)
 */
export const percentage = (message = "Must be between 0 and 100") =>
  z.number().min(0, message).max(100, message);

/**
 * Create a positive number schema with custom message
 */
export const positiveNumber = (message = "Must be a positive number") =>
  z.number().positive(message);

/**
 * Create a non-negative number schema
 */
export const nonNegativeNumber = (message = "Must be non-negative") =>
  z.number().nonnegative(message);

/**
 * Create a bounded number schema
 */
export const boundedNumber = (min: number, max: number) =>
  z
    .number()
    .min(min, `Must be at least ${min}`)
    .max(max, `Must be no more than ${max}`);

/**
 * Create a string with length constraints
 */
export const boundedString = (min: number, max: number) =>
  z
    .string()
    .min(min, `Must be at least ${min} characters`)
    .max(max, `Must be no more than ${max} characters`);

// ============================================
// Conditional Validation Helpers
// ============================================

/**
 * Create a conditionally required field
 */
export function conditionallyRequired<T extends z.ZodTypeAny>(
  schema: T,
  condition: (data: any) => boolean,
  message = "This field is required",
) {
  return schema.refine(
    (val: any, ctx: any) => {
      if (condition(ctx.parent) && !val) {
        return false;
      }
      return true;
    },
    { message },
  );
}

/**
 * Create a field that requires another field
 */
export function requiresField<T extends z.ZodTypeAny>(
  schema: T,
  requiredField: string,
  message?: string,
) {
  return conditionallyRequired(
    schema,
    (data) => !!data[requiredField],
    message || `Required when ${requiredField} is provided`,
  );
}

// ============================================
// Error Formatting
// ============================================

/**
 * Format validation errors for display
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  return errors
    .map((err) => {
      const path = err.path ? `${err.path}: ` : "";
      return `${path}${err.message}`;
    })
    .join("; ");
}

/**
 * Group validation errors by path
 */
export function groupErrorsByPath(
  errors: ValidationError[],
): Record<string, string[]> {
  const grouped: Record<string, string[]> = {};

  errors.forEach((err) => {
    const path = err.path || "general";
    if (!grouped[path]) {
      grouped[path] = [];
    }
    grouped[path].push(err.message);
  });

  return grouped;
}

/**
 * Get first error for a specific path
 */
export function getFieldError(
  errors: ValidationError[],
  fieldPath: string,
): string | undefined {
  const error = errors.find((err) => err.path === fieldPath);
  return error?.message;
}

// ============================================
// Composite Validators
// ============================================

/**
 * Validate date range (start must be before end)
 */
export function validateDateRange(
  startDate: string | Date,
  endDate: string | Date,
): boolean {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return start < end;
}

/**
 * Validate that at least one field in a group has a value
 */
export function validateAtLeastOne<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[],
): boolean {
  return fields.some(
    (field) => obj[field] !== undefined && obj[field] !== null,
  );
}

/**
 * Validate mutually exclusive fields (only one can be set)
 */
export function validateMutuallyExclusive<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[],
): boolean {
  const setFields = fields.filter(
    (field) => obj[field] !== undefined && obj[field] !== null,
  );
  return setFields.length <= 1;
}

// ============================================
// Rate Limiting / Security Helpers
// ============================================

/**
 * Check if content appears to be spam or malicious
 */
export function isLikelySpam(content: string): boolean {
  const spamPatterns = [
    /\b(viagra|cialis|casino|lottery|winner|claim your prize)\b/gi,
    /\b(click here|act now|limited time|urgent)\b/gi,
    /(http|https):\/\/[^\s]+/g, // Excessive URLs
  ];

  const urlCount = (content.match(/(http|https):\/\/[^\s]+/g) || []).length;
  const suspiciousCount = spamPatterns.reduce(
    (count, pattern) => count + (content.match(pattern) || []).length,
    0,
  );

  return urlCount > 5 || suspiciousCount > 3;
}

/**
 * Validate request rate (simple in-memory rate limiting)
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60000,
): boolean {
  const now = Date.now();
  const record = requestCounts.get(identifier);

  if (!record || now > record.resetTime) {
    requestCounts.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

/**
 * Clean expired rate limit records
 */
export function cleanRateLimitRecords(): void {
  const now = Date.now();
  for (const [key, record] of requestCounts.entries()) {
    if (now > record.resetTime) {
      requestCounts.delete(key);
    }
  }
}

// ============================================
// Type Guards
// ============================================

/**
 * Check if value is a valid UUID
 */
export function isUUID(value: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Check if value is a valid email
 */
export function isEmail(value: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(value);
}

/**
 * Check if value is a valid phone number
 */
export function isPhoneNumber(value: string): boolean {
  const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
  const digitsOnly = value.replace(/\D/g, "");
  return (
    phoneRegex.test(value) && digitsOnly.length >= 10 && digitsOnly.length <= 15
  );
}
