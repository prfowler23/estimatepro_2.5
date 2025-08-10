/**
 * Custom Error Types for Service Layer
 * Provides domain-specific error classes with proper context and recovery strategies
 */

/**
 * Base error class for all service errors
 */
export class ServiceError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly context?: Record<string, unknown>;
  public readonly recoverable: boolean;
  public readonly timestamp: Date;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    context?: Record<string, unknown>,
    recoverable: boolean = false,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
    this.recoverable = recoverable;
    this.timestamp = new Date();

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      context: this.context,
      recoverable: this.recoverable,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }
}

/**
 * Validation error for invalid input data
 */
export class ValidationError extends ServiceError {
  public readonly validationErrors: Array<{
    field: string;
    message: string;
    value?: unknown;
  }>;

  constructor(
    message: string,
    validationErrors: Array<{
      field: string;
      message: string;
      value?: unknown;
    }> = [],
    context?: Record<string, unknown>,
  ) {
    super(message, "VALIDATION_ERROR", 400, context, true);
    this.validationErrors = validationErrors;
  }
}

/**
 * Database operation errors
 */
export class DatabaseError extends ServiceError {
  public readonly query?: string;
  public readonly operation: string;

  constructor(
    message: string,
    operation: string,
    query?: string,
    context?: Record<string, unknown>,
  ) {
    super(message, "DATABASE_ERROR", 500, context, false);
    this.operation = operation;
    this.query = query;
  }
}

/**
 * Network/transport error for fetch and connectivity issues
 */
export class NetworkError extends ServiceError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "NETWORK_ERROR", 503, context, true);
  }
}

/**
 * External API errors (OpenAI, Weather API, etc.)
 */
export class ExternalAPIError extends ServiceError {
  public readonly apiName: string;
  public readonly endpoint?: string;
  public readonly responseStatus?: number;
  public readonly responseBody?: unknown;

  constructor(
    message: string,
    apiName: string,
    endpoint?: string,
    responseStatus?: number,
    responseBody?: unknown,
    context?: Record<string, unknown>,
  ) {
    super(message, "EXTERNAL_API_ERROR", 502, context, true);
    this.apiName = apiName;
    this.endpoint = endpoint;
    this.responseStatus = responseStatus;
    this.responseBody = responseBody;
  }
}

/**
 * Configuration errors
 */
export class ConfigurationError extends ServiceError {
  public readonly missingConfig: string[];

  constructor(
    message: string,
    missingConfig: string[],
    context?: Record<string, unknown>,
  ) {
    super(message, "CONFIGURATION_ERROR", 500, context, false);
    this.missingConfig = missingConfig;
  }
}

/**
 * Authentication and authorization errors
 */
export class AuthError extends ServiceError {
  public readonly reason:
    | "unauthenticated"
    | "unauthorized"
    | "expired"
    | "invalid";

  constructor(
    message: string,
    reason: "unauthenticated" | "unauthorized" | "expired" | "invalid",
    context?: Record<string, unknown>,
  ) {
    const statusCode = reason === "unauthorized" ? 403 : 401;
    super(message, "AUTH_ERROR", statusCode, context, true);
    this.reason = reason;
  }
}

/**
 * Resource not found error
 */
export class NotFoundError extends ServiceError {
  public readonly resourceType: string;
  public readonly resourceId?: string;

  constructor(
    resourceType: string,
    resourceId?: string,
    message?: string,
    context?: Record<string, unknown>,
  ) {
    const defaultMessage =
      message ||
      `${resourceType}${resourceId ? ` with id ${resourceId}` : ""} not found`;
    super(defaultMessage, "NOT_FOUND", 404, context, false);
    this.resourceType = resourceType;
    this.resourceId = resourceId;
  }
}

/**
 * Rate limiting error
 */
export class RateLimitError extends ServiceError {
  public readonly limit: number;
  public readonly resetTime?: Date;
  public readonly retryAfter?: number;

  constructor(
    message: string,
    limit: number,
    resetTime?: Date,
    retryAfter?: number,
    context?: Record<string, unknown>,
  ) {
    super(message, "RATE_LIMIT_ERROR", 429, context, true);
    this.limit = limit;
    this.resetTime = resetTime;
    this.retryAfter = retryAfter;
  }
}

/**
 * Business logic error
 */
export class BusinessLogicError extends ServiceError {
  public readonly businessRule: string;

  constructor(
    message: string,
    businessRule: string,
    context?: Record<string, unknown>,
  ) {
    super(message, "BUSINESS_LOGIC_ERROR", 422, context, false);
    this.businessRule = businessRule;
  }
}

/**
 * Concurrent modification error
 */
export class ConcurrencyError extends ServiceError {
  public readonly expectedVersion?: string;
  public readonly actualVersion?: string;

  constructor(
    message: string,
    expectedVersion?: string,
    actualVersion?: string,
    context?: Record<string, unknown>,
  ) {
    super(message, "CONCURRENCY_ERROR", 409, context, true);
    this.expectedVersion = expectedVersion;
    this.actualVersion = actualVersion;
  }
}

/**
 * Timeout error
 */
export class TimeoutError extends ServiceError {
  public readonly timeoutMs: number;
  public readonly operation: string;

  constructor(
    message: string,
    operation: string,
    timeoutMs: number,
    context?: Record<string, unknown>,
  ) {
    super(message, "TIMEOUT_ERROR", 504, context, true);
    this.operation = operation;
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Helper function to determine if an error is recoverable
 */
export function isRecoverableError(error: unknown): boolean {
  if (error instanceof ServiceError) {
    return error.recoverable;
  }
  // Network errors are generally recoverable
  if (error instanceof Error && error.message.includes("network")) {
    return true;
  }
  return false;
}

/**
 * Helper function to get appropriate HTTP status code from error
 */
export function getErrorStatusCode(error: unknown): number {
  if (error instanceof ServiceError) {
    return error.statusCode;
  }
  return 500;
}

/**
 * Helper function to create user-friendly error message
 */
export function getUserFriendlyMessage(error: unknown): string {
  if (error instanceof ValidationError) {
    return "Please check your input and try again.";
  }
  if (error instanceof AuthError) {
    return "Please sign in to continue.";
  }
  if (error instanceof NotFoundError) {
    return "The requested resource could not be found.";
  }
  if (error instanceof RateLimitError) {
    return "Too many requests. Please try again later.";
  }
  if (error instanceof BusinessLogicError) {
    return error.message; // Business logic errors should have user-friendly messages
  }
  if (error instanceof ExternalAPIError) {
    return "An external service is temporarily unavailable. Please try again later.";
  }
  if (error instanceof TimeoutError) {
    return "The operation took too long. Please try again.";
  }
  return "An unexpected error occurred. Please try again later.";
}
