// API Middleware for Sentry monitoring and performance tracking
// Provides comprehensive request/response monitoring for API routes

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { logger } from "@/lib/monitoring/sentry-logger";

export interface APIMonitoringOptions {
  trackPerformance?: boolean;
  trackErrors?: boolean;
  trackUserContext?: boolean;
  sensitiveHeaders?: string[];
  excludePaths?: string[];
  logLevel?: "minimal" | "standard" | "verbose";
}

const DEFAULT_OPTIONS: Required<APIMonitoringOptions> = {
  trackPerformance: true,
  trackErrors: true,
  trackUserContext: true,
  sensitiveHeaders: [
    "authorization",
    "cookie",
    "x-api-key",
    "x-auth-token",
    "x-access-token",
  ],
  excludePaths: ["/api/health", "/api/ping"],
  logLevel: "standard",
};

// Enhanced API monitoring wrapper
export function withSentryMonitoring(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: APIMonitoringOptions = {},
) {
  const config = { ...DEFAULT_OPTIONS, ...options };

  return async (req: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now();
    const url = new URL(req.url);
    const pathname = url.pathname;
    const method = req.method;

    // Skip monitoring for excluded paths
    if (config.excludePaths.some((path) => pathname.includes(path))) {
      return handler(req);
    }

    // Start Sentry transaction using newer API
    const transaction = Sentry.startSpan(
      {
        name: `${method} ${pathname}`,
        op: "http.server",
      },
      () => {
        // Set tags for the span
        Sentry.setTag("api.method", method);
        Sentry.setTag("api.path", pathname);
        Sentry.setTag("component", "api");
        return { method, pathname };
      },
    );

    let response: NextResponse;
    let statusCode = 500;
    let error: Error | null = null;

    try {
      // Add request context
      if (config.trackUserContext) {
        await addUserContext(req);
      }

      // Add request breadcrumb
      if (config.logLevel !== "minimal") {
        logger.addBreadcrumb(
          `API Request: ${method} ${pathname}`,
          "http",
          "info",
          {
            method,
            pathname,
            query: Object.fromEntries(url.searchParams),
            headers: sanitizeHeaders(req.headers, config.sensitiveHeaders),
          },
        );
      }

      // Execute the API handler
      response = await handler(req);
      statusCode = response.status;

      // Track successful response
      Sentry.setTag("transaction.status", "ok");
      Sentry.setTag("http.status_code", statusCode.toString());
    } catch (err) {
      error = err instanceof Error ? err : new Error(String(err));
      statusCode = 500;

      // Track error
      Sentry.setTag("transaction.status", "internal_error");
      Sentry.setTag("http.status_code", statusCode.toString());

      if (config.trackErrors) {
        logger.logAPIError(pathname, method, error, statusCode, {
          query: Object.fromEntries(url.searchParams),
          headers: sanitizeHeaders(req.headers, config.sensitiveHeaders),
        });
      }

      // Create error response
      response = NextResponse.json(
        {
          error: "Internal server error",
          message:
            process.env.NODE_ENV === "development" ? error.message : undefined,
        },
        { status: statusCode },
      );
    } finally {
      const duration = Date.now() - startTime;

      // Track performance
      if (config.trackPerformance) {
        logger.trackAPIPerformance(pathname, method, duration, statusCode, {
          error: error ? error.message : undefined,
        });
      }

      // Add response breadcrumb
      if (config.logLevel === "verbose") {
        logger.addBreadcrumb(
          `API Response: ${method} ${pathname} - ${statusCode}`,
          "http",
          statusCode >= 400 ? "error" : "info",
          {
            method,
            pathname,
            statusCode,
            duration,
            error: error?.message,
          },
        );
      }

      // Log request summary
      if (config.logLevel !== "minimal") {
        const logMessage = `${method} ${pathname} - ${statusCode} (${duration}ms)`;

        if (statusCode >= 500) {
          logger.error(logMessage, error || undefined, {
            method,
            pathname,
            statusCode,
            duration,
          });
        } else if (statusCode >= 400) {
          logger.warn(logMessage, {
            method,
            pathname,
            statusCode,
            duration,
          });
        } else if (config.logLevel === "verbose") {
          logger.info(logMessage, {
            method,
            pathname,
            statusCode,
            duration,
          });
        }
      }

      // Transactions finish automatically with new SDK
    }

    return response;
  };
}

// Extract user context from request
async function addUserContext(req: NextRequest): Promise<void> {
  try {
    // Try to extract user ID from various sources
    let userId: string | undefined;
    let userEmail: string | undefined;

    // Check Authorization header
    const authHeader = req.headers.get("authorization");
    if (authHeader) {
      // For JWT tokens, you could decode and extract user info
      // This is a simplified example
      Sentry.setTag("auth.method", "bearer");
    }

    // Check for user ID in headers (custom implementation)
    const userIdHeader = req.headers.get("x-user-id");
    if (userIdHeader) {
      userId = userIdHeader;
    }

    // Check for session cookie
    const cookies = req.headers.get("cookie");
    if (cookies) {
      // Parse cookies to extract user session info
      // This would depend on your session implementation
      Sentry.setTag("session.present", "true");
    }

    // Set user context in Sentry
    if (userId || userEmail) {
      Sentry.setUser({
        id: userId,
        email: userEmail,
      });
    }

    // Get client IP
    const clientIP = getClientIP(req);
    if (clientIP) {
      Sentry.setTag("client.ip", clientIP);
    }

    // Get user agent
    const userAgent = req.headers.get("user-agent");
    if (userAgent) {
      Sentry.setTag("client.user_agent", userAgent.substring(0, 100));
    }
  } catch (err) {
    // Don't fail the request if user context extraction fails
    logger.warn("Failed to extract user context", { error: err });
  }
}

// Sanitize headers to remove sensitive information
function sanitizeHeaders(
  headers: Headers,
  sensitiveHeaders: string[],
): Record<string, string> {
  const sanitized: Record<string, string> = {};

  headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase();
    if (sensitiveHeaders.includes(lowerKey)) {
      sanitized[key] = "[REDACTED]";
    } else {
      // Truncate very long header values
      sanitized[key] =
        value.length > 200 ? value.substring(0, 200) + "..." : value;
    }
  });

  return sanitized;
}

// Extract client IP from request
function getClientIP(req: NextRequest): string | null {
  // Check various headers for client IP
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // Take the first IP in the chain
    return forwardedFor.split(",")[0].trim();
  }

  const realIP = req.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }

  const clientIP = req.headers.get("x-client-ip");
  if (clientIP) {
    return clientIP;
  }

  // Fallback to connection info (may not be available in all environments)
  return null;
}

// Database operation monitoring
export function withDatabaseMonitoring<T>(
  operation: string,
  table: string,
  fn: () => Promise<T>,
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    const startTime = Date.now();

    try {
      const result = await fn();
      const duration = Date.now() - startTime;

      // Track successful database operation
      logger.trackDatabasePerformance(
        operation,
        table,
        duration,
        Array.isArray(result) ? result.length : undefined,
      );

      logger.addBreadcrumb(
        `Database: ${operation} ${table}`,
        "database",
        "info",
        {
          operation,
          table,
          duration,
          success: true,
        },
      );

      resolve(result);
    } catch (error) {
      const duration = Date.now() - startTime;
      const err = error instanceof Error ? error : new Error(String(error));

      // Track failed database operation
      logger.logDatabaseError(operation, table, err, {
        duration,
      });

      logger.addBreadcrumb(
        `Database Error: ${operation} ${table}`,
        "database",
        "error",
        {
          operation,
          table,
          duration,
          error: err.message,
        },
      );

      reject(error);
    }
  });
}

// Performance monitoring for external API calls
export async function withExternalAPIMonitoring<T>(
  service: string,
  endpoint: string,
  fn: () => Promise<T>,
): Promise<T> {
  const startTime = Date.now();

  const span = Sentry.startSpan({
    op: "http.client",
    description: `${service}: ${endpoint}`,
  });

  try {
    const result = await fn();
    const duration = Date.now() - startTime;

    // Track successful external API call
    logger.trackPerformance({
      name: `external_api.${service}.${endpoint}`,
      value: duration,
      unit: "ms",
      tags: {
        service,
        endpoint,
        component: "external_api",
        success: "true",
      },
    });

    span.setStatus("ok");
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    const err = error instanceof Error ? error : new Error(String(error));

    // Track failed external API call
    logger.error(`External API Error: ${service} ${endpoint}`, err, {
      service,
      endpoint,
      duration,
      component: "external_api",
    });

    span.setStatus("internal_error");
    throw error;
  } finally {
    span.finish();
  }
}

// Batch operation monitoring
export async function withBatchMonitoring<T>(
  operation: string,
  batchSize: number,
  fn: () => Promise<T>,
): Promise<T> {
  const startTime = Date.now();

  try {
    const result = await fn();
    const duration = Date.now() - startTime;

    // Track batch operation
    logger.trackPerformance({
      name: `batch.${operation}`,
      value: duration,
      unit: "ms",
      tags: {
        operation,
        batch_size: batchSize.toString(),
        component: "batch",
      },
    });

    logger.info(`Batch operation completed: ${operation}`, {
      operation,
      batchSize,
      duration,
      success: true,
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    const err = error instanceof Error ? error : new Error(String(error));

    logger.error(`Batch operation failed: ${operation}`, err, {
      operation,
      batchSize,
      duration,
    });

    throw error;
  }
}

// Memory usage monitoring
export function trackMemoryUsage(label: string): void {
  if (typeof process !== "undefined" && process.memoryUsage) {
    const memUsage = process.memoryUsage();

    logger.trackPerformance({
      name: `memory.${label}.heap_used`,
      value: memUsage.heapUsed,
      unit: "bytes",
      tags: {
        component: "memory",
        label,
      },
    });

    logger.trackPerformance({
      name: `memory.${label}.heap_total`,
      value: memUsage.heapTotal,
      unit: "bytes",
      tags: {
        component: "memory",
        label,
      },
    });

    // Log warning if memory usage is high
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    if (heapUsedMB > 500) {
      // 500MB threshold
      logger.warn(`High memory usage detected: ${heapUsedMB.toFixed(2)}MB`, {
        label,
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        component: "memory",
      });
    }
  }
}
