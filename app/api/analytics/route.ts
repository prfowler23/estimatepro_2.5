import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/server";
import { AnalyticsService } from "@/lib/analytics/data";

export async function GET(request: NextRequest) {
  try {
    // Authenticate the request
    const { user, error: authError } = await authenticateRequest(request);
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const metrics = searchParams.get("metrics")?.split(",");

    // Fetch analytics data
    const analyticsData = await AnalyticsService.getFullAnalyticsData();

    // Filter data based on parameters if provided
    let filteredData = analyticsData;

    if (metrics) {
      // Return only requested metrics
      const allowedMetrics = [
        "overview",
        "revenue",
        "services",
        "customers",
        "conversion",
        "locations",
      ];
      const requestedMetrics = metrics.filter((metric) =>
        allowedMetrics.includes(metric),
      );

      filteredData = Object.fromEntries(
        Object.entries(analyticsData).filter(([key]) =>
          requestedMetrics.includes(key),
        ),
      ) as typeof analyticsData;
    }

    return NextResponse.json({
      success: true,
      data: filteredData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 },
    );
  }
}
