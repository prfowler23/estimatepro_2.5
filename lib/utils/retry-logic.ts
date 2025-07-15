// Retry logic utilities for critical operations

export interface RetryOptions {
  maxAttempts: number;
  delayMs: number;
  backoffFactor: number;
  maxDelayMs: number;
  retryCondition?: (error: Error) => boolean;
  onRetry?: (attempt: number, error: Error) => void;
  onSuccess?: (attempt: number) => void;
  onFinalFailure?: (error: Error, attempts: number) => void;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  totalTime: number;
}

const defaultRetryOptions: RetryOptions = {
  maxAttempts: 3,
  delayMs: 1000,
  backoffFactor: 2,
  maxDelayMs: 10000,
  retryCondition: (error) => {
    // Default retry condition: retry on network errors, timeouts, and server errors
    return error.name === 'NetworkError' || 
           error.name === 'TimeoutError' ||
           error.message.includes('500') ||
           error.message.includes('502') ||
           error.message.includes('503') ||
           error.message.includes('504');
  }
};

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<RetryResult<T>> {
  const config = { ...defaultRetryOptions, ...options };
  const startTime = Date.now();
  let lastError: Error;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      const result = await operation();
      
      // Success callback
      if (config.onSuccess) {
        config.onSuccess(attempt);
      }

      return {
        success: true,
        data: result,
        attempts: attempt,
        totalTime: Date.now() - startTime
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check if we should retry
      const shouldRetry = config.retryCondition!(lastError);
      const isLastAttempt = attempt === config.maxAttempts;
      
      if (!shouldRetry || isLastAttempt) {
        // Final failure callback
        if (config.onFinalFailure) {
          config.onFinalFailure(lastError, attempt);
        }
        
        break;
      }
      
      // Retry callback
      if (config.onRetry) {
        config.onRetry(attempt, lastError);
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        config.delayMs * Math.pow(config.backoffFactor, attempt - 1),
        config.maxDelayMs
      );
      
      await sleep(delay);
    }
  }

  return {
    success: false,
    error: lastError!,
    attempts: config.maxAttempts,
    totalTime: Date.now() - startTime
  };
}

// Specialized retry functions for different operation types

// Database operations
export async function withDatabaseRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<RetryResult<T>> {
  return withRetry(operation, {
    maxAttempts: 5,
    delayMs: 500,
    backoffFactor: 1.5,
    maxDelayMs: 5000,
    retryCondition: (error) => {
      return error.message.includes('connection') ||
             error.message.includes('timeout') ||
             error.message.includes('network') ||
             error.message.includes('ECONNRESET') ||
             error.message.includes('ENOTFOUND');
    },
    ...options
  });
}

// API operations
export async function withApiRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<RetryResult<T>> {
  return withRetry(operation, {
    maxAttempts: 3,
    delayMs: 1000,
    backoffFactor: 2,
    maxDelayMs: 8000,
    retryCondition: (error) => {
      const status = extractStatusCode(error);
      return status === 500 || status === 502 || status === 503 || status === 504 || 
             status === 408 || status === 429 || // Rate limited
             error.name === 'NetworkError' ||
             error.name === 'TimeoutError';
    },
    ...options
  });
}

// AI operations (higher timeout tolerance)
export async function withAIRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<RetryResult<T>> {
  return withRetry(operation, {
    maxAttempts: 2,
    delayMs: 2000,
    backoffFactor: 3,
    maxDelayMs: 15000,
    retryCondition: (error) => {
      const status = extractStatusCode(error);
      return status === 500 || status === 502 || status === 503 || status === 504 ||
             status === 429 || // Rate limited
             error.message.includes('timeout') ||
             error.message.includes('overloaded');
    },
    ...options
  });
}

// File operations
export async function withFileRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<RetryResult<T>> {
  return withRetry(operation, {
    maxAttempts: 3,
    delayMs: 500,
    backoffFactor: 1.5,
    maxDelayMs: 3000,
    retryCondition: (error) => {
      return error.message.includes('ENOENT') ||
             error.message.includes('EACCES') ||
             error.message.includes('EMFILE') ||
             error.message.includes('ENFILE') ||
             error.name === 'NetworkError';
    },
    ...options
  });
}

// Authentication operations
export async function withAuthRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<RetryResult<T>> {
  return withRetry(operation, {
    maxAttempts: 2,
    delayMs: 1000,
    backoffFactor: 2,
    maxDelayMs: 4000,
    retryCondition: (error) => {
      const status = extractStatusCode(error);
      return status === 500 || status === 502 || status === 503 || status === 504 ||
             error.name === 'NetworkError' ||
             error.name === 'TimeoutError';
    },
    ...options
  });
}

// React hook for retry operations
export function useRetry() {
  const executeWithRetry = async <T>(
    operation: () => Promise<T>,
    options?: Partial<RetryOptions>
  ): Promise<RetryResult<T>> => {
    return withRetry(operation, options);
  };

  return {
    executeWithRetry,
    withDatabaseRetry,
    withApiRetry,
    withAIRetry,
    withFileRetry,
    withAuthRetry
  };
}

// Circuit breaker pattern for repeated failures
export class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime: number | null = null;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private maxFailures: number = 5,
    private timeout: number = 60000, // 1 minute
    private retryTimeout: number = 30000 // 30 seconds
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (this.lastFailureTime && Date.now() - this.lastFailureTime > this.retryTimeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await Promise.race([
        operation(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Operation timeout')), this.timeout)
        )
      ]);

      // Success - reset circuit breaker
      this.failureCount = 0;
      this.state = 'closed';
      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (this.failureCount >= this.maxFailures) {
        this.state = 'open';
      }

      throw error;
    }
  }

  getState(): 'closed' | 'open' | 'half-open' {
    return this.state;
  }

  reset(): void {
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.state = 'closed';
  }
}

// Utility functions

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function extractStatusCode(error: Error): number | null {
  const match = error.message.match(/status:?\s*(\d+)/i) || 
                error.message.match(/(\d{3})/);
  return match ? parseInt(match[1], 10) : null;
}

// Jitter function to prevent thundering herd
export function addJitter(delayMs: number, jitterFactor: number = 0.1): number {
  const jitter = delayMs * jitterFactor * Math.random();
  return delayMs + jitter;
}

// Decorator for automatic retry
export function retryable(options: Partial<RetryOptions> = {}) {
  return function <T extends (...args: any[]) => Promise<any>>(
    target: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const originalMethod = descriptor.value!;
    
    descriptor.value = async function (this: any, ...args: any[]) {
      const result = await withRetry(
        () => originalMethod.apply(this, args),
        options
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

// Global circuit breakers for different services
export const circuitBreakers = {
  database: new CircuitBreaker(5, 30000, 60000),
  api: new CircuitBreaker(3, 10000, 30000),
  ai: new CircuitBreaker(2, 60000, 120000),
  file: new CircuitBreaker(3, 5000, 15000),
  auth: new CircuitBreaker(2, 10000, 60000)
};

// Export default retry function
export default withRetry;