import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateRequest } from "@/lib/auth/server";
import { validateRequest } from "@/lib/schemas/api-validation";
import { errorHandler } from "@/lib/error/error-handler";
import {
  EstimateProError,
  createValidationError,
} from "@/lib/error/error-types";
import { generalRateLimiter, aiRateLimiter } from "@/lib/utils/rate-limit";

// Standard API response types
export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  meta?: {
    timestamp: string;
    pagination?: {
      limit: number;
      offset: number;
      total: number;
      hasMore: boolean;
    };
    [key: string]: any;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    id?: string; // Error tracking ID
  };
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

// API error codes
export enum ApiErrorCode {
  VALIDATION_ERROR = "VALIDATION_ERROR",
  AUTH_ERROR = "AUTH_ERROR",
  RATE_LIMIT_ERROR = "RATE_LIMIT_ERROR",
  NOT_FOUND = "NOT_FOUND",
  CONFLICT = "CONFLICT",
  FORBIDDEN = "FORBIDDEN",
  AI_SERVICE_ERROR = "AI_SERVICE_ERROR",
  DATABASE_ERROR = "DATABASE_ERROR",
  INTERNAL_ERROR = "INTERNAL_ERROR",
}

// Rate limiter types
export type RateLimiterType = "general" | "ai" | "none";

// Handler options
export interface ApiHandlerOptions {
  requireAuth?: boolean;
  rateLimiter?: RateLimiterType;
  auditLog?: boolean;
  cors?: boolean;
}

// Standard API handler wrapper
export async function apiHandler<TInput = any, TOutput = any>(
  request: NextRequest,
  schema: z.ZodSchema<TInput> | null,
  handler: (data: TInput, context: ApiContext) => Promise<TOutput>,
  options: ApiHandlerOptions = {},
): Promise<NextResponse<ApiResponse<TOutput>>> {
  const {
    requireAuth = true,
    rateLimiter = "general",
    auditLog = true,
    cors = true,
  } = options;

  try {
    // 1. CORS handling
    if (cors && request.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    // 2. Rate limiting
    if (rateLimiter !== "none") {
      const limiter = rateLimiter === "ai" ? aiRateLimiter : generalRateLimiter;
      const rateLimitResult = await limiter.check(request);

      if (!rateLimitResult.success) {
        return NextResponse.json(
          createErrorResponse(
            ApiErrorCode.RATE_LIMIT_ERROR,
            "Rate limit exceeded",
            { retryAfter: rateLimitResult.retryAfter },
          ),
          {
            status: 429,
            headers: {
              "Retry-After": String(rateLimitResult.retryAfter || 60),
              ...(cors ? getCorsHeaders() : {}),
            },
          },
        );
      }
    }

    // 3. Authentication
    let user = null;
    if (requireAuth) {
      const authResult = await authenticateRequest(request);
      if (!authResult.success) {
        return NextResponse.json(
          createErrorResponse(
            ApiErrorCode.AUTH_ERROR,
            authResult.error || "Authentication required",
          ),
          {
            status: 401,
            headers: cors ? getCorsHeaders() : {},
          },
        );
      }
      user = authResult.user;
    }

    // 4. Request body parsing and validation
    let validatedData: TInput | null = null;
    if (schema && (request.method === "POST" || request.method === "PUT")) {
      try {
        const body = await request.json();
        const validation = validateRequest(schema, body);

        if (!validation.success) {
          return NextResponse.json(
            createErrorResponse(
              ApiErrorCode.VALIDATION_ERROR,
              validation.error || "Invalid request data",
            ),
            {
              status: 400,
              headers: cors ? getCorsHeaders() : {},
            },
          );
        }

        validatedData = validation.data!;
      } catch (error) {
        return NextResponse.json(
          createErrorResponse(
            ApiErrorCode.VALIDATION_ERROR,
            "Invalid JSON in request body",
          ),
          {
            status: 400,
            headers: cors ? getCorsHeaders() : {},
          },
        );
      }
    }

    // 5. Create API context
    const context: ApiContext = {
      user,
      request,
      userAgent: request.headers.get("user-agent") || undefined,
      ip: getClientIP(request),
      timestamp: new Date().toISOString(),
    };

    // 6. Execute handler
    const result = await handler(validatedData as TInput, context);

    // 7. Create success response
    const response = createSuccessResponse(result);

    // 8. Audit logging (if enabled)
    if (auditLog && user) {
      // Log API usage for audit trail
      console.log(`API Call: ${request.method} ${request.url}`, {
        userId: user.id,
        timestamp: context.timestamp,
        userAgent: context.userAgent,
        ip: context.ip,
      });
    }

    return NextResponse.json(response, {
      status: 200,
      headers: cors ? getCorsHeaders() : {},
    });
  } catch (error) {
    // Central error handling
    const enhancedError = await errorHandler.handleError(error, {
      component: "apiHandler",
      action: `${request.method} ${request.url}`,
      metadata: {
        userAgent: request.headers.get("user-agent"),
        ip: getClientIP(request),
      },
    });

    const errorCode = getErrorCode(enhancedError);
    const statusCode = getStatusCode(errorCode);

    return NextResponse.json(
      createErrorResponse(errorCode, enhancedError.message, {
        id: enhancedError.id,
      }),
      {
        status: statusCode,
        headers: cors ? getCorsHeaders() : {},
      },
    );
  }
}

// Context passed to handlers
export interface ApiContext {
  user: any | null; // User from authentication
  request: NextRequest;
  userAgent?: string;
  ip?: string;
  timestamp: string;
}

// Utility functions
function createSuccessResponse<T>(data: T): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
    },
  };
}

function createErrorResponse(
  code: ApiErrorCode,
  message: string,
  details?: any,
): ApiErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
  };
}

function getCorsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function getClientIP(request: NextRequest): string | undefined {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    request.headers.get("x-real-ip") ||
    undefined
  );
}

function getErrorCode(error: EstimateProError): ApiErrorCode {
  if (error.type === "validation") return ApiErrorCode.VALIDATION_ERROR;
  if (error.type === "authentication") return ApiErrorCode.AUTH_ERROR;
  if (error.type === "authorization") return ApiErrorCode.FORBIDDEN;
  if (error.type === "ai_service") return ApiErrorCode.AI_SERVICE_ERROR;
  if (error.type === "database") return ApiErrorCode.DATABASE_ERROR;
  return ApiErrorCode.INTERNAL_ERROR;
}

function getStatusCode(errorCode: ApiErrorCode): number {
  switch (errorCode) {
    case ApiErrorCode.VALIDATION_ERROR:
      return 400;
    case ApiErrorCode.AUTH_ERROR:
      return 401;
    case ApiErrorCode.FORBIDDEN:
      return 403;
    case ApiErrorCode.NOT_FOUND:
      return 404;
    case ApiErrorCode.CONFLICT:
      return 409;
    case ApiErrorCode.RATE_LIMIT_ERROR:
      return 429;
    case ApiErrorCode.AI_SERVICE_ERROR:
    case ApiErrorCode.DATABASE_ERROR:
    case ApiErrorCode.INTERNAL_ERROR:
    default:
      return 500;
  }
}

// Specialized handlers for common patterns

// GET handler (no validation needed)
export async function getHandler<TOutput>(
  request: NextRequest,
  handler: (context: ApiContext) => Promise<TOutput>,
  options?: Omit<ApiHandlerOptions, "rateLimiter">,
): Promise<NextResponse<ApiResponse<TOutput>>> {
  return apiHandler(request, null, (_data, context) => handler(context), {
    ...options,
    rateLimiter: "general",
  });
}

// POST handler with validation
export async function postHandler<TInput, TOutput>(
  request: NextRequest,
  schema: z.ZodSchema<TInput>,
  handler: (data: TInput, context: ApiContext) => Promise<TOutput>,
  options?: ApiHandlerOptions,
): Promise<NextResponse<ApiResponse<TOutput>>> {
  return apiHandler(request, schema, handler, options);
}

// AI-specific handler with AI rate limiting
export async function aiHandler<TInput, TOutput>(
  request: NextRequest,
  schema: z.ZodSchema<TInput>,
  handler: (data: TInput, context: ApiContext) => Promise<TOutput>,
  options?: Omit<ApiHandlerOptions, "rateLimiter">,
): Promise<NextResponse<ApiResponse<TOutput>>> {
  return apiHandler(request, schema, handler, {
    ...options,
    rateLimiter: "ai",
  });
}

// Pagination helper
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  limit: number,
  offset: number,
): ApiSuccessResponse<T[]> {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + limit < total,
      },
    },
  };
}

// Method validation middleware
export function validateHttpMethod(
  request: NextRequest,
  allowedMethods: string[],
): NextResponse | null {
  if (!allowedMethods.includes(request.method)) {
    return NextResponse.json(
      createErrorResponse(
        ApiErrorCode.VALIDATION_ERROR,
        `Method ${request.method} not allowed`,
      ),
      {
        status: 405,
        headers: {
          Allow: allowedMethods.join(", "),
          ...getCorsHeaders(),
        },
      },
    );
  }
  return null;
}
