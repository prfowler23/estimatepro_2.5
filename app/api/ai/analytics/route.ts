import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/utils/logger";
import { getUser } from "@/lib/auth/server";
import { aiAnalytics } from "@/lib/ai/analytics/ai-analytics-service";
import { z } from "zod";
import { ErrorResponses, logApiError } from "@/lib/api/error-responses";

// Query parameter schemas
const analyticsQuerySchema = z.object({
  type: z.enum(["summary", "user", "dashboard", "export"]).default("summary"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  userId: z.string().optional(),
  format: z.enum(["json", "csv"]).default("json"),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 50)),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return ErrorResponses.unauthorized();
    }

    // Parse query parameters
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const params = analyticsQuerySchema.parse(searchParams);

    // Default date range (last 30 days)
    const endDate = params.endDate ? new Date(params.endDate) : new Date();
    const startDate = params.startDate
      ? new Date(params.startDate)
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    switch (params.type) {
      case "summary": {
        const summary = await aiAnalytics.getAnalyticsSummary(
          startDate,
          endDate,
          params.page,
          params.limit,
        );
        return NextResponse.json(summary);
      }

      case "user": {
        // Only allow users to see their own analytics or admins to see any
        const targetUserId = params.userId || user.id;
        const isAdmin = user.user_metadata?.role === "admin";

        // Non-admin users can only see their own analytics
        if (targetUserId !== user.id && !isAdmin) {
          return ErrorResponses.forbidden();
        }

        const userAnalytics = await aiAnalytics.getUserAnalytics(targetUserId);
        return NextResponse.json(userAnalytics);
      }

      case "dashboard": {
        const dashboardMetrics = await aiAnalytics.getDashboardData();
        return NextResponse.json(dashboardMetrics);
      }

      case "export": {
        const exportData = await aiAnalytics.exportAnalytics(
          startDate,
          endDate,
          params.format,
        );

        const headers: HeadersInit = {
          "Content-Disposition": `attachment; filename=ai-analytics-${startDate.toISOString().split("T")[0]}-to-${endDate.toISOString().split("T")[0]}.${params.format}`,
        };

        if (params.format === "csv") {
          headers["Content-Type"] = "text/csv";
        } else {
          headers["Content-Type"] = "application/json";
        }

        return new Response(exportData, { headers });
      }

      default:
        return ErrorResponses.badRequest("Invalid analytics type");
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ErrorResponses.validationError(error);
    }

    logApiError(error, {
      endpoint: "/api/ai/analytics",
      method: "GET",
    });
    return ErrorResponses.internalError();
  }
}

// Admin endpoint to cleanup old analytics
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return ErrorResponses.unauthorized();
    }

    // Check if user is admin
    const isAdmin = user.user_metadata?.role === "admin";
    if (!isAdmin) {
      return ErrorResponses.forbidden();
    }

    const { daysToKeep = 90 } = await request.json();

    const deletedCount = await aiAnalytics.cleanupOldAnalytics(daysToKeep);

    return NextResponse.json({
      success: true,
      deletedCount,
      message: `Deleted ${deletedCount} analytics events older than ${daysToKeep} days`,
    });
  } catch (error) {
    logApiError(error, {
      endpoint: "/api/ai/analytics",
      method: "DELETE",
      userId: user.id,
    });
    return ErrorResponses.internalError();
  }
}
