import DOMPurify from "isomorphic-dompurify";
import { z } from "zod";
import { nanoid } from "nanoid";

// Sanitize user input to prevent XSS attacks
export function sanitizeInput(input: unknown): string {
  if (typeof input !== "string") {
    return String(input || "");
  }

  // Configure DOMPurify for calculator-specific needs
  const clean = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // No HTML tags allowed in calculator inputs
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });

  return clean;
}

// Sanitize numeric input
export function sanitizeNumericInput(input: unknown): number {
  const num = Number(input);
  if (isNaN(num) || !isFinite(num)) {
    return 0;
  }
  return num;
}

// Generate secure, collision-resistant IDs
export function generateSecureId(prefix?: string): string {
  const id = nanoid();
  return prefix ? `${prefix}-${id}` : id;
}

// Validate and sanitize calculator form data
export function sanitizeCalculatorData<T extends Record<string, any>>(
  data: T,
  schema: z.ZodSchema<T>,
): T | null {
  try {
    // First validate with Zod
    const validated = schema.parse(data);

    // Then sanitize string fields
    const sanitized = Object.entries(validated).reduce((acc, [key, value]) => {
      if (typeof value === "string") {
        acc[key] = sanitizeInput(value);
      } else {
        acc[key] = value;
      }
      return acc;
    }, {} as any);

    return sanitized as T;
  } catch (error) {
    console.error("Calculator data validation failed:", error);
    return null;
  }
}

// Rate limiting for form submissions
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS = 30; // 30 requests per minute

export function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return true;
  }

  if (entry.count >= MAX_REQUESTS) {
    return false;
  }

  entry.count++;
  return true;
}

// Clean up old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, RATE_LIMIT_WINDOW);
