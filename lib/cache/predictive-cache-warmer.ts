/**
 * Predictive Cache Warmer - Phase 3 Performance Optimization
 *
 * Intelligently preloads frequently accessed data based on usage patterns,
 * user behavior prediction, and time-based access patterns.
 */

import { getSupabaseCacheLayer } from "./supabase-cache-layer";
import { createClient } from "@/lib/supabase/client";
import { OptimizedDatabaseQueries } from "@/lib/utils/optimized-database-queries";
import type { Database } from "@/types/supabase";

interface CacheWarmingPattern {
  userId: string;
  dataType: "estimates" | "dashboard" | "analytics" | "facade_analyses";
  accessFrequency: number; // accesses per hour
  lastAccessed: Date;
  predictedNextAccess: Date;
  priority: "high" | "medium" | "low";
  preloadStrategy: "immediate" | "scheduled" | "lazy";
}

interface WarmingJob {
  id: string;
  userId: string;
  dataType: string;
  scheduledAt: Date;
  status: "pending" | "running" | "completed" | "failed";
  executionTime?: number;
  error?: string;
}

interface PredictiveConfig {
  enabled: boolean;
  maxConcurrentJobs: number;
  warmingWindowHours: number; // How far ahead to predict
  minAccessFrequency: number; // Minimum frequency to consider for warming
  priorityThresholds: {
    high: number; // accesses per hour
    medium: number;
    low: number;
  };
}

/**
 * Predictive Cache Warming System
 */
export class PredictiveCacheWarmer {
  private static instance: PredictiveCacheWarmer | null = null;
  private cache = getSupabaseCacheLayer();
  private client = createClient();
  private queries = OptimizedDatabaseQueries.getInstance();

  private accessPatterns = new Map<string, CacheWarmingPattern>();
  private activeJobs = new Map<string, WarmingJob>();
  private jobQueue: WarmingJob[] = [];

  private config: PredictiveConfig = {
    enabled: process.env.ENABLE_PREDICTIVE_CACHING !== "false",
    maxConcurrentJobs: 3,
    warmingWindowHours: 2,
    minAccessFrequency: 0.5, // At least once every 2 hours
    priorityThresholds: {
      high: 5, // 5+ accesses per hour
      medium: 2, // 2+ accesses per hour
      low: 0.5, // 0.5+ accesses per hour
    },
  };

  private warmingInterval?: NodeJS.Timeout;
  private patternAnalysisInterval?: NodeJS.Timeout;
  private cleanupInterval?: NodeJS.Timeout;

  private constructor() {
    this.startPredictiveWarming();
    this.startPatternAnalysis();
    this.startCleanup();
    this.setupProcessHandlers();
  }

  static getInstance(): PredictiveCacheWarmer {
    if (!PredictiveCacheWarmer.instance) {
      PredictiveCacheWarmer.instance = new PredictiveCacheWarmer();
    }
    return PredictiveCacheWarmer.instance;
  }

  /**
   * Record access pattern for predictive learning
   */
  recordAccess(
    userId: string,
    dataType: "estimates" | "dashboard" | "analytics" | "facade_analyses",
    accessDetails?: { estimateId?: string; timeRange?: any },
  ): void {
    const patternKey = `${userId}:${dataType}`;
    const now = new Date();

    const existing = this.accessPatterns.get(patternKey);
    if (existing) {
      // Update frequency calculation (rolling average)
      const hoursSinceLastAccess =
        (now.getTime() - existing.lastAccessed.getTime()) / (1000 * 60 * 60);
      const newFrequency =
        hoursSinceLastAccess > 0
          ? (existing.accessFrequency + 1 / hoursSinceLastAccess) / 2
          : existing.accessFrequency + 1;

      existing.accessFrequency = newFrequency;
      existing.lastAccessed = now;
      existing.predictedNextAccess = this.predictNextAccess(existing);
      existing.priority = this.calculatePriority(newFrequency);
      existing.preloadStrategy = this.determinePreloadStrategy(existing);
    } else {
      // New pattern
      const pattern: CacheWarmingPattern = {
        userId,
        dataType,
        accessFrequency: 1,
        lastAccessed: now,
        predictedNextAccess: new Date(now.getTime() + 60 * 60 * 1000), // 1 hour default
        priority: "low",
        preloadStrategy: "lazy",
      };

      this.accessPatterns.set(patternKey, pattern);
    }

    // Immediate warming for high-priority frequent access
    const pattern = this.accessPatterns.get(patternKey)!;
    if (
      pattern.priority === "high" &&
      pattern.preloadStrategy === "immediate"
    ) {
      this.scheduleImmediateWarming(pattern, accessDetails);
    }
  }

  /**
   * Schedule cache warming based on predictions
   */
  private async schedulePredictiveWarming(): Promise<void> {
    if (!this.config.enabled) return;

    const now = new Date();
    const warmingWindow = new Date(
      now.getTime() + this.config.warmingWindowHours * 60 * 60 * 1000,
    );

    for (const [key, pattern] of this.accessPatterns.entries()) {
      // Skip if pattern doesn't meet minimum frequency threshold
      if (pattern.accessFrequency < this.config.minAccessFrequency) continue;

      // Check if predicted access falls within warming window
      if (pattern.predictedNextAccess <= warmingWindow) {
        const jobId = `${key}-${pattern.predictedNextAccess.getTime()}`;

        // Don't schedule if already scheduled or running
        if (
          this.activeJobs.has(jobId) ||
          this.jobQueue.some((j) => j.id === jobId)
        ) {
          continue;
        }

        const job: WarmingJob = {
          id: jobId,
          userId: pattern.userId,
          dataType: pattern.dataType,
          scheduledAt: pattern.predictedNextAccess,
          status: "pending",
        };

        // Add to queue based on priority
        if (pattern.priority === "high") {
          this.jobQueue.unshift(job);
        } else {
          this.jobQueue.push(job);
        }
      }
    }

    // Process job queue
    await this.processJobQueue();
  }

  /**
   * Process pending warming jobs
   */
  private async processJobQueue(): Promise<void> {
    const availableSlots = this.config.maxConcurrentJobs - this.activeJobs.size;
    if (availableSlots <= 0) return;

    const jobsToProcess = this.jobQueue
      .filter(
        (job) => job.status === "pending" && job.scheduledAt <= new Date(),
      )
      .slice(0, availableSlots);

    for (const job of jobsToProcess) {
      this.executeWarmingJob(job).catch((error) => {
        console.error(`Cache warming job ${job.id} failed:`, error);
        job.status = "failed";
        job.error = error instanceof Error ? error.message : String(error);
        this.activeJobs.delete(job.id);
      });
    }
  }

  /**
   * Execute individual cache warming job
   */
  private async executeWarmingJob(job: WarmingJob): Promise<void> {
    const startTime = Date.now();
    job.status = "running";
    this.activeJobs.set(job.id, job);

    try {
      switch (job.dataType) {
        case "dashboard":
          await this.warmDashboardData(job.userId);
          break;
        case "estimates":
          await this.warmEstimatesData(job.userId);
          break;
        case "analytics":
          await this.warmAnalyticsData(job.userId);
          break;
        case "facade_analyses":
          await this.warmFacadeAnalysesData(job.userId);
          break;
        default:
          throw new Error(`Unknown data type: ${job.dataType}`);
      }

      job.status = "completed";
      job.executionTime = Date.now() - startTime;

      // Remove from queue
      const queueIndex = this.jobQueue.findIndex((j) => j.id === job.id);
      if (queueIndex !== -1) {
        this.jobQueue.splice(queueIndex, 1);
      }
    } finally {
      this.activeJobs.delete(job.id);
    }
  }

  /**
   * Warm dashboard data
   */
  private async warmDashboardData(userId: string): Promise<void> {
    try {
      // Load dashboard summary with current date range
      await this.queries.loadDashboardSummary(userId);

      // Load dashboard summary with last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      await this.queries.loadDashboardSummary(userId, {
        start: thirtyDaysAgo,
        end: new Date(),
      });

      console.log(`✅ Dashboard data warmed for user ${userId}`);
    } catch (error) {
      console.error(`Failed to warm dashboard data for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Warm estimates data
   */
  private async warmEstimatesData(userId: string): Promise<void> {
    try {
      // Load recent estimates with services
      await this.queries.loadEstimatesWithServices({
        userId,
        limit: 20,
        includeServices: true,
      });

      // Load estimates by common statuses
      const commonStatuses = ["draft", "sent", "approved"];
      for (const status of commonStatuses) {
        await this.queries.loadEstimatesWithServices({
          userId,
          status: [status],
          limit: 10,
        });
      }

      console.log(`✅ Estimates data warmed for user ${userId}`);
    } catch (error) {
      console.error(`Failed to warm estimates data for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Warm analytics data
   */
  private async warmAnalyticsData(userId: string): Promise<void> {
    try {
      // Warm common analytics queries
      const { data: estimates, error } = await this.client
        .from("estimates")
        .select("id, created_at")
        .eq("created_by", userId)
        .gte(
          "created_at",
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        )
        .limit(50);

      if (error) throw error;

      // Cache analytics aggregations
      const cacheKey = `analytics_summary:${userId}:30d`;
      const analyticsData = {
        totalEstimates: estimates?.length || 0,
        recentActivity: estimates?.slice(0, 10) || [],
        timestamp: new Date().toISOString(),
      };

      await this.cache.set(cacheKey, analyticsData, {
        ttl: 300000, // 5 minutes
        tags: ["analytics", `user:${userId}`],
      });

      console.log(`✅ Analytics data warmed for user ${userId}`);
    } catch (error) {
      console.error(`Failed to warm analytics data for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Warm facade analyses data
   */
  private async warmFacadeAnalysesData(userId: string): Promise<void> {
    try {
      // Get recent facade analysis IDs
      const { data: analyses, error } = await this.client
        .from("facade_analyses")
        .select("id")
        .eq("created_by", userId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      if (!analyses || analyses.length === 0) return;

      const analysisIds = analyses.map((a) => a.id);

      // Warm facade analyses with images
      await this.queries.loadFacadeAnalysesWithImages(analysisIds, "hybrid");

      console.log(`✅ Facade analyses data warmed for user ${userId}`);
    } catch (error) {
      console.error(
        `Failed to warm facade analyses data for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Schedule immediate warming for high-priority access
   */
  private scheduleImmediateWarming(
    pattern: CacheWarmingPattern,
    accessDetails?: any,
  ): void {
    const jobId = `immediate-${pattern.userId}-${pattern.dataType}-${Date.now()}`;
    const job: WarmingJob = {
      id: jobId,
      userId: pattern.userId,
      dataType: pattern.dataType,
      scheduledAt: new Date(),
      status: "pending",
    };

    // Add to front of queue for immediate processing
    this.jobQueue.unshift(job);

    // Process immediately if slots available
    if (this.activeJobs.size < this.config.maxConcurrentJobs) {
      this.processJobQueue().catch(console.error);
    }
  }

  /**
   * Predict next access time based on pattern
   */
  private predictNextAccess(pattern: CacheWarmingPattern): Date {
    const averageInterval = 1 / pattern.accessFrequency; // hours between accesses
    const variance = averageInterval * 0.2; // 20% variance

    // Add some randomness to avoid thundering herd
    const jitter = (Math.random() - 0.5) * variance * 2;
    const predictedInterval = Math.max(0.1, averageInterval + jitter); // At least 6 minutes

    return new Date(
      pattern.lastAccessed.getTime() + predictedInterval * 60 * 60 * 1000,
    );
  }

  /**
   * Calculate priority based on access frequency
   */
  private calculatePriority(frequency: number): "high" | "medium" | "low" {
    if (frequency >= this.config.priorityThresholds.high) return "high";
    if (frequency >= this.config.priorityThresholds.medium) return "medium";
    return "low";
  }

  /**
   * Determine preload strategy based on pattern
   */
  private determinePreloadStrategy(
    pattern: CacheWarmingPattern,
  ): "immediate" | "scheduled" | "lazy" {
    if (pattern.priority === "high" && pattern.accessFrequency > 10) {
      return "immediate";
    }
    if (pattern.priority === "high" || pattern.priority === "medium") {
      return "scheduled";
    }
    return "lazy";
  }

  /**
   * Start predictive warming scheduler
   */
  private startPredictiveWarming(): void {
    if (!this.config.enabled) return;

    this.warmingInterval = setInterval(() => {
      this.schedulePredictiveWarming().catch((error) => {
        console.error("Predictive warming scheduler error:", error);
      });
    }, 30000); // Every 30 seconds
  }

  /**
   * Start pattern analysis for optimization
   */
  private startPatternAnalysis(): void {
    this.patternAnalysisInterval = setInterval(() => {
      this.analyzeAndOptimizePatterns();
    }, 300000); // Every 5 minutes
  }

  /**
   * Start cleanup of old patterns and jobs
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldData();
    }, 600000); // Every 10 minutes
  }

  /**
   * Analyze patterns and optimize configuration
   */
  private analyzeAndOptimizePatterns(): void {
    const now = Date.now();

    // Remove stale patterns (no access for 24 hours)
    for (const [key, pattern] of this.accessPatterns.entries()) {
      const hoursSinceLastAccess =
        (now - pattern.lastAccessed.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastAccess > 24) {
        this.accessPatterns.delete(key);
      }
    }

    // Clean up failed jobs
    this.jobQueue = this.jobQueue.filter(
      (job) =>
        job.status !== "failed" || now - job.scheduledAt.getTime() < 60000,
    );

    console.log(
      `📊 Pattern analysis: ${this.accessPatterns.size} active patterns, ${this.jobQueue.length} queued jobs`,
    );
  }

  /**
   * Clean up old data
   */
  private cleanupOldData(): void {
    const cutoff = Date.now() - 86400000; // 24 hours

    // Remove completed jobs older than 24 hours
    this.jobQueue = this.jobQueue.filter(
      (job) => job.status !== "completed" || job.scheduledAt.getTime() > cutoff,
    );

    console.log(`🧹 Cleanup completed: ${this.jobQueue.length} jobs remaining`);
  }

  /**
   * Get warming statistics
   */
  getStatistics() {
    const activePatterns = Array.from(this.accessPatterns.values());
    const priorityCounts = {
      high: activePatterns.filter((p) => p.priority === "high").length,
      medium: activePatterns.filter((p) => p.priority === "medium").length,
      low: activePatterns.filter((p) => p.priority === "low").length,
    };

    const jobStatusCounts = {
      pending: this.jobQueue.filter((j) => j.status === "pending").length,
      running: this.activeJobs.size,
      completed: this.jobQueue.filter((j) => j.status === "completed").length,
      failed: this.jobQueue.filter((j) => j.status === "failed").length,
    };

    return {
      enabled: this.config.enabled,
      patterns: {
        total: activePatterns.length,
        byPriority: priorityCounts,
        avgAccessFrequency:
          activePatterns.length > 0
            ? activePatterns.reduce((sum, p) => sum + p.accessFrequency, 0) /
              activePatterns.length
            : 0,
      },
      jobs: {
        total: this.jobQueue.length + this.activeJobs.size,
        byStatus: jobStatusCounts,
        queueLength: this.jobQueue.length,
      },
      config: this.config,
    };
  }

  /**
   * Configure warming parameters
   */
  configure(newConfig: Partial<PredictiveConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log("🔧 Predictive cache warmer configuration updated:", newConfig);
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.log("🛑 Shutting down predictive cache warmer...");

    [
      this.warmingInterval,
      this.patternAnalysisInterval,
      this.cleanupInterval,
    ].forEach((interval) => {
      if (interval) clearInterval(interval);
    });

    // Wait for active jobs to complete (with timeout)
    const timeout = Date.now() + 30000; // 30 second timeout
    while (this.activeJobs.size > 0 && Date.now() < timeout) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    this.accessPatterns.clear();
    this.jobQueue.length = 0;
    this.activeJobs.clear();

    console.log("✅ Predictive cache warmer shutdown completed");
  }

  private setupProcessHandlers(): void {
    process.once("exit", () => this.shutdown());
    process.once("SIGINT", () => this.shutdown());
    process.once("SIGTERM", () => this.shutdown());
  }
}

// Export singleton instance and convenience functions
export const predictiveCacheWarmer = PredictiveCacheWarmer.getInstance();

export const recordAccess = (
  userId: string,
  dataType: "estimates" | "dashboard" | "analytics" | "facade_analyses",
  accessDetails?: any,
) => predictiveCacheWarmer.recordAccess(userId, dataType, accessDetails);

export const getPredictiveCacheStats = () =>
  predictiveCacheWarmer.getStatistics();

export const configurePredictiveCache = (config: Partial<PredictiveConfig>) =>
  predictiveCacheWarmer.configure(config);

export default PredictiveCacheWarmer;
