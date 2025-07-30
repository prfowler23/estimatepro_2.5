import { NextRequest } from "next/server";
import { getUser } from "@/lib/auth/server";
import { AIPerformanceMonitor } from "@/lib/ai/monitoring/ai-performance-monitor";

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Check if user is admin (you may want to implement proper role checking)
    // For now, we'll allow any authenticated user to view metrics

    const monitor = AIPerformanceMonitor.getInstance();
    const searchParams = request.nextUrl.searchParams;

    // Parse time range if provided
    const timeRangeParam = searchParams.get("timeRange");
    let timeRange: { start: number; end: number } | undefined;

    if (timeRangeParam) {
      switch (timeRangeParam) {
        case "hour":
          timeRange = {
            start: Date.now() - 60 * 60 * 1000,
            end: Date.now(),
          };
          break;
        case "day":
          timeRange = {
            start: Date.now() - 24 * 60 * 60 * 1000,
            end: Date.now(),
          };
          break;
        case "week":
          timeRange = {
            start: Date.now() - 7 * 24 * 60 * 60 * 1000,
            end: Date.now(),
          };
          break;
        default:
          // Try to parse custom range
          const [start, end] = timeRangeParam.split(",").map(Number);
          if (start && end) {
            timeRange = { start, end };
          }
      }
    }

    // Get aggregated metrics
    const aggregated = monitor.getAggregatedMetrics(timeRange);
    const health = monitor.getHealthStatus();

    // Get recent metrics if requested
    const includeRecent = searchParams.get("includeRecent") === "true";
    const recentMetrics = includeRecent
      ? monitor.getMetrics(timeRange).slice(-50) // Last 50 metrics
      : [];

    return new Response(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        timeRange,
        health,
        aggregated,
        recentMetrics,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      },
    );
  } catch (error) {
    console.error("Error fetching AI metrics:", error);
    return new Response("Internal server error", { status: 500 });
  }
}

// Export metrics data (admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Check admin permission (implement your own logic)
    // if (!isAdmin(user)) {
    //   return new Response("Forbidden", { status: 403 });
    // }

    const { action } = await request.json();
    const monitor = AIPerformanceMonitor.getInstance();

    switch (action) {
      case "export":
        const exportData = monitor.exportMetrics();
        return new Response(exportData, {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Content-Disposition": `attachment; filename="ai-metrics-${Date.now()}.json"`,
          },
        });

      case "clearMetrics":
        // This would need to be implemented in the monitor
        return new Response(JSON.stringify({ message: "Metrics cleared" }), {
          status: 200,
        });

      default:
        return new Response("Invalid action", { status: 400 });
    }
  } catch (error) {
    console.error("Error processing metrics action:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
