/**
 * Rate limiting utility for API endpoints
 * Prevents abuse and implements proper rate limiting
 */

import { NextRequest, NextResponse } from "next/server";

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (req: NextRequest) => string; // Custom key generator
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
  message?: string; // Custom error message
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

// In-memory store for rate limiting
// In production, you'd want to use Redis or similar
class InMemoryStore {
  private store: Map<string, { count: number; resetTime: number }> = new Map();

  increment(
    key: string,
    windowMs: number,
  ): { count: number; resetTime: number } {
    const now = Date.now();
    const current = this.store.get(key);

    if (!current || now > current.resetTime) {
      // New window or expired window
      const resetTime = now + windowMs;
      this.store.set(key, { count: 1, resetTime });
      return { count: 1, resetTime };
    }

    // Increment existing window
    current.count++;
    this.store.set(key, current);
    return current;
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.store.entries()) {
      if (now > value.resetTime) {
        this.store.delete(key);
      }
    }
  }
}

const store = new InMemoryStore();

// Cleanup expired entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => store.cleanup(), 5 * 60 * 1000);
}

/**
 * Default key generator using IP address
 */
function defaultKeyGenerator(req: NextRequest): string {
  // Try to get real IP from headers (for reverse proxies)
  const forwarded = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  if (realIp) {
    return realIp;
  }

  // NextRequest.ip is not available in newer versions of Next.js
  // Fall back to localhost IP as default
  return "127.0.0.1";
}

/**
 * Rate limiting middleware
 */
export function rateLimit(config: RateLimitConfig) {
  const {
    windowMs = 60000, // 1 minute
    maxRequests = 100,
    keyGenerator = defaultKeyGenerator,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    message = "Too many requests, please try again later.",
  } = config;

  return async (req: NextRequest): Promise<RateLimitResult> => {
    const key = keyGenerator(req);
    const result = store.increment(key, windowMs);

    const success = result.count <= maxRequests;
    const remaining = Math.max(0, maxRequests - result.count);
    const retryAfter = success
      ? undefined
      : Math.ceil((result.resetTime - Date.now()) / 1000);

    return {
      success,
      limit: maxRequests,
      remaining,
      reset: result.resetTime,
      retryAfter,
    };
  };
}

/**
 * Middleware wrapper for API routes
 */
export function withRateLimit(config: RateLimitConfig) {
  const limiter = rateLimit(config);

  return async (
    req: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>,
  ) => {
    const result = await limiter(req);

    if (!result.success) {
      return NextResponse.json(
        {
          error: config.message || "Rate limit exceeded",
          limit: result.limit,
          remaining: result.remaining,
          reset: result.reset,
          retryAfter: result.retryAfter,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": result.limit.toString(),
            "X-RateLimit-Remaining": result.remaining.toString(),
            "X-RateLimit-Reset": result.reset.toString(),
            "Retry-After": result.retryAfter?.toString() || "60",
          },
        },
      );
    }

    // Add rate limit headers to successful responses
    const response = await handler(req);
    response.headers.set("X-RateLimit-Limit", result.limit.toString());
    response.headers.set("X-RateLimit-Remaining", result.remaining.toString());
    response.headers.set("X-RateLimit-Reset", result.reset.toString());

    return response;
  };
}

/**
 * Predefined rate limiting configurations
 */
export const rateLimitConfigs = {
  // General API endpoints
  api: {
    windowMs: 60000, // 1 minute
    maxRequests: 100,
    message: "Too many API requests, please try again later.",
  },

  // Authentication endpoints
  auth: {
    windowMs: 300000, // 5 minutes
    maxRequests: 5,
    message: "Too many authentication attempts, please try again later.",
  },

  // AI endpoints (more restrictive)
  ai: {
    windowMs: 60000, // 1 minute
    maxRequests: 20,
    message: "Too many AI requests, please try again later.",
  },

  // File upload endpoints
  upload: {
    windowMs: 60000, // 1 minute
    maxRequests: 10,
    message: "Too many file uploads, please try again later.",
  },

  // Email endpoints
  email: {
    windowMs: 300000, // 5 minutes
    maxRequests: 3,
    message: "Too many email requests, please try again later.",
  },

  // Database write operations
  write: {
    windowMs: 60000, // 1 minute
    maxRequests: 50,
    message: "Too many write operations, please try again later.",
  },
} as const;

/**
 * User-specific rate limiting (requires authentication)
 */
export function userRateLimit(config: RateLimitConfig) {
  return rateLimit({
    ...config,
    keyGenerator: (req: NextRequest) => {
      // Extract user ID from auth token or session
      const authHeader = req.headers.get("authorization");
      const sessionCookie = req.cookies.get("session");

      if (authHeader) {
        // Extract user ID from JWT token (simplified)
        try {
          const token = authHeader.replace("Bearer ", "");
          const payload = JSON.parse(atob(token.split(".")[1]));
          return `user:${payload.sub || payload.user_id}`;
        } catch {
          // Fall back to IP-based limiting
          return defaultKeyGenerator(req);
        }
      }

      if (sessionCookie) {
        return `session:${sessionCookie.value}`;
      }

      // Fall back to IP-based limiting
      return defaultKeyGenerator(req);
    },
  });
}

/**
 * Helper function to apply rate limiting to API route handlers
 */
export function apiRateLimit(config?: Partial<RateLimitConfig>) {
  const finalConfig = { ...rateLimitConfigs.api, ...config };
  return withRateLimit(finalConfig);
}

/**
 * Helper function for AI endpoint rate limiting
 */
export function aiRateLimit(config?: Partial<RateLimitConfig>) {
  const finalConfig = { ...rateLimitConfigs.ai, ...config };
  return withRateLimit(finalConfig);
}

/**
 * Helper function for auth endpoint rate limiting
 */
export function authRateLimit(config?: Partial<RateLimitConfig>) {
  const finalConfig = { ...rateLimitConfigs.auth, ...config };
  return withRateLimit(finalConfig);
}
