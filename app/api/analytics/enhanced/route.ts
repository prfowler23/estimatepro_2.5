// Enhanced Analytics API
// Provides sophisticated data analysis and business intelligence

import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/server";
import { enhancedAnalyticsService } from "@/lib/analytics/enhanced-analytics-service";
import { withAuditLogging } from "@/lib/audit/audit-middleware";
import { withAutoRateLimit } from "@/lib/middleware/rate-limit-middleware";
import { z } from "zod";

// Request validation schema
const AnalyticsRequestSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  metrics: z
    .array(
      z.enum([
        "business_metrics",
        "financial_analysis",
        "operational_insights",
        "predictive_analytics",
        "benchmarking_data",
        "risk_analysis",
        "recommendations",
      ]),
    )
    .optional(),
  includeRecommendations: z.boolean().default(true),
  includePredictive: z.boolean().default(false),
  detailLevel: z
    .enum(["summary", "detailed", "comprehensive"])
    .default("detailed"),
});

async function handleGET(request: NextRequest) {
  try {
    // Authenticate the request
    const { user, error: authError } = await authenticateRequest(request);
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const requestData = {
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      metrics: searchParams.get("metrics")?.split(",") || undefined,
      includeRecommendations:
        searchParams.get("includeRecommendations") !== "false",
      includePredictive: searchParams.get("includePredictive") === "true",
      detailLevel: searchParams.get("detailLevel") || "detailed",
    };

    // Validate request parameters
    const validationResult = AnalyticsRequestSchema.safeParse(requestData);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request parameters",
          details: validationResult.error.errors,
        },
        { status: 400 },
      );
    }

    const {
      startDate,
      endDate,
      metrics,
      includeRecommendations,
      includePredictive,
      detailLevel,
    } = validationResult.data;

    // Convert string dates to Date objects
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    // Build response data based on requested metrics
    const responseData: any = {
      metadata: {
        generated_at: new Date().toISOString(),
        period: {
          start: start?.toISOString(),
          end: end?.toISOString(),
        },
        detail_level: detailLevel,
        user_id: user.id,
      },
    };

    // Always include basic business metrics for context
    responseData.business_metrics =
      await enhancedAnalyticsService.getBusinessMetrics(start, end);

    // Include requested metrics or all if none specified
    const requestedMetrics = metrics || [
      "financial_analysis",
      "recommendations",
    ];

    if (requestedMetrics.includes("financial_analysis")) {
      responseData.financial_analysis =
        await enhancedAnalyticsService.getFinancialAnalysis(start, end);
    }

    if (
      requestedMetrics.includes("predictive_analytics") ||
      includePredictive
    ) {
      responseData.predictive_analytics =
        await enhancedAnalyticsService.getPredictiveAnalytics();
    }

    if (
      requestedMetrics.includes("recommendations") ||
      includeRecommendations
    ) {
      responseData.recommendations =
        await enhancedAnalyticsService.generateRecommendations();
    }

    // Add insights based on the data
    responseData.insights = generateInsights(responseData);

    // Add performance scores
    responseData.performance_scores = calculatePerformanceScores(
      responseData.business_metrics,
    );

    // Add data quality indicators
    responseData.data_quality = assessDataQuality(responseData);

    return NextResponse.json({
      success: true,
      data: responseData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Enhanced analytics error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate enhanced analytics",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

async function handlePOST(request: NextRequest) {
  try {
    // Authenticate the request
    const { user, error: authError } = await authenticateRequest(request);
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, parameters } = body;

    switch (action) {
      case "generate_report":
        return await generateCustomReport(parameters, user.id);

      case "export_data":
        return await exportAnalyticsData(parameters, user.id);

      case "benchmark_analysis":
        return await performBenchmarkAnalysis(parameters, user.id);

      case "trend_analysis":
        return await performTrendAnalysis(parameters, user.id);

      default:
        return NextResponse.json(
          { error: "Invalid action parameter" },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("Enhanced analytics POST error:", error);
    return NextResponse.json(
      { error: "Failed to process analytics request" },
      { status: 500 },
    );
  }
}

// Helper functions
function generateInsights(data: any): any[] {
  const insights = [];

  if (data.business_metrics) {
    const metrics = data.business_metrics;

    // Revenue insights
    if (metrics.revenueGrowthRate > 0.2) {
      insights.push({
        type: "positive",
        category: "revenue",
        title: "Strong Revenue Growth",
        description: `Revenue is growing at ${(metrics.revenueGrowthRate * 100).toFixed(1)}% annually, significantly above industry average.`,
        impact: "high",
        confidence: 0.9,
        actions: [
          "Continue current growth strategies",
          "Consider scaling operations",
          "Explore new market opportunities",
        ],
      });
    } else if (metrics.revenueGrowthRate < 0) {
      insights.push({
        type: "warning",
        category: "revenue",
        title: "Revenue Decline",
        description: `Revenue is declining at ${Math.abs(metrics.revenueGrowthRate * 100).toFixed(1)}% annually. Immediate action required.`,
        impact: "high",
        confidence: 0.85,
        actions: [
          "Analyze root causes of decline",
          "Review pricing strategy",
          "Enhance customer retention programs",
          "Improve sales processes",
        ],
      });
    }

    // Win rate insights
    if (metrics.winRate < 0.25) {
      insights.push({
        type: "opportunity",
        category: "sales",
        title: "Low Win Rate",
        description: `Win rate of ${(metrics.winRate * 100).toFixed(1)}% is below optimal. Focus on proposal quality and competitive positioning.`,
        impact: "high",
        confidence: 0.8,
        actions: [
          "Improve proposal templates",
          "Conduct competitive analysis",
          "Provide sales training",
          "Enhance value proposition",
        ],
      });
    }

    // Efficiency insights
    if (metrics.salesCycleLength > 60) {
      insights.push({
        type: "opportunity",
        category: "efficiency",
        title: "Long Sales Cycle",
        description: `Average sales cycle of ${metrics.salesCycleLength.toFixed(0)} days is longer than optimal.`,
        impact: "medium",
        confidence: 0.75,
        actions: [
          "Streamline proposal process",
          "Improve lead qualification",
          "Enhance follow-up procedures",
          "Automate routine tasks",
        ],
      });
    }

    // Profitability insights
    if (metrics.profitMargin < 0.2) {
      insights.push({
        type: "warning",
        category: "profitability",
        title: "Low Profit Margin",
        description: `Profit margin of ${(metrics.profitMargin * 100).toFixed(1)}% is below industry standards.`,
        impact: "high",
        confidence: 0.8,
        actions: [
          "Review cost structure",
          "Optimize pricing strategy",
          "Improve operational efficiency",
          "Reduce unnecessary expenses",
        ],
      });
    }
  }

  return insights;
}

function calculatePerformanceScores(businessMetrics: any): any {
  const scores = {
    overall: 0,
    revenue: 0,
    efficiency: 0,
    profitability: 0,
    growth: 0,
  };

  if (!businessMetrics) {
    return scores;
  }

  // Revenue score (0-100)
  scores.revenue = Math.min(
    100,
    Math.max(
      0,
      (businessMetrics.totalRevenue / 1000000) * 50 + // Revenue scale
        businessMetrics.revenueGrowthRate * 100 * 2, // Growth impact
    ),
  );

  // Efficiency score (0-100)
  scores.efficiency = Math.min(
    100,
    Math.max(
      0,
      businessMetrics.winRate * 100 * 0.5 + // Win rate
        (Math.max(0, 90 - businessMetrics.salesCycleLength) / 90) * 50, // Cycle length (inverse)
    ),
  );

  // Profitability score (0-100)
  scores.profitability = Math.min(
    100,
    Math.max(
      0,
      businessMetrics.profitMargin * 100 * 2 + // Profit margin
        Math.max(0, 1 - businessMetrics.operatingRatio) * 100 * 0.5, // Operating efficiency
    ),
  );

  // Growth score (0-100)
  scores.growth = Math.min(
    100,
    Math.max(
      0,
      businessMetrics.revenueGrowthRate * 100 * 3 + // Revenue growth
        businessMetrics.dealSizeGrowthRate * 100 * 2 + // Deal size growth
        50, // Base score
    ),
  );

  // Overall score (weighted average)
  scores.overall =
    scores.revenue * 0.3 +
    scores.efficiency * 0.25 +
    scores.profitability * 0.25 +
    scores.growth * 0.2;

  // Round all scores
  Object.keys(scores).forEach((key) => {
    scores[key as keyof typeof scores] = Math.round(
      scores[key as keyof typeof scores],
    );
  });

  return scores;
}

function assessDataQuality(data: any): any {
  const quality = {
    completeness: 0,
    accuracy: 0,
    timeliness: 0,
    consistency: 0,
    overall: 0,
    issues: [] as string[],
  };

  let totalChecks = 0;
  let passedChecks = 0;

  // Check data completeness
  if (data.business_metrics) {
    totalChecks += 5;
    if (data.business_metrics.totalRevenue > 0) passedChecks++;
    if (data.business_metrics.winRate >= 0) passedChecks++;
    if (data.business_metrics.averageDealSize > 0) passedChecks++;
    if (data.business_metrics.salesCycleLength > 0) passedChecks++;
    if (data.business_metrics.revenueGrowthRate !== undefined) passedChecks++;
  }

  // Check for data issues
  if (data.business_metrics?.winRate > 1) {
    quality.issues.push("Win rate exceeds 100% - data validation needed");
  }

  if (data.business_metrics?.salesCycleLength > 365) {
    quality.issues.push(
      "Sales cycle length exceeds 1 year - review data accuracy",
    );
  }

  if (data.business_metrics?.revenueGrowthRate < -0.5) {
    quality.issues.push("Revenue decline exceeds 50% - verify data accuracy");
  }

  // Calculate quality scores
  quality.completeness =
    totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;
  quality.accuracy =
    quality.issues.length === 0
      ? 100
      : Math.max(0, 100 - quality.issues.length * 20);
  quality.timeliness = 90; // Assume 90% for real-time data
  quality.consistency = 85; // Assume 85% for cross-system consistency

  quality.overall = Math.round(
    quality.completeness * 0.3 +
      quality.accuracy * 0.3 +
      quality.timeliness * 0.2 +
      quality.consistency * 0.2,
  );

  return quality;
}

async function generateCustomReport(
  parameters: any,
  userId: string,
): Promise<NextResponse> {
  try {
    // Implementation for custom report generation
    return NextResponse.json({
      success: true,
      message: "Custom report generation not yet implemented",
      report_id: `report_${Date.now()}`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to generate custom report" },
      { status: 500 },
    );
  }
}

async function exportAnalyticsData(
  parameters: any,
  userId: string,
): Promise<NextResponse> {
  try {
    // Implementation for data export
    return NextResponse.json({
      success: true,
      message: "Data export not yet implemented",
      export_id: `export_${Date.now()}`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to export analytics data" },
      { status: 500 },
    );
  }
}

async function performBenchmarkAnalysis(
  parameters: any,
  userId: string,
): Promise<NextResponse> {
  try {
    // Implementation for benchmark analysis
    return NextResponse.json({
      success: true,
      message: "Benchmark analysis not yet implemented",
      analysis_id: `benchmark_${Date.now()}`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to perform benchmark analysis" },
      { status: 500 },
    );
  }
}

async function performTrendAnalysis(
  parameters: any,
  userId: string,
): Promise<NextResponse> {
  try {
    // Implementation for trend analysis
    return NextResponse.json({
      success: true,
      message: "Trend analysis not yet implemented",
      analysis_id: `trend_${Date.now()}`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to perform trend analysis" },
      { status: 500 },
    );
  }
}

// Export wrapped handlers with audit logging and rate limiting
export const GET = withAuditLogging(withAutoRateLimit(handleGET), {
  logLevel: "all",
  sensitiveRoutes: ["/api/analytics/enhanced"],
});

export const POST = withAuditLogging(withAutoRateLimit(handlePOST), {
  logLevel: "all",
  sensitiveRoutes: ["/api/analytics/enhanced"],
});
