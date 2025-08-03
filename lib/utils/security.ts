/**
 * Security utilities for input validation, sanitization, and protection
 */

import { NextRequest } from "next/server";
import DOMPurify from "isomorphic-dompurify";

/**
 * Input sanitization utilities
 */
export const sanitize = {
  /**
   * Sanitize HTML content to prevent XSS
   */
  html(input: string): string {
    // Use isomorphic-dompurify which handles both server and client environments
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [
        "p",
        "br",
        "strong",
        "em",
        "u",
        "ul",
        "ol",
        "li",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
      ],
      ALLOWED_ATTR: ["class", "id"],
    });
  },

  /**
   * Sanitize text input
   */
  text(input: string): string {
    return input
      .replace(/[<>]/g, "")
      .replace(/javascript:/gi, "")
      .trim();
  },

  /**
   * Sanitize email input
   */
  email(input: string): string {
    return input
      .toLowerCase()
      .replace(/[^a-z0-9@._-]/g, "")
      .trim();
  },

  /**
   * Sanitize URL input
   */
  url(input: string): string {
    try {
      const url = new URL(input);
      // Only allow http and https protocols
      if (!["http:", "https:"].includes(url.protocol)) {
        throw new Error("Invalid protocol");
      }
      return url.toString();
    } catch {
      return "";
    }
  },

  /**
   * Sanitize file name
   */
  fileName(input: string): string {
    return input
      .replace(/[^a-zA-Z0-9._-]/g, "")
      .replace(/\.{2,}/g, ".")
      .replace(/^\./, "")
      .slice(0, 255);
  },

  /**
   * NOTE: SQL sanitization should NOT be done through string manipulation.
   * Use parameterized queries with Supabase client instead.
   * This function is removed to prevent security vulnerabilities.
   */
};

/**
 * Input validation utilities
 */
export const validate = {
  /**
   * Validate email format
   */
  email(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  },

  /**
   * Validate URL format
   */
  url(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return ["http:", "https:"].includes(urlObj.protocol);
    } catch {
      return false;
    }
  },

  /**
   * Validate UUID format
   */
  uuid(uuid: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  },

  /**
   * Validate phone number (basic)
   */
  phone(phone: string): boolean {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone);
  },

  /**
   * Validate file size
   */
  fileSize(size: number, maxSize: number = 10 * 1024 * 1024): boolean {
    return size > 0 && size <= maxSize;
  },

  /**
   * Validate file type
   */
  fileType(fileName: string, allowedTypes: string[]): boolean {
    const extension = fileName.split(".").pop()?.toLowerCase();
    return extension ? allowedTypes.includes(extension) : false;
  },

  /**
   * Validate JSON structure
   */
  json(input: string): boolean {
    try {
      JSON.parse(input);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Validate password strength
   */
  password(password: string): {
    isValid: boolean;
    score: number;
    issues: string[];
  } {
    const issues: string[] = [];
    let score = 0;

    if (password.length < 8) {
      issues.push("Password must be at least 8 characters long");
    } else {
      score += 1;
    }

    if (!/[a-z]/.test(password)) {
      issues.push("Password must contain at least one lowercase letter");
    } else {
      score += 1;
    }

    if (!/[A-Z]/.test(password)) {
      issues.push("Password must contain at least one uppercase letter");
    } else {
      score += 1;
    }

    if (!/\d/.test(password)) {
      issues.push("Password must contain at least one number");
    } else {
      score += 1;
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      issues.push("Password must contain at least one special character");
    } else {
      score += 1;
    }

    return {
      isValid: issues.length === 0,
      score,
      issues,
    };
  },
};

/**
 * CSRF protection utilities
 * NOTE: Custom CSRF implementation removed due to security vulnerabilities.
 * Use established libraries like 'csrf' or Next.js built-in CSRF protection.
 *
 * For proper CSRF protection, consider:
 * - Using Next.js built-in CSRF middleware
 * - Implementing SameSite cookie attributes
 * - Using the 'csrf' npm package for server-side protection
 */

/**
 * Content Security Policy utilities
 */
export const csp = {
  /**
   * Generate CSP header value
   */
  generateHeader(): string {
    const directives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Adjust as needed
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://api.openai.com https://*.supabase.co",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ];

    return directives.join("; ");
  },
};

/**
 * Request validation utilities
 */
export const request = {
  /**
   * Validate request method
   */
  validateMethod(req: NextRequest, allowedMethods: string[]): boolean {
    return allowedMethods.includes(req.method);
  },

  /**
   * Validate request origin
   */
  validateOrigin(req: NextRequest, allowedOrigins: string[]): boolean {
    const origin = req.headers.get("origin");
    if (!origin) return false;
    return allowedOrigins.includes(origin);
  },

  /**
   * Validate content type
   */
  validateContentType(req: NextRequest, allowedTypes: string[]): boolean {
    const contentType = req.headers.get("content-type");
    if (!contentType) return false;
    return allowedTypes.some((type) => contentType.includes(type));
  },

  /**
   * Extract and validate authorization token
   */
  extractAuthToken(req: NextRequest): string | null {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return null;

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") return null;

    return parts[1];
  },

  /**
   * Validate request size
   */
  validateSize(req: NextRequest, maxSize: number = 10 * 1024 * 1024): boolean {
    const contentLength = req.headers.get("content-length");
    if (!contentLength) return true; // Allow requests without content-length

    const size = parseInt(contentLength, 10);
    return size <= maxSize;
  },
};

/**
 * Security headers utilities
 */
export const securityHeaders = {
  /**
   * Get security headers for responses
   */
  getHeaders(): Record<string, string> {
    return {
      "X-Frame-Options": "DENY",
      "X-Content-Type-Options": "nosniff",
      "X-XSS-Protection": "1; mode=block",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Content-Security-Policy": csp.generateHeader(),
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    };
  },
};

/**
 * Comprehensive security checker
 */
export function securityCheck(
  req: NextRequest,
  options: {
    allowedMethods?: string[];
    allowedOrigins?: string[];
    allowedContentTypes?: string[];
    requireAuth?: boolean;
    maxRequestSize?: number;
  },
): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Method validation
  if (
    options.allowedMethods &&
    !request.validateMethod(req, options.allowedMethods)
  ) {
    errors.push("Invalid request method");
  }

  // Origin validation
  if (
    options.allowedOrigins &&
    !request.validateOrigin(req, options.allowedOrigins)
  ) {
    errors.push("Invalid request origin");
  }

  // Content type validation
  if (
    options.allowedContentTypes &&
    !request.validateContentType(req, options.allowedContentTypes)
  ) {
    errors.push("Invalid content type");
  }

  // Auth validation
  if (options.requireAuth && !request.extractAuthToken(req)) {
    errors.push("Missing or invalid authorization token");
  }

  // CSRF validation - removed due to security vulnerabilities
  // Use proper CSRF protection libraries instead

  // Size validation
  if (
    options.maxRequestSize &&
    !request.validateSize(req, options.maxRequestSize)
  ) {
    errors.push("Request size exceeds limit");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
