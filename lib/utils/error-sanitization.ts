/**
 * Error sanitization utilities
 * Prevents XSS attacks and sensitive data leakage in error messages
 */

// List of sensitive patterns to redact
const SENSITIVE_PATTERNS = [
  /password/gi,
  /token/gi,
  /secret/gi,
  /api[_-]?key/gi,
  /authorization/gi,
  /bearer\s+[a-zA-Z0-9\-._~+/]+=*/gi,
  /key:\s*['""][^'"]*['"]/gi,
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi, // Email addresses
  /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/gi, // Credit card numbers
  /\b\d{3}[- ]?\d{2}[- ]?\d{4}\b/gi, // SSN pattern
];

// HTML entities for XSS prevention
const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;",
  "`": "&#96;",
  "=": "&#x3D;",
};

/**
 * Escape HTML to prevent XSS attacks
 */
export function escapeHtml(text: string): string {
  if (typeof text !== "string") return "";

  return text.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] || char);
}

/**
 * Sanitize error message by removing sensitive information
 */
export function sanitizeErrorMessage(message: string): string {
  if (typeof message !== "string") return "";

  let sanitized = message;

  // Remove sensitive patterns
  SENSITIVE_PATTERNS.forEach((pattern) => {
    sanitized = sanitized.replace(pattern, "[REDACTED]");
  });

  // Escape HTML to prevent XSS
  sanitized = escapeHtml(sanitized);

  // Limit length to prevent DoS
  const MAX_LENGTH = 500;
  if (sanitized.length > MAX_LENGTH) {
    sanitized = sanitized.substring(0, MAX_LENGTH) + "...";
  }

  return sanitized;
}

/**
 * Sanitize technical details for development mode
 */
export function sanitizeTechnicalDetails(details: string): string {
  if (typeof details !== "string") return "";

  let sanitized = details;

  // More aggressive sanitization for technical details
  const TECHNICAL_PATTERNS = [
    /file:\/\/[^\s]+/gi, // File paths
    /https?:\/\/[^\s]+/gi, // URLs (except in allowed contexts)
    /localhost:\d+/gi, // Local development URLs
    /127\.0\.0\.1:\d+/gi, // Local IPs
    /192\.168\.\d+\.\d+/gi, // Private IPs
    /10\.\d+\.\d+\.\d+/gi, // Private IPs
    /\/Users\/[^/\s]+/gi, // Mac user paths
    /C:\\Users\\[^\\s]+/gi, // Windows user paths
    /\/home\/[^/\s]+/gi, // Linux user paths
  ];

  TECHNICAL_PATTERNS.forEach((pattern) => {
    sanitized = sanitized.replace(pattern, "[PATH_REDACTED]");
  });

  // Apply general sanitization
  return sanitizeErrorMessage(sanitized);
}

/**
 * Check if current environment allows technical details
 */
export function shouldShowTechnicalDetails(): boolean {
  return process.env.NODE_ENV === "development";
}

/**
 * Sanitize user-friendly message for safe display
 */
export function sanitizeUserMessage(message: string): string {
  if (typeof message !== "string") return "An error occurred";

  // User messages should be even more strictly sanitized
  let sanitized = message;

  // Remove any potential script content
  sanitized = sanitized.replace(/<script[\s\S]*?<\/script>/gi, "");
  sanitized = sanitized.replace(/javascript:/gi, "");
  sanitized = sanitized.replace(/on\w+\s*=/gi, ""); // Remove event handlers

  // Apply general sanitization
  sanitized = sanitizeErrorMessage(sanitized);

  // Ensure it's not empty
  return sanitized.trim() || "An error occurred";
}

/**
 * Validate and sanitize error context data
 */
export function sanitizeErrorContext(
  context: Record<string, any>,
): Record<string, any> {
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(context)) {
    // Skip sensitive keys
    if (SENSITIVE_PATTERNS.some((pattern) => pattern.test(key))) {
      sanitized[key] = "[REDACTED]";
      continue;
    }

    if (typeof value === "string") {
      sanitized[key] = sanitizeErrorMessage(value);
    } else if (typeof value === "number" || typeof value === "boolean") {
      sanitized[key] = value;
    } else if (value === null || value === undefined) {
      sanitized[key] = value;
    } else {
      // For objects and arrays, stringify then sanitize
      try {
        const stringified = JSON.stringify(value);
        sanitized[key] = sanitizeErrorMessage(stringified);
      } catch {
        sanitized[key] = "[SERIALIZATION_ERROR]";
      }
    }
  }

  return sanitized;
}

/**
 * Rate limiter for error logging to prevent spam
 */
class ErrorRateLimiter {
  private readonly counts = new Map<
    string,
    { count: number; resetTime: number }
  >();
  private readonly maxAttempts = 10;
  private readonly windowMs = 60000; // 1 minute

  shouldAllow(key: string): boolean {
    const now = Date.now();
    const record = this.counts.get(key);

    if (!record || now >= record.resetTime) {
      this.counts.set(key, { count: 1, resetTime: now + this.windowMs });
      return true;
    }

    if (record.count >= this.maxAttempts) {
      return false;
    }

    record.count++;
    return true;
  }

  reset(key?: string): void {
    if (key) {
      this.counts.delete(key);
    } else {
      this.counts.clear();
    }
  }
}

export const errorRateLimiter = new ErrorRateLimiter();
