/**
 * Comprehensive validation utilities with enhanced type safety and security
 * Provides validation for common data types with proper error handling
 */

import { ValidationError } from "./null-safety";

// Email validation with comprehensive pattern matching
export const validateEmail = (email: string): boolean => {
  // Enhanced email regex that handles most valid email formats
  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  // Additional checks for common invalid patterns
  if (!email || email.length > 254) return false;
  if (email.startsWith(".") || email.endsWith(".")) return false;
  if (email.includes("..")) return false;

  return emailRegex.test(email.toLowerCase());
};

// Phone number validation (international format)
export const validatePhone = (phone: string): boolean => {
  // Remove all non-digit characters for validation
  const cleaned = phone.replace(/\D/g, "");

  // Check for reasonable length (7-15 digits for international numbers)
  return cleaned.length >= 7 && cleaned.length <= 15;
};

// URL validation with security considerations
export const validateUrl = (
  url: string,
  allowedProtocols: string[] = ["http", "https"],
): boolean => {
  try {
    const parsed = new URL(url);

    // Check protocol whitelist
    const protocol = parsed.protocol.slice(0, -1); // Remove trailing ':'
    if (!allowedProtocols.includes(protocol)) return false;

    // Additional security checks
    if (
      parsed.hostname === "localhost" &&
      !allowedProtocols.includes("localhost")
    )
      return false;
    if (
      parsed.hostname.match(/^\d+\.\d+\.\d+\.\d+$/) &&
      !allowedProtocols.includes("ip")
    )
      return false;

    return true;
  } catch {
    return false;
  }
};

// Password strength validation
export const validatePasswordStrength = (
  password: string,
  options: {
    minLength?: number;
    requireUppercase?: boolean;
    requireLowercase?: boolean;
    requireNumbers?: boolean;
    requireSymbols?: boolean;
    maxLength?: number;
  } = {},
): { isValid: boolean; score: number; feedback: string[] } => {
  const {
    minLength = 8,
    requireUppercase = true,
    requireLowercase = true,
    requireNumbers = true,
    requireSymbols = false,
    maxLength = 128,
  } = options;

  const feedback: string[] = [];
  let score = 0;

  // Length checks
  if (password.length < minLength) {
    feedback.push(`Password must be at least ${minLength} characters long`);
  } else {
    score += 1;
  }

  if (password.length > maxLength) {
    feedback.push(`Password must be no more than ${maxLength} characters long`);
  }

  // Character type checks
  if (requireUppercase && !/[A-Z]/.test(password)) {
    feedback.push("Password must contain at least one uppercase letter");
  } else if (/[A-Z]/.test(password)) {
    score += 1;
  }

  if (requireLowercase && !/[a-z]/.test(password)) {
    feedback.push("Password must contain at least one lowercase letter");
  } else if (/[a-z]/.test(password)) {
    score += 1;
  }

  if (requireNumbers && !/\d/.test(password)) {
    feedback.push("Password must contain at least one number");
  } else if (/\d/.test(password)) {
    score += 1;
  }

  if (
    requireSymbols &&
    !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  ) {
    feedback.push("Password must contain at least one symbol");
  } else if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score += 1;
  }

  // Additional strength checks
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;
  if (/[^A-Za-z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password))
    score += 1;

  return {
    isValid: feedback.length === 0,
    score: Math.min(score, 10), // Cap at 10
    feedback,
  };
};

// Generic validation function with custom validators
export const validate = <T>(
  value: T,
  validators: Array<{
    validator: (val: T) => boolean;
    message: string;
    code?: string;
  }>,
  fieldName?: string,
): T => {
  for (const { validator, message, code } of validators) {
    if (!validator(value)) {
      throw new ValidationError(
        message,
        fieldName,
        code || "VALIDATION_FAILED",
      );
    }
  }

  return value;
};

// Common validators object for easy reuse
export const validators = {
  required: <T>(value: T | null | undefined): value is T => {
    return value !== null && value !== undefined && value !== "";
  },

  minLength: (min: number) => (value: string) => {
    return typeof value === "string" && value.length >= min;
  },

  maxLength: (max: number) => (value: string) => {
    return typeof value === "string" && value.length <= max;
  },

  pattern: (regex: RegExp) => (value: string) => {
    return typeof value === "string" && regex.test(value);
  },

  min: (min: number) => (value: number) => {
    return typeof value === "number" && value >= min;
  },

  max: (max: number) => (value: number) => {
    return typeof value === "number" && value <= max;
  },

  range: (min: number, max: number) => (value: number) => {
    return typeof value === "number" && value >= min && value <= max;
  },

  oneOf:
    <T>(allowedValues: T[]) =>
    (value: T) => {
      return allowedValues.includes(value);
    },

  email: (value: string) => validateEmail(value),
  phone: (value: string) => validatePhone(value),
  url: (value: string) => validateUrl(value),
} as const;
