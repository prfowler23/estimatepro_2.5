import { NextResponse } from "next/server";
import { z } from "zod";

/**
 * Standard error codes for the API
 */
export enum ErrorCode {
  // Authentication errors
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  INVALID_TOKEN = "INVALID_TOKEN",
  SESSION_EXPIRED = "SESSION_EXPIRED",

  // Validation errors
  VALIDATION_ERROR = "VALIDATION_ERROR",
  INVALID_INPUT = "INVALID_INPUT",
  MISSING_REQUIRED_FIELD = "MISSING_REQUIRED_FIELD",

  // Resource errors
  NOT_FOUND = "NOT_FOUND",
  ALREADY_EXISTS = "ALREADY_EXISTS",
  CONFLICT = "CONFLICT",

  // Rate limiting
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
  QUOTA_EXCEEDED = "QUOTA_EXCEEDED",

  // External service errors
  EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR",
  AI_SERVICE_UNAVAILABLE = "AI_SERVICE_UNAVAILABLE",
  DATABASE_ERROR = "DATABASE_ERROR",

  // Server errors
  INTERNAL_ERROR = "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
  TIMEOUT = "TIMEOUT",
}

/**
 * Standard error response structure
 */
export interface ErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details?: any;
    timestamp: string;
    requestId?: string;
  };
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  code: ErrorCode,
  message: string,
  status: number,
  details?: any,
  headers?: HeadersInit,
): NextResponse<ErrorResponse> {
  const errorResponse: ErrorResponse = {
    error: {
      code,
      message,
      timestamp: new Date().toISOString(),
      ...(details && { details }),
      ...(process.env.NODE_ENV === "development" && {
        requestId: crypto.randomUUID(),
      }),
    },
  };

  return NextResponse.json(errorResponse, {
    status,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });
}

/**
 * Common error response helpers
 */
export const ErrorResponses = {
  // 400 Bad Request
  badRequest: (message = "Bad request", details?: any) =>
    createErrorResponse(ErrorCode.INVALID_INPUT, message, 400, details),

  // 401 Unauthorized
  unauthorized: (message = "Authentication required") =>
    createErrorResponse(ErrorCode.UNAUTHORIZED, message, 401),

  // 403 Forbidden
  forbidden: (message = "Access denied") =>
    createErrorResponse(ErrorCode.FORBIDDEN, message, 403),

  // 404 Not Found
  notFound: (resource = "Resource") =>
    createErrorResponse(ErrorCode.NOT_FOUND, `${resource} not found`, 404),

  // 409 Conflict
  conflict: (message = "Resource conflict", details?: any) =>
    createErrorResponse(ErrorCode.CONFLICT, message, 409, details),

  // 422 Validation Error
  validationError: (errors: z.ZodError | any) =>
    createErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      "Validation failed",
      422,
      errors instanceof z.ZodError ? errors.errors : errors,
    ),

  // 429 Rate Limit
  rateLimitExceeded: (retryAfter?: number) =>
    createErrorResponse(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      "Too many requests",
      429,
      { retryAfter },
      retryAfter ? { "Retry-After": retryAfter.toString() } : undefined,
    ),

  // 500 Internal Server Error
  internalError: (message = "Internal server error", details?: any) =>
    createErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      process.env.NODE_ENV === "production"
        ? "An unexpected error occurred"
        : message,
      500,
      process.env.NODE_ENV === "development" ? details : undefined,
    ),

  // 503 Service Unavailable
  serviceUnavailable: (service = "Service", retryAfter?: number) =>
    createErrorResponse(
      ErrorCode.SERVICE_UNAVAILABLE,
      `${service} is temporarily unavailable`,
      503,
      { retryAfter },
      retryAfter ? { "Retry-After": retryAfter.toString() } : undefined,
    ),

  // Custom AI error
  aiServiceError: (message = "AI service error", details?: any) =>
    createErrorResponse(
      ErrorCode.AI_SERVICE_UNAVAILABLE,
      message,
      503,
      details,
    ),

  // Custom database error
  databaseError: (operation = "Database operation") =>
    createErrorResponse(
      ErrorCode.DATABASE_ERROR,
      `${operation} failed`,
      500,
      process.env.NODE_ENV === "development"
        ? { hint: "Check database logs" }
        : undefined,
    ),
};

/**
 * Extract error message from various error types
 */
export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }
  return "Unknown error";
}

/**
 * Log error with appropriate level
 */
export function logApiError(
  error: unknown,
  context: {
    endpoint: string;
    method: string;
    userId?: string;
    [key: string]: any;
  },
): void {
  const errorMessage = extractErrorMessage(error);
  const errorData = {
    ...context,
    error: errorMessage,
    stack: error instanceof Error ? error.stack : undefined,
    timestamp: new Date().toISOString(),
  };

  // In production, this would send to a logging service
  if (process.env.NODE_ENV === "production") {
    console.error("API Error:", errorMessage, { context });
  } else {
    console.error("API Error:", errorData);
  }
}
