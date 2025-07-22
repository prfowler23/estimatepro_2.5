/**
 * Analytics tracking for newly implemented features
 * Tracks usage, performance, and adoption metrics for recent feature additions
 */

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/types/supabase";

// Analytics event types for new features
export type NewFeatureAnalyticsEvent =
  | {
      event: "ai_assistant_interaction";
      properties: {
        sessionId: string;
        messageType: "user" | "assistant";
        tokenCount?: number;
        responseTime?: number;
        satisfactionRating?: number;
        featureUsed: string[];
      };
    }
  | {
      event: "vendor_management_action";
      properties: {
        action: "create" | "update" | "delete" | "search" | "filter";
        vendorType?: string;
        searchTerm?: string;
        filterCriteria?: string[];
        resultCount?: number;
      };
    }
  | {
      event: "pilot_certification_action";
      properties: {
        action: "add_cert" | "update_cert" | "schedule_renewal" | "flight_log";
        certificationType?: string;
        expirationDays?: number;
        flightHours?: number;
      };
    }
  | {
      event: "collaboration_activity";
      properties: {
        action: "join_session" | "leave_session" | "edit_field" | "add_comment";
        sessionId: string;
        participantCount?: number;
        fieldType?: string;
        conflictResolved?: boolean;
      };
    }
  | {
      event: "mobile_navigation_usage";
      properties: {
        screen: string;
        previousScreen?: string;
        timeSpent?: number;
        gestureType?: "tap" | "swipe" | "scroll";
      };
    }
  | {
      event: "feature_flag_activation";
      properties: {
        flagKey: string;
        enabled: boolean;
        userSegment?: string;
        rolloutPercentage?: number;
      };
    }
  | {
      event: "monitoring_alert";
      properties: {
        alertType: "error" | "performance" | "usage";
        severity: "low" | "medium" | "high" | "critical";
        component: string;
        errorMessage?: string;
        responseTime?: number;
      };
    };

// Performance metrics for new features
export interface NewFeaturePerformanceMetrics {
  featureKey: string;
  loadTime: number;
  renderTime: number;
  interactionTime?: number;
  errorCount: number;
  successRate: number;
  memoryUsage?: number;
  cacheHitRate?: number;
}

// Feature adoption metrics
export interface FeatureAdoptionMetrics {
  featureKey: string;
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  retentionRate: number;
  engagementScore: number;
  conversionRate?: number;
}

export class NewFeatureAnalytics {
  private supabase = createClientComponentClient<Database>();
  private analyticsQueue: NewFeatureAnalyticsEvent[] = [];
  private batchSize = 10;
  private flushInterval = 30000; // 30 seconds
  private lastFlush = Date.now();

  constructor() {
    // Start periodic flush
    if (typeof window !== "undefined") {
      setInterval(() => this.flushEvents(), this.flushInterval);

      // Flush on page unload
      window.addEventListener("beforeunload", () => this.flushEvents());
    }
  }

  /**
   * Track AI Assistant interactions
   */
  async trackAIAssistantUsage(data: {
    sessionId: string;
    messageType: "user" | "assistant";
    tokenCount?: number;
    responseTime?: number;
    satisfactionRating?: number;
    featureUsed?: string[];
  }) {
    await this.track({
      event: "ai_assistant_interaction",
      properties: {
        sessionId: data.sessionId,
        messageType: data.messageType,
        tokenCount: data.tokenCount,
        responseTime: data.responseTime,
        satisfactionRating: data.satisfactionRating,
        featureUsed: data.featureUsed || [],
      },
    });

    // Track performance metrics
    if (data.responseTime) {
      await this.trackPerformance({
        featureKey: "ai_assistant",
        loadTime: 0,
        renderTime: data.responseTime,
        errorCount: 0,
        successRate: 100,
      });
    }
  }

  /**
   * Track vendor management system usage
   */
  async trackVendorManagement(data: {
    action: "create" | "update" | "delete" | "search" | "filter";
    vendorType?: string;
    searchTerm?: string;
    filterCriteria?: string[];
    resultCount?: number;
  }) {
    await this.track({
      event: "vendor_management_action",
      properties: data,
    });

    // Track search effectiveness
    if (data.action === "search" && data.resultCount !== undefined) {
      const searchEffectiveness = data.resultCount > 0 ? 100 : 0;
      await this.trackPerformance({
        featureKey: "vendor_management",
        loadTime: 0,
        renderTime: 0,
        errorCount: 0,
        successRate: searchEffectiveness,
      });
    }
  }

  /**
   * Track pilot certification system usage
   */
  async trackPilotCertification(data: {
    action: "add_cert" | "update_cert" | "schedule_renewal" | "flight_log";
    certificationType?: string;
    expirationDays?: number;
    flightHours?: number;
  }) {
    await this.track({
      event: "pilot_certification_action",
      properties: data,
    });

    // Track compliance metrics
    if (data.expirationDays !== undefined) {
      const complianceScore = data.expirationDays > 30 ? 100 : 50;
      await this.trackPerformance({
        featureKey: "pilot_certification",
        loadTime: 0,
        renderTime: 0,
        errorCount: 0,
        successRate: complianceScore,
      });
    }
  }

  /**
   * Track collaboration feature usage
   */
  async trackCollaboration(data: {
    action: "join_session" | "leave_session" | "edit_field" | "add_comment";
    sessionId: string;
    participantCount?: number;
    fieldType?: string;
    conflictResolved?: boolean;
  }) {
    await this.track({
      event: "collaboration_activity",
      properties: data,
    });

    // Track collaboration effectiveness
    const effectivenessScore = data.conflictResolved === true ? 100 : 80;
    await this.trackPerformance({
      featureKey: "collaboration",
      loadTime: 0,
      renderTime: 0,
      errorCount: 0,
      successRate: effectivenessScore,
    });
  }

  /**
   * Track mobile navigation usage
   */
  async trackMobileNavigation(data: {
    screen: string;
    previousScreen?: string;
    timeSpent?: number;
    gestureType?: "tap" | "swipe" | "scroll";
  }) {
    await this.track({
      event: "mobile_navigation_usage",
      properties: data,
    });

    // Track mobile engagement
    if (data.timeSpent) {
      const engagementScore = data.timeSpent > 5000 ? 100 : 50;
      await this.trackPerformance({
        featureKey: "mobile_navigation",
        loadTime: 0,
        renderTime: data.timeSpent,
        errorCount: 0,
        successRate: engagementScore,
      });
    }
  }

  /**
   * Track feature flag activations
   */
  async trackFeatureFlagUsage(data: {
    flagKey: string;
    enabled: boolean;
    userSegment?: string;
    rolloutPercentage?: number;
  }) {
    await this.track({
      event: "feature_flag_activation",
      properties: data,
    });
  }

  /**
   * Track monitoring alerts
   */
  async trackMonitoringAlert(data: {
    alertType: "error" | "performance" | "usage";
    severity: "low" | "medium" | "high" | "critical";
    component: string;
    errorMessage?: string;
    responseTime?: number;
  }) {
    await this.track({
      event: "monitoring_alert",
      properties: data,
    });

    // Track system health
    const healthScore =
      data.severity === "low" ? 90 : data.severity === "medium" ? 70 : 40;
    await this.trackPerformance({
      featureKey: "monitoring_system",
      loadTime: 0,
      renderTime: data.responseTime || 0,
      errorCount: 1,
      successRate: healthScore,
    });
  }

  /**
   * Track performance metrics for features
   */
  async trackPerformance(metrics: NewFeaturePerformanceMetrics) {
    try {
      await this.supabase.from("feature_performance_metrics").insert({
        feature_key: metrics.featureKey,
        load_time: metrics.loadTime,
        render_time: metrics.renderTime,
        interaction_time: metrics.interactionTime,
        error_count: metrics.errorCount,
        success_rate: metrics.successRate,
        memory_usage: metrics.memoryUsage,
        cache_hit_rate: metrics.cacheHitRate,
        recorded_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Failed to track performance metrics:", error);
    }
  }

  /**
   * Get feature adoption metrics
   */
  async getFeatureAdoption(
    featureKey: string,
    timeRange: string = "30d",
  ): Promise<FeatureAdoptionMetrics | null> {
    try {
      const { data, error } = await this.supabase.rpc(
        "get_feature_adoption_metrics",
        {
          feature_key: featureKey,
          time_range: timeRange,
        },
      );

      if (error) {
        console.error("Failed to get feature adoption metrics:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Failed to get feature adoption metrics:", error);
      return null;
    }
  }

  /**
   * Get feature performance summary
   */
  async getFeaturePerformance(featureKey: string, timeRange: string = "7d") {
    try {
      const { data, error } = await this.supabase
        .from("feature_performance_metrics")
        .select("*")
        .eq("feature_key", featureKey)
        .gte(
          "recorded_at",
          new Date(Date.now() - this.parseTimeRange(timeRange)).toISOString(),
        );

      if (error) {
        console.error("Failed to get feature performance:", error);
        return null;
      }

      // Calculate aggregated metrics
      if (data.length === 0) return null;

      const avgLoadTime =
        data.reduce((sum, d) => sum + (d.load_time || 0), 0) / data.length;
      const avgRenderTime =
        data.reduce((sum, d) => sum + (d.render_time || 0), 0) / data.length;
      const totalErrors = data.reduce(
        (sum, d) => sum + (d.error_count || 0),
        0,
      );
      const avgSuccessRate =
        data.reduce((sum, d) => sum + (d.success_rate || 0), 0) / data.length;

      return {
        featureKey,
        avgLoadTime,
        avgRenderTime,
        totalErrors,
        avgSuccessRate,
        sampleCount: data.length,
      };
    } catch (error) {
      console.error("Failed to get feature performance:", error);
      return null;
    }
  }

  /**
   * Generate feature usage report
   */
  async generateFeatureReport(timeRange: string = "30d") {
    const features = [
      "ai_assistant",
      "vendor_management",
      "pilot_certification",
      "collaboration",
      "mobile_navigation",
      "monitoring_system",
    ];

    const report = {
      timeRange,
      generatedAt: new Date().toISOString(),
      features: [] as any[],
    };

    for (const feature of features) {
      const adoption = await this.getFeatureAdoption(feature, timeRange);
      const performance = await this.getFeaturePerformance(feature, timeRange);

      report.features.push({
        featureKey: feature,
        adoption,
        performance,
      });
    }

    return report;
  }

  /**
   * Core tracking method - adds events to queue
   */
  private async track(event: NewFeatureAnalyticsEvent) {
    this.analyticsQueue.push(event);

    // Flush if queue is full or enough time has passed
    if (
      this.analyticsQueue.length >= this.batchSize ||
      Date.now() - this.lastFlush > this.flushInterval
    ) {
      await this.flushEvents();
    }
  }

  /**
   * Flush events to database
   */
  private async flushEvents() {
    if (this.analyticsQueue.length === 0) return;

    const eventsToFlush = this.analyticsQueue.splice(0);
    this.lastFlush = Date.now();

    try {
      const analyticsEvents = eventsToFlush.map((event) => ({
        event_type: event.event,
        event_data: event.properties,
        user_id: null, // Will be populated by database trigger if user is authenticated
        session_id: this.getSessionId(),
        timestamp: new Date().toISOString(),
      }));

      await this.supabase.from("analytics_events").insert(analyticsEvents);
    } catch (error) {
      console.error("Failed to flush analytics events:", error);
      // Re-queue events for retry
      this.analyticsQueue.unshift(...eventsToFlush);
    }
  }

  /**
   * Get or generate session ID
   */
  private getSessionId(): string {
    if (typeof window === "undefined") return "server";

    let sessionId = sessionStorage.getItem("analytics_session_id");
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem("analytics_session_id", sessionId);
    }
    return sessionId;
  }

  /**
   * Parse time range string to milliseconds
   */
  private parseTimeRange(timeRange: string): number {
    const unit = timeRange.slice(-1);
    const value = parseInt(timeRange.slice(0, -1));

    switch (unit) {
      case "d":
        return value * 24 * 60 * 60 * 1000;
      case "h":
        return value * 60 * 60 * 1000;
      case "m":
        return value * 60 * 1000;
      default:
        return 30 * 24 * 60 * 60 * 1000; // Default 30 days
    }
  }
}

// Global analytics instance
export const newFeatureAnalytics = new NewFeatureAnalytics();

// Convenience functions for common tracking scenarios
export const trackAIAssistant =
  newFeatureAnalytics.trackAIAssistantUsage.bind(newFeatureAnalytics);
export const trackVendorManagement =
  newFeatureAnalytics.trackVendorManagement.bind(newFeatureAnalytics);
export const trackPilotCertification =
  newFeatureAnalytics.trackPilotCertification.bind(newFeatureAnalytics);
export const trackCollaboration =
  newFeatureAnalytics.trackCollaboration.bind(newFeatureAnalytics);
export const trackMobileNavigation =
  newFeatureAnalytics.trackMobileNavigation.bind(newFeatureAnalytics);
export const trackFeatureFlag =
  newFeatureAnalytics.trackFeatureFlagUsage.bind(newFeatureAnalytics);
export const trackMonitoringAlert =
  newFeatureAnalytics.trackMonitoringAlert.bind(newFeatureAnalytics);
