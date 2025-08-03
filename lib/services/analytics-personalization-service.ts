// Analytics Personalization Service
// Provides user preference management and personalized analytics experiences

import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { logger } from "@/lib/utils/logger";

interface UserPreferences {
  userId: string;
  dashboardLayout: string[];
  favoriteCharts: string[];
  defaultTimeRange: string;
  defaultMetrics: string[];
  notifications: {
    realTime: boolean;
    anomalies: boolean;
    dailyReports: boolean;
    thresholdAlerts: boolean;
  };
  display: {
    theme: "light" | "dark" | "auto";
    density: "compact" | "comfortable" | "spacious";
    animations: boolean;
    chartDefaults: {
      type: "line" | "bar" | "area" | "pie";
      colors: string[];
      showGrid: boolean;
      showLegend: boolean;
    };
  };
  filters: {
    savedFilters: Record<string, any>[];
    quickFilters: string[];
    defaultAggregation: "sum" | "avg" | "count" | "max" | "min";
  };
  customViews: {
    id: string;
    name: string;
    config: any;
    isDefault: boolean;
  }[];
}

interface PersonalizationContext {
  userId: string;
  role: string;
  permissions: string[];
  lastLogin: string;
  sessionDuration: number;
  viewingHistory: {
    charts: string[];
    metrics: string[];
    timeRanges: string[];
  };
}

// Validation schemas
const UserPreferencesSchema = z.object({
  userId: z.string(),
  dashboardLayout: z.array(z.string()),
  favoriteCharts: z.array(z.string()),
  defaultTimeRange: z.string(),
  defaultMetrics: z.array(z.string()),
  notifications: z.object({
    realTime: z.boolean(),
    anomalies: z.boolean(),
    dailyReports: z.boolean(),
    thresholdAlerts: z.boolean(),
  }),
  display: z.object({
    theme: z.enum(["light", "dark", "auto"]),
    density: z.enum(["compact", "comfortable", "spacious"]),
    animations: z.boolean(),
    chartDefaults: z.object({
      type: z.enum(["line", "bar", "area", "pie"]),
      colors: z.array(z.string()),
      showGrid: z.boolean(),
      showLegend: z.boolean(),
    }),
  }),
  filters: z.object({
    savedFilters: z.array(z.any()),
    quickFilters: z.array(z.string()),
    defaultAggregation: z.enum(["sum", "avg", "count", "max", "min"]),
  }),
  customViews: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      config: z.any(),
      isDefault: z.boolean(),
    }),
  ),
});

export class AnalyticsPersonalizationService {
  private preferencesCache = new Map<string, UserPreferences>();
  private contextCache = new Map<string, PersonalizationContext>();

  /**
   * Get user preferences with fallback to defaults
   */
  async getUserPreferences(userId: string): Promise<UserPreferences> {
    try {
      // Check cache first
      if (this.preferencesCache.has(userId)) {
        return this.preferencesCache.get(userId)!;
      }

      const supabase = createClient();

      const { data, error } = await supabase
        .from("user_analytics_preferences")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        logger.error("Failed to fetch user preferences:", error);
      }

      let preferences: UserPreferences;

      if (data) {
        preferences = {
          userId,
          dashboardLayout: data.dashboard_layout || this.getDefaultLayout(),
          favoriteCharts: data.favorite_charts || [],
          defaultTimeRange: data.default_time_range || "30d",
          defaultMetrics: data.default_metrics || [
            "revenue",
            "customers",
            "estimates",
          ],
          notifications: data.notifications || this.getDefaultNotifications(),
          display: data.display_settings || this.getDefaultDisplay(),
          filters: data.filter_settings || this.getDefaultFilters(),
          customViews: data.custom_views || [],
        };
      } else {
        preferences = this.getDefaultPreferences(userId);
        await this.saveUserPreferences(preferences);
      }

      // Validate preferences
      const validatedPreferences = UserPreferencesSchema.parse(preferences);
      this.preferencesCache.set(userId, validatedPreferences);

      return validatedPreferences;
    } catch (error) {
      logger.error("Error getting user preferences:", error);
      return this.getDefaultPreferences(userId);
    }
  }

  /**
   * Save user preferences
   */
  async saveUserPreferences(preferences: UserPreferences): Promise<void> {
    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("user_analytics_preferences")
        .upsert(
          {
            user_id: preferences.userId,
            dashboard_layout: preferences.dashboardLayout,
            favorite_charts: preferences.favoriteCharts,
            default_time_range: preferences.defaultTimeRange,
            default_metrics: preferences.defaultMetrics,
            notifications: preferences.notifications,
            display_settings: preferences.display,
            filter_settings: preferences.filters,
            custom_views: preferences.customViews,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );

      if (error) {
        throw error;
      }

      // Update cache
      this.preferencesCache.set(preferences.userId, preferences);

      logger.info("User preferences saved successfully", {
        userId: preferences.userId,
      });
    } catch (error) {
      logger.error("Failed to save user preferences:", error);
      throw error;
    }
  }

  /**
   * Get personalized dashboard configuration
   */
  async getPersonalizedDashboard(userId: string): Promise<any> {
    try {
      const preferences = await this.getUserPreferences(userId);
      const context = await this.getPersonalizationContext(userId);

      // Generate personalized dashboard based on preferences and context
      const dashboard = {
        layout: preferences.dashboardLayout,
        widgets: this.generateRecommendedWidgets(preferences, context),
        metrics: this.getPrioritizedMetrics(preferences, context),
        filters: this.getSmartFilters(preferences, context),
        theme: preferences.display.theme,
        density: preferences.display.density,
        animations: preferences.display.animations,
      };

      return dashboard;
    } catch (error) {
      logger.error("Failed to generate personalized dashboard:", error);
      throw error;
    }
  }

  /**
   * Update user viewing behavior for personalization
   */
  async trackUserBehavior(
    userId: string,
    action: string,
    context: Record<string, any>,
  ): Promise<void> {
    try {
      const supabase = createClient();

      await supabase.from("user_analytics_behavior").insert({
        user_id: userId,
        action,
        context,
        timestamp: new Date().toISOString(),
      });

      // Update personalization context
      await this.updatePersonalizationContext(userId, action, context);
    } catch (error) {
      logger.error("Failed to track user behavior:", error);
    }
  }

  /**
   * Get smart filter recommendations
   */
  async getFilterRecommendations(userId: string): Promise<any[]> {
    try {
      const context = await this.getPersonalizationContext(userId);
      const preferences = await this.getUserPreferences(userId);

      const recommendations = [];

      // Recommend filters based on viewing history
      if (context.viewingHistory.timeRanges.length > 0) {
        const mostUsedTimeRange = this.getMostFrequent(
          context.viewingHistory.timeRanges,
        );
        recommendations.push({
          type: "timeRange",
          value: mostUsedTimeRange,
          reason: "Frequently used time range",
          confidence: 0.8,
        });
      }

      // Recommend metrics based on favorites
      preferences.favoriteCharts.forEach((chart) => {
        recommendations.push({
          type: "chart",
          value: chart,
          reason: "Favorite chart",
          confidence: 0.9,
        });
      });

      // Role-based recommendations
      if (context.role === "manager") {
        recommendations.push({
          type: "aggregation",
          value: "sum",
          reason: "Managers typically view totals",
          confidence: 0.7,
        });
      }

      return recommendations;
    } catch (error) {
      logger.error("Failed to get filter recommendations:", error);
      return [];
    }
  }

  /**
   * Create custom view
   */
  async createCustomView(
    userId: string,
    name: string,
    config: any,
    isDefault = false,
  ): Promise<string> {
    try {
      const preferences = await this.getUserPreferences(userId);
      const viewId = `view_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const newView = {
        id: viewId,
        name,
        config,
        isDefault,
      };

      // If setting as default, remove default from other views
      if (isDefault) {
        preferences.customViews.forEach((view) => {
          view.isDefault = false;
        });
      }

      preferences.customViews.push(newView);
      await this.saveUserPreferences(preferences);

      return viewId;
    } catch (error) {
      logger.error("Failed to create custom view:", error);
      throw error;
    }
  }

  /**
   * Export user preferences for backup/migration
   */
  async exportUserPreferences(userId: string): Promise<any> {
    try {
      const preferences = await this.getUserPreferences(userId);
      const context = await this.getPersonalizationContext(userId);

      return {
        preferences,
        context,
        exportedAt: new Date().toISOString(),
        version: "1.0",
      };
    } catch (error) {
      logger.error("Failed to export user preferences:", error);
      throw error;
    }
  }

  /**
   * Import user preferences from backup
   */
  async importUserPreferences(
    userId: string,
    data: any,
    merge = true,
  ): Promise<void> {
    try {
      if (merge) {
        const existingPreferences = await this.getUserPreferences(userId);
        const mergedPreferences = this.mergePreferences(
          existingPreferences,
          data.preferences,
        );
        await this.saveUserPreferences(mergedPreferences);
      } else {
        await this.saveUserPreferences({ ...data.preferences, userId });
      }

      logger.info("User preferences imported successfully", { userId });
    } catch (error) {
      logger.error("Failed to import user preferences:", error);
      throw error;
    }
  }

  // Private helper methods

  private getDefaultPreferences(userId: string): UserPreferences {
    return {
      userId,
      dashboardLayout: this.getDefaultLayout(),
      favoriteCharts: [],
      defaultTimeRange: "30d",
      defaultMetrics: ["revenue", "customers", "estimates"],
      notifications: this.getDefaultNotifications(),
      display: this.getDefaultDisplay(),
      filters: this.getDefaultFilters(),
      customViews: [],
    };
  }

  private getDefaultLayout(): string[] {
    return ["overview", "realtime", "quality", "ai", "advanced"];
  }

  private getDefaultNotifications() {
    return {
      realTime: true,
      anomalies: true,
      dailyReports: false,
      thresholdAlerts: true,
    };
  }

  private getDefaultDisplay() {
    return {
      theme: "auto" as const,
      density: "comfortable" as const,
      animations: true,
      chartDefaults: {
        type: "line" as const,
        colors: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"],
        showGrid: true,
        showLegend: true,
      },
    };
  }

  private getDefaultFilters() {
    return {
      savedFilters: [],
      quickFilters: ["last_7_days", "current_month", "top_services"],
      defaultAggregation: "sum" as const,
    };
  }

  private async getPersonalizationContext(
    userId: string,
  ): Promise<PersonalizationContext> {
    // This would typically fetch from database
    // For now, return default context
    return {
      userId,
      role: "user",
      permissions: ["read", "export"],
      lastLogin: new Date().toISOString(),
      sessionDuration: 0,
      viewingHistory: {
        charts: [],
        metrics: [],
        timeRanges: [],
      },
    };
  }

  private async updatePersonalizationContext(
    userId: string,
    action: string,
    context: Record<string, any>,
  ): Promise<void> {
    // Update context based on user actions
    // This would update the database and cache
  }

  private generateRecommendedWidgets(
    preferences: UserPreferences,
    context: PersonalizationContext,
  ): string[] {
    const widgets = [...preferences.dashboardLayout];

    // Add role-based widgets
    if (context.role === "manager") {
      widgets.push("executive_summary", "kpi_overview");
    }

    return widgets;
  }

  private getPrioritizedMetrics(
    preferences: UserPreferences,
    context: PersonalizationContext,
  ): string[] {
    const metrics = [...preferences.defaultMetrics];

    // Add frequently viewed metrics
    context.viewingHistory.metrics.forEach((metric) => {
      if (!metrics.includes(metric)) {
        metrics.push(metric);
      }
    });

    return metrics;
  }

  private getSmartFilters(
    preferences: UserPreferences,
    context: PersonalizationContext,
  ): any[] {
    return [
      ...preferences.filters.savedFilters,
      {
        type: "timeRange",
        value: preferences.defaultTimeRange,
        label: "Default Time Range",
      },
    ];
  }

  private getMostFrequent(items: string[]): string {
    const frequency = items.reduce(
      (acc, item) => {
        acc[item] = (acc[item] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.keys(frequency).reduce((a, b) =>
      frequency[a] > frequency[b] ? a : b,
    );
  }

  private mergePreferences(
    existing: UserPreferences,
    imported: UserPreferences,
  ): UserPreferences {
    return {
      ...existing,
      ...imported,
      customViews: [...existing.customViews, ...imported.customViews],
      favoriteCharts: [
        ...new Set([...existing.favoriteCharts, ...imported.favoriteCharts]),
      ],
    };
  }
}

// Singleton instance
let personalizationService: AnalyticsPersonalizationService | null = null;

export function getAnalyticsPersonalizationService(): AnalyticsPersonalizationService {
  if (!personalizationService) {
    personalizationService = new AnalyticsPersonalizationService();
  }
  return personalizationService;
}

export default AnalyticsPersonalizationService;
