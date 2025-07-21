import { z } from "zod";

// Custom error types for AI operations
export class AIError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public retryable: boolean = false,
    public originalError?: Error,
  ) {
    super(message);
    this.name = "AIError";
  }
}

export class RateLimitError extends AIError {
  constructor(
    message: string = "Rate limit exceeded",
    public retryAfter?: number,
  ) {
    super(message, "RATE_LIMIT_EXCEEDED", 429, true);
    this.name = "RateLimitError";
  }
}

export class ValidationError extends AIError {
  constructor(
    message: string,
    public validationErrors: z.ZodIssue[],
  ) {
    super(message, "VALIDATION_ERROR", 400, false);
    this.name = "ValidationError";
  }
}

export class AuthenticationError extends AIError {
  constructor(message: string = "Authentication failed") {
    super(message, "AUTH_ERROR", 401, false);
    this.name = "AuthenticationError";
  }
}

export class QuotaExceededError extends AIError {
  constructor(message: string = "API quota exceeded") {
    super(message, "QUOTA_EXCEEDED", 429, false);
    this.name = "QuotaExceededError";
  }
}

export class ContentFilterError extends AIError {
  constructor(message: string = "Content filtered by safety system") {
    super(message, "CONTENT_FILTERED", 400, false);
    this.name = "ContentFilterError";
  }
}

export class ModelUnavailableError extends AIError {
  constructor(message: string = "AI model temporarily unavailable") {
    super(message, "MODEL_UNAVAILABLE", 503, true);
    this.name = "ModelUnavailableError";
  }
}

export class NetworkError extends AIError {
  constructor(message: string = "Network error occurred") {
    super(message, "NETWORK_ERROR", 500, true);
    this.name = "NetworkError";
  }
}

// Retry configuration
export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
  jitter: boolean;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitter: true,
};

// Rate limiting configuration
export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  burstLimit: number;
}

export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  requestsPerMinute: 20,
  requestsPerHour: 500,
  requestsPerDay: 5000,
  burstLimit: 5,
};

// Enhanced retry function with exponential backoff
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {},
): Promise<T> {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error;

  for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Check if error is retryable
      if (error instanceof AIError && !error.retryable) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === retryConfig.maxAttempts) {
        break;
      }

      // Calculate delay with exponential backoff
      const baseDelay =
        retryConfig.baseDelay *
        Math.pow(retryConfig.backoffMultiplier, attempt - 1);
      const jitter = retryConfig.jitter ? Math.random() * 0.3 : 0;
      const delay = Math.min(baseDelay * (1 + jitter), retryConfig.maxDelay);

      console.warn(
        `AI operation failed (attempt ${attempt}/${retryConfig.maxAttempts}), retrying in ${delay}ms:`,
        error instanceof Error ? error.message : String(error),
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

// Rate limiter implementation
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  constructor(private config: RateLimitConfig = DEFAULT_RATE_LIMIT_CONFIG) {}

  async checkRateLimit(key: string): Promise<void> {
    const now = Date.now();
    const requests = this.requests.get(key) || [];

    // Clean old requests
    const validRequests = requests.filter((timestamp) => {
      return now - timestamp < 24 * 60 * 60 * 1000; // Keep requests from last 24 hours
    });

    // Check various time windows
    const minuteAgo = now - 60 * 1000;
    const hourAgo = now - 60 * 60 * 1000;
    const dayAgo = now - 24 * 60 * 60 * 1000;

    const requestsLastMinute = validRequests.filter(
      (t) => t > minuteAgo,
    ).length;
    const requestsLastHour = validRequests.filter((t) => t > hourAgo).length;
    const requestsLastDay = validRequests.filter((t) => t > dayAgo).length;

    // Check burst limit (last 5 seconds)
    const burstWindow = now - 5 * 1000;
    const burstRequests = validRequests.filter((t) => t > burstWindow).length;

    if (burstRequests >= this.config.burstLimit) {
      throw new RateLimitError("Burst rate limit exceeded", 5);
    }

    if (requestsLastMinute >= this.config.requestsPerMinute) {
      throw new RateLimitError("Per-minute rate limit exceeded", 60);
    }

    if (requestsLastHour >= this.config.requestsPerHour) {
      throw new RateLimitError("Per-hour rate limit exceeded", 3600);
    }

    if (requestsLastDay >= this.config.requestsPerDay) {
      throw new RateLimitError("Daily rate limit exceeded", 86400);
    }

    // Record this request
    validRequests.push(now);
    this.requests.set(key, validRequests);
  }

  // Clear rate limit for a key (useful for testing or admin override)
  clearRateLimit(key: string): void {
    this.requests.delete(key);
  }

  // Get rate limit status
  getRateLimitStatus(key: string): {
    remainingMinute: number;
    remainingHour: number;
    remainingDay: number;
    remainingBurst: number;
  } {
    const now = Date.now();
    const requests = this.requests.get(key) || [];

    const minuteAgo = now - 60 * 1000;
    const hourAgo = now - 60 * 60 * 1000;
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const burstWindow = now - 5 * 1000;

    const requestsLastMinute = requests.filter((t) => t > minuteAgo).length;
    const requestsLastHour = requests.filter((t) => t > hourAgo).length;
    const requestsLastDay = requests.filter((t) => t > dayAgo).length;
    const burstRequests = requests.filter((t) => t > burstWindow).length;

    return {
      remainingMinute: Math.max(
        0,
        this.config.requestsPerMinute - requestsLastMinute,
      ),
      remainingHour: Math.max(
        0,
        this.config.requestsPerHour - requestsLastHour,
      ),
      remainingDay: Math.max(0, this.config.requestsPerDay - requestsLastDay),
      remainingBurst: Math.max(0, this.config.burstLimit - burstRequests),
    };
  }
}

// Global rate limiter instance
export const globalRateLimiter = new RateLimiter();

// Error mapper for OpenAI API responses
export function mapOpenAIError(error: any): AIError {
  if (!error.response) {
    return new NetworkError(error.message || "Network error occurred");
  }

  const status = error.response.status;
  const message =
    error.response.data?.error?.message || error.message || "Unknown error";

  switch (status) {
    case 400:
      if (message.includes("content_filter")) {
        return new ContentFilterError(message);
      }
      return new ValidationError(message, []);

    case 401:
      return new AuthenticationError(message);

    case 429:
      const retryAfter = error.response.headers?.["retry-after"];
      if (message.includes("quota")) {
        return new QuotaExceededError(message);
      }
      return new RateLimitError(
        message,
        retryAfter ? parseInt(retryAfter) : undefined,
      );

    case 503:
      return new ModelUnavailableError(message);

    default:
      return new AIError(message, "UNKNOWN_ERROR", status, status >= 500);
  }
}

// Content safety checker
export function checkContentSafety(content: string): void {
  const unsafe_patterns = [
    /\b(hack|crack|exploit|vulnerability)\b/i,
    /\b(malware|virus|trojan|backdoor)\b/i,
    /\b(ddos|dos attack|flood)\b/i,
    /<script[^>]*>.*?<\/script>/i,
    /javascript:/i,
    /data:text\/html/i,
  ];

  for (const pattern of unsafe_patterns) {
    if (pattern.test(content)) {
      throw new ContentFilterError(
        "Content contains potentially unsafe patterns",
      );
    }
  }

  // Check for excessively long content
  if (content.length > 50000) {
    throw new ValidationError("Content exceeds maximum length limit", []);
  }
}

// Structured logging for AI operations
export interface AILogEntry {
  timestamp: string;
  operation: string;
  userId?: string;
  success: boolean;
  error?: string;
  duration: number;
  tokensUsed?: number;
  cost?: number;
  metadata?: Record<string, any>;
}

export class AILogger {
  private logs: AILogEntry[] = [];

  log(entry: Omit<AILogEntry, "timestamp">): void {
    const logEntry: AILogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    };

    this.logs.push(logEntry);

    // Console logging with appropriate level
    if (entry.success) {
      console.info(
        `[AI] ${entry.operation} completed in ${entry.duration}ms`,
        entry.metadata,
      );
    } else {
      console.error(
        `[AI] ${entry.operation} failed: ${entry.error}`,
        entry.metadata,
      );
    }

    // Keep only last 1000 entries in memory
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-1000);
    }
  }

  getLogs(filter?: Partial<AILogEntry>): AILogEntry[] {
    if (!filter) return this.logs;

    return this.logs.filter((log) => {
      return Object.entries(filter).every(
        ([key, value]) => log[key as keyof AILogEntry] === value,
      );
    });
  }

  getStats(): {
    totalOperations: number;
    successRate: number;
    averageDuration: number;
    totalTokens: number;
    totalCost: number;
  } {
    const total = this.logs.length;
    const successful = this.logs.filter((l) => l.success).length;
    const totalDuration = this.logs.reduce((sum, l) => sum + l.duration, 0);
    const totalTokens = this.logs.reduce(
      (sum, l) => sum + (l.tokensUsed || 0),
      0,
    );
    const totalCost = this.logs.reduce((sum, l) => sum + (l.cost || 0), 0);

    return {
      totalOperations: total,
      successRate: total > 0 ? successful / total : 0,
      averageDuration: total > 0 ? totalDuration / total : 0,
      totalTokens,
      totalCost,
    };
  }
}

// Global logger instance
export const aiLogger = new AILogger();

// Wrapper function that combines all error handling features
export async function safeAIOperation<T>(
  operation: () => Promise<T>,
  context: {
    operationName: string;
    userId?: string;
    retryConfig?: Partial<RetryConfig>;
    rateLimitKey?: string;
    validateInput?: (input: any) => void;
    validateOutput?: (output: T) => T;
  },
): Promise<T> {
  const startTime = Date.now();
  let result: T;
  let error: Error | null = null;

  try {
    // Rate limiting
    if (context.rateLimitKey) {
      await globalRateLimiter.checkRateLimit(context.rateLimitKey);
    }

    // Execute operation with retry logic
    result = await withRetry(operation, context.retryConfig);

    // Validate output if provided
    if (context.validateOutput) {
      result = context.validateOutput(result);
    }

    return result;
  } catch (err) {
    error = err as Error;
    throw error;
  } finally {
    // Log the operation
    const duration = Date.now() - startTime;
    aiLogger.log({
      operation: context.operationName,
      userId: context.userId,
      success: !error,
      error: error?.message,
      duration,
      metadata: error ? { errorType: error.constructor.name } : undefined,
    });
  }
}
