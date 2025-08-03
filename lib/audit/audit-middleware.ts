// Audit Middleware for Automatic Request Logging
// Intercepts API requests and logs them for compliance and security monitoring

import { NextRequest, NextResponse } from "next/server";
import { AuditSystem, AuditEventType, AuditSeverity } from "./audit-system";

// Request context for audit logging
interface AuditContext {
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId: string;
  startTime: number;
}

// Audit middleware configuration
interface AuditMiddlewareConfig {
  enabled: boolean;
  logRequestBodies: boolean;
  logResponseBodies: boolean;
  sensitiveRoutes: string[];
  excludedRoutes: string[];
  maxBodySize: number;
  logLevel: "all" | "errors_only" | "sensitive_only";
}

// Default configuration
const DEFAULT_CONFIG: AuditMiddlewareConfig = {
  enabled: process.env.AUDIT_MIDDLEWARE_ENABLED !== "false",
  logRequestBodies: process.env.AUDIT_LOG_REQUEST_BODIES === "true",
  logResponseBodies: process.env.AUDIT_LOG_RESPONSE_BODIES === "true",
  sensitiveRoutes: [
    "/api/auth/",
    "/api/users/",
    "/api/integrations/",
    "/api/ai/",
    "/api/estimates/",
    "/api/customers/",
  ],
  excludedRoutes: ["/api/health", "/api/metrics", "/_next/", "/favicon.ico"],
  maxBodySize: parseInt(process.env.AUDIT_MAX_BODY_SIZE || "10240"), // 10KB
  logLevel: (process.env.AUDIT_LOG_LEVEL as any) || "all",
};

// Extract user information from request
async function extractUserInfo(request: NextRequest): Promise<{
  userId?: string;
  sessionId?: string;
}> {
  try {
    // Try to extract from custom headers first (for API calls)
    const userIdHeader = request.headers.get("x-user-id");
    const sessionIdHeader = request.headers.get("x-session-id");

    if (userIdHeader) {
      return {
        userId: userIdHeader,
        sessionId: sessionIdHeader || undefined,
      };
    }

    // Extract from Authorization header (Bearer token)
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      // Parse JWT token to extract user info (simplified - in production use proper JWT library)
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        return {
          userId: payload.sub || payload.user_id,
          sessionId: payload.session_id,
        };
      } catch (error) {
        // Invalid JWT format
      }
    }

    // Extract from Supabase auth cookies
    const authCookie = request.cookies.get("sb-access-token");
    const refreshCookie = request.cookies.get("sb-refresh-token");

    if (authCookie) {
      try {
        // Parse Supabase auth token (simplified)
        const payload = JSON.parse(atob(authCookie.value.split(".")[1]));
        return {
          userId: payload.sub,
          sessionId: payload.session_id,
        };
      } catch (error) {
        // Invalid token format
      }
    }

    // Try to extract from cookie-based session
    const sessionCookie = request.cookies.get("supabase-auth-token");
    if (sessionCookie) {
      try {
        const sessionData = JSON.parse(sessionCookie.value);
        return {
          userId: sessionData.user?.id,
          sessionId: sessionData.session?.id,
        };
      } catch (error) {
        // Invalid session cookie format
      }
    }

    return {};
  } catch (error) {
    console.warn("Failed to extract user info:", error);
    return {};
  }
}

// Extract IP address from request
function extractIPAddress(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIP = request.headers.get("x-real-ip");
  const cfConnectingIP = request.headers.get("cf-connecting-ip");

  return forwardedFor?.split(",")[0] || realIP || cfConnectingIP || "unknown";
}

// Determine if route should be audited
function shouldAuditRoute(
  pathname: string,
  config: AuditMiddlewareConfig,
): boolean {
  if (!config.enabled) return false;

  // Check excluded routes
  if (config.excludedRoutes.some((route) => pathname.startsWith(route))) {
    return false;
  }

  // Check log level
  if (config.logLevel === "sensitive_only") {
    return config.sensitiveRoutes.some((route) => pathname.startsWith(route));
  }

  return true;
}

// Determine audit severity based on route and method
function determineAuditSeverity(
  pathname: string,
  method: string,
  config: AuditMiddlewareConfig,
): AuditSeverity {
  // High severity for sensitive routes
  if (config.sensitiveRoutes.some((route) => pathname.startsWith(route))) {
    return method === "DELETE" ? "critical" : "high";
  }

  // Medium severity for POST/PUT/PATCH
  if (["POST", "PUT", "PATCH"].includes(method)) {
    return "medium";
  }

  // Low severity for GET/HEAD/OPTIONS
  return "low";
}

// Sanitize request body for logging
function sanitizeRequestBody(body: any, pathname: string): any {
  if (!body || typeof body !== "object") return body;

  const sensitiveFields = [
    "password",
    "token",
    "secret",
    "key",
    "authorization",
    "credit_card",
    "ssn",
    "phone",
    "email",
  ];

  const sanitized = { ...body };

  function sanitizeObject(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }

    if (obj && typeof obj === "object") {
      const sanitizedObj: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (
          sensitiveFields.some((field) => key.toLowerCase().includes(field))
        ) {
          sanitizedObj[key] = "[REDACTED]";
        } else {
          sanitizedObj[key] = sanitizeObject(value);
        }
      }
      return sanitizedObj;
    }

    return obj;
  }

  return sanitizeObject(sanitized);
}

// Main audit middleware function
export async function auditMiddleware(
  request: NextRequest,
  config: AuditMiddlewareConfig = DEFAULT_CONFIG,
): Promise<{
  context: AuditContext;
  logRequest: () => Promise<void>;
  logResponse: (response: NextResponse, error?: Error) => Promise<void>;
}> {
  const startTime = Date.now();
  const pathname = request.nextUrl.pathname;
  const method = request.method;

  // Extract user info
  const userInfo = await extractUserInfo(request);

  // Create audit context
  const context: AuditContext = {
    requestId: crypto.randomUUID(),
    startTime,
    ipAddress: extractIPAddress(request),
    userAgent: request.headers.get("user-agent") || "unknown",
    ...userInfo,
  };

  // Check if route should be audited
  const shouldAudit = shouldAuditRoute(pathname, config);

  // Log request function
  const logRequest = async (): Promise<void> => {
    if (!shouldAudit) return;

    const auditSystem = AuditSystem.getInstance();
    let requestBody: any = null;

    if (config.logRequestBodies && ["POST", "PUT", "PATCH"].includes(method)) {
      try {
        const body = await request.clone().text();
        if (body && body.length <= config.maxBodySize) {
          requestBody = sanitizeRequestBody(JSON.parse(body), pathname);
        }
      } catch (error) {
        // Ignore JSON parsing errors
      }
    }

    const severity = determineAuditSeverity(pathname, method, config);
    const eventType: AuditEventType = "api_access";

    await auditSystem.logEvent({
      event_type: eventType,
      severity,
      user_id: context.userId,
      session_id: context.sessionId,
      action: `${method} ${pathname}`,
      details: {
        request_id: context.requestId,
        method,
        pathname,
        query_params: Object.fromEntries(request.nextUrl.searchParams),
        headers: Object.fromEntries(request.headers.entries()),
        request_body: requestBody,
        user_agent: context.userAgent,
        content_length: request.headers.get("content-length"),
        content_type: request.headers.get("content-type"),
      },
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
      compliance_tags: ["api_access", "request_logging"],
    });
  };

  // Log response function
  const logResponse = async (
    response: NextResponse,
    error?: Error,
  ): Promise<void> => {
    const auditSystem = AuditSystem.getInstance();
    if (!shouldAudit) return;

    const duration = Date.now() - startTime;
    const statusCode = response.status;

    let responseBody: any = null;

    if (config.logResponseBodies && statusCode >= 200 && statusCode < 300) {
      try {
        const body = await response.clone().text();
        if (body && body.length <= config.maxBodySize) {
          responseBody = JSON.parse(body);
        }
      } catch (error) {
        // Ignore JSON parsing errors
      }
    }

    // Determine severity based on response
    let severity: AuditSeverity;
    if (error || statusCode >= 500) {
      severity = "high";
    } else if (statusCode >= 400) {
      severity = "medium";
    } else {
      severity = determineAuditSeverity(pathname, method, config);
    }

    const eventType: AuditEventType = error ? "system_error" : "api_access";

    await auditSystem.logEvent({
      event_type: eventType,
      severity,
      user_id: context.userId,
      session_id: context.sessionId,
      action: `${method} ${pathname} - ${statusCode}`,
      details: {
        request_id: context.requestId,
        method,
        pathname,
        status_code: statusCode,
        duration_ms: duration,
        response_body: responseBody,
        response_headers: Object.fromEntries(response.headers.entries()),
        error_message: error?.message,
        error_stack: error?.stack,
        success: !error && statusCode < 400,
      },
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
      compliance_tags: error
        ? ["api_error", "system_error"]
        : ["api_response", "request_logging"],
    });
  };

  return { context, logRequest, logResponse };
}

// Higher-order function to wrap API handlers with audit logging
export function withAuditLogging(
  handler: (request: NextRequest) => Promise<NextResponse>,
  config?: Partial<AuditMiddlewareConfig>,
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };
    const { logRequest, logResponse } = await auditMiddleware(
      request,
      mergedConfig,
    );

    try {
      // Log the request
      await logRequest();

      // Execute the handler
      const response = await handler(request);

      // Log the response
      await logResponse(response);

      return response;
    } catch (error) {
      // Log the error
      const errorResponse = NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );

      await logResponse(errorResponse, error as Error);

      throw error;
    }
  };
}

// Authentication audit helpers
export async function logAuthenticationEvent(
  eventType: "user_login" | "user_logout" | "login_failed" | "session_expired",
  userId: string,
  details: Record<string, any> = {},
  request?: NextRequest,
): Promise<void> {
  const auditSystem = AuditSystem.getInstance();
  const severity: AuditSeverity =
    eventType === "login_failed" ? "high" : "medium";

  await auditSystem.logEvent({
    event_type: eventType,
    severity,
    user_id: userId,
    action: eventType,
    details: {
      ...details,
      timestamp: new Date().toISOString(),
    },
    ip_address: request ? extractIPAddress(request) : undefined,
    user_agent: request?.headers.get("user-agent") || undefined,
    compliance_tags: ["authentication", "user_activity"],
  });
}

// Security event logging
export async function logSecurityEvent(
  eventType: "security_violation" | "suspicious_activity" | "permission_denied",
  details: Record<string, any>,
  userId?: string,
  request?: NextRequest,
): Promise<void> {
  const auditSystem = AuditSystem.getInstance();
  await auditSystem.logEvent({
    event_type: eventType,
    severity: "critical",
    user_id: userId,
    action: eventType,
    details: {
      ...details,
      timestamp: new Date().toISOString(),
    },
    ip_address: request ? extractIPAddress(request) : undefined,
    user_agent: request?.headers.get("user-agent") || undefined,
    compliance_tags: ["security", "incident_response"],
  });
}

// Data access logging
export async function logDataAccess(
  resourceType: string,
  resourceId: string,
  action: "read" | "write" | "delete",
  userId: string,
  details: Record<string, any> = {},
): Promise<void> {
  const auditSystem = AuditSystem.getInstance();
  const severity: AuditSeverity = action === "delete" ? "high" : "medium";

  await auditSystem.logEvent({
    event_type: `${resourceType}_${action}`,
    severity,
    user_id: userId,
    resource_type: resourceType,
    resource_id: resourceId,
    action,
    details: {
      ...details,
      timestamp: new Date().toISOString(),
    },
    compliance_tags: ["data_access", "resource_activity"],
  });
}

// Export configuration for easier testing and customization
export { DEFAULT_CONFIG as defaultAuditConfig };
export type { AuditMiddlewareConfig, AuditContext };
