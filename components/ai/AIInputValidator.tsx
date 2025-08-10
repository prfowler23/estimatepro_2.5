"use client";

import React, { useCallback, useMemo } from "react";
import { z, ZodSchema } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { logger } from "@/lib/utils/logger";
import DOMPurify from "isomorphic-dompurify";

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedData?: any;
}

interface AIInputValidatorProps {
  children: React.ReactNode;
  schema?: ZodSchema;
  onValidationError?: (errors: string[]) => void;
  showErrors?: boolean;
  className?: string;
}

/**
 * Comprehensive input validation wrapper for AI components
 * Provides XSS protection, schema validation, and sanitization
 */
export function AIInputValidator({
  children,
  schema,
  onValidationError,
  showErrors = true,
  className = "",
}: AIInputValidatorProps) {
  const [validationErrors, setValidationErrors] = React.useState<string[]>([]);

  /**
   * Sanitize string inputs to prevent XSS attacks
   */
  const sanitizeInput = useCallback((input: any): any => {
    if (typeof input === "string") {
      // Remove potential XSS vectors
      return DOMPurify.sanitize(input, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
        KEEP_CONTENT: true,
      });
    }

    if (Array.isArray(input)) {
      return input.map(sanitizeInput);
    }

    if (input && typeof input === "object") {
      const sanitized: any = {};
      for (const key in input) {
        if (input.hasOwnProperty(key)) {
          sanitized[key] = sanitizeInput(input[key]);
        }
      }
      return sanitized;
    }

    return input;
  }, []);

  /**
   * Validate input against schema and sanitize
   */
  const validateInput = useCallback(
    (data: any): ValidationResult => {
      const errors: string[] = [];

      // First, sanitize the input
      const sanitizedData = sanitizeInput(data);

      // Then validate against schema if provided
      if (schema) {
        try {
          schema.parse(sanitizedData);
        } catch (error) {
          if (error instanceof z.ZodError) {
            errors.push(
              ...error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
            );
          } else {
            errors.push("Validation failed");
          }
        }
      }

      // Additional AI-specific validations
      if (typeof sanitizedData === "string") {
        // Check for prompt injection attempts
        const suspiciousPatterns = [
          /ignore.{0,20}previous.{0,20}instructions/i,
          /system.{0,20}prompt/i,
          /\bexecute\b.{0,20}\bcode\b/i,
          /\bdisregard\b.{0,20}\brules\b/i,
        ];

        for (const pattern of suspiciousPatterns) {
          if (pattern.test(sanitizedData)) {
            errors.push("Input contains potentially harmful patterns");
            logger.warn("Potential prompt injection attempt detected", {
              pattern: pattern.toString(),
            });
            break;
          }
        }

        // Check input length
        if (sanitizedData.length > 10000) {
          errors.push("Input is too long (max 10,000 characters)");
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        sanitizedData,
      };
    },
    [schema, sanitizeInput],
  );

  /**
   * Wrap child components with validation context
   */
  const wrappedChildren = useMemo(() => {
    return React.Children.map(children, (child) => {
      if (!React.isValidElement(child)) return child;

      // Intercept onChange handlers to add validation
      if (child.props.onChange) {
        const originalOnChange = child.props.onChange;
        const validatedOnChange = (value: any) => {
          const validation = validateInput(value);

          if (!validation.isValid) {
            setValidationErrors(validation.errors);
            if (onValidationError) {
              onValidationError(validation.errors);
            }
            logger.warn("AI input validation failed", {
              errors: validation.errors,
            });
          } else {
            setValidationErrors([]);
          }

          // Call original handler with sanitized data
          originalOnChange(validation.sanitizedData || value);
        };

        return React.cloneElement(child as React.ReactElement<any>, {
          onChange: validatedOnChange,
        });
      }

      return child;
    });
  }, [children, validateInput, onValidationError]);

  return (
    <div className={className}>
      {showErrors && validationErrors.length > 0 && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      {wrappedChildren}
    </div>
  );
}

/**
 * Pre-defined validation schemas for common AI inputs
 */
export const AIValidationSchemas = {
  // Text input for AI prompts
  prompt: z
    .string()
    .min(1, "Input is required")
    .max(10000, "Input is too long")
    .refine(
      (val) => !/<script|<iframe|javascript:|onerror=/i.test(val),
      "Input contains potentially unsafe content",
    ),

  // Image URL validation
  imageUrl: z
    .string()
    .url("Invalid URL")
    .refine(
      (url) => /\.(jpg|jpeg|png|gif|webp)$/i.test(url) || url.includes("image"),
      "URL must point to an image",
    ),

  // Building type selection
  buildingType: z.enum([
    "commercial",
    "residential",
    "industrial",
    "institutional",
  ]),

  // Service type selection
  serviceType: z.enum([
    "window_cleaning",
    "pressure_washing",
    "soft_washing",
    "gutter_cleaning",
    "roof_cleaning",
    "solar_panel_cleaning",
  ]),

  // Numeric inputs
  numericInput: z
    .number()
    .min(0, "Value must be positive")
    .max(1000000, "Value is too large"),

  // Email validation
  email: z
    .string()
    .email("Invalid email address")
    .max(255, "Email is too long"),

  // Phone validation
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number"),

  // Date validation
  date: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date"),
};

/**
 * Hook for manual validation in components
 */
export function useAIInputValidation(schema?: ZodSchema) {
  const validate = useCallback(
    (data: any): ValidationResult => {
      const errors: string[] = [];
      let sanitizedData = data;

      // Sanitize first
      if (typeof data === "string") {
        sanitizedData = DOMPurify.sanitize(data, {
          ALLOWED_TAGS: [],
          ALLOWED_ATTR: [],
          KEEP_CONTENT: true,
        });
      }

      // Then validate
      if (schema) {
        try {
          schema.parse(sanitizedData);
        } catch (error) {
          if (error instanceof z.ZodError) {
            errors.push(
              ...error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
            );
          }
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        sanitizedData,
      };
    },
    [schema],
  );

  return { validate };
}

export default AIInputValidator;
