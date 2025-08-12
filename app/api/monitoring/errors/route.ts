/**
 * Error Monitoring API Endpoint
 *
 * Receives and processes error reports from the advanced error monitoring system.
 * Provides error analytics, trend analysis, and automated resolution recommendations.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/universal-client";
import { z } from "zod";
import {
  ErrorSeverity,
  ErrorCategory,
  EnhancedError,
} from "@/lib/monitoring/advanced-error-analytics";

// Error reporting schema
const ErrorReportSchema = z.object({
  errors: z.array(
    z.object({
      id: z.string(),
      timestamp: z.number(),
      message: z.string(),
      stack: z.string().optional(),
      category: z.nativeEnum(ErrorCategory),
      severity: z.nativeEnum(ErrorSeverity),
      context: z.object({
        userId: z.string().optional(),
        page: z.string().optional(),
        component: z.string().optional(),
        action: z.string().optional(),
        userAgent: z.string().optional(),
        url: z.string().optional(),
        sessionId: z.string().optional(),
        buildVersion: z.string().optional(),
      }),
      metadata: z.object({
        reproduced: z.boolean().optional(),
        frequency: z.number().optional(),
        affectedUsers: z.number().optional(),
        resolutionStatus: z
          .enum(["open", "investigating", "resolved", "wont_fix"])
          .optional(),
        tags: z.array(z.string()).optional(),
      }),
      performance: z
        .object({
          renderTime: z.number().optional(),
          memoryUsage: z.number().optional(),
          cacheHitRate: z.number().optional(),
          networkLatency: z.number().optional(),
        })
        .optional(),
      recovery: z
        .object({
          attempted: z.boolean().optional(),
          successful: z.boolean().optional(),
          strategy: z.string().optional(),
          retryCount: z.number().optional(),
        })
        .optional(),
    }),
  ),
});

/**
 * POST /api/monitoring/errors
 * Report errors to the monitoring system
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await req.json();

    // Validate request body
    const validation = ErrorReportSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid error report format",
          details: validation.error.errors,
        },
        { status: 400 },
      );
    }

    const { errors } = validation.data;

    // Get user information if authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Process each error
    const processedErrors = await Promise.all(
      errors.map(async (error) => {
        try {
          // Store error in database
          const { data: storedError, error: dbError } = await supabase
            .from("error_logs")
            .insert({
              error_id: error.id,
              message: error.message,
              stack_trace: error.stack,
              category: error.category,
              severity: error.severity,
              user_id: user?.id || error.context.userId,
              page: error.context.page,
              component: error.context.component,
              action: error.context.action,
              user_agent: error.context.userAgent,
              url: error.context.url,
              session_id: error.context.sessionId,
              build_version: error.context.buildVersion,
              frequency: error.metadata.frequency || 1,
              affected_users: error.metadata.affectedUsers || 1,
              resolution_status: error.metadata.resolutionStatus || "open",
              tags: error.metadata.tags || [],
              performance_data: error.performance,
              recovery_data: error.recovery,
              created_at: new Date(error.timestamp).toISOString(),
            })
            .select()
            .single();

          if (dbError) {
            console.error("Failed to store error:", dbError);
            return {
              id: error.id,
              success: false,
              error: "Database storage failed",
            };
          }

          // Generate resolution recommendations
          const recommendations = generateResolutionRecommendations(error);

          // Check for similar errors and update frequency
          await updateErrorFrequency(supabase, error);

          // Trigger alerts for critical errors
          if (error.severity === ErrorSeverity.CRITICAL) {
            await triggerCriticalErrorAlert(supabase, error, user?.id);
          }

          return {
            id: error.id,
            success: true,
            recommendations,
            stored_id: storedError.id,
          };
        } catch (error) {
          console.error("Error processing error report:", error);
          return {
            id: error.id,
            success: false,
            error: "Processing failed",
          };
        }
      }),
    );

    // Generate analytics insights
    const analytics = await generateErrorAnalytics(supabase, errors, user?.id);

    return NextResponse.json({
      success: true,
      processed_count: processedErrors.filter((e) => e.success).length,
      failed_count: processedErrors.filter((e) => !e.success).length,
      results: processedErrors,
      analytics,
    });
  } catch (error) {
    console.error("Error monitoring API error:", error);
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
 * GET /api/monitoring/errors
 * Retrieve error analytics and reports
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);

    // Get user information
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameters
    const timeRange = searchParams.get("timeRange") || "24h";
    const category = searchParams.get("category");
    const severity = searchParams.get("severity");
    const limit = parseInt(searchParams.get("limit") || "50");
    const includeResolved = searchParams.get("includeResolved") === "true";

    // Calculate time range
    const timeRangeMs = getTimeRangeMs(timeRange);
    const cutoffTime = new Date(Date.now() - timeRangeMs).toISOString();

    // Build query
    let query = supabase
      .from("error_logs")
      .select("*")
      .gte("created_at", cutoffTime)
      .order("created_at", { ascending: false })
      .limit(limit);

    // Apply filters
    if (category) {
      query = query.eq("category", category);
    }
    if (severity) {
      query = query.eq("severity", severity);
    }
    if (!includeResolved) {
      query = query.neq("resolution_status", "resolved");
    }

    // Execute query
    const { data: errors, error: queryError } = await query;

    if (queryError) {
      throw queryError;
    }

    // Generate analytics
    const analytics = await generateErrorAnalytics(
      supabase,
      errors || [],
      user.id,
    );

    // Get error trends
    const trends = await getErrorTrends(supabase, timeRange, user.id);

    return NextResponse.json({
      success: true,
      errors: errors || [],
      analytics,
      trends,
      timeRange,
      filters: {
        category,
        severity,
        includeResolved,
      },
    });
  } catch (error) {
    console.error("Error analytics API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve error analytics",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * Generate resolution recommendations for an error
 */
function generateResolutionRecommendations(error: EnhancedError): string[] {
  const recommendations: string[] = [];

  // Category-specific recommendations
  switch (error.category) {
    case ErrorCategory.CACHE:
      recommendations.push("Clear application cache and reload");
      recommendations.push("Check cache configuration and TTL settings");
      if (error.message.includes("memory")) {
        recommendations.push("Reduce cache size or enable automatic cleanup");
      }
      break;

    case ErrorCategory.NETWORK:
      recommendations.push("Check internet connection");
      recommendations.push("Retry the operation");
      if (error.message.includes("timeout")) {
        recommendations.push("Increase request timeout settings");
      }
      break;

    case ErrorCategory.DATABASE:
      recommendations.push("Check database connection");
      recommendations.push("Verify data integrity");
      if (error.message.includes("constraint")) {
        recommendations.push("Review data validation rules");
      }
      break;

    case ErrorCategory.AUTHENTICATION:
      recommendations.push("Re-authenticate the user");
      recommendations.push("Check token expiration");
      recommendations.push("Verify user permissions");
      break;

    case ErrorCategory.AI_SERVICE:
      recommendations.push("Check AI service status");
      recommendations.push("Validate input data format");
      recommendations.push("Review API rate limits");
      break;

    case ErrorCategory.PERFORMANCE:
      recommendations.push("Optimize resource usage");
      recommendations.push("Enable caching for frequently accessed data");
      recommendations.push("Consider lazy loading for heavy components");
      break;

    default:
      recommendations.push("Review error logs for more details");
      recommendations.push("Contact support if the issue persists");
  }

  // Severity-specific recommendations
  if (error.severity === ErrorSeverity.CRITICAL) {
    recommendations.unshift(
      "Immediate attention required - escalate to development team",
    );
  }

  // Frequency-based recommendations
  if (error.metadata.frequency && error.metadata.frequency > 5) {
    recommendations.push(
      "This is a recurring issue - consider implementing a permanent fix",
    );
  }

  return recommendations;
}

/**
 * Update error frequency for similar errors
 */
async function updateErrorFrequency(supabase: any, error: EnhancedError) {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data: similarErrors, error: queryError } = await supabase
    .from("error_logs")
    .select("id, frequency")
    .eq("message", error.message)
    .eq("category", error.category)
    .gte("created_at", fiveMinutesAgo);

  if (!queryError && similarErrors && similarErrors.length > 0) {
    // Update frequency of the most recent similar error
    const latestError = similarErrors[0];
    await supabase
      .from("error_logs")
      .update({
        frequency: (latestError.frequency || 1) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", latestError.id);
  }
}

/**
 * Trigger critical error alert
 */
async function triggerCriticalErrorAlert(
  supabase: any,
  error: EnhancedError,
  userId?: string,
) {
  console.error("🚨 CRITICAL ERROR ALERT:", {
    id: error.id,
    message: error.message,
    category: error.category,
    userId,
  });

  // Store alert record
  await supabase.from("error_alerts").insert({
    error_id: error.id,
    user_id: userId,
    alert_type: "critical_error",
    message: error.message,
    category: error.category,
    severity: error.severity,
    created_at: new Date().toISOString(),
  });

  // Could integrate with external alerting systems (Slack, email, etc.)
  // await sendSlackAlert(error);
  // await sendEmailAlert(error, userId);
}

/**
 * Generate error analytics
 */
async function generateErrorAnalytics(
  supabase: any,
  errors: any[],
  userId?: string,
) {
  if (errors.length === 0) {
    return {
      totalErrors: 0,
      errorsByCategory: {},
      errorsBySeverity: {},
      topErrors: [],
      resolutionRate: 0,
      averageResolutionTime: 0,
    };
  }

  // Group by category
  const errorsByCategory = errors.reduce((acc, error) => {
    acc[error.category] = (acc[error.category] || 0) + 1;
    return acc;
  }, {});

  // Group by severity
  const errorsBySeverity = errors.reduce((acc, error) => {
    acc[error.severity] = (acc[error.severity] || 0) + 1;
    return acc;
  }, {});

  // Top errors by frequency
  const errorCounts = errors.reduce((acc, error) => {
    const key = `${error.message}_${error.category}`;
    if (!acc[key]) {
      acc[key] = { count: 0, error };
    }
    acc[key].count += error.frequency || 1;
    return acc;
  }, {});

  const topErrors = Object.values(errorCounts)
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 10)
    .map((item: any) => ({
      message: item.error.message,
      count: item.count,
      category: item.error.category,
      severity: item.error.severity,
    }));

  // Calculate resolution metrics
  const resolvedErrors = errors.filter(
    (e) => e.resolution_status === "resolved",
  );
  const resolutionRate = (resolvedErrors.length / errors.length) * 100;

  return {
    totalErrors: errors.length,
    errorsByCategory,
    errorsBySeverity,
    topErrors,
    resolutionRate: Math.round(resolutionRate),
    averageResolutionTime: 0, // Would calculate from actual resolution times
  };
}

/**
 * Get error trends over time
 */
async function getErrorTrends(
  supabase: any,
  timeRange: string,
  userId: string,
) {
  const timeRangeMs = getTimeRangeMs(timeRange);
  const cutoffTime = new Date(Date.now() - timeRangeMs).toISOString();

  const { data: trendData, error } = await supabase
    .from("error_logs")
    .select("created_at, category, severity")
    .gte("created_at", cutoffTime)
    .order("created_at", { ascending: true });

  if (error || !trendData) {
    return { hourly: [], daily: [], categories: [] };
  }

  // Group by hour for recent trends
  const hourlyTrends = new Array(24).fill(0);
  const now = Date.now();

  trendData.forEach((error) => {
    const errorTime = new Date(error.created_at).getTime();
    const hoursAgo = Math.floor((now - errorTime) / (60 * 60 * 1000));
    if (hoursAgo < 24) {
      hourlyTrends[23 - hoursAgo]++;
    }
  });

  return {
    hourly: hourlyTrends,
    daily: [], // Could implement daily trends
    categories: Object.keys(
      trendData.reduce((acc, error) => {
        acc[error.category] = true;
        return acc;
      }, {}),
    ),
  };
}

/**
 * Convert time range string to milliseconds
 */
function getTimeRangeMs(timeRange: string): number {
  switch (timeRange) {
    case "1h":
      return 60 * 60 * 1000;
    case "6h":
      return 6 * 60 * 60 * 1000;
    case "24h":
      return 24 * 60 * 60 * 1000;
    case "7d":
      return 7 * 24 * 60 * 60 * 1000;
    case "30d":
      return 30 * 24 * 60 * 60 * 1000;
    default:
      return 24 * 60 * 60 * 1000; // Default to 24 hours
  }
}
