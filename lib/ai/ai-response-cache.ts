"use client";

// PHASE 3 FIX: AI response caching system for improved performance
import { aiCache, aiCacheWrapper } from "./ai-cache";

// AI response types
export interface AIPhotoAnalysisResponse {
  buildingType?: string;
  materials?: string[];
  dimensions?: {
    height: number;
    width: number;
    depth?: number;
  };
  condition?: string;
  recommendations?: string[];
  confidence: number;
  analysisType: string;
}

export interface AIDocumentExtractionResponse {
  extractedText: string;
  requirements?: {
    services?: string[];
    buildingType?: string;
    location?: string;
    urgency?: string;
    budget?: string;
    buildingSize?: string;
  };
  contacts?: Array<{
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
  }>;
  confidence: number;
}

export interface AIAutoQuoteResponse {
  suggestedServices: string[];
  estimatedTotal: number;
  timeline: string;
  recommendations: string[];
  confidence: number;
  breakdown: {
    materials: number;
    labor: number;
    equipment: number;
    overhead: number;
  };
}

export interface AIRiskAssessmentResponse {
  riskLevel: "low" | "medium" | "high";
  riskFactors: string[];
  recommendations: string[];
  confidence: number;
  mitigationStrategies: string[];
}

export interface AICompetitiveIntelligenceResponse {
  marketPosition: string;
  competitorAnalysis: Array<{
    name: string;
    pricing: string;
    strengths: string[];
    weaknesses: string[];
  }>;
  recommendations: string[];
  confidence: number;
}

// Cache configuration for different AI operations
interface AICacheConfig {
  photo_analysis: {
    ttl: number; // 2 hours
    maxEntries: number;
  };
  document_extraction: {
    ttl: number; // 4 hours
    maxEntries: number;
  };
  auto_quote: {
    ttl: number; // 1 hour
    maxEntries: number;
  };
  risk_assessment: {
    ttl: number; // 6 hours
    maxEntries: number;
  };
  competitive_intelligence: {
    ttl: number; // 24 hours
    maxEntries: number;
  };
}

// Default cache configuration
const DEFAULT_CACHE_CONFIG: AICacheConfig = {
  photo_analysis: {
    ttl: 7200, // 2 hours
    maxEntries: 500,
  },
  document_extraction: {
    ttl: 14400, // 4 hours
    maxEntries: 200,
  },
  auto_quote: {
    ttl: 3600, // 1 hour
    maxEntries: 100,
  },
  risk_assessment: {
    ttl: 21600, // 6 hours
    maxEntries: 300,
  },
  competitive_intelligence: {
    ttl: 86400, // 24 hours
    maxEntries: 50,
  },
};

export class AIResponseCache {
  private config: AICacheConfig;

  constructor(config: Partial<AICacheConfig> = {}) {
    this.config = {
      photo_analysis: {
        ...DEFAULT_CACHE_CONFIG.photo_analysis,
        ...config.photo_analysis,
      },
      document_extraction: {
        ...DEFAULT_CACHE_CONFIG.document_extraction,
        ...config.document_extraction,
      },
      auto_quote: { ...DEFAULT_CACHE_CONFIG.auto_quote, ...config.auto_quote },
      risk_assessment: {
        ...DEFAULT_CACHE_CONFIG.risk_assessment,
        ...config.risk_assessment,
      },
      competitive_intelligence: {
        ...DEFAULT_CACHE_CONFIG.competitive_intelligence,
        ...config.competitive_intelligence,
      },
    };
  }

  // Cache photo analysis response
  async cachePhotoAnalysis(
    imageUrl: string,
    analysisType: string,
    response: AIPhotoAnalysisResponse,
  ): Promise<void> {
    await aiCacheWrapper.cachedPhotoAnalysis(
      imageUrl,
      analysisType,
      async () => response,
      this.config.photo_analysis.ttl,
    );

    console.log(
      `✅ Cached AI photo analysis for ${analysisType} (confidence: ${response.confidence}%)`,
    );
  }

  // Get cached photo analysis response
  async getCachedPhotoAnalysis(
    imageUrl: string,
    analysisType: string,
  ): Promise<AIPhotoAnalysisResponse | null> {
    const cacheKey = { url: imageUrl, type: analysisType };
    const cached = aiCache.get<AIPhotoAnalysisResponse>(
      "photo_analysis",
      cacheKey,
    );

    if (cached) {
      console.log(
        `🎯 Cache hit for photo analysis: ${analysisType} (confidence: ${cached.confidence}%)`,
      );
      return cached;
    }

    console.log(`💀 Cache miss for photo analysis: ${analysisType}`);
    return null;
  }

  // Cache document extraction response
  async cacheDocumentExtraction(
    documentContent: string,
    extractionType: string,
    response: AIDocumentExtractionResponse,
  ): Promise<void> {
    await aiCacheWrapper.cachedExtraction(
      extractionType,
      documentContent,
      async () => response,
      this.config.document_extraction.ttl,
    );

    console.log(
      `✅ Cached AI document extraction for ${extractionType} (confidence: ${response.confidence}%)`,
    );
  }

  // Get cached document extraction response
  async getCachedDocumentExtraction(
    documentContent: string,
    extractionType: string,
  ): Promise<AIDocumentExtractionResponse | null> {
    const cacheKey = {
      type: extractionType,
      content: documentContent.substring(0, 1000), // Truncate for key
    };

    const cached = aiCache.get<AIDocumentExtractionResponse>(
      "extraction",
      cacheKey,
    );

    if (cached) {
      console.log(
        `🎯 Cache hit for document extraction: ${extractionType} (confidence: ${cached.confidence}%)`,
      );
      return cached;
    }

    console.log(`💀 Cache miss for document extraction: ${extractionType}`);
    return null;
  }

  // Cache auto quote response
  async cacheAutoQuote(
    extractedData: any,
    options: any,
    response: AIAutoQuoteResponse,
  ): Promise<void> {
    await aiCacheWrapper.cachedQuoteGeneration(
      extractedData,
      options,
      async () => response,
      this.config.auto_quote.ttl,
    );

    console.log(
      `✅ Cached AI auto quote (total: $${response.estimatedTotal}, confidence: ${response.confidence}%)`,
    );
  }

  // Get cached auto quote response
  async getCachedAutoQuote(
    extractedData: any,
    options: any,
  ): Promise<AIAutoQuoteResponse | null> {
    const cacheKey = {
      services: extractedData.requirements?.services,
      buildingType: extractedData.requirements?.buildingType,
      buildingSize: extractedData.requirements?.buildingSize,
      options,
    };

    const cached = aiCache.get<AIAutoQuoteResponse>(
      "quote_generation",
      cacheKey,
    );

    if (cached) {
      console.log(
        `🎯 Cache hit for auto quote (total: $${cached.estimatedTotal}, confidence: ${cached.confidence}%)`,
      );
      return cached;
    }

    console.log("💀 Cache miss for auto quote");
    return null;
  }

  // Cache risk assessment response
  async cacheRiskAssessment(
    assessmentData: any,
    response: AIRiskAssessmentResponse,
  ): Promise<void> {
    const cacheKey = {
      buildingType: assessmentData.buildingType,
      services: assessmentData.services,
      location: assessmentData.location,
      conditions: assessmentData.conditions,
    };

    aiCache.set(
      "risk_assessment",
      cacheKey,
      response,
      this.config.risk_assessment.ttl,
    );

    console.log(
      `✅ Cached AI risk assessment (risk: ${response.riskLevel}, confidence: ${response.confidence}%)`,
    );
  }

  // Get cached risk assessment response
  async getCachedRiskAssessment(
    assessmentData: any,
  ): Promise<AIRiskAssessmentResponse | null> {
    const cacheKey = {
      buildingType: assessmentData.buildingType,
      services: assessmentData.services,
      location: assessmentData.location,
      conditions: assessmentData.conditions,
    };

    const cached = aiCache.get<AIRiskAssessmentResponse>(
      "risk_assessment",
      cacheKey,
    );

    if (cached) {
      console.log(
        `🎯 Cache hit for risk assessment (risk: ${cached.riskLevel}, confidence: ${cached.confidence}%)`,
      );
      return cached;
    }

    console.log("💀 Cache miss for risk assessment");
    return null;
  }

  // Cache competitive intelligence response
  async cacheCompetitiveIntelligence(
    analysisContent: string,
    response: AICompetitiveIntelligenceResponse,
  ): Promise<void> {
    await aiCacheWrapper.cachedCompetitiveAnalysis(
      analysisContent,
      async () => response,
      this.config.competitive_intelligence.ttl,
    );

    console.log(
      `✅ Cached AI competitive intelligence (confidence: ${response.confidence}%)`,
    );
  }

  // Get cached competitive intelligence response
  async getCachedCompetitiveIntelligence(
    analysisContent: string,
  ): Promise<AICompetitiveIntelligenceResponse | null> {
    const contentHash = require("crypto")
      .createHash("sha256")
      .update(analysisContent)
      .digest("hex")
      .substring(0, 16);

    const cacheKey = { contentHash };
    const cached = aiCache.get<AICompetitiveIntelligenceResponse>(
      "competitive_analysis",
      cacheKey,
    );

    if (cached) {
      console.log(
        `🎯 Cache hit for competitive intelligence (confidence: ${cached.confidence}%)`,
      );
      return cached;
    }

    console.log("💀 Cache miss for competitive intelligence");
    return null;
  }

  // Get comprehensive cache statistics
  getAIResponseCacheStats(): {
    photoAnalysis: number;
    documentExtraction: number;
    autoQuote: number;
    riskAssessment: number;
    competitiveIntelligence: number;
    totalEntries: number;
    hitRate: number;
    memoryUsage: number;
  } {
    const photoAnalysis = aiCache.getEntriesByPrefix("photo_analysis").length;
    const documentExtraction = aiCache.getEntriesByPrefix("extraction").length;
    const autoQuote = aiCache.getEntriesByPrefix("quote_generation").length;
    const riskAssessment = aiCache.getEntriesByPrefix("risk_assessment").length;
    const competitiveIntelligence = aiCache.getEntriesByPrefix(
      "competitive_analysis",
    ).length;

    const stats = aiCache.getStats();

    return {
      photoAnalysis,
      documentExtraction,
      autoQuote,
      riskAssessment,
      competitiveIntelligence,
      totalEntries: stats.totalEntries,
      hitRate: stats.hitRate,
      memoryUsage: stats.memoryUsage,
    };
  }

  // Clear all AI response cache entries
  clearAIResponseCache(): void {
    const prefixes = [
      "photo_analysis",
      "extraction",
      "quote_generation",
      "risk_assessment",
      "competitive_analysis",
    ];

    let totalCleared = 0;

    prefixes.forEach((prefix) => {
      const entries = aiCache.getEntriesByPrefix(prefix);
      entries.forEach((entry) => {
        aiCache.delete(prefix, entry.key);
      });
      totalCleared += entries.length;
    });

    console.log(`🗑️ Cleared ${totalCleared} AI response cache entries`);
  }

  // Preload common AI responses
  async preloadCommonAIResponses(
    commonPatterns: Array<{
      type:
        | "photo_analysis"
        | "document_extraction"
        | "auto_quote"
        | "risk_assessment"
        | "competitive_intelligence";
      data: any;
      generator: () => Promise<any>;
    }>,
  ): Promise<void> {
    console.log(
      `🔄 Preloading ${commonPatterns.length} common AI response patterns...`,
    );

    const promises = commonPatterns.map(async ({ type, data, generator }) => {
      try {
        let cacheKey: any;
        let cached: any;

        // Check if already cached based on type
        switch (type) {
          case "photo_analysis":
            cacheKey = { url: data.imageUrl, type: data.analysisType };
            cached = aiCache.get("photo_analysis", cacheKey);
            break;
          case "document_extraction":
            cacheKey = {
              type: data.extractionType,
              content: data.content.substring(0, 1000),
            };
            cached = aiCache.get("extraction", cacheKey);
            break;
          case "auto_quote":
            cacheKey = {
              services: data.extractedData.requirements?.services,
              buildingType: data.extractedData.requirements?.buildingType,
              buildingSize: data.extractedData.requirements?.buildingSize,
              options: data.options,
            };
            cached = aiCache.get("quote_generation", cacheKey);
            break;
          case "risk_assessment":
            cacheKey = {
              buildingType: data.buildingType,
              services: data.services,
              location: data.location,
              conditions: data.conditions,
            };
            cached = aiCache.get("risk_assessment", cacheKey);
            break;
          case "competitive_intelligence":
            const contentHash = require("crypto")
              .createHash("sha256")
              .update(data.content)
              .digest("hex")
              .substring(0, 16);
            cacheKey = { contentHash };
            cached = aiCache.get("competitive_analysis", cacheKey);
            break;
        }

        if (!cached) {
          const response = await generator();

          // Cache the response based on type
          switch (type) {
            case "photo_analysis":
              await this.cachePhotoAnalysis(
                data.imageUrl,
                data.analysisType,
                response,
              );
              break;
            case "document_extraction":
              await this.cacheDocumentExtraction(
                data.content,
                data.extractionType,
                response,
              );
              break;
            case "auto_quote":
              await this.cacheAutoQuote(
                data.extractedData,
                data.options,
                response,
              );
              break;
            case "risk_assessment":
              await this.cacheRiskAssessment(data, response);
              break;
            case "competitive_intelligence":
              await this.cacheCompetitiveIntelligence(data.content, response);
              break;
          }
        }
      } catch (error) {
        console.warn(`Failed to preload ${type} pattern:`, error);
      }
    });

    await Promise.allSettled(promises);
    console.log("✅ AI response preloading completed");
  }

  // Get configuration
  getConfig(): AICacheConfig {
    return { ...this.config };
  }

  // Update configuration
  updateConfig(config: Partial<AICacheConfig>): void {
    this.config = {
      photo_analysis: {
        ...this.config.photo_analysis,
        ...config.photo_analysis,
      },
      document_extraction: {
        ...this.config.document_extraction,
        ...config.document_extraction,
      },
      auto_quote: { ...this.config.auto_quote, ...config.auto_quote },
      risk_assessment: {
        ...this.config.risk_assessment,
        ...config.risk_assessment,
      },
      competitive_intelligence: {
        ...this.config.competitive_intelligence,
        ...config.competitive_intelligence,
      },
    };

    console.log("⚙️ AI response cache configuration updated", this.config);
  }
}

// Global AI response cache manager
export const aiResponseCache = new AIResponseCache();

// Helper functions for easier usage
export async function getCachedPhotoAnalysis(
  imageUrl: string,
  analysisType: string,
): Promise<AIPhotoAnalysisResponse | null> {
  return aiResponseCache.getCachedPhotoAnalysis(imageUrl, analysisType);
}

export async function cachePhotoAnalysis(
  imageUrl: string,
  analysisType: string,
  response: AIPhotoAnalysisResponse,
): Promise<void> {
  return aiResponseCache.cachePhotoAnalysis(imageUrl, analysisType, response);
}

export async function getCachedDocumentExtraction(
  documentContent: string,
  extractionType: string,
): Promise<AIDocumentExtractionResponse | null> {
  return aiResponseCache.getCachedDocumentExtraction(
    documentContent,
    extractionType,
  );
}

export async function cacheDocumentExtraction(
  documentContent: string,
  extractionType: string,
  response: AIDocumentExtractionResponse,
): Promise<void> {
  return aiResponseCache.cacheDocumentExtraction(
    documentContent,
    extractionType,
    response,
  );
}

export async function getCachedAutoQuote(
  extractedData: any,
  options: any,
): Promise<AIAutoQuoteResponse | null> {
  return aiResponseCache.getCachedAutoQuote(extractedData, options);
}

export async function cacheAutoQuote(
  extractedData: any,
  options: any,
  response: AIAutoQuoteResponse,
): Promise<void> {
  return aiResponseCache.cacheAutoQuote(extractedData, options, response);
}

// Export the cache manager for advanced usage
export default aiResponseCache;
