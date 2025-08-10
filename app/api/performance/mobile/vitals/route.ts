/**
 * Mobile Performance Vitals API Route
 *
 * Handles collection and analysis of mobile performance metrics,
 * Core Web Vitals data, and device capability information.
 *
 * Features:
 * - Core Web Vitals data collection
 * - Device performance profiling
 * - Performance trend analysis
 * - Optimization recommendations
 * - Real-time metrics aggregation
 *
 * Part of Phase 4 Priority 3: Mobile Performance & Core Web Vitals
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Validation schemas
const MobilePerformanceMetricSchema = z.object({
  name: z.enum(["LCP", "INP", "CLS", "FCP", "TTFB"]),
  value: z.number().min(0),
  rating: z.enum(["good", "needs-improvement", "poor"]),
  timestamp: z.number(),
  url: z.string().url(),
  deviceInfo: z.object({
    userAgent: z.string(),
    deviceType: z.enum(["mobile", "tablet", "desktop"]),
    screenWidth: z.number(),
    screenHeight: z.number(),
    devicePixelRatio: z.number(),
  }),
  connectionInfo: z
    .object({
      effectiveType: z.enum(["slow-2g", "2g", "3g", "4g", "5g"]).optional(),
      downlink: z.number().optional(),
      rtt: z.number().optional(),
      saveData: z.boolean().optional(),
    })
    .optional(),
  performanceProfile: z
    .object({
      deviceTier: z.enum(["low-end", "mid-range", "high-end"]),
      memoryPressure: z.enum(["low", "medium", "high"]),
      batteryLevel: z.enum(["critical", "low", "medium", "high"]),
      thermalState: z.enum(["nominal", "fair", "serious", "critical"]),
    })
    .optional(),
});

const BatchVitalsSchema = z.object({
  metrics: z.array(MobilePerformanceMetricSchema),
  sessionId: z.string().uuid().optional(),
  userId: z.string().optional(),
});

/**
 * POST /api/performance/mobile/vitals
 *
 * Collect mobile performance metrics and Core Web Vitals data
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = BatchVitalsSchema.parse(body);

    // Process performance metrics
    const processedMetrics = validatedData.metrics.map((metric) => ({
      ...metric,
      processed_at: new Date().toISOString(),
      // Add performance score calculation
      performance_score: calculatePerformanceScore(metric),
      // Add optimization suggestions
      optimization_suggestions: getOptimizationSuggestions(metric),
    }));

    // Calculate aggregated insights
    const insights = generatePerformanceInsights(processedMetrics);

    // In a real implementation, you would save to database here
    // await savePerformanceMetrics(processedMetrics);

    return NextResponse.json({
      success: true,
      processed_count: processedMetrics.length,
      performance_insights: insights,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to process mobile vitals:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/performance/mobile/vitals
 *
 * Retrieve mobile performance analytics and trends
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get("timeframe") || "24h";
    const deviceTier = searchParams.get("deviceTier");

    // Mock performance data - in real implementation, fetch from database
    const mockData = generateMockPerformanceData(timeframe, deviceTier);

    return NextResponse.json({
      success: true,
      data: mockData,
      timeframe,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to fetch mobile vitals:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve performance data",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * Calculate performance score based on metric value and type
 */
function calculatePerformanceScore(
  metric: z.infer<typeof MobilePerformanceMetricSchema>,
): number {
  const thresholds = {
    LCP: { good: 2500, poor: 4000 },
    INP: { good: 100, poor: 300 },
    CLS: { good: 0.1, poor: 0.25 },
    FCP: { good: 1800, poor: 3000 },
    TTFB: { good: 600, poor: 1200 },
  };

  const threshold = thresholds[metric.name];
  if (!threshold) return 50;

  if (metric.value <= threshold.good) {
    return 100;
  } else if (metric.value <= threshold.poor) {
    // Linear interpolation between good and poor
    const range = threshold.poor - threshold.good;
    const position = metric.value - threshold.good;
    return Math.max(0, 75 - (position / range) * 25);
  } else {
    // Poor performance - scale down from 50
    const excessRatio = (metric.value - threshold.poor) / threshold.poor;
    return Math.max(0, 50 - Math.min(40, excessRatio * 25));
  }
}

/**
 * Generate optimization suggestions based on metric performance
 */
function getOptimizationSuggestions(
  metric: z.infer<typeof MobilePerformanceMetricSchema>,
): string[] {
  const suggestions: string[] = [];

  switch (metric.name) {
    case "LCP":
      if (metric.value > 4000) {
        suggestions.push("Optimize largest content element loading");
        suggestions.push("Consider image compression and WebP format");
        suggestions.push("Implement critical CSS to reduce render blocking");
      } else if (metric.value > 2500) {
        suggestions.push("Review image optimization opportunities");
        suggestions.push("Consider lazy loading for non-critical resources");
      }
      break;

    case "INP":
      if (metric.value > 300) {
        suggestions.push("Reduce JavaScript execution time");
        suggestions.push("Break up long tasks using time slicing");
        suggestions.push("Consider code splitting for large bundles");
      } else if (metric.value > 100) {
        suggestions.push("Optimize event handler performance");
        suggestions.push("Review third-party script impact");
      }
      break;

    case "CLS":
      if (metric.value > 0.25) {
        suggestions.push("Add size attributes to images and videos");
        suggestions.push("Reserve space for dynamically inserted content");
        suggestions.push("Avoid inserting content above existing content");
      } else if (metric.value > 0.1) {
        suggestions.push("Review font loading strategies");
        suggestions.push("Optimize ad and widget placement");
      }
      break;

    case "FCP":
      if (metric.value > 3000) {
        suggestions.push("Optimize critical rendering path");
        suggestions.push("Reduce server response time");
        suggestions.push("Minimize render-blocking resources");
      }
      break;

    case "TTFB":
      if (metric.value > 1200) {
        suggestions.push("Optimize server processing time");
        suggestions.push("Consider CDN implementation");
        suggestions.push("Review database query performance");
      }
      break;
  }

  // Add device-specific suggestions
  if (metric.performanceProfile) {
    if (metric.performanceProfile.deviceTier === "low-end") {
      suggestions.push("Enable aggressive optimization for low-end devices");
      suggestions.push("Reduce image quality for better performance");
    }

    if (
      metric.performanceProfile.batteryLevel === "critical" ||
      metric.performanceProfile.batteryLevel === "low"
    ) {
      suggestions.push("Enable battery saver mode optimizations");
      suggestions.push("Reduce animations and background processing");
    }
  }

  return suggestions;
}

/**
 * Generate performance insights from collected metrics
 */
function generatePerformanceInsights(metrics: any[]): object {
  if (metrics.length === 0) return {};

  const metricsByType = metrics.reduce(
    (acc, metric) => {
      if (!acc[metric.name]) acc[metric.name] = [];
      acc[metric.name].push(metric);
      return acc;
    },
    {} as Record<string, any[]>,
  );

  const insights = {
    total_metrics: metrics.length,
    average_scores: {} as Record<string, number>,
    performance_distribution: {} as Record<
      string,
      { good: number; needs_improvement: number; poor: number }
    >,
    device_insights: generateDeviceInsights(metrics),
    recommendations: generateGlobalRecommendations(metrics),
  };

  // Calculate averages and distributions
  Object.entries(metricsByType).forEach(([metricName, metricList]) => {
    const scores = metricList.map((m) => m.performance_score || 0);
    insights.average_scores[metricName] =
      scores.reduce((a, b) => a + b, 0) / scores.length;

    const distribution = metricList.reduce(
      (acc, metric) => {
        acc[metric.rating] = (acc[metric.rating] || 0) + 1;
        return acc;
      },
      { good: 0, "needs-improvement": 0, poor: 0 },
    );

    insights.performance_distribution[metricName] = distribution;
  });

  return insights;
}

/**
 * Generate device-specific insights
 */
function generateDeviceInsights(metrics: any[]): object {
  const deviceMetrics = metrics.filter((m) => m.performanceProfile);

  if (deviceMetrics.length === 0) return {};

  const deviceTierCounts = deviceMetrics.reduce(
    (acc, metric) => {
      const tier = metric.performanceProfile.deviceTier;
      acc[tier] = (acc[tier] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const batteryIssues = deviceMetrics.filter(
    (m) =>
      m.performanceProfile.batteryLevel === "critical" ||
      m.performanceProfile.batteryLevel === "low",
  ).length;

  return {
    device_tier_distribution: deviceTierCounts,
    low_battery_percentage: (batteryIssues / deviceMetrics.length) * 100,
    memory_pressure_issues: deviceMetrics.filter(
      (m) => m.performanceProfile.memoryPressure === "high",
    ).length,
  };
}

/**
 * Generate global performance recommendations
 */
function generateGlobalRecommendations(metrics: any[]): string[] {
  const recommendations = new Set<string>();

  // Analyze common performance issues
  const poorLCP = metrics.filter(
    (m) => m.name === "LCP" && m.rating === "poor",
  ).length;
  const poorINP = metrics.filter(
    (m) => m.name === "INP" && m.rating === "poor",
  ).length;
  const poorCLS = metrics.filter(
    (m) => m.name === "CLS" && m.rating === "poor",
  ).length;

  const totalLCP = metrics.filter((m) => m.name === "LCP").length;
  const totalINP = metrics.filter((m) => m.name === "INP").length;
  const totalCLS = metrics.filter((m) => m.name === "CLS").length;

  if (poorLCP / totalLCP > 0.3) {
    recommendations.add(
      "Priority: Optimize Largest Contentful Paint performance",
    );
  }

  if (poorINP / totalINP > 0.2) {
    recommendations.add("Priority: Reduce JavaScript execution blocking");
  }

  if (poorCLS / totalCLS > 0.2) {
    recommendations.add("Priority: Improve layout stability");
  }

  return Array.from(recommendations);
}

/**
 * Generate mock performance data for development/testing
 */
function generateMockPerformanceData(
  timeframe: string,
  deviceTier?: string | null,
) {
  const now = Date.now();
  const hours = timeframe === "1h" ? 1 : timeframe === "24h" ? 24 : 168; // 1h, 24h, or 7d

  const data = [];
  const intervals = Math.min(50, hours); // Max 50 data points

  for (let i = 0; i < intervals; i++) {
    const timestamp = now - (hours - i) * 60 * 60 * 1000;

    data.push({
      timestamp,
      metrics: {
        LCP: 2000 + Math.random() * 2000,
        INP: 50 + Math.random() * 150,
        CLS: Math.random() * 0.3,
        FCP: 1200 + Math.random() * 1000,
        TTFB: 300 + Math.random() * 600,
      },
      device_tier:
        deviceTier ||
        ["low-end", "mid-range", "high-end"][Math.floor(Math.random() * 3)],
      performance_score: 60 + Math.random() * 40,
    });
  }

  return {
    timeline: data,
    summary: {
      total_sessions: data.length,
      average_lcp:
        data.reduce((sum, d) => sum + d.metrics.LCP, 0) / data.length,
      average_fid:
        data.reduce((sum, d) => sum + d.metrics.INP, 0) / data.length,
      average_cls:
        data.reduce((sum, d) => sum + d.metrics.CLS, 0) / data.length,
      average_score:
        data.reduce((sum, d) => sum + d.performance_score, 0) / data.length,
    },
  };
}
