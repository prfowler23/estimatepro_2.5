import { AIModel } from "./types";
import { getAIConfig } from "./ai-config";

interface RetryOptions {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
}

interface FallbackConfig {
  primaryModels: AIModel[];
  fallbackModels: AIModel[];
  retryOptions: RetryOptions;
  timeoutMs: number;
}

interface ModelHealth {
  failureCount: number;
  lastFailure?: Date;
  circuitBreakerOpen: boolean;
  circuitBreakerOpenUntil?: Date;
}

export class AIFallbackService {
  private static instance: AIFallbackService;
  private modelHealth: Map<string, ModelHealth> = new Map();
  private config: FallbackConfig;

  // Circuit breaker configuration
  private readonly FAILURE_THRESHOLD = 5;
  private readonly CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minute
  private readonly FAILURE_WINDOW = 300000; // 5 minutes

  private constructor() {
    this.config = {
      primaryModels: ["gpt-4-turbo-preview", "gpt-4"],
      fallbackModels: ["gpt-3.5-turbo-16k", "gpt-3.5-turbo"],
      retryOptions: {
        maxRetries: 3,
        initialDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
        jitter: true,
      },
      timeoutMs: 30000,
    };

    // Initialize model health tracking
    this.initializeModelHealth();
  }

  static getInstance(): AIFallbackService {
    if (!AIFallbackService.instance) {
      AIFallbackService.instance = new AIFallbackService();
    }
    return AIFallbackService.instance;
  }

  private initializeModelHealth(): void {
    const allModels = [
      ...this.config.primaryModels,
      ...this.config.fallbackModels,
    ];
    allModels.forEach((model) => {
      this.modelHealth.set(model, {
        failureCount: 0,
        circuitBreakerOpen: false,
      });
    });
  }

  /**
   * Execute AI request with fallback and retry logic
   */
  async executeWithFallback<T>(
    operation: (model: string) => Promise<T>,
    options?: {
      preferredModel?: string;
      skipFallback?: boolean;
      customRetryOptions?: Partial<RetryOptions>;
    },
  ): Promise<T> {
    const models = this.getAvailableModels(options?.preferredModel);
    const retryOptions = {
      ...this.config.retryOptions,
      ...options?.customRetryOptions,
    };

    let lastError: Error | null = null;

    for (const model of models) {
      if (this.isCircuitBreakerOpen(model)) {
        console.log(`Circuit breaker open for model ${model}, skipping...`);
        continue;
      }

      try {
        // Execute with retry logic
        const result = await this.executeWithRetry(
          () => operation(model),
          model,
          retryOptions,
        );

        // Reset failure count on success
        this.recordSuccess(model);
        return result;
      } catch (error) {
        lastError = error as Error;
        this.recordFailure(model);

        console.error(`Failed to execute with model ${model}:`, error);

        if (options?.skipFallback) {
          throw error;
        }
      }
    }

    // All models failed
    throw new Error(
      `All AI models failed. Last error: ${lastError?.message || "Unknown error"}`,
    );
  }

  /**
   * Execute operation with retry logic
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    model: string,
    options: RetryOptions,
  ): Promise<T> {
    let lastError: Error | null = null;
    let delay = options.initialDelay;

    for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
      try {
        // Add timeout to prevent hanging requests
        const result = await this.withTimeout(
          operation(),
          this.config.timeoutMs,
        );
        return result;
      } catch (error) {
        lastError = error as Error;

        // Don't retry on specific errors
        if (this.isNonRetryableError(error)) {
          throw error;
        }

        if (attempt < options.maxRetries) {
          console.log(
            `Retry attempt ${attempt + 1}/${options.maxRetries} for model ${model} after ${delay}ms`,
          );

          // Wait before retry with exponential backoff
          await this.sleep(delay);

          // Calculate next delay
          delay = Math.min(delay * options.backoffMultiplier, options.maxDelay);

          // Add jitter to prevent thundering herd
          if (options.jitter) {
            delay = delay * (0.5 + Math.random() * 0.5);
          }
        }
      }
    }

    throw lastError || new Error("Operation failed after retries");
  }

  /**
   * Get available models based on circuit breaker status
   */
  private getAvailableModels(preferredModel?: string): string[] {
    const models: string[] = [];

    // Add preferred model first if specified
    if (preferredModel && !this.isCircuitBreakerOpen(preferredModel)) {
      models.push(preferredModel);
    }

    // Add primary models
    this.config.primaryModels.forEach((model) => {
      if (!models.includes(model) && !this.isCircuitBreakerOpen(model)) {
        models.push(model);
      }
    });

    // Add fallback models
    this.config.fallbackModels.forEach((model) => {
      if (!models.includes(model) && !this.isCircuitBreakerOpen(model)) {
        models.push(model);
      }
    });

    return models;
  }

  /**
   * Check if circuit breaker is open for a model
   */
  private isCircuitBreakerOpen(model: string): boolean {
    const health = this.modelHealth.get(model);
    if (!health) return false;

    // Check if circuit breaker should be closed
    if (health.circuitBreakerOpen && health.circuitBreakerOpenUntil) {
      if (new Date() > health.circuitBreakerOpenUntil) {
        // Close circuit breaker
        health.circuitBreakerOpen = false;
        health.failureCount = 0;
        delete health.circuitBreakerOpenUntil;
      }
    }

    return health.circuitBreakerOpen;
  }

  /**
   * Record successful operation
   */
  private recordSuccess(model: string): void {
    const health = this.modelHealth.get(model);
    if (health) {
      health.failureCount = 0;
      delete health.lastFailure;
    }
  }

  /**
   * Record failed operation and check circuit breaker
   */
  private recordFailure(model: string): void {
    const health = this.modelHealth.get(model);
    if (!health) return;

    health.failureCount++;
    health.lastFailure = new Date();

    // Check if we should open circuit breaker
    if (health.failureCount >= this.FAILURE_THRESHOLD) {
      health.circuitBreakerOpen = true;
      health.circuitBreakerOpenUntil = new Date(
        Date.now() + this.CIRCUIT_BREAKER_TIMEOUT,
      );
      console.warn(
        `Circuit breaker opened for model ${model} until ${health.circuitBreakerOpenUntil}`,
      );
    }
  }

  /**
   * Check if error is non-retryable
   */
  private isNonRetryableError(error: any): boolean {
    // Don't retry on authentication errors
    if (error.status === 401 || error.status === 403) {
      return true;
    }

    // Don't retry on invalid request errors
    if (error.status === 400) {
      return true;
    }

    // Don't retry on specific OpenAI errors
    if (error.error?.type === "invalid_request_error") {
      return true;
    }

    return false;
  }

  /**
   * Add timeout to promise
   */
  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Operation timed out")), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get model health status for monitoring
   */
  getModelHealthStatus(): Record<
    string,
    {
      available: boolean;
      failureCount: number;
      lastFailure?: string;
      circuitBreakerOpen: boolean;
    }
  > {
    const status: Record<string, any> = {};

    this.modelHealth.forEach((health, model) => {
      status[model] = {
        available: !health.circuitBreakerOpen,
        failureCount: health.failureCount,
        lastFailure: health.lastFailure?.toISOString(),
        circuitBreakerOpen: health.circuitBreakerOpen,
      };
    });

    return status;
  }

  /**
   * Reset model health (for testing or manual intervention)
   */
  resetModelHealth(model?: string): void {
    if (model) {
      const health = this.modelHealth.get(model);
      if (health) {
        health.failureCount = 0;
        health.circuitBreakerOpen = false;
        delete health.lastFailure;
        delete health.circuitBreakerOpenUntil;
      }
    } else {
      // Reset all models
      this.initializeModelHealth();
    }
  }
}

// Singleton instance
export const aiFallbackService = AIFallbackService.getInstance();

// Helper function for easy use
export async function withAIFallback<T>(
  operation: (model: string) => Promise<T>,
  options?: {
    preferredModel?: string;
    skipFallback?: boolean;
    customRetryOptions?: Partial<RetryOptions>;
  },
): Promise<T> {
  return aiFallbackService.executeWithFallback(operation, options);
}
