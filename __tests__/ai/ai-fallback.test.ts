import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { AIFallbackService } from "@/lib/ai/ai-fallback-service";
import { AIGracefulDegradationService } from "@/lib/ai/ai-graceful-degradation";

// Mock OpenAI
jest.mock("openai", () => ({
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  })),
}));

describe("AIFallbackService", () => {
  let fallbackService: AIFallbackService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton
    (AIFallbackService as any).instance = null;
    fallbackService = AIFallbackService.getInstance();
    fallbackService.resetModelHealth();
  });

  describe("Retry Logic", () => {
    it("should retry failed requests", async () => {
      let attempts = 0;
      const operation = jest.fn(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error("Temporary failure");
        }
        return { success: true };
      });

      const result = await fallbackService.executeWithFallback(operation);

      expect(result).toEqual({ success: true });
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it("should use exponential backoff", async () => {
      const startTime = Date.now();
      let attempts = 0;

      const operation = jest.fn(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error("Temporary failure");
        }
        return { success: true };
      });

      await fallbackService.executeWithFallback(operation, {
        customRetryOptions: {
          maxRetries: 3,
          initialDelay: 100,
          backoffMultiplier: 2,
          jitter: false,
        },
      });

      const totalTime = Date.now() - startTime;
      // Should have delays: 100ms + 200ms = 300ms minimum
      expect(totalTime).toBeGreaterThanOrEqual(300);
    });

    it("should not retry non-retryable errors", async () => {
      const operation = jest.fn(async () => {
        const error: any = new Error("Authentication failed");
        error.status = 401;
        throw error;
      });

      await expect(
        fallbackService.executeWithFallback(operation),
      ).rejects.toThrow("Authentication failed");

      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  describe("Circuit Breaker", () => {
    it("should open circuit breaker after threshold failures", async () => {
      const operation = jest.fn(async (model: string) => {
        if (model === "gpt-4-turbo-preview") {
          throw new Error("Model failure");
        }
        return { success: true, model };
      });

      // Fail 5 times to open circuit breaker
      for (let i = 0; i < 5; i++) {
        try {
          await fallbackService.executeWithFallback(operation, {
            preferredModel: "gpt-4-turbo-preview",
          });
        } catch (e) {
          // Expected to fail
        }
      }

      // Check model health
      const health = fallbackService.getModelHealthStatus();
      expect(health["gpt-4-turbo-preview"].circuitBreakerOpen).toBe(true);
      expect(health["gpt-4-turbo-preview"].available).toBe(false);

      // Should use fallback model
      const result = await fallbackService.executeWithFallback(operation);
      expect(result.model).not.toBe("gpt-4-turbo-preview");
    });

    it("should auto-close circuit breaker after timeout", async () => {
      // Set up a model with open circuit breaker
      const health = fallbackService.getModelHealthStatus();

      // Manually open circuit breaker with short timeout
      (fallbackService as any).modelHealth.set("gpt-4", {
        failureCount: 5,
        circuitBreakerOpen: true,
        circuitBreakerOpenUntil: new Date(Date.now() - 1000), // Already expired
      });

      const operation = jest.fn(async (model: string) => ({
        success: true,
        model,
      }));

      const result = await fallbackService.executeWithFallback(operation, {
        preferredModel: "gpt-4",
      });

      expect(result.model).toBe("gpt-4");
      expect(operation).toHaveBeenCalledWith("gpt-4");
    });
  });

  describe("Model Fallback", () => {
    it("should try fallback models in order", async () => {
      const attemptedModels: string[] = [];
      const operation = jest.fn(async (model: string) => {
        attemptedModels.push(model);
        if (model === "gpt-3.5-turbo") {
          return { success: true, model };
        }
        throw new Error(`${model} failed`);
      });

      const result = await fallbackService.executeWithFallback(operation);

      expect(result.model).toBe("gpt-3.5-turbo");
      expect(attemptedModels).toContain("gpt-4-turbo-preview");
      expect(attemptedModels).toContain("gpt-4");
      expect(attemptedModels).toContain("gpt-3.5-turbo");
    });

    it("should respect preferred model", async () => {
      const operation = jest.fn(async (model: string) => ({
        success: true,
        model,
      }));

      const result = await fallbackService.executeWithFallback(operation, {
        preferredModel: "gpt-3.5-turbo",
      });

      expect(result.model).toBe("gpt-3.5-turbo");
      expect(operation).toHaveBeenCalledTimes(1);
      expect(operation).toHaveBeenCalledWith("gpt-3.5-turbo");
    });
  });
});

describe("AIGracefulDegradationService", () => {
  let degradationService: AIGracefulDegradationService;

  beforeEach(() => {
    // Reset singleton
    (AIGracefulDegradationService as any).instance = null;
    degradationService = AIGracefulDegradationService.getInstance();
  });

  describe("Degradation Levels", () => {
    it("should start with full service", () => {
      const level = degradationService.getDegradationLevel();
      expect(level.level).toBe("full");
      expect(level.features.streaming).toBe(true);
      expect(level.features.tools).toBe(true);
      expect(level.features.contextMemory).toBe(true);
      expect(level.features.advancedModels).toBe(true);
    });

    it("should degrade to partial on moderate errors", () => {
      degradationService.updateDegradationLevel({
        apiErrors: 3,
        timeouts: 1,
      });

      const level = degradationService.getDegradationLevel();
      expect(level.level).toBe("partial");
      expect(level.features.streaming).toBe(false);
      expect(level.features.tools).toBe(true);
      expect(level.features.contextMemory).toBe(false);
      expect(level.features.advancedModels).toBe(false);
    });

    it("should go offline on severe errors", () => {
      degradationService.updateDegradationLevel({
        apiErrors: 10,
        modelFailures: 5,
        timeouts: 3,
      });

      const level = degradationService.getDegradationLevel();
      expect(level.level).toBe("offline");
      expect(level.features.streaming).toBe(false);
      expect(level.features.tools).toBe(false);
      expect(level.features.contextMemory).toBe(false);
      expect(level.features.advancedModels).toBe(false);
    });
  });

  describe("Fallback Responses", () => {
    it("should provide calculator guidance for calculator queries", () => {
      const response = degradationService.getFallbackResponse(
        "calculate window cleaning for my building",
      );

      expect(response).toContain("Window Cleaning calculator");
      expect(response).toContain("residential and commercial");
    });

    it("should provide general fallback for non-calculator queries", () => {
      const response = degradationService.getFallbackResponse(
        "tell me about your features",
      );

      expect(response).toMatch(/offline|calculator|estimation/i);
    });

    it("should cache successful responses", () => {
      degradationService.cacheResponse("test query", "test response", "gpt-4");

      const cached = degradationService.getFallbackResponse("test query");
      expect(cached).toContain("test response");
      expect(cached).toContain("Cached response");
    });
  });

  describe("Configuration Degradation", () => {
    it("should simplify config for partial degradation", () => {
      degradationService.updateDegradationLevel({ apiErrors: 3 });

      const originalConfig = {
        model: "gpt-4",
        maxTokens: 2000,
        temperature: 0.7,
        stream: true,
      };

      const degradedConfig =
        degradationService.getDegradedConfig(originalConfig);

      expect(degradedConfig.model).toBe("gpt-3.5-turbo");
      expect(degradedConfig.maxTokens).toBe(500);
      expect(degradedConfig.stream).toBe(false);
      expect(degradedConfig.temperature).toBe(0.3);
    });

    it("should provide offline config when offline", () => {
      degradationService.updateDegradationLevel({ apiErrors: 20 });

      const originalConfig = {
        model: "gpt-4",
        maxTokens: 2000,
        stream: true,
        tools: ["calculator", "analyzer"],
      };

      const degradedConfig =
        degradationService.getDegradedConfig(originalConfig);

      expect(degradedConfig.model).toBe("offline");
      expect(degradedConfig.maxTokens).toBe(0);
      expect(degradedConfig.stream).toBe(false);
      expect(degradedConfig.tools).toEqual([]);
    });
  });

  describe("Cache Management", () => {
    it("should limit cache size", () => {
      // Add many cached responses
      for (let i = 0; i < 1100; i++) {
        degradationService.cacheResponse(
          `query ${i}`,
          `response ${i}`,
          "gpt-4",
        );
      }

      const stats = degradationService.getCacheStats();
      expect(stats.size).toBeLessThanOrEqual(1000);
    });

    it("should normalize queries for better cache hits", () => {
      degradationService.cacheResponse(
        "What is window cleaning?",
        "Window cleaning info",
        "gpt-4",
      );

      // Should match with different punctuation/case
      const response = degradationService.getFallbackResponse(
        "what is window cleaning",
      );

      expect(response).toContain("Window cleaning info");
    });
  });
});
