/**
 * Enhanced retry logic utilities for critical operations
 * Includes exponential backoff with jitter, circuit breaker pattern, and comprehensive error handling
 */

export interface RetryOptions {
  maxAttempts: number;
  delayMs: number;
  backoffFactor: number;
  maxDelayMs: number;
  jitter: boolean | number; // true for default 10%, or custom percentage (0-1)
  retryCondition?: (error: Error, attempt: number) => boolean;
  onRetry?: (attempt: number, error: Error, nextDelay: number) => void;
  onSuccess?: (attempt: number, totalTime: number) => void;
  onFinalFailure?: (error: Error, attempts: number, totalTime: number) => void;
  abortSignal?: AbortSignal; // Support for cancellation
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  totalTime: number;
  lastAttemptTime?: number;
  averageAttemptTime?: number;
}

// Enhanced default configuration with jitter
const defaultRetryOptions: Required<RetryOptions> = {
  maxAttempts: 3,
  delayMs: 1000,
  backoffFactor: 2,
  maxDelayMs: 10000,
  jitter: 0.1, // 10% jitter by default
  retryCondition: (error, attempt) => {
    // Enhanced retry condition with attempt-based logic
    const isRetryableError =
      error.name === "NetworkError" ||
      error.name === "TimeoutError" ||
      error.name === "AbortError" ||
      error.message.includes("ECONNRESET") ||
      error.message.includes("ENOTFOUND") ||
      error.message.includes("ETIMEDOUT") ||
      /5\d{2}/.test(error.message) || // 5xx status codes
      error.message.includes("429"); // Rate limited

    // Don't retry client errors (4xx except 429) or after too many attempts
    const isClientError = /4[0-46-9]\d/.test(error.message);
    return isRetryableError && !isClientError && attempt <= 3;
  },
  onRetry: () => {}, // Default no-op
  onSuccess: () => {}, // Default no-op
  onFinalFailure: () => {}, // Default no-op
  abortSignal: new AbortController().signal,
};

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {},
): Promise<RetryResult<T>> {
  const config = { ...defaultRetryOptions, ...options };
  const startTime = Date.now();
  let lastError: Error;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    // Check for abort signal
    if (config.abortSignal?.aborted) {
      throw new Error("Operation aborted");
    }

    try {
      const result = await operation();

      // Success callback with timing info
      const totalTime = Date.now() - startTime;
      if (config.onSuccess) {
        config.onSuccess(attempt, totalTime);
      }

      return {
        success: true,
        data: result,
        attempts: attempt,
        totalTime: Date.now() - startTime,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry based on error and attempt number
      const shouldRetry = config.retryCondition(lastError, attempt);
      const isLastAttempt = attempt === config.maxAttempts;

      if (!shouldRetry || isLastAttempt) {
        // Final failure callback with timing info
        const totalTime = Date.now() - startTime;
        if (config.onFinalFailure) {
          config.onFinalFailure(lastError, attempt, totalTime);
        }

        break;
      }

      // Retry callback is now handled above with delay info

      // Calculate delay with exponential backoff and jitter
      const baseDelay = Math.min(
        config.delayMs * Math.pow(config.backoffFactor, attempt - 1),
        config.maxDelayMs,
      );

      const delayWithJitter = addJitter(baseDelay, config.jitter);

      // Notify about retry with actual delay
      if (config.onRetry) {
        config.onRetry(attempt, lastError, delayWithJitter);
      }

      await sleep(delayWithJitter);
    }
  }

  return {
    success: false,
    error: lastError!,
    attempts: config.maxAttempts,
    totalTime: Date.now() - startTime,
  };
}

// Specialized retry functions for different operation types

// Enhanced database operations with better retry logic
export async function withDatabaseRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {},
): Promise<RetryResult<T>> {
  return withRetry(operation, {
    maxAttempts: 5,
    delayMs: 500,
    backoffFactor: 1.5,
    maxDelayMs: 5000,
    jitter: 0.15, // Slightly higher jitter for database operations
    retryCondition: (error, attempt) => {
      const isDatabaseError =
        error.message.includes("connection") ||
        error.message.includes("timeout") ||
        error.message.includes("network") ||
        error.message.includes("ECONNRESET") ||
        error.message.includes("ENOTFOUND") ||
        error.message.includes("EPIPE") ||
        error.message.includes("Connection terminated") ||
        error.message.includes("server closed the connection");

      // Don't retry on authentication or permission errors
      const isAuthError =
        error.message.includes("authentication") ||
        error.message.includes("permission") ||
        error.message.includes("access denied") ||
        error.message.includes("unauthorized");

      return isDatabaseError && !isAuthError && attempt <= 5;
    },
    ...options,
  });
}

// Enhanced API operations with smarter retry logic
export async function withApiRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {},
): Promise<RetryResult<T>> {
  return withRetry(operation, {
    maxAttempts: 3,
    delayMs: 1000,
    backoffFactor: 2,
    maxDelayMs: 8000,
    jitter: 0.1,
    retryCondition: (error, attempt) => {
      const status = extractStatusCode(error);

      // Always retry these conditions
      const shouldAlwaysRetry =
        status === 500 ||
        status === 502 ||
        status === 503 ||
        status === 504 ||
        status === 408 ||
        error.name === "NetworkError" ||
        error.name === "TimeoutError" ||
        error.name === "AbortError";

      // Special handling for rate limiting
      if (status === 429) {
        // Extract retry-after header if available
        const retryAfter = extractRetryAfter(error);
        if (retryAfter && retryAfter > 60) {
          // Don't retry if rate limit is too long
          return false;
        }
        return attempt <= 2; // Limit retries for rate limiting
      }

      return shouldAlwaysRetry && attempt <= 3;
    },
    ...options,
  });
}

// Enhanced AI operations with conservative retry strategy
export async function withAIRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {},
): Promise<RetryResult<T>> {
  return withRetry(operation, {
    maxAttempts: 2,
    delayMs: 2000,
    backoffFactor: 2.5,
    maxDelayMs: 15000,
    jitter: 0.2, // Higher jitter for AI services to avoid thundering herd
    retryCondition: (error, attempt) => {
      const status = extractStatusCode(error);

      // AI services often have different error patterns
      const isRetryableAIError =
        status === 500 ||
        status === 502 ||
        status === 503 ||
        status === 504 ||
        error.message.includes("timeout") ||
        error.message.includes("overloaded") ||
        error.message.includes("capacity") ||
        error.message.includes("temporarily unavailable");

      // Handle AI-specific rate limiting more carefully
      if (status === 429) {
        const retryAfter = extractRetryAfter(error);
        // Only retry if rate limit is reasonable
        return retryAfter ? retryAfter <= 30 : attempt === 1;
      }

      return isRetryableAIError && attempt <= 2;
    },
    ...options,
  });
}

// File operations
export async function withFileRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {},
): Promise<RetryResult<T>> {
  return withRetry(operation, {
    maxAttempts: 3,
    delayMs: 500,
    backoffFactor: 1.5,
    maxDelayMs: 3000,
    retryCondition: (error) => {
      return (
        error.message.includes("ENOENT") ||
        error.message.includes("EACCES") ||
        error.message.includes("EMFILE") ||
        error.message.includes("ENFILE") ||
        error.name === "NetworkError"
      );
    },
    ...options,
  });
}

// Authentication operations
export async function withAuthRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {},
): Promise<RetryResult<T>> {
  return withRetry(operation, {
    maxAttempts: 2,
    delayMs: 1000,
    backoffFactor: 2,
    maxDelayMs: 4000,
    retryCondition: (error) => {
      const status = extractStatusCode(error);
      return (
        status === 500 ||
        status === 502 ||
        status === 503 ||
        status === 504 ||
        error.name === "NetworkError" ||
        error.name === "TimeoutError"
      );
    },
    ...options,
  });
}

/**
 * React hook for retry operations with enhanced capabilities
 */
export function useRetry() {
  const executeWithRetry = async <T>(
    operation: () => Promise<T>,
    options?: Partial<RetryOptions>,
  ): Promise<RetryResult<T>> => {
    return withRetry(operation, options);
  };

  const executeWithAbort = async <T>(
    operation: () => Promise<T>,
    abortController: AbortController,
    options?: Partial<RetryOptions>,
  ): Promise<RetryResult<T>> => {
    return withRetry(operation, {
      ...options,
      abortSignal: abortController.signal,
    });
  };

  return {
    executeWithRetry,
    executeWithAbort,
    withDatabaseRetry,
    withApiRetry,
    withAIRetry,
    withFileRetry,
    withAuthRetry,
    // Utility functions
    addJitter,
    extractStatusCode,
  };
}

// Circuit breaker pattern for repeated failures
export class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime: number | null = null;
  private state: "closed" | "open" | "half-open" = "closed";

  constructor(
    private maxFailures: number = 5,
    private timeout: number = 60000, // 1 minute
    private retryTimeout: number = 30000, // 30 seconds
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (
        this.lastFailureTime &&
        Date.now() - this.lastFailureTime > this.retryTimeout
      ) {
        this.state = "half-open";
      } else {
        throw new Error("Circuit breaker is open");
      }
    }

    try {
      const result = await Promise.race([
        operation(),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("Operation timeout")),
            this.timeout,
          ),
        ),
      ]);

      // Success - reset circuit breaker
      this.failureCount = 0;
      this.state = "closed";
      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (this.failureCount >= this.maxFailures) {
        this.state = "open";
      }

      throw error;
    }
  }

  getState(): "closed" | "open" | "half-open" {
    return this.state;
  }

  reset(): void {
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.state = "closed";
  }
}

// Utility functions

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractStatusCode(error: Error): number | null {
  // Try multiple patterns to extract status code
  const patterns = [
    /status:?\s*(\d+)/i,
    /code:?\s*(\d+)/i,
    /\b(\d{3})\b/,
    /status\s*=\s*(\d+)/i,
  ];

  for (const pattern of patterns) {
    const match = error.message.match(pattern);
    if (match) {
      const code = parseInt(match[1], 10);
      if (code >= 100 && code <= 599) {
        return code;
      }
    }
  }

  return null;
}

/**
 * Extract retry-after header value from error message
 */
function extractRetryAfter(error: Error): number | null {
  const retryAfterMatch = error.message.match(/retry[_-]?after:?\s*(\d+)/i);
  return retryAfterMatch ? parseInt(retryAfterMatch[1], 10) : null;
}

/**
 * Enhanced jitter function to prevent thundering herd
 * Supports both additive and multiplicative jitter
 */
export function addJitter(
  delayMs: number,
  jitterConfig: boolean | number = 0.1,
  strategy: "additive" | "multiplicative" | "full" = "additive",
): number {
  if (jitterConfig === false) {
    return delayMs;
  }

  const jitterFactor = jitterConfig === true ? 0.1 : jitterConfig;

  switch (strategy) {
    case "additive":
      // Add random jitter: delay + (0 to jitter% of delay)
      const jitter = delayMs * jitterFactor * Math.random();
      return Math.round(delayMs + jitter);

    case "multiplicative":
      // Multiply by random factor: delay * (1 ± jitter%)
      const multiplier = 1 + jitterFactor * (Math.random() - 0.5) * 2;
      return Math.round(delayMs * Math.max(0.1, multiplier));

    case "full":
      // Full jitter: random between 0 and delay
      return Math.round(Math.random() * delayMs);

    default:
      return delayMs;
  }
}

/**
 * Enhanced decorator for automatic retry with better type safety
 */
export function retryable(options: Partial<RetryOptions> = {}) {
  return function <T extends (...args: any[]) => Promise<any>>(
    target: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>,
  ) {
    const originalMethod = descriptor.value!;
    const methodName = `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (this: any, ...args: any[]) {
      const enhancedOptions: Partial<RetryOptions> = {
        ...options,
        onRetry: (attempt, error, delay) => {
          console.warn(
            `Retrying ${methodName} (attempt ${attempt}): ${error.message}. Next retry in ${delay}ms`,
          );
          options.onRetry?.(attempt, error, delay);
        },
        onFinalFailure: (error, attempts, totalTime) => {
          console.error(
            `${methodName} failed after ${attempts} attempts in ${totalTime}ms:`,
            error,
          );
          options.onFinalFailure?.(error, attempts, totalTime);
        },
      };

      const result = await withRetry(
        () => originalMethod.apply(this, args),
        enhancedOptions,
      );

      if (result.success) {
        return result.data;
      } else {
        throw result.error;
      }
    } as T;

    return descriptor;
  };
}

// Enhanced global circuit breakers with better configuration
export const circuitBreakers = {
  database: new CircuitBreaker(5, 30000, 60000), // 5 failures, 30s timeout, 60s retry
  api: new CircuitBreaker(3, 15000, 45000), // 3 failures, 15s timeout, 45s retry
  ai: new CircuitBreaker(2, 90000, 180000), // 2 failures, 90s timeout, 3m retry (AI is expensive)
  file: new CircuitBreaker(4, 10000, 30000), // 4 failures, 10s timeout, 30s retry
  auth: new CircuitBreaker(2, 15000, 90000), // 2 failures, 15s timeout, 90s retry
  external: new CircuitBreaker(3, 20000, 60000), // For external APIs
} as const;

/**
 * Get or create a circuit breaker for a specific service
 */
export function getCircuitBreaker(
  serviceName: string,
  config?: { maxFailures?: number; timeout?: number; retryTimeout?: number },
): CircuitBreaker {
  const existing = (circuitBreakers as any)[serviceName];
  if (existing) {
    return existing;
  }

  // Create new circuit breaker with provided or default config
  return new CircuitBreaker(
    config?.maxFailures ?? 3,
    config?.timeout ?? 15000,
    config?.retryTimeout ?? 45000,
  );
}

// Export default retry function
export default withRetry;
