import PQueue from "p-queue";

/**
 * AI Request Queue with rate limiting and concurrency control
 * Prevents overwhelming AI provider APIs and manages costs
 */
export class AIRequestQueue {
  private queues: Map<string, PQueue>;
  private static instance: AIRequestQueue;

  private constructor() {
    this.queues = new Map();
  }

  static getInstance(): AIRequestQueue {
    if (!AIRequestQueue.instance) {
      AIRequestQueue.instance = new AIRequestQueue();
    }
    return AIRequestQueue.instance;
  }

  /**
   * Get or create a queue for a specific AI service
   */
  private getQueue(service: string): PQueue {
    if (!this.queues.has(service)) {
      // Different rate limits for different services
      const config = this.getQueueConfig(service);
      this.queues.set(service, new PQueue(config));
    }
    return this.queues.get(service)!;
  }

  /**
   * Get queue configuration based on service
   */
  private getQueueConfig(service: string): PQueue.Options {
    switch (service) {
      case "openai":
        return {
          concurrency: 5, // Max concurrent requests
          interval: 60000, // 1 minute
          intervalCap: 50, // Max 50 requests per minute
          timeout: 30000, // 30 second timeout
          throwOnTimeout: true,
        };
      case "vision":
        return {
          concurrency: 3, // Vision models are more resource intensive
          interval: 60000,
          intervalCap: 20, // Lower rate limit for vision
          timeout: 60000, // 1 minute timeout for image processing
          throwOnTimeout: true,
        };
      case "embedding":
        return {
          concurrency: 10, // Embeddings are lighter
          interval: 60000,
          intervalCap: 100,
          timeout: 10000,
          throwOnTimeout: true,
        };
      default:
        return {
          concurrency: 5,
          interval: 60000,
          intervalCap: 30,
          timeout: 30000,
          throwOnTimeout: true,
        };
    }
  }

  /**
   * Add a request to the queue
   */
  async add<T>(
    service: string,
    fn: () => Promise<T>,
    priority?: number,
  ): Promise<T> {
    const queue = this.getQueue(service);

    try {
      return await queue.add(fn, { priority });
    } catch (error) {
      if (error instanceof Error && error.name === "TimeoutError") {
        throw new Error(`AI request timeout for service: ${service}`);
      }
      throw error;
    }
  }

  /**
   * Get queue statistics
   */
  getStats(service: string): {
    size: number;
    pending: number;
    isPaused: boolean;
  } {
    const queue = this.getQueue(service);
    return {
      size: queue.size,
      pending: queue.pending,
      isPaused: queue.isPaused,
    };
  }

  /**
   * Get all queue statistics
   */
  getAllStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    for (const [service, queue] of this.queues) {
      stats[service] = {
        size: queue.size,
        pending: queue.pending,
        isPaused: queue.isPaused,
      };
    }
    return stats;
  }

  /**
   * Pause a specific queue
   */
  pause(service: string): void {
    const queue = this.getQueue(service);
    queue.pause();
  }

  /**
   * Resume a specific queue
   */
  resume(service: string): void {
    const queue = this.getQueue(service);
    queue.start();
  }

  /**
   * Clear a specific queue
   */
  clear(service: string): void {
    const queue = this.getQueue(service);
    queue.clear();
  }

  /**
   * Clear all queues
   */
  clearAll(): void {
    for (const queue of this.queues.values()) {
      queue.clear();
    }
  }

  /**
   * Wait for a queue to be empty
   */
  async onEmpty(service: string): Promise<void> {
    const queue = this.getQueue(service);
    await queue.onEmpty();
  }

  /**
   * Wait for all queues to be empty
   */
  async onAllEmpty(): Promise<void> {
    const promises = Array.from(this.queues.values()).map((queue) =>
      queue.onEmpty(),
    );
    await Promise.all(promises);
  }

  /**
   * Wait for a queue to be idle (no running tasks)
   */
  async onIdle(service: string): Promise<void> {
    const queue = this.getQueue(service);
    await queue.onIdle();
  }

  /**
   * Execute with automatic retry and exponential backoff
   */
  async executeWithRetry<T>(
    service: string,
    fn: () => Promise<T>,
    options: {
      maxRetries?: number;
      initialDelay?: number;
      maxDelay?: number;
      factor?: number;
      priority?: number;
    } = {},
  ): Promise<T> {
    const {
      maxRetries = 3,
      initialDelay = 1000,
      maxDelay = 30000,
      factor = 2,
      priority,
    } = options;

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.add(service, fn, priority);
      } catch (error) {
        lastError = error as Error;

        // Don't retry on certain errors
        if (
          error instanceof Error &&
          (error.message.includes("Invalid API key") ||
            error.message.includes("Insufficient quota") ||
            error.message.includes("Model not found"))
        ) {
          throw error;
        }

        if (attempt < maxRetries) {
          const delay = Math.min(
            initialDelay * Math.pow(factor, attempt),
            maxDelay,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error("Max retries exceeded");
  }
}

// Export singleton instance
export const aiRequestQueue = AIRequestQueue.getInstance();
