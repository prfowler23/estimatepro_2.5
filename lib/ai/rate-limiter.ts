import { getUser } from "@/lib/auth/server";

// Mock Redis and Ratelimit interfaces for TypeScript
interface Redis {
  lpush(key: string, value: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  lrange(key: string, start: number, stop: number): Promise<string[]>;
  del(key: string): Promise<number>;
}

interface RatelimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

interface Ratelimit {
  limit(identifier: string): Promise<RatelimitResult>;
}

export interface RateLimitConfig {
  requests: number;
  window: string;
  identifier?: "ip" | "userId" | "combined";
}

export interface UsageTrackingData {
  userId: string;
  timestamp: number;
  endpoint: string;
  model: string;
  tokensUsed: number;
  cost: number;
  success: boolean;
  error?: string;
}

// Rate limit configurations per endpoint
const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  "ai.assistant.stream": {
    requests: 100,
    window: "1h",
    identifier: "userId",
  },
  "ai.assistant.chat": {
    requests: 200,
    window: "1h",
    identifier: "userId",
  },
  "ai.facade-analysis": {
    requests: 20,
    window: "1h",
    identifier: "userId",
  },
  "ai.photo-analysis": {
    requests: 50,
    window: "1h",
    identifier: "userId",
  },
  "ai.document-extraction": {
    requests: 30,
    window: "1h",
    identifier: "userId",
  },
  "ai.tools": {
    requests: 500,
    window: "1h",
    identifier: "userId",
  },
  default: {
    requests: 50,
    window: "1h",
    identifier: "ip",
  },
};

// Token cost per model (per 1K tokens)
const TOKEN_COSTS = {
  "gpt-4": { input: 0.03, output: 0.06 },
  "gpt-4-turbo": { input: 0.01, output: 0.03 },
  "gpt-3.5-turbo": { input: 0.0005, output: 0.0015 },
  "gpt-4-vision-preview": { input: 0.01, output: 0.03 },
};

export class AIRateLimiter {
  private static instance: AIRateLimiter;
  private rateLimiters: Map<string, Ratelimit> = new Map();
  private redis: Redis | null = null;
  private usageTracking: Map<string, UsageTrackingData[]> = new Map();

  private constructor() {
    this.initializeRedis();
  }

  private initializeRedis() {
    // Redis is not configured - using in-memory rate limiting only
    console.warn(
      "Redis not configured. Rate limiting will use in-memory fallback.",
    );
  }

  static getInstance(): AIRateLimiter {
    if (!AIRateLimiter.instance) {
      AIRateLimiter.instance = new AIRateLimiter();
    }
    return AIRateLimiter.instance;
  }

  async checkRateLimit(
    endpoint: string,
    identifier: string,
    userId?: string,
  ): Promise<{
    success: boolean;
    limit?: number;
    remaining?: number;
    reset?: number;
    retryAfter?: number;
  }> {
    // Get rate limiter for endpoint
    const rateLimiter =
      this.rateLimiters.get(endpoint) || this.rateLimiters.get("default");

    if (!rateLimiter) {
      // Fallback to in-memory rate limiting
      return this.checkInMemoryRateLimit(endpoint, identifier);
    }

    // Check rate limit
    const result = await rateLimiter.limit(identifier);

    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
      retryAfter: result.success
        ? undefined
        : Math.round((result.reset - Date.now()) / 1000),
    };
  }

  private checkInMemoryRateLimit(
    endpoint: string,
    identifier: string,
  ): {
    success: boolean;
    limit?: number;
    remaining?: number;
    reset?: number;
    retryAfter?: number;
  } {
    // Simple in-memory rate limiting fallback
    const key = `${endpoint}:${identifier}`;
    const now = Date.now();
    const windowMs = 60 * 60 * 1000; // 1 hour
    const config = RATE_LIMIT_CONFIGS[endpoint] || RATE_LIMIT_CONFIGS.default;

    // Get or create usage data
    const usage = this.usageTracking.get(key) || [];

    // Filter out old entries
    const recentUsage = usage.filter((u) => u.timestamp > now - windowMs);

    if (recentUsage.length >= config.requests) {
      const oldestEntry = recentUsage[0];
      const reset = oldestEntry.timestamp + windowMs;

      return {
        success: false,
        limit: config.requests,
        remaining: 0,
        reset,
        retryAfter: Math.round((reset - now) / 1000),
      };
    }

    return {
      success: true,
      limit: config.requests,
      remaining: config.requests - recentUsage.length - 1,
      reset: now + windowMs,
    };
  }

  async trackUsage(data: UsageTrackingData): Promise<void> {
    try {
      // Store in memory
      const key = `usage:${data.userId}`;
      const usage = this.usageTracking.get(key) || [];
      usage.push(data);

      // Keep only last 1000 entries per user
      if (usage.length > 1000) {
        this.usageTracking.set(key, usage.slice(-1000));
      } else {
        this.usageTracking.set(key, usage);
      }

      // Store in Redis if available
      if (this.redis) {
        const redisKey = `ai-usage:${data.userId}:${new Date().toISOString().split("T")[0]}`;
        await this.redis.lpush(redisKey, JSON.stringify(data));
        await this.redis.expire(redisKey, 30 * 24 * 60 * 60); // 30 days
      }
    } catch (error) {
      console.error("Error tracking usage:", error);
    }
  }

  async getUserUsage(
    userId: string,
    timeRange?: { start: Date; end: Date },
  ): Promise<{
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    byEndpoint: Record<string, number>;
    byModel: Record<string, { requests: number; tokens: number; cost: number }>;
    dailyUsage: Record<
      string,
      { requests: number; tokens: number; cost: number }
    >;
  }> {
    const usage = await this.getUsageData(userId, timeRange);

    const result = {
      totalRequests: 0,
      totalTokens: 0,
      totalCost: 0,
      byEndpoint: {} as Record<string, number>,
      byModel: {} as Record<
        string,
        { requests: number; tokens: number; cost: number }
      >,
      dailyUsage: {} as Record<
        string,
        { requests: number; tokens: number; cost: number }
      >,
    };

    usage.forEach((entry) => {
      // Total metrics
      result.totalRequests++;
      result.totalTokens += entry.tokensUsed;
      result.totalCost += entry.cost;

      // By endpoint
      result.byEndpoint[entry.endpoint] =
        (result.byEndpoint[entry.endpoint] || 0) + 1;

      // By model
      if (!result.byModel[entry.model]) {
        result.byModel[entry.model] = { requests: 0, tokens: 0, cost: 0 };
      }
      result.byModel[entry.model].requests++;
      result.byModel[entry.model].tokens += entry.tokensUsed;
      result.byModel[entry.model].cost += entry.cost;

      // Daily usage
      const date = new Date(entry.timestamp).toISOString().split("T")[0];
      if (!result.dailyUsage[date]) {
        result.dailyUsage[date] = { requests: 0, tokens: 0, cost: 0 };
      }
      result.dailyUsage[date].requests++;
      result.dailyUsage[date].tokens += entry.tokensUsed;
      result.dailyUsage[date].cost += entry.cost;
    });

    return result;
  }

  private async getUsageData(
    userId: string,
    timeRange?: { start: Date; end: Date },
  ): Promise<UsageTrackingData[]> {
    const usage: UsageTrackingData[] = [];

    // Get from memory
    const memoryUsage = this.usageTracking.get(`usage:${userId}`) || [];
    usage.push(...memoryUsage);

    // Get from Redis if available
    if (this.redis) {
      const startDate =
        timeRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = timeRange?.end || new Date();

      // Iterate through each day in range
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dateKey = currentDate.toISOString().split("T")[0];
        const redisKey = `ai-usage:${userId}:${dateKey}`;

        try {
          const data = await this.redis.lrange(redisKey, 0, -1);
          data.forEach((item) => {
            try {
              usage.push(JSON.parse(item));
            } catch (e) {
              console.error("Error parsing usage data:", e);
            }
          });
        } catch (error) {
          console.error("Error fetching usage from Redis:", error);
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    // Filter by time range if specified
    if (timeRange) {
      return usage.filter(
        (u) =>
          u.timestamp >= timeRange.start.getTime() &&
          u.timestamp <= timeRange.end.getTime(),
      );
    }

    return usage;
  }

  calculateCost(
    model: string,
    inputTokens: number,
    outputTokens: number,
  ): number {
    const costs =
      TOKEN_COSTS[model as keyof typeof TOKEN_COSTS] ||
      TOKEN_COSTS["gpt-3.5-turbo"];
    return (
      (inputTokens / 1000) * costs.input + (outputTokens / 1000) * costs.output
    );
  }

  async getUserQuota(userId: string): Promise<{
    dailyLimit: number;
    monthlyLimit: number;
    dailyUsed: number;
    monthlyUsed: number;
    dailyRemaining: number;
    monthlyRemaining: number;
  }> {
    // Default quotas (can be customized per user tier)
    const dailyLimit = 1000;
    const monthlyLimit = 20000;

    // Get usage for today and this month
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const usage = await this.getUserUsage(userId, {
      start: firstDayOfMonth,
      end: new Date(),
    });

    const todayKey = today.toISOString().split("T")[0];
    const dailyUsed = usage.dailyUsage[todayKey]?.requests || 0;
    const monthlyUsed = usage.totalRequests;

    return {
      dailyLimit,
      monthlyLimit,
      dailyUsed,
      monthlyUsed,
      dailyRemaining: Math.max(0, dailyLimit - dailyUsed),
      monthlyRemaining: Math.max(0, monthlyLimit - monthlyUsed),
    };
  }

  async resetUserQuota(
    userId: string,
    type: "daily" | "monthly",
  ): Promise<void> {
    if (!this.redis) {
      // Clear from memory
      const key = `usage:${userId}`;
      const usage = this.usageTracking.get(key) || [];

      if (type === "daily") {
        const today = new Date().setHours(0, 0, 0, 0);
        this.usageTracking.set(
          key,
          usage.filter((u) => u.timestamp < today),
        );
      } else {
        this.usageTracking.delete(key);
      }
      return;
    }

    // Clear from Redis
    if (type === "daily") {
      const today = new Date().toISOString().split("T")[0];
      await this.redis.del(`ai-usage:${userId}:${today}`);
    } else {
      // Clear entire month
      const today = new Date();
      for (let i = 1; i <= today.getDate(); i++) {
        const date = new Date(today.getFullYear(), today.getMonth(), i)
          .toISOString()
          .split("T")[0];
        await this.redis.del(`ai-usage:${userId}:${date}`);
      }
    }
  }
}

// Helper middleware for Express/Next.js
export async function withRateLimit(
  endpoint: string,
  request: Request,
  userId?: string,
): Promise<{
  allowed: boolean;
  headers: Record<string, string>;
  error?: string;
}> {
  const rateLimiter = AIRateLimiter.getInstance();

  // Get identifier based on endpoint config
  const config = RATE_LIMIT_CONFIGS[endpoint] || RATE_LIMIT_CONFIGS.default;
  let identifier: string;

  if (config.identifier === "userId" && userId) {
    identifier = userId;
  } else if (config.identifier === "combined" && userId) {
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    identifier = `${userId}:${ip}`;
  } else {
    identifier = request.headers.get("x-forwarded-for") || "unknown";
  }

  const result = await rateLimiter.checkRateLimit(endpoint, identifier, userId);

  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(result.limit || 0),
    "X-RateLimit-Remaining": String(result.remaining || 0),
    "X-RateLimit-Reset": String(result.reset || 0),
  };

  if (!result.success) {
    headers["Retry-After"] = String(result.retryAfter || 60);
    return {
      allowed: false,
      headers,
      error: `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`,
    };
  }

  return { allowed: true, headers };
}

// Export tracking helper
export async function trackAIUsage(
  userId: string,
  endpoint: string,
  model: string,
  tokensUsed: number,
  success: boolean,
  error?: string,
): Promise<void> {
  const rateLimiter = AIRateLimiter.getInstance();

  // Calculate cost based on model and tokens
  // This is a simplified calculation - you may want to track input/output separately
  const cost = rateLimiter.calculateCost(model, tokensUsed / 2, tokensUsed / 2);

  await rateLimiter.trackUsage({
    userId,
    timestamp: Date.now(),
    endpoint,
    model,
    tokensUsed,
    cost,
    success,
    error,
  });
}
