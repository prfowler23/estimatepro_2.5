/**
 * Analytics Cache Service
 * Handles caching, offline support, and retry logic for analytics operations
 */

export class AnalyticsCacheService {
  private cache = new Map<
    string,
    { data: any; timestamp: number; ttl: number }
  >();
  private isOnline = true;
  private fallbackData = new Map<string, any>();
  private retryQueue: Array<() => Promise<void>> = [];
  private maxRetries = 3;
  private retryDelay = 1000;

  constructor() {
    this.initializeErrorHandling();
  }

  private initializeErrorHandling() {
    // Monitor connection status
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        this.isOnline = true;
        this.processRetryQueue();
      });
      window.addEventListener("offline", () => {
        this.isOnline = false;
      });
    }
  }

  /**
   * Execute operation with fallback and retry logic
   */
  async withFallback<T>(
    operation: () => Promise<T>,
    fallbackKey: string,
    fallbackValue?: T,
    retryable = true,
  ): Promise<T> {
    try {
      const result = await this.executeWithRetry(operation);
      // Cache successful result for fallback
      this.fallbackData.set(fallbackKey, result);
      return result;
    } catch (error) {
      console.warn(
        `Analytics operation failed, using fallback for ${fallbackKey}:`,
        error,
      );

      // Try cached fallback data first
      const cachedFallback = this.fallbackData.get(fallbackKey);
      if (cachedFallback) {
        return cachedFallback;
      }

      // Use provided fallback value
      if (fallbackValue !== undefined) {
        return fallbackValue;
      }

      // Queue for retry if retryable and offline
      if (retryable && !this.isOnline) {
        this.retryQueue.push(async () => {
          try {
            const result = await operation();
            this.fallbackData.set(fallbackKey, result);
          } catch (retryError) {
            console.warn(`Retry failed for ${fallbackKey}:`, retryError);
          }
        });
      }

      // Return empty/default data structure based on the expected type
      return this.getEmptyFallback(fallbackKey) as T;
    }
  }

  /**
   * Execute operation with retry logic
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    retries = this.maxRetries,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retries > 0 && this.isRetryableError(error)) {
        await this.delay(this.retryDelay);
        return this.executeWithRetry(operation, retries - 1);
      }
      throw error;
    }
  }

  /**
   * Determine if error is worth retrying
   */
  private isRetryableError(error: any): boolean {
    if (!error) return false;

    const retryableErrors = [
      "NETWORK_ERROR",
      "TIMEOUT",
      "CONNECTION_ERROR",
      "TEMPORARY_ERROR",
      "RATE_LIMIT_ERROR",
    ];

    return retryableErrors.some(
      (errorType) =>
        error.message?.includes(errorType) ||
        error.code?.includes(errorType) ||
        error.status >= 500, // Server errors
    );
  }

  /**
   * Delay utility for retry logic
   */
  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Process queued retry operations when back online
   */
  private async processRetryQueue(): Promise<void> {
    while (this.retryQueue.length > 0 && this.isOnline) {
      const operation = this.retryQueue.shift();
      if (operation) {
        try {
          await operation();
        } catch (error) {
          console.warn("Retry queue operation failed:", error);
        }
      }
    }
  }

  /**
   * Generate empty fallback data structures
   */
  private getEmptyFallback(key: string): any {
    if (key.includes("metrics")) {
      return [];
    }
    if (key.includes("stats")) {
      return {
        userId: "",
        userName: "",
        userRole: "",
        totalWorkflows: 0,
        completedWorkflows: 0,
        averageCompletionTime: 0,
        averageQualityScore: 0,
        averageStepDuration: 0,
        averageBacktrackRate: 0,
        averageErrorRate: 0,
        averageAIUsage: 0,
        weeklyCompletionRate: 0,
        monthlyCompletionRate: 0,
        qualityTrend: "stable" as const,
        efficiencyTrend: "stable" as const,
        slowestSteps: [],
        mostCommonErrors: [],
        underutilizedFeatures: [],
      };
    }
    if (key.includes("insights")) {
      return [];
    }
    if (key.includes("benchmarks")) {
      return [];
    }
    if (key.includes("timeseries")) {
      return [];
    }
    return null;
  }

  /**
   * Get cached data
   */
  getCachedData(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
    return null;
  }

  /**
   * Set cached data with TTL
   */
  setCachedData(key: string, data: any, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Check if online
   */
  get isConnected(): boolean {
    return this.isOnline;
  }

  /**
   * Get retry queue length
   */
  get pendingRetries(): number {
    return this.retryQueue.length;
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear();
    this.fallbackData.clear();
  }
}
