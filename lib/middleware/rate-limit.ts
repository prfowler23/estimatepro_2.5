import { NextRequest, NextResponse } from "next/server";

// Rate limit configuration per endpoint
interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  max: number; // Maximum requests per window
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

// Default rate limit configs
const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  "/api/ai/": {
    windowMs: 60 * 1000, // 1 minute
    max: 20, // 20 requests per minute for AI endpoints
    message: "Too many AI requests, please try again later",
  },
  "/api/auth/": {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 auth attempts per 15 minutes
    message: "Too many authentication attempts, please try again later",
  },
  "/api/": {
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute for general API
    message: "Too many requests, please try again later",
  },
};

// In-memory rate limit store (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (now > data.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 1000); // Clean up every minute

/**
 * Get client identifier for rate limiting
 */
function getClientId(request: NextRequest): string {
  // Try to get user ID from auth token
  const authHeader = request.headers.get("authorization");
  if (authHeader) {
    // Extract user ID from JWT token
    try {
      const token = authHeader.replace("Bearer ", "");
      // Parse JWT parts
      const parts = token.split(".");
      if (parts.length !== 3) {
        throw new Error("Invalid JWT format");
      }

      // Decode payload (we can't verify signature without the secret here)
      // In production, this should be verified by Supabase auth middleware
      const payload = JSON.parse(atob(parts[1]));

      // Basic validation
      if (payload.sub && payload.exp) {
        // Check if token is expired
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp < now) {
          throw new Error("Token expired");
        }
        return `user:${payload.sub}`;
      }
    } catch {
      // Fall through to IP-based limiting
      // Invalid tokens get IP-based rate limiting instead
    }
  }

  // Fall back to IP address
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded
    ? forwarded.split(",")[0]
    : request.headers.get("x-real-ip") || "unknown";

  return `ip:${ip}`;
}

/**
 * Get rate limit configuration for a path
 */
function getRateLimitConfig(pathname: string): RateLimitConfig {
  // Find the most specific matching configuration
  for (const [path, config] of Object.entries(DEFAULT_RATE_LIMITS)) {
    if (pathname.startsWith(path)) {
      return config;
    }
  }

  // Default fallback
  return DEFAULT_RATE_LIMITS["/api/"];
}

/**
 * Rate limiting middleware
 */
export async function rateLimit(
  request: NextRequest,
  config?: Partial<RateLimitConfig>,
): Promise<NextResponse | null> {
  // Skip rate limiting in development
  if (process.env.NODE_ENV === "development") {
    return null;
  }

  const pathname = request.nextUrl.pathname;

  // Only apply to API routes
  if (!pathname.startsWith("/api/")) {
    return null;
  }

  const clientId = getClientId(request);
  const rateLimitConfig = { ...getRateLimitConfig(pathname), ...config };
  const key = `${pathname}:${clientId}`;

  const now = Date.now();
  const windowStart = now - rateLimitConfig.windowMs;

  // Get or create rate limit data
  let data = rateLimitStore.get(key);

  if (!data || now > data.resetTime) {
    // Reset or create new window
    data = {
      count: 0,
      resetTime: now + rateLimitConfig.windowMs,
    };
  }

  // Increment request count
  data.count++;
  rateLimitStore.set(key, data);

  // Check if rate limit exceeded
  if (data.count > rateLimitConfig.max) {
    const retryAfter = Math.ceil((data.resetTime - now) / 1000);

    return new NextResponse(
      JSON.stringify({
        error: "Rate limit exceeded",
        message: rateLimitConfig.message,
        retryAfter,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": retryAfter.toString(),
          "X-RateLimit-Limit": rateLimitConfig.max.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": data.resetTime.toString(),
        },
      },
    );
  }

  // Add rate limit headers to successful requests
  const remaining = Math.max(0, rateLimitConfig.max - data.count);
  const resetTime = Math.ceil(data.resetTime / 1000);

  // Store headers for the next response
  request.headers.set("X-RateLimit-Limit", rateLimitConfig.max.toString());
  request.headers.set("X-RateLimit-Remaining", remaining.toString());
  request.headers.set("X-RateLimit-Reset", resetTime.toString());

  return null; // Allow request to proceed
}

/**
 * Custom rate limit decorator for specific endpoints
 */
export function withRateLimit(config: Partial<RateLimitConfig>) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const method = descriptor.value;

    descriptor.value = async function (request: NextRequest) {
      const rateLimitResponse = await rateLimit(request, config);
      if (rateLimitResponse) {
        return rateLimitResponse;
      }

      return method.call(this, request);
    };

    return descriptor;
  };
}

/**
 * Redis-based rate limiting for production
 * Requires Redis client to be configured
 */
export class RedisRateLimit {
  private redis: any; // Redis client

  constructor(redis: any) {
    this.redis = redis;
  }

  async check(
    key: string,
    config: RateLimitConfig,
  ): Promise<{
    allowed: boolean;
    count: number;
    remaining: number;
    resetTime: number;
  }> {
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Use Redis pipeline for atomic operations
    const pipeline = this.redis.pipeline();
    pipeline.zremrangebyscore(key, "-inf", windowStart);
    pipeline.zadd(key, now, `${now}-${Math.random()}`);
    pipeline.zcard(key);
    pipeline.expire(key, Math.ceil(config.windowMs / 1000));

    const results = await pipeline.exec();
    const count = results[2][1];

    const allowed = count <= config.max;
    const remaining = Math.max(0, config.max - count);
    const resetTime = now + config.windowMs;

    return {
      allowed,
      count,
      remaining,
      resetTime,
    };
  }
}
