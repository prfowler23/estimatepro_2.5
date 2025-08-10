/**
 * Custom error classes and error handling utilities for Supabase operations
 */

import { PostgrestError } from "@supabase/supabase-js";

/**
 * Base error class for all Supabase-related errors
 */
export class SupabaseError extends Error {
  public readonly code: string;
  public readonly details?: unknown;
  public readonly timestamp: Date;

  constructor(message: string, code: string, details?: unknown) {
    super(message);
    this.name = "SupabaseError";
    this.code = code;
    this.details = details;
    this.timestamp = new Date();

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SupabaseError);
    }
  }

  /**
   * Convert error to JSON for logging
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }
}

/**
 * Error thrown when configuration is invalid or missing
 */
export class SupabaseConfigError extends SupabaseError {
  constructor(message: string, details?: unknown) {
    super(message, "CONFIG_ERROR", details);
    this.name = "SupabaseConfigError";
  }
}

/**
 * Error thrown when connection fails or pool is exhausted
 */
export class SupabaseConnectionError extends SupabaseError {
  public readonly retryable: boolean;

  constructor(message: string, retryable = true, details?: unknown) {
    super(message, "CONNECTION_ERROR", details);
    this.name = "SupabaseConnectionError";
    this.retryable = retryable;
  }
}

/**
 * Error thrown when authentication fails
 */
export class SupabaseAuthError extends SupabaseError {
  public readonly statusCode?: number;

  constructor(message: string, statusCode?: number, details?: unknown) {
    super(message, "AUTH_ERROR", details);
    this.name = "SupabaseAuthError";
    this.statusCode = statusCode;
  }
}

/**
 * Error thrown when database operations fail
 */
export class SupabaseDatabaseError extends SupabaseError {
  public readonly hint?: string;
  public readonly pgError?: PostgrestError;

  constructor(message: string, pgError?: PostgrestError, details?: unknown) {
    super(message, pgError?.code || "DATABASE_ERROR", details);
    this.name = "SupabaseDatabaseError";
    this.hint = pgError?.hint;
    this.pgError = pgError;
  }
}

/**
 * Error thrown when pool operations fail
 */
export class SupabasePoolError extends SupabaseError {
  public readonly poolStats?: {
    total: number;
    inUse: number;
    idle: number;
    maxConnections: number;
  };

  constructor(
    message: string,
    poolStats?: {
      total: number;
      inUse: number;
      idle: number;
      maxConnections: number;
    },
    details?: unknown,
  ) {
    super(message, "POOL_ERROR", details);
    this.name = "SupabasePoolError";
    this.poolStats = poolStats;
  }
}

/**
 * Error thrown when operation times out
 */
export class SupabaseTimeoutError extends SupabaseError {
  public readonly timeoutMs: number;

  constructor(message: string, timeoutMs: number, details?: unknown) {
    super(message, "TIMEOUT_ERROR", details);
    this.name = "SupabaseTimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Error handler utility for PostgrestError
 */
export function handlePostgrestError(
  error: PostgrestError,
): SupabaseDatabaseError {
  let message = error.message;

  // Enhance error messages based on common error codes
  switch (error.code) {
    case "23505":
      message = `Duplicate key violation: ${error.details || error.message}`;
      break;
    case "23503":
      message = `Foreign key violation: ${error.details || error.message}`;
      break;
    case "23502":
      message = `Not null violation: ${error.details || error.message}`;
      break;
    case "42501":
      message = `Insufficient privileges: ${error.details || error.message}`;
      break;
    case "42P01":
      message = `Table does not exist: ${error.details || error.message}`;
      break;
    case "PGRST301":
      message = "JWT expired or invalid. Please re-authenticate.";
      break;
    case "PGRST204":
      message = "No rows found matching the criteria.";
      break;
    default:
      // Use the original message if no specific handling
      break;
  }

  return new SupabaseDatabaseError(message, error);
}

/**
 * Type guard to check if error is a SupabaseError
 */
export function isSupabaseError(error: unknown): error is SupabaseError {
  return error instanceof SupabaseError;
}

/**
 * Type guard to check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof SupabaseConnectionError) {
    return error.retryable;
  }
  if (error instanceof SupabaseTimeoutError) {
    return true;
  }
  if (error instanceof SupabaseDatabaseError) {
    // Some database errors are retryable
    const retryableCodes = ["40001", "40P01", "55P03", "57P03"];
    return retryableCodes.includes(error.code);
  }
  return false;
}

/**
 * Format error for logging
 */
export function formatErrorForLogging(error: unknown): {
  message: string;
  code?: string;
  details?: unknown;
  stack?: string;
} {
  if (isSupabaseError(error)) {
    return error.toJSON();
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    message: String(error),
  };
}

/**
 * Create user-friendly error message
 */
export function getUserFriendlyErrorMessage(error: unknown): string {
  if (error instanceof SupabaseAuthError) {
    if (error.statusCode === 401) {
      return "Please sign in to continue.";
    }
    if (error.statusCode === 403) {
      return "You don't have permission to perform this action.";
    }
    return "Authentication failed. Please try again.";
  }

  if (error instanceof SupabaseConnectionError) {
    return "Connection error. Please check your internet connection and try again.";
  }

  if (error instanceof SupabaseTimeoutError) {
    return "The operation took too long. Please try again.";
  }

  if (error instanceof SupabaseDatabaseError) {
    if (error.code === "23505") {
      return "This item already exists. Please use a different value.";
    }
    if (error.code === "23503") {
      return "This operation would violate data integrity. Please check related items.";
    }
    if (error.code === "42501") {
      return "You don't have permission to perform this operation.";
    }
    return "Database operation failed. Please try again or contact support.";
  }

  if (error instanceof SupabaseConfigError) {
    return "Configuration error. Please contact support.";
  }

  if (error instanceof SupabasePoolError) {
    return "Service is temporarily unavailable. Please try again in a moment.";
  }

  if (error instanceof Error) {
    // Don't expose internal error messages to users
    if (error.message.includes("fetch")) {
      return "Network error. Please check your connection and try again.";
    }
  }

  return "An unexpected error occurred. Please try again or contact support.";
}

/**
 * Wrap async operations with error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context?: string,
): Promise<{ success: boolean; data?: T; error?: SupabaseError }> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    const supabaseError =
      error instanceof SupabaseError
        ? error
        : new SupabaseError(
            error instanceof Error ? error.message : String(error),
            "UNKNOWN_ERROR",
            { context, originalError: error },
          );

    return { success: false, error: supabaseError };
  }
}

/**
 * Error recovery strategies
 */
export interface ErrorRecoveryStrategy {
  shouldRetry: (error: unknown, attempt: number) => boolean;
  getDelay: (attempt: number) => number;
  onRetry?: (error: unknown, attempt: number) => void;
  maxAttempts: number;
}

/**
 * Default recovery strategy with exponential backoff
 */
export const defaultRecoveryStrategy: ErrorRecoveryStrategy = {
  maxAttempts: 3,
  shouldRetry: (error, attempt) => {
    if (attempt >= 3) return false;
    return isRetryableError(error);
  },
  getDelay: (attempt) => {
    // Exponential backoff with jitter
    const baseDelay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
    const jitter = Math.random() * 1000;
    return baseDelay + jitter;
  },
};

/**
 * Execute operation with retry logic
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  strategy: ErrorRecoveryStrategy = defaultRecoveryStrategy,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= strategy.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (!strategy.shouldRetry(error, attempt)) {
        throw error;
      }

      if (attempt < strategy.maxAttempts) {
        if (strategy.onRetry) {
          strategy.onRetry(error, attempt);
        }

        const delay = strategy.getDelay(attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
