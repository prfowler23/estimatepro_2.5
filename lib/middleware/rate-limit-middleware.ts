import { NextRequest, NextResponse } from "next/server";
import {
  apiRateLimit,
  aiRateLimit,
  authRateLimit,
  withRateLimit,
  rateLimitConfigs,
} from "@/lib/utils/rate-limiter";

// Type for route handlers
type RouteHandler = (
  request: NextRequest,
  context?: { params?: any },
) => Promise<NextResponse> | NextResponse;

/**
 * Apply rate limiting to a route handler based on the route type
 */
export function withRouteRateLimit(
  handler: RouteHandler,
  type: "api" | "ai" | "auth" | "upload" | "email" | "write" = "api",
) {
  return async (request: NextRequest, context?: { params?: any }) => {
    let rateLimitConfig;

    switch (type) {
      case "ai":
        rateLimitConfig = rateLimitConfigs.ai;
        break;
      case "auth":
        rateLimitConfig = rateLimitConfigs.auth;
        break;
      case "upload":
        rateLimitConfig = rateLimitConfigs.upload;
        break;
      case "email":
        rateLimitConfig = rateLimitConfigs.email;
        break;
      case "write":
        rateLimitConfig = rateLimitConfigs.write;
        break;
      default:
        rateLimitConfig = rateLimitConfigs.api;
    }

    const rateLimitWrapper = withRateLimit(rateLimitConfig);

    return rateLimitWrapper(request, async (req) => {
      return handler(req, context);
    });
  };
}

/**
 * Auto-detect route type based on URL path and apply appropriate rate limiting
 */
export function withAutoRateLimit(handler: RouteHandler) {
  return async (request: NextRequest, context?: { params?: any }) => {
    const { pathname } = new URL(request.url);

    let type: "api" | "ai" | "auth" | "upload" | "email" | "write" = "api";

    // Determine rate limit type based on route
    if (pathname.includes("/api/ai/")) {
      type = "ai";
    } else if (pathname.includes("/auth/")) {
      type = "auth";
    } else if (pathname.includes("/upload") || pathname.includes("/photo")) {
      type = "upload";
    } else if (pathname.includes("/email")) {
      type = "email";
    } else if (
      request.method === "POST" ||
      request.method === "PUT" ||
      request.method === "DELETE" ||
      request.method === "PATCH"
    ) {
      type = "write";
    }

    return withRouteRateLimit(handler, type)(request, context);
  };
}

/**
 * Apply rate limiting to API routes with custom configuration
 */
export function withCustomRateLimit(
  handler: RouteHandler,
  config: {
    windowMs?: number;
    maxRequests?: number;
    message?: string;
  },
) {
  const rateLimitConfig = {
    ...rateLimitConfigs.api,
    ...config,
  };

  const rateLimitWrapper = withRateLimit(rateLimitConfig);

  return async (request: NextRequest, context?: { params?: any }) => {
    return rateLimitWrapper(request, async (req) => {
      return handler(req, context);
    });
  };
}

/**
 * Specific rate limiters for common use cases
 */
export const withAIRateLimit = (handler: RouteHandler) =>
  withRouteRateLimit(handler, "ai");

export const withAuthRateLimit = (handler: RouteHandler) =>
  withRouteRateLimit(handler, "auth");

export const withUploadRateLimit = (handler: RouteHandler) =>
  withRouteRateLimit(handler, "upload");

export const withEmailRateLimit = (handler: RouteHandler) =>
  withRouteRateLimit(handler, "email");

export const withWriteRateLimit = (handler: RouteHandler) =>
  withRouteRateLimit(handler, "write");

/**
 * Higher-order function to create rate-limited route handlers
 */
export function createRateLimitedHandler(
  type: "api" | "ai" | "auth" | "upload" | "email" | "write" = "api",
) {
  return (handler: RouteHandler) => withRouteRateLimit(handler, type);
}

// Export withRateLimit for backward compatibility
export { withRateLimit } from "@/lib/utils/rate-limiter";
