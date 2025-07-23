"use client";

// PHASE 3 FIX: Template suggestion caching system for improved performance
import { WorkflowTemplate } from "../services/workflow-templates";
import { GuidedFlowData } from "../types/estimate-types";
import { aiCache } from "./ai-cache";

// Template suggestion cache entry
interface TemplateSuggestionCacheEntry {
  suggestions: WorkflowTemplate[];
  confidence: number;
  reasoning: string;
  timestamp: number;
}

// Template application cache entry
interface TemplateApplicationCacheEntry {
  appliedData: GuidedFlowData;
  templateId: string;
  timestamp: number;
}

// Template cache configuration
interface TemplateCacheConfig {
  suggestionTtl: number; // Template suggestions TTL (in seconds)
  applicationTtl: number; // Template application TTL (in seconds)
  maxSuggestions: number; // Max suggestions to cache per key
  enableIntelligentInvalidation: boolean;
}

// Default configuration
const DEFAULT_CONFIG: TemplateCacheConfig = {
  suggestionTtl: 1800, // 30 minutes
  applicationTtl: 3600, // 1 hour
  maxSuggestions: 5,
  enableIntelligentInvalidation: true,
};

export class TemplateCacheManager {
  private config: TemplateCacheConfig;

  constructor(config: Partial<TemplateCacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // Generate cache key for template suggestions
  private generateSuggestionKey(
    flowData: GuidedFlowData,
    context?: any,
  ): string {
    const keyData = {
      buildingType:
        flowData.initialContact?.aiExtractedData?.requirements?.buildingType,
      services: flowData.scopeDetails?.selectedServices,
      buildingSize:
        flowData.initialContact?.aiExtractedData?.requirements?.buildingSize,
      location:
        flowData.initialContact?.aiExtractedData?.requirements?.location,
      urgency: flowData.initialContact?.aiExtractedData?.requirements?.urgency,
      budget: flowData.initialContact?.aiExtractedData?.requirements?.budget,
      context: context?.type || "default",
    };

    return JSON.stringify(keyData, Object.keys(keyData).sort());
  }

  // Generate cache key for template applications
  private generateApplicationKey(
    templateId: string,
    baseData: GuidedFlowData,
  ): string {
    const keyData = {
      templateId,
      existingData: {
        hasInitialContact: !!baseData.initialContact,
        hasScope: !!baseData.scopeDetails,
        hasFiles: !!baseData.filesPhotos,
        hasArea: !!baseData.areaOfWork,
      },
    };

    return JSON.stringify(keyData, Object.keys(keyData).sort());
  }

  // Cache template suggestions
  async cacheTemplateSuggestions(
    flowData: GuidedFlowData,
    suggestions: WorkflowTemplate[],
    confidence: number,
    reasoning: string,
    context?: any,
  ): Promise<void> {
    const cacheKey = this.generateSuggestionKey(flowData, context);

    const entry: TemplateSuggestionCacheEntry = {
      suggestions: suggestions.slice(0, this.config.maxSuggestions),
      confidence,
      reasoning,
      timestamp: Date.now(),
    };

    aiCache.set(
      "template_suggestions",
      cacheKey,
      entry,
      this.config.suggestionTtl,
    );

    console.log(
      `✅ Cached ${suggestions.length} template suggestions with ${confidence}% confidence`,
    );
  }

  // Get cached template suggestions
  async getCachedTemplateSuggestions(
    flowData: GuidedFlowData,
    context?: any,
  ): Promise<TemplateSuggestionCacheEntry | null> {
    const cacheKey = this.generateSuggestionKey(flowData, context);
    const cached = aiCache.get<TemplateSuggestionCacheEntry>(
      "template_suggestions",
      cacheKey,
    );

    if (cached) {
      console.log(
        `🎯 Cache hit for template suggestions (${cached.suggestions.length} suggestions)`,
      );
      return cached;
    }

    console.log("💀 Cache miss for template suggestions");
    return null;
  }

  // Cache template application result
  async cacheTemplateApplication(
    templateId: string,
    baseData: GuidedFlowData,
    appliedData: GuidedFlowData,
  ): Promise<void> {
    const cacheKey = this.generateApplicationKey(templateId, baseData);

    const entry: TemplateApplicationCacheEntry = {
      appliedData,
      templateId,
      timestamp: Date.now(),
    };

    aiCache.set(
      "template_application",
      cacheKey,
      entry,
      this.config.applicationTtl,
    );

    console.log(`✅ Cached template application for template ${templateId}`);
  }

  // Get cached template application
  async getCachedTemplateApplication(
    templateId: string,
    baseData: GuidedFlowData,
  ): Promise<TemplateApplicationCacheEntry | null> {
    const cacheKey = this.generateApplicationKey(templateId, baseData);
    const cached = aiCache.get<TemplateApplicationCacheEntry>(
      "template_application",
      cacheKey,
    );

    if (cached) {
      console.log(`🎯 Cache hit for template application: ${templateId}`);
      return cached;
    }

    console.log(`💀 Cache miss for template application: ${templateId}`);
    return null;
  }

  // Invalidate template suggestions when relevant data changes
  async invalidateTemplateSuggestions(
    flowData: GuidedFlowData,
    changedFields: string[],
  ): Promise<void> {
    if (!this.config.enableIntelligentInvalidation) {
      return;
    }

    // Check if changed fields affect template suggestions
    const criticalFields = [
      "buildingType",
      "selectedServices",
      "buildingSize",
      "location",
      "urgency",
      "budget",
    ];

    const shouldInvalidate = changedFields.some((field) =>
      criticalFields.some((critical) => field.includes(critical)),
    );

    if (shouldInvalidate) {
      const cacheKey = this.generateSuggestionKey(flowData);
      const deleted = aiCache.delete("template_suggestions", cacheKey);

      if (deleted) {
        console.log(
          "🗑️ Invalidated template suggestions cache due to critical field changes",
        );
      }
    }
  }

  // Get cache statistics for templates
  getTemplateCacheStats(): {
    suggestionEntries: number;
    applicationEntries: number;
    totalHits: number;
    totalMisses: number;
  } {
    const suggestions = aiCache.getEntriesByPrefix("template_suggestions");
    const applications = aiCache.getEntriesByPrefix("template_application");
    const stats = aiCache.getStats();

    return {
      suggestionEntries: suggestions.length,
      applicationEntries: applications.length,
      totalHits: stats.totalHits,
      totalMisses: stats.totalMisses,
    };
  }

  // Clear all template cache entries
  clearTemplateCache(): void {
    const suggestions = aiCache.getEntriesByPrefix("template_suggestions");
    const applications = aiCache.getEntriesByPrefix("template_application");

    suggestions.forEach((entry) => {
      aiCache.delete("template_suggestions", entry.key);
    });

    applications.forEach((entry) => {
      aiCache.delete("template_application", entry.key);
    });

    console.log(
      `🗑️ Cleared ${suggestions.length + applications.length} template cache entries`,
    );
  }

  // Preload popular templates
  async preloadPopularTemplates(
    popularFlowPatterns: GuidedFlowData[],
    templateGenerator: (flowData: GuidedFlowData) => Promise<{
      suggestions: WorkflowTemplate[];
      confidence: number;
      reasoning: string;
    }>,
  ): Promise<void> {
    console.log(
      `🔄 Preloading ${popularFlowPatterns.length} popular template patterns...`,
    );

    const promises = popularFlowPatterns.map(async (pattern) => {
      try {
        const cacheKey = this.generateSuggestionKey(pattern);
        const existing = aiCache.get<TemplateSuggestionCacheEntry>(
          "template_suggestions",
          cacheKey,
        );

        if (!existing) {
          const { suggestions, confidence, reasoning } =
            await templateGenerator(pattern);
          await this.cacheTemplateSuggestions(
            pattern,
            suggestions,
            confidence,
            reasoning,
          );
        }
      } catch (error) {
        console.warn("Failed to preload template pattern:", error);
      }
    });

    await Promise.allSettled(promises);
    console.log("✅ Template preloading completed");
  }

  // Get configuration
  getConfig(): TemplateCacheConfig {
    return { ...this.config };
  }

  // Update configuration
  updateConfig(config: Partial<TemplateCacheConfig>): void {
    this.config = { ...this.config, ...config };
    console.log("⚙️ Template cache configuration updated", this.config);
  }
}

// Global template cache manager instance
export const templateCacheManager = new TemplateCacheManager();

// Helper functions for easier usage
export async function getCachedTemplateSuggestions(
  flowData: GuidedFlowData,
  context?: any,
): Promise<TemplateSuggestionCacheEntry | null> {
  return templateCacheManager.getCachedTemplateSuggestions(flowData, context);
}

export async function cacheTemplateSuggestions(
  flowData: GuidedFlowData,
  suggestions: WorkflowTemplate[],
  confidence: number,
  reasoning: string,
  context?: any,
): Promise<void> {
  return templateCacheManager.cacheTemplateSuggestions(
    flowData,
    suggestions,
    confidence,
    reasoning,
    context,
  );
}

export async function getCachedTemplateApplication(
  templateId: string,
  baseData: GuidedFlowData,
): Promise<TemplateApplicationCacheEntry | null> {
  return templateCacheManager.getCachedTemplateApplication(
    templateId,
    baseData,
  );
}

export async function cacheTemplateApplication(
  templateId: string,
  baseData: GuidedFlowData,
  appliedData: GuidedFlowData,
): Promise<void> {
  return templateCacheManager.cacheTemplateApplication(
    templateId,
    baseData,
    appliedData,
  );
}

// Export the manager for advanced usage
export default templateCacheManager;
