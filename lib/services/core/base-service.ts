/**
 * Base Service Class
 * Provides common functionality for all service classes
 */

import { Logger, createLogger } from "./logger";
import { ServiceError, isRecoverableError } from "./errors";
import { withDatabaseRetry } from "@/lib/utils/retry-logic";

export interface ServiceConfig {
  serviceName: string;
  enableCaching?: boolean;
  cacheTimeout?: number; // milliseconds
  enableRetry?: boolean;
  maxRetries?: number;
  retryDelay?: number; // milliseconds
  enableLogging?: boolean;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

/**
 * Abstract base class for all services
 */
export abstract class BaseService {
  protected readonly logger: Logger;
  protected readonly config: Required<ServiceConfig>;
  private cache: Map<string, CacheEntry<any>> = new Map();
  private timers: Set<NodeJS.Timeout> = new Set();
  private disposed: boolean = false;

  constructor(config: ServiceConfig) {
    this.config = {
      serviceName: config.serviceName,
      enableCaching: config.enableCaching ?? true,
      cacheTimeout: config.cacheTimeout ?? 5 * 60 * 1000, // 5 minutes default
      enableRetry: config.enableRetry ?? true,
      maxRetries: config.maxRetries ?? 3,
      retryDelay: config.retryDelay ?? 1000,
      enableLogging: config.enableLogging ?? true,
    };

    this.logger = createLogger(this.config.serviceName);

    if (this.config.enableLogging) {
      this.logger.info(`${this.config.serviceName} initialized`, {
        config: this.config,
      });
    }

    // Setup cleanup on process exit
    this.setupCleanup();
  }

  /**
   * Cache management methods
   */
  protected getCached<T>(key: string): T | null {
    if (!this.config.enableCaching) return null;

    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    this.logger.debug(`Cache hit for key: ${key}`, {
      key,
      age: Date.now() - entry.timestamp,
    });

    return entry.data as T;
  }

  protected setCached<T>(key: string, data: T, timeout?: number): void {
    if (!this.config.enableCaching) return;

    const expiresAt = Date.now() + (timeout ?? this.config.cacheTimeout);

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt,
    });

    this.logger.debug(`Cached data for key: ${key}`, {
      key,
      expiresAt: new Date(expiresAt),
    });
  }

  protected clearCache(pattern?: string): void {
    if (pattern) {
      // Clear entries matching pattern
      const keysToDelete: string[] = [];
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach((key) => this.cache.delete(key));

      this.logger.debug(
        `Cleared ${keysToDelete.length} cache entries matching pattern: ${pattern}`,
      );
    } else {
      // Clear all cache
      const size = this.cache.size;
      this.cache.clear();
      this.logger.debug(`Cleared all ${size} cache entries`);
    }
  }

  /**
   * Timer management for cleanup
   */
  protected addTimer(timer: NodeJS.Timeout): void {
    this.timers.add(timer);
  }

  protected clearTimer(timer: NodeJS.Timeout): void {
    clearTimeout(timer);
    this.timers.delete(timer);
  }

  protected clearAllTimers(): void {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
  }

  /**
   * Retry logic wrapper
   */
  protected async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
  ): Promise<T> {
    if (!this.config.enableRetry) {
      return await operation();
    }

    let lastError: Error | unknown;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const result = await operation();

        if (attempt > 1) {
          this.logger.info(
            `${operationName} succeeded after ${attempt} attempts`,
          );
        }

        return result;
      } catch (error) {
        lastError = error;

        // Check if error is recoverable
        if (!isRecoverableError(error)) {
          this.logger.error(
            `${operationName} failed with non-recoverable error`,
            error,
          );
          throw error;
        }

        if (attempt < this.config.maxRetries) {
          const delay = this.config.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
          this.logger.warn(`${operationName} failed, retrying in ${delay}ms`, {
            attempt,
            maxRetries: this.config.maxRetries,
            error,
          });

          await this.delay(delay);
        }
      }
    }

    this.logger.error(
      `${operationName} failed after ${this.config.maxRetries} attempts`,
      lastError,
    );
    throw lastError;
  }

  /**
   * Database operation wrapper
   */
  protected async withDatabase<T>(
    operation: () => Promise<T>,
    operationName: string,
  ): Promise<T> {
    return await this.logger.time(operationName, async () => {
      const result = await withDatabaseRetry(operation);

      if (!result.success) {
        throw result.error || new Error(`${operationName} failed`);
      }

      return result.data as T;
    });
  }

  /**
   * Utility methods
   */
  protected delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      const timer = setTimeout(resolve, ms);
      this.addTimer(timer);
    });
  }

  protected generateCacheKey(
    ...parts: (string | number | undefined)[]
  ): string {
    return parts.filter((p) => p !== undefined).join(":");
  }

  /**
   * Lifecycle methods
   */
  private setupCleanup(): void {
    // Handle process termination
    const cleanup = () => {
      if (!this.disposed) {
        this.dispose();
      }
    };

    process.once("exit", cleanup);
    process.once("SIGINT", cleanup);
    process.once("SIGTERM", cleanup);
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    if (this.disposed) return;

    this.logger.info(`Disposing ${this.config.serviceName}`);

    // Clear all timers
    this.clearAllTimers();

    // Clear cache
    this.clearCache();

    // Mark as disposed
    this.disposed = true;

    // Call child class cleanup if implemented
    this.onDispose();
  }

  /**
   * Hook for child classes to implement custom cleanup
   */
  protected onDispose(): void {
    // Override in child classes if needed
  }

  /**
   * Health check method
   */
  public async healthCheck(): Promise<{
    healthy: boolean;
    service: string;
    cacheSize: number;
    timerCount: number;
    details?: Record<string, any>;
  }> {
    const baseHealth = {
      healthy: true,
      service: this.config.serviceName,
      cacheSize: this.cache.size,
      timerCount: this.timers.size,
    };

    try {
      // Call child class health check if implemented
      const details = await this.onHealthCheck();
      return {
        ...baseHealth,
        details,
      };
    } catch (error) {
      this.logger.error("Health check failed", error);
      return {
        ...baseHealth,
        healthy: false,
        details: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }
  }

  /**
   * Hook for child classes to implement custom health checks
   */
  protected async onHealthCheck(): Promise<Record<string, any>> {
    return {};
  }

  /**
   * Performance metrics
   */
  public getMetrics(): {
    service: string;
    cacheHitRate: number;
    activeTimers: number;
    memoryUsage: NodeJS.MemoryUsage;
  } {
    // Calculate cache hit rate (would need to track hits/misses for real implementation)
    const cacheHitRate = this.cache.size > 0 ? 0.8 : 0; // Placeholder

    return {
      service: this.config.serviceName,
      cacheHitRate,
      activeTimers: this.timers.size,
      memoryUsage: process.memoryUsage(),
    };
  }
}
