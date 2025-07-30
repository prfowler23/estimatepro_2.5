// AI Input Validation and Sanitization
import { z } from "zod";
import DOMPurify from "isomorphic-dompurify";
import { ServiceType } from "@/lib/types/estimate-types";

// Sanitize string input to prevent XSS
export function sanitizeInput(input: string): string {
  // Remove any HTML tags and scripts
  const cleaned = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });

  // Additional sanitization for common injection patterns
  return cleaned
    .replace(/[<>]/g, "") // Remove angle brackets
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, "") // Remove event handlers
    .trim();
}

// Validate and sanitize AI-extracted data
export const AIExtractedDataSchema = z.object({
  requirements: z.object({
    buildingType: z.string().transform(sanitizeInput).optional(),
    buildingSize: z.string().transform(sanitizeInput).optional(),
    floors: z.number().min(1).max(200).optional(),
    timeline: z.string().transform(sanitizeInput).optional(),
    services: z.array(z.string()).optional(),
    specialRequirements: z
      .array(z.string().transform(sanitizeInput))
      .optional(),
  }),
  contact: z
    .object({
      name: z.string().transform(sanitizeInput).optional(),
      email: z.string().email().optional(),
      phone: z.string().transform(sanitizeInput).optional(),
      company: z.string().transform(sanitizeInput).optional(),
    })
    .optional(),
  confidence: z.number().min(0).max(1),
});

// Validate service suggestion data
export const ServiceSuggestionSchema = z.object({
  serviceType: z.enum([
    "WC",
    "PW",
    "SW",
    "BF",
    "GR",
    "FR",
    "HD",
    "FC",
    "GRC",
    "PWS",
    "PD",
    "GC",
  ] as const),
  confidence: z.number().min(0).max(1),
  reason: z.string().transform(sanitizeInput),
  priority: z.enum(["high", "medium", "low"]),
  estimatedValue: z.number().positive().optional(),
  compatibility: z.array(z.string()),
  risks: z.array(z.string().transform(sanitizeInput)).optional(),
});

// Validate AI message content
export const AIMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().transform(sanitizeInput),
  timestamp: z.date().optional(),
});

// URL validation for image analysis
export const ImageURLSchema = z
  .string()
  .url()
  .refine(
    (url) => {
      try {
        const parsed = new URL(url);
        // Only allow http/https protocols
        if (!["http:", "https:"].includes(parsed.protocol)) {
          return false;
        }
        // Prevent localhost and internal IPs
        const hostname = parsed.hostname.toLowerCase();
        if (
          hostname === "localhost" ||
          hostname === "127.0.0.1" ||
          hostname.startsWith("192.168.") ||
          hostname.startsWith("10.") ||
          hostname.startsWith("172.") ||
          hostname.includes("internal") ||
          hostname.includes("local")
        ) {
          return false;
        }
        return true;
      } catch {
        return false;
      }
    },
    {
      message: "Invalid or potentially unsafe URL",
    },
  );

// Validate tool arguments
export const ToolArgumentsSchema = z.object({
  toolName: z.string().regex(/^[a-zA-Z0-9_-]+$/, "Invalid tool name"),
  parameters: z.record(z.unknown()).transform((params) => {
    // Sanitize string parameters
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === "string") {
        sanitized[key] = sanitizeInput(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }),
});

// File upload validation
export const FileUploadSchema = z.object({
  name: z.string().transform(sanitizeInput),
  type: z.string().regex(/^[a-zA-Z0-9\/\-+.]+$/, "Invalid file type"),
  size: z.number().max(10 * 1024 * 1024, "File too large (max 10MB)"),
  content: z.string().optional(),
});

// Batch validation helper
export function validateAIInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): { success: boolean; data?: T; error?: string } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors.map((e) => e.message).join(", "),
      };
    }
    return { success: false, error: "Validation failed" };
  }
}

// Export all schemas
export const AIValidationSchemas = {
  extractedData: AIExtractedDataSchema,
  serviceSuggestion: ServiceSuggestionSchema,
  message: AIMessageSchema,
  imageURL: ImageURLSchema,
  toolArguments: ToolArgumentsSchema,
  fileUpload: FileUploadSchema,
} as const;
