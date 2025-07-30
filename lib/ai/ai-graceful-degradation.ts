/**
 * AI Graceful Degradation Service
 * Provides fallback behaviors when AI services are unavailable or degraded
 */

interface DegradationLevel {
  level: "full" | "partial" | "offline";
  features: {
    streaming: boolean;
    tools: boolean;
    contextMemory: boolean;
    advancedModels: boolean;
  };
  message?: string;
}

interface CachedResponse {
  query: string;
  response: string;
  timestamp: number;
  model: string;
}

export class AIGracefulDegradationService {
  private static instance: AIGracefulDegradationService;
  private degradationLevel: DegradationLevel;
  private responseCache: Map<string, CachedResponse> = new Map();
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MAX_CACHE_SIZE = 1000;

  // Common responses for offline mode
  private readonly offlineResponses = {
    general: [
      "I'm currently offline, but I can help with basic calculations. Please try specific service calculations like 'calculate window cleaning for 5000 sq ft'.",
      "AI services are temporarily unavailable. You can still use our calculators directly from the Calculator menu.",
      "I'm in offline mode. Try asking about specific services or use the manual estimation tools.",
    ],
    estimation: [
      "While I can't provide AI-powered estimates right now, you can use our calculator tools for accurate pricing.",
      "AI estimation is offline. Please use the guided estimation flow or individual service calculators.",
      "Try our pre-built calculators for window cleaning, pressure washing, and other services.",
    ],
    technical: [
      "Technical AI assistance is offline. Check our help documentation or use the service calculators.",
      "I can't provide technical guidance right now, but our calculators include best practices.",
      "Please refer to the service specifications in each calculator for technical details.",
    ],
  };

  private constructor() {
    this.degradationLevel = {
      level: "full",
      features: {
        streaming: true,
        tools: true,
        contextMemory: true,
        advancedModels: true,
      },
    };
  }

  static getInstance(): AIGracefulDegradationService {
    if (!AIGracefulDegradationService.instance) {
      AIGracefulDegradationService.instance =
        new AIGracefulDegradationService();
    }
    return AIGracefulDegradationService.instance;
  }

  /**
   * Update degradation level based on system health
   */
  updateDegradationLevel(errors: {
    modelFailures?: number;
    apiErrors?: number;
    timeouts?: number;
    rateLimitHits?: number;
  }): void {
    const totalErrors =
      (errors.modelFailures || 0) +
      (errors.apiErrors || 0) +
      (errors.timeouts || 0) +
      (errors.rateLimitHits || 0);

    if (totalErrors === 0) {
      this.setFullService();
    } else if (totalErrors < 5 || errors.rateLimitHits) {
      this.setPartialDegradation();
    } else {
      this.setOfflineMode();
    }
  }

  /**
   * Set full service mode
   */
  private setFullService(): void {
    this.degradationLevel = {
      level: "full",
      features: {
        streaming: true,
        tools: true,
        contextMemory: true,
        advancedModels: true,
      },
    };
  }

  /**
   * Set partial degradation mode
   */
  private setPartialDegradation(): void {
    this.degradationLevel = {
      level: "partial",
      features: {
        streaming: false, // Disable streaming to reduce load
        tools: true, // Keep tools for functionality
        contextMemory: false, // Disable context to save tokens
        advancedModels: false, // Use simpler models
      },
      message:
        "AI services are running with reduced capabilities. Some features may be limited.",
    };
  }

  /**
   * Set offline mode
   */
  private setOfflineMode(): void {
    this.degradationLevel = {
      level: "offline",
      features: {
        streaming: false,
        tools: false,
        contextMemory: false,
        advancedModels: false,
      },
      message:
        "AI services are currently offline. Using cached responses and basic functionality.",
    };
  }

  /**
   * Get current degradation level
   */
  getDegradationLevel(): DegradationLevel {
    return this.degradationLevel;
  }

  /**
   * Check if a feature is available
   */
  isFeatureAvailable(feature: keyof DegradationLevel["features"]): boolean {
    return this.degradationLevel.features[feature];
  }

  /**
   * Get fallback response for offline mode
   */
  getFallbackResponse(query: string, mode: string = "general"): string {
    // Check cache first
    const cached = this.getCachedResponse(query);
    if (cached) {
      return cached;
    }

    // Check for calculator-related queries
    if (this.isCalculatorQuery(query)) {
      return this.getCalculatorGuidance(query);
    }

    // Return random offline response
    const responses =
      this.offlineResponses[mode as keyof typeof this.offlineResponses] ||
      this.offlineResponses.general;
    return responses[Math.floor(Math.random() * responses.length)];
  }

  /**
   * Check if query is calculator-related
   */
  private isCalculatorQuery(query: string): boolean {
    const calculatorKeywords = [
      "calculate",
      "price",
      "cost",
      "estimate",
      "quote",
      "window cleaning",
      "pressure washing",
      "soft washing",
      "facade",
    ];

    const lowerQuery = query.toLowerCase();
    return calculatorKeywords.some((keyword) => lowerQuery.includes(keyword));
  }

  /**
   * Get calculator-specific guidance
   */
  private getCalculatorGuidance(query: string): string {
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes("window")) {
      return "For window cleaning estimates, use the Window Cleaning calculator. It handles residential and commercial properties with factors like height, accessibility, and glass type.";
    }

    if (lowerQuery.includes("pressure") || lowerQuery.includes("power wash")) {
      return "For pressure washing quotes, try the Pressure Washing calculator. It accounts for surface area, material type, and soil level.";
    }

    if (lowerQuery.includes("facade")) {
      return "The AI Facade Analysis tool can analyze building photos for automated measurements. Upload a photo in the Facade Analysis calculator.";
    }

    return "Please use one of our specialized calculators: Window Cleaning, Pressure Washing, Soft Washing, or Facade Analysis. Each provides accurate pricing based on your specific requirements.";
  }

  /**
   * Cache a successful response
   */
  cacheResponse(query: string, response: string, model: string): void {
    // Limit cache size
    if (this.responseCache.size >= this.MAX_CACHE_SIZE) {
      // Remove oldest entries
      const entriesToRemove = Array.from(this.responseCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)
        .slice(0, 100)
        .map(([key]) => key);

      entriesToRemove.forEach((key) => this.responseCache.delete(key));
    }

    // Normalize query for better cache hits
    const normalizedQuery = this.normalizeQuery(query);

    this.responseCache.set(normalizedQuery, {
      query,
      response,
      timestamp: Date.now(),
      model,
    });
  }

  /**
   * Get cached response if available
   */
  private getCachedResponse(query: string): string | null {
    const normalizedQuery = this.normalizeQuery(query);
    const cached = this.responseCache.get(normalizedQuery);

    if (!cached) return null;

    // Check if cache is expired
    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.responseCache.delete(normalizedQuery);
      return null;
    }

    return `${cached.response}\n\n*[Cached response from ${new Date(cached.timestamp).toLocaleString()}]*`;
  }

  /**
   * Normalize query for caching
   */
  private normalizeQuery(query: string): string {
    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, "") // Remove punctuation
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim();
  }

  /**
   * Get degraded configuration based on current level
   */
  getDegradedConfig(originalConfig: any): any {
    if (this.degradationLevel.level === "full") {
      return originalConfig;
    }

    const degradedConfig = { ...originalConfig };

    if (this.degradationLevel.level === "partial") {
      // Use simpler model
      if (degradedConfig.model?.includes("gpt-4")) {
        degradedConfig.model = "gpt-3.5-turbo";
      }

      // Reduce token limits
      degradedConfig.maxTokens = Math.min(
        degradedConfig.maxTokens || 1000,
        500,
      );

      // Disable streaming
      degradedConfig.stream = false;

      // Simplify temperature for consistency
      degradedConfig.temperature = 0.3;
    }

    if (this.degradationLevel.level === "offline") {
      // Offline mode - minimal config
      degradedConfig.model = "offline";
      degradedConfig.maxTokens = 0;
      degradedConfig.stream = false;
      degradedConfig.tools = [];
    }

    return degradedConfig;
  }

  /**
   * Check if should use cache based on degradation level
   */
  shouldUseCache(): boolean {
    return this.degradationLevel.level !== "full";
  }

  /**
   * Get user-friendly message about current service level
   */
  getServiceLevelMessage(): string | null {
    return this.degradationLevel.message || null;
  }

  /**
   * Clear response cache
   */
  clearCache(): void {
    this.responseCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    oldestEntry: Date | null;
    hitRate: number;
  } {
    const entries = Array.from(this.responseCache.values());
    const oldestEntry =
      entries.length > 0
        ? new Date(Math.min(...entries.map((e) => e.timestamp)))
        : null;

    return {
      size: this.responseCache.size,
      oldestEntry,
      hitRate: 0, // Would need to track hits/misses for this
    };
  }
}

// Singleton instance
export const aiGracefulDegradation = AIGracefulDegradationService.getInstance();

// Helper functions
export function getDegradedAIConfig(originalConfig: any): any {
  return aiGracefulDegradation.getDegradedConfig(originalConfig);
}

export function isAIFeatureAvailable(
  feature: keyof DegradationLevel["features"],
): boolean {
  return aiGracefulDegradation.isFeatureAvailable(feature);
}

export function getAIServiceMessage(): string | null {
  return aiGracefulDegradation.getServiceLevelMessage();
}
