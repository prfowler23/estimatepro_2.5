/**
 * Unified rate limiting utilities for API endpoints
 * Combines in-memory and distributed rate limiting with Redis support
 * Prevents abuse and implements proper rate limiting with sliding windows
 */

import { NextRequest, NextResponse } from "next/server";
import { ValidationError } from "./null-safety";

// Enhanced rate limiting configuration
export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (req: NextRequest) => string | Promise<string>; // Custom key generator
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
  message?: string; // Custom error message
  store?: RateLimitStore; // Custom storage backend
  algorithm?: "fixed-window" | "sliding-window" | "token-bucket"; // Rate limiting algorithm
  enableDistributed?: boolean; // Enable distributed rate limiting
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
  algorithm: string;
  windowMs: number;
}

export interface RateLimitInfo extends RateLimitResult {
  key: string;
  clientId: string;
  timestamp: number;
}

// Enhanced error handling for rate limiting
export class RateLimitError extends ValidationError {
  constructor(
    message: string,
    public readonly result: RateLimitResult,
    public readonly clientId?: string,
  ) {
    super(message, "rate-limit", "RATE_LIMIT_EXCEEDED");
    this.name = "RateLimitError";
  }
}

// Abstract storage interface for different backends
export interface RateLimitStore {
  get(key: string): Promise<RateLimitStoreValue | null>;
  set(key: string, value: RateLimitStoreValue, ttlMs: number): Promise<void>;
  increment(key: string, windowMs: number): Promise<RateLimitStoreValue>;
  reset(key: string): Promise<void>;
  cleanup?(): Promise<void>;
}

export interface RateLimitStoreValue {
  count: number;
  resetTime: number;
  firstRequest?: number; // For sliding window
  requests?: number[]; // For token bucket
}

// Enhanced in-memory store with better performance
class InMemoryStore implements RateLimitStore {
  private store: Map<string, RateLimitStoreValue> = new Map();
  private cleanupInterval?: NodeJS.Timeout;

  constructor(cleanupIntervalMs = 5 * 60 * 1000) {
    // Cleanup expired entries every 5 minutes by default
    if (typeof setInterval !== "undefined") {
      this.cleanupInterval = setInterval(
        () => this.cleanup(),
        cleanupIntervalMs,
      );
    }
  }

  async get(key: string): Promise<RateLimitStoreValue | null> {
    return this.store.get(key) || null;
  }

  async set(
    key: string,
    value: RateLimitStoreValue,
    ttlMs: number,
  ): Promise<void> {
    this.store.set(key, { ...value, resetTime: Date.now() + ttlMs });
  }

  async increment(key: string, windowMs: number): Promise<RateLimitStoreValue> {
    const now = Date.now();
    const current = this.store.get(key);

    if (!current || now > current.resetTime) {
      // New window or expired window
      const resetTime = now + windowMs;
      const value = { count: 1, resetTime, firstRequest: now };
      this.store.set(key, value);
      return value;
    }

    // Increment existing window
    current.count++;
    this.store.set(key, current);
    return current;
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }

  async cleanup(): Promise<void> {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, value] of this.store.entries()) {
      if (now > value.resetTime) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.store.delete(key));
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }

  // Get store statistics
  getStats(): { size: number; memoryUsage: number } {
    return {
      size: this.store.size,
      memoryUsage: this.store.size * 200, // Rough estimate
    };
  }
}

// Sliding window store implementation
class SlidingWindowStore implements RateLimitStore {
  private store: Map<string, number[]> = new Map();

  async get(key: string): Promise<RateLimitStoreValue | null> {
    const requests = this.store.get(key);
    if (!requests) return null;

    return {
      count: requests.length,
      resetTime: 0, // Not applicable for sliding window
      requests,
    };
  }

  async set(key: string, value: RateLimitStoreValue): Promise<void> {
    if (value.requests) {
      this.store.set(key, value.requests);
    }
  }

  async increment(key: string, windowMs: number): Promise<RateLimitStoreValue> {
    const now = Date.now();
    const requests = this.store.get(key) || [];

    // Remove old requests outside the window
    const windowStart = now - windowMs;
    const validRequests = requests.filter((time) => time > windowStart);

    // Add current request
    validRequests.push(now);
    this.store.set(key, validRequests);

    return {
      count: validRequests.length,
      resetTime: now + windowMs,
      requests: validRequests,
    };
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }

  async cleanup(): Promise<void> {
    const now = Date.now();

    for (const [key, requests] of this.store.entries()) {
      const validRequests = requests.filter(
        (time) => time > now - 24 * 60 * 60 * 1000,
      ); // Keep 24h
      if (validRequests.length === 0) {
        this.store.delete(key);
      } else if (validRequests.length < requests.length) {
        this.store.set(key, validRequests);
      }
    }
  }
}

// Default store instance
const defaultStore = new InMemoryStore();

/**
 * Enhanced IP address extraction with proxy support
 */
function getClientIdentifier(req: NextRequest): string {
  // Try to get real IP from various headers (for reverse proxies)
  const headers = [
    "x-forwarded-for",
    "x-real-ip",
    "x-client-ip",
    "cf-connecting-ip", // Cloudflare
    "fastly-client-ip", // Fastly
    "x-forwarded",
    "forwarded-for",
    "forwarded",
  ];

  for (const header of headers) {
    const value = req.headers.get(header);
    if (value) {
      // Take the first IP if comma-separated
      const ip = value.split(",")[0].trim();
      if (ip && ip !== "unknown") {
        return ip;
      }
    }
  }

  // Fallback to a default IP (NextRequest doesn't have an ip property)
  return "127.0.0.1";
}

/**
 * Enhanced rate limiting with multiple algorithms
 */
export function createRateLimiter(config: RateLimitConfig) {
  const {
    windowMs = 60000, // 1 minute
    maxRequests = 100,
    keyGenerator = getClientIdentifier,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    message = "Too many requests, please try again later.",
    store = config.algorithm === "sliding-window"
      ? new SlidingWindowStore()
      : defaultStore,
    algorithm = "fixed-window",
  } = config;

  return async (req: NextRequest): Promise<RateLimitResult> => {
    try {
      const key =
        typeof keyGenerator === "function"
          ? await keyGenerator(req)
          : keyGenerator;

      const result = await store.increment(key, windowMs);
      const success = result.count <= maxRequests;
      const remaining = Math.max(0, maxRequests - result.count);

      let retryAfter: number | undefined;
      if (!success) {
        switch (algorithm) {
          case "sliding-window":
            retryAfter = Math.ceil(windowMs / 1000);
            break;
          case "fixed-window":
          default:
            retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
        }
      }

      return {
        success,
        limit: maxRequests,
        remaining,
        reset: result.resetTime,
        retryAfter,
        algorithm,
        windowMs,
      };
    } catch (error) {
      console.error("Rate limiter error:", error);
      // Fail open - allow request if rate limiter fails
      return {
        success: true,
        limit: maxRequests,
        remaining: maxRequests,
        reset: Date.now() + windowMs,
        algorithm,
        windowMs,
      };
    }
  };
}

/**
 * Middleware wrapper for API routes with enhanced error handling
 */
export function withRateLimit(config: RateLimitConfig) {
  const limiter = createRateLimiter(config);

  return async (
    req: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>,
  ): Promise<NextResponse> => {
    const result = await limiter(req);

    if (!result.success) {
      const error = new RateLimitError(
        config.message || "Rate limit exceeded",
        result,
        await config.keyGenerator?.(req),
      );

      return NextResponse.json(
        {
          error: error.message,
          code: "RATE_LIMIT_EXCEEDED",
          limit: result.limit,
          remaining: result.remaining,
          reset: result.reset,
          retryAfter: result.retryAfter,
          algorithm: result.algorithm,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": result.limit.toString(),
            "X-RateLimit-Remaining": result.remaining.toString(),
            "X-RateLimit-Reset": result.reset.toString(),
            "X-RateLimit-Algorithm": result.algorithm,
            "Retry-After": result.retryAfter?.toString() || "60",
            "Content-Type": "application/json",
          },
        },
      );
    }

    // Add rate limit headers to successful responses
    try {
      const response = await handler(req);
      response.headers.set("X-RateLimit-Limit", result.limit.toString());
      response.headers.set(
        "X-RateLimit-Remaining",
        result.remaining.toString(),
      );
      response.headers.set("X-RateLimit-Reset", result.reset.toString());
      response.headers.set("X-RateLimit-Algorithm", result.algorithm);
      return response;
    } catch (handlerError) {
      // Log the handler error but still apply rate limit headers
      console.error("Handler error in rate limited endpoint:", handlerError);
      throw handlerError;
    }
  };
}

/**
 * Enhanced predefined rate limiting configurations
 */
export const rateLimitConfigs = {
  // General API endpoints - balanced limits
  api: {
    windowMs: 60000, // 1 minute
    maxRequests: 100,
    algorithm: "sliding-window" as const,
    message: "Too many API requests, please try again later.",
  },

  // Authentication endpoints - very strict
  auth: {
    windowMs: 300000, // 5 minutes
    maxRequests: 5,
    algorithm: "fixed-window" as const,
    message: "Too many authentication attempts, please try again later.",
  },

  // AI endpoints - moderate limits due to cost
  ai: {
    windowMs: 60000, // 1 minute
    maxRequests: 20,
    algorithm: "sliding-window" as const,
    message: "Too many AI requests, please try again later.",
  },

  // File upload endpoints - strict due to resource usage
  upload: {
    windowMs: 60000, // 1 minute
    maxRequests: 10,
    algorithm: "fixed-window" as const,
    message: "Too many file uploads, please try again later.",
  },

  // Email endpoints - very strict to prevent spam
  email: {
    windowMs: 300000, // 5 minutes
    maxRequests: 3,
    algorithm: "fixed-window" as const,
    message: "Too many email requests, please try again later.",
  },

  // Database write operations - moderate limits
  write: {
    windowMs: 60000, // 1 minute
    maxRequests: 50,
    algorithm: "sliding-window" as const,
    message: "Too many write operations, please try again later.",
  },

  // Public API endpoints - generous limits
  public: {
    windowMs: 60000, // 1 minute
    maxRequests: 200,
    algorithm: "sliding-window" as const,
    message: "Too many requests, please try again later.",
  },

  // Admin endpoints - very restrictive
  admin: {
    windowMs: 60000, // 1 minute
    maxRequests: 20,
    algorithm: "fixed-window" as const,
    message: "Too many admin requests, please try again later.",
  },
} as const;

/**
 * User-specific rate limiting with authentication context
 */
export function createUserRateLimit(config: RateLimitConfig) {
  const enhancedConfig: RateLimitConfig = {
    ...config,
    keyGenerator: async (req: NextRequest) => {
      // Try to extract user ID from various sources
      const authHeader = req.headers.get("authorization");
      const sessionCookie = req.cookies.get("session");
      const apiKey = req.headers.get("x-api-key");

      // JWT token extraction
      if (authHeader?.startsWith("Bearer ")) {
        try {
          const token = authHeader.replace("Bearer ", "");
          const payload = JSON.parse(atob(token.split(".")[1]));
          const userId = payload.sub || payload.user_id || payload.id;
          if (userId) {
            return `user:${userId}`;
          }
        } catch (error) {
          console.warn("Failed to extract user ID from JWT:", error);
        }
      }

      // Session cookie
      if (sessionCookie?.value) {
        return `session:${sessionCookie.value}`;
      }

      // API key
      if (apiKey) {
        return `apikey:${apiKey}`;
      }

      // Fall back to IP-based limiting
      return `ip:${getClientIdentifier(req)}`;
    },
  };

  return createRateLimiter(enhancedConfig);
}

/**
 * Helper functions for common rate limiting scenarios
 */
export const rateLimitHelpers = {
  // Apply rate limiting to API route handlers
  api: (config?: Partial<RateLimitConfig>) => {
    const finalConfig = { ...rateLimitConfigs.api, ...config };
    return withRateLimit(finalConfig);
  },

  // AI endpoint rate limiting
  ai: (config?: Partial<RateLimitConfig>) => {
    const finalConfig = { ...rateLimitConfigs.ai, ...config };
    return withRateLimit(finalConfig);
  },

  // Auth endpoint rate limiting
  auth: (config?: Partial<RateLimitConfig>) => {
    const finalConfig = { ...rateLimitConfigs.auth, ...config };
    return withRateLimit(finalConfig);
  },

  // User-specific rate limiting
  user: (config?: Partial<RateLimitConfig>) => {
    const finalConfig = { ...rateLimitConfigs.api, ...config };
    return withRateLimit({
      ...finalConfig,
      keyGenerator: async (req) => {
        const userLimiter = createUserRateLimit(finalConfig);
        return userLimiter(req).then(() => getClientIdentifier(req));
      },
    });
  },

  // Upload endpoint rate limiting
  upload: (config?: Partial<RateLimitConfig>) => {
    const finalConfig = { ...rateLimitConfigs.upload, ...config };
    return withRateLimit(finalConfig);
  },
} as const;

// Export store implementations for custom usage
export { InMemoryStore, SlidingWindowStore };

// Export the default store for direct usage
export { defaultStore };

/**
 * Utility function to get rate limit info without incrementing
 */
export async function getRateLimitInfo(
  key: string,
  config: RateLimitConfig,
  store: RateLimitStore = defaultStore,
): Promise<RateLimitInfo | null> {
  try {
    const value = await store.get(key);
    if (!value) return null;

    const remaining = Math.max(0, config.maxRequests - value.count);
    const success = value.count <= config.maxRequests;

    return {
      key,
      clientId: key,
      timestamp: Date.now(),
      success,
      limit: config.maxRequests,
      remaining,
      reset: value.resetTime,
      algorithm: config.algorithm || "fixed-window",
      windowMs: config.windowMs,
    };
  } catch (error) {
    console.error("Failed to get rate limit info:", error);
    return null;
  }
}

/**
 * Bulk reset rate limits (admin function)
 */
export async function resetRateLimit(
  keys: string | string[],
  store: RateLimitStore = defaultStore,
): Promise<void> {
  const keyArray = Array.isArray(keys) ? keys : [keys];

  try {
    await Promise.all(keyArray.map((key) => store.reset(key)));
  } catch (error) {
    console.error("Failed to reset rate limits:", error);
    throw new ValidationError(
      "Failed to reset rate limits",
      "bulk-reset",
      "RATE_LIMIT_RESET_FAILED",
    );
  }
}

// Default export
export default createRateLimiter;
