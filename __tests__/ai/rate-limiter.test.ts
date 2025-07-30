import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import {
  AIRateLimiter,
  withRateLimit,
  trackAIUsage,
} from "@/lib/ai/rate-limiter";

// Mock Redis
jest.mock("@upstash/redis", () => ({
  Redis: jest.fn(() => ({
    lpush: jest.fn(() => Promise.resolve(1)),
    lrange: jest.fn(() => Promise.resolve([])),
    expire: jest.fn(() => Promise.resolve(1)),
    del: jest.fn(() => Promise.resolve(1)),
  })),
}));

jest.mock("@upstash/ratelimit", () => ({
  Ratelimit: jest.fn(() => ({
    slidingWindow: jest.fn(() => ({})),
    limit: jest.fn(() =>
      Promise.resolve({
        success: true,
        limit: 100,
        remaining: 99,
        reset: Date.now() + 3600000,
      }),
    ),
  })),
}));

describe("AIRateLimiter", () => {
  let rateLimiter: AIRateLimiter;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton instance
    (AIRateLimiter as any).instance = null;
    rateLimiter = AIRateLimiter.getInstance();
  });

  describe("Rate Limiting", () => {
    it("should allow requests within rate limit", async () => {
      const result = await rateLimiter.checkRateLimit(
        "ai.assistant.stream",
        "user123",
      );

      expect(result.success).toBe(true);
      expect(result.limit).toBeDefined();
      expect(result.remaining).toBeDefined();
    });

    it("should enforce rate limits when exceeded", async () => {
      // Simulate exceeding rate limit
      const endpoint = "ai.facade-analysis";
      const userId = "user123";

      // Make requests up to the limit
      for (let i = 0; i < 20; i++) {
        await rateLimiter.checkRateLimit(endpoint, userId, userId);
        // Track usage to simulate real requests
        await rateLimiter.trackUsage({
          userId,
          timestamp: Date.now(),
          endpoint,
          model: "gpt-4",
          tokensUsed: 100,
          cost: 0.01,
          success: true,
        });
      }

      // This request should be rate limited
      const result = await rateLimiter.checkRateLimit(endpoint, userId, userId);

      expect(result.success).toBe(false);
      expect(result.retryAfter).toBeDefined();
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it("should handle different endpoints with different limits", async () => {
      const streamResult = await rateLimiter.checkRateLimit(
        "ai.assistant.stream",
        "user123",
      );
      const facadeResult = await rateLimiter.checkRateLimit(
        "ai.facade-analysis",
        "user456",
      );

      expect(streamResult.limit).toBe(100); // Stream endpoint limit
      expect(facadeResult.limit).toBe(20); // Facade analysis limit
    });
  });

  describe("Usage Tracking", () => {
    it("should track usage data", async () => {
      const userId = "user123";
      const usageData = {
        userId,
        timestamp: Date.now(),
        endpoint: "ai.assistant.stream",
        model: "gpt-4",
        tokensUsed: 500,
        cost: 0.05,
        success: true,
      };

      await rateLimiter.trackUsage(usageData);

      const usage = await rateLimiter.getUserUsage(userId);
      expect(usage.totalRequests).toBe(1);
      expect(usage.totalTokens).toBe(500);
      expect(usage.totalCost).toBe(0.05);
    });

    it("should aggregate usage by endpoint and model", async () => {
      const userId = "user123";

      // Track multiple requests
      await rateLimiter.trackUsage({
        userId,
        timestamp: Date.now(),
        endpoint: "ai.assistant.stream",
        model: "gpt-4",
        tokensUsed: 300,
        cost: 0.03,
        success: true,
      });

      await rateLimiter.trackUsage({
        userId,
        timestamp: Date.now(),
        endpoint: "ai.facade-analysis",
        model: "gpt-4-vision-preview",
        tokensUsed: 1000,
        cost: 0.1,
        success: true,
      });

      const usage = await rateLimiter.getUserUsage(userId);

      expect(usage.byEndpoint["ai.assistant.stream"]).toBe(1);
      expect(usage.byEndpoint["ai.facade-analysis"]).toBe(1);
      expect(usage.byModel["gpt-4"].requests).toBe(1);
      expect(usage.byModel["gpt-4-vision-preview"].requests).toBe(1);
    });

    it("should calculate daily usage correctly", async () => {
      const userId = "user123";
      const today = new Date().toISOString().split("T")[0];

      await rateLimiter.trackUsage({
        userId,
        timestamp: Date.now(),
        endpoint: "ai.assistant.stream",
        model: "gpt-4",
        tokensUsed: 200,
        cost: 0.02,
        success: true,
      });

      const usage = await rateLimiter.getUserUsage(userId);

      expect(usage.dailyUsage[today]).toBeDefined();
      expect(usage.dailyUsage[today].requests).toBe(1);
      expect(usage.dailyUsage[today].tokens).toBe(200);
      expect(usage.dailyUsage[today].cost).toBe(0.02);
    });
  });

  describe("Quota Management", () => {
    it("should calculate user quota correctly", async () => {
      const userId = "user123";

      // Track some usage
      for (let i = 0; i < 5; i++) {
        await rateLimiter.trackUsage({
          userId,
          timestamp: Date.now(),
          endpoint: "ai.assistant.stream",
          model: "gpt-4",
          tokensUsed: 100,
          cost: 0.01,
          success: true,
        });
      }

      const quota = await rateLimiter.getUserQuota(userId);

      expect(quota.dailyUsed).toBe(5);
      expect(quota.dailyRemaining).toBe(995); // 1000 - 5
      expect(quota.monthlyUsed).toBe(5);
      expect(quota.monthlyRemaining).toBe(19995); // 20000 - 5
    });

    it("should reset daily quota", async () => {
      const userId = "user123";

      // Track usage
      await rateLimiter.trackUsage({
        userId,
        timestamp: Date.now(),
        endpoint: "ai.assistant.stream",
        model: "gpt-4",
        tokensUsed: 100,
        cost: 0.01,
        success: true,
      });

      // Reset daily quota
      await rateLimiter.resetUserQuota(userId, "daily");

      const quota = await rateLimiter.getUserQuota(userId);
      expect(quota.dailyUsed).toBe(0);
    });
  });

  describe("Cost Calculation", () => {
    it("should calculate costs correctly for different models", () => {
      expect(rateLimiter.calculateCost("gpt-4", 1000, 1000)).toBeCloseTo(
        0.09,
        2,
      );
      expect(rateLimiter.calculateCost("gpt-4-turbo", 1000, 1000)).toBeCloseTo(
        0.04,
        2,
      );
      expect(
        rateLimiter.calculateCost("gpt-3.5-turbo", 1000, 1000),
      ).toBeCloseTo(0.002, 3);
    });
  });
});

describe("withRateLimit middleware", () => {
  it("should add rate limit headers", async () => {
    const mockRequest = {
      headers: {
        get: jest.fn().mockReturnValue("192.168.1.1"),
      },
    } as any;

    const result = await withRateLimit(
      "ai.assistant.stream",
      mockRequest,
      "user123",
    );

    expect(result.allowed).toBe(true);
    expect(result.headers["X-RateLimit-Limit"]).toBeDefined();
    expect(result.headers["X-RateLimit-Remaining"]).toBeDefined();
    expect(result.headers["X-RateLimit-Reset"]).toBeDefined();
  });

  it("should return error when rate limit exceeded", async () => {
    const mockRequest = {
      headers: {
        get: jest.fn().mockReturnValue("192.168.1.1"),
      },
    } as any;

    // Simulate rate limit exceeded by making many requests
    const endpoint = "ai.facade-analysis";
    const userId = "user123";

    // Make 20 requests to exceed the limit
    for (let i = 0; i < 20; i++) {
      await withRateLimit(endpoint, mockRequest, userId);
      await trackAIUsage(userId, endpoint, "gpt-4", 100, true);
    }

    const result = await withRateLimit(endpoint, mockRequest, userId);

    expect(result.allowed).toBe(false);
    expect(result.error).toContain("Rate limit exceeded");
    expect(result.headers["Retry-After"]).toBeDefined();
  });
});

describe("trackAIUsage helper", () => {
  it("should track successful usage", async () => {
    const userId = "user123";

    await trackAIUsage(userId, "ai.assistant.stream", "gpt-4", 1000, true);

    const rateLimiter = AIRateLimiter.getInstance();
    const usage = await rateLimiter.getUserUsage(userId);

    expect(usage.totalRequests).toBe(1);
    expect(usage.totalTokens).toBe(1000);
    expect(usage.byEndpoint["ai.assistant.stream"]).toBe(1);
  });

  it("should track failed usage with error", async () => {
    const userId = "user123";

    await trackAIUsage(
      userId,
      "ai.facade-analysis",
      "gpt-4-vision-preview",
      0,
      false,
      "API key invalid",
    );

    const rateLimiter = AIRateLimiter.getInstance();
    const usage = await rateLimiter.getUserUsage(userId);

    expect(usage.totalRequests).toBe(1);
    expect(usage.totalTokens).toBe(0);
  });
});
