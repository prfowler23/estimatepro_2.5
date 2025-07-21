// Monitoring Metrics API
// Real-time system metrics and health data API endpoint

import { NextRequest, NextResponse } from "next/server";
import { systemMonitor } from "@/lib/monitoring/system-monitor";
import { performanceMonitor } from "@/lib/performance/performance-monitor";

// GET /api/monitoring/metrics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hours = parseInt(searchParams.get("hours") || "24");
    const include = searchParams.get("include")?.split(",") || [
      "current",
      "history",
      "health",
    ];

    const response: any = {};

    // Include current metrics
    if (include.includes("current")) {
      response.current = systemMonitor.getCurrentMetrics();
    }

    // Include metrics history
    if (include.includes("history")) {
      response.history = systemMonitor.getMetricsHistory(hours);
    }

    // Include health checks
    if (include.includes("health")) {
      const healthChecks = Array.from(
        systemMonitor.getHealthCheckStatus().values(),
      );
      response.health = {
        checks: healthChecks,
        status: systemMonitor.getSystemStatus(),
      };
    }

    // Include performance data
    if (include.includes("performance")) {
      response.performance = {
        averageResponseTime: performanceMonitor.getAverageResponseTime(),
        errorRate: performanceMonitor.getErrorRate(),
        throughput: performanceMonitor.getThroughput(),
        recentLogs: performanceMonitor.getRecentLogs(100),
      };
    }

    // Include aggregated statistics
    if (include.includes("stats")) {
      const currentMetrics = systemMonitor.getCurrentMetrics();
      if (currentMetrics) {
        response.stats = {
          uptime: currentMetrics.application.uptime,
          totalRequests: performanceMonitor.getTotalRequests(),
          totalErrors: performanceMonitor.getTotalErrors(),
          peakCpuUsage: Math.max(
            ...systemMonitor.getMetricsHistory(hours).map((m) => m.cpu.usage),
          ),
          peakMemoryUsage: Math.max(
            ...systemMonitor
              .getMetricsHistory(hours)
              .map((m) => m.memory.percentage),
          ),
        };
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching monitoring metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch monitoring metrics" },
      { status: 500 },
    );
  }
}

// POST /api/monitoring/metrics
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    switch (type) {
      case "custom_metric":
        // Handle custom metric submission
        console.log("Custom metric received:", data);
        break;

      case "user_action":
        // Track user action for analytics
        performanceMonitor.logUserAction(data.action, data.duration);
        break;

      case "error":
        // Log client-side error
        performanceMonitor.logError(data.error, data.context);
        break;

      default:
        return NextResponse.json(
          { error: "Unknown metric type" },
          { status: 400 },
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing monitoring metric:", error);
    return NextResponse.json(
      { error: "Failed to process metric" },
      { status: 500 },
    );
  }
}

// PUT /api/monitoring/metrics
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case "start_monitoring":
        systemMonitor.start();
        break;

      case "stop_monitoring":
        systemMonitor.stop();
        break;

      case "update_config":
        systemMonitor.updateConfig(data);
        break;

      case "clear_history":
        // Clear metrics history (implementation needed)
        break;

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating monitoring:", error);
    return NextResponse.json(
      { error: "Failed to update monitoring" },
      { status: 500 },
    );
  }
}
