// Performance Alerts API
// Manages performance alerts and notifications

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { performanceMonitor } from "@/lib/performance/performance-monitor";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has access to performance alerts
    const isAdmin = user.user_metadata?.role === "admin";
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const resolved = searchParams.get("resolved") === "true";
    const type = searchParams.get("type") as "warning" | "critical" | undefined;

    // Get performance alerts
    let alerts = performanceMonitor.getAlerts(resolved);

    // Filter by type if specified
    if (type) {
      alerts = alerts.filter((alert) => alert.type === type);
    }

    // Sort by timestamp (newest first)
    alerts = alerts.sort((a, b) => b.timestamp - a.timestamp);

    return NextResponse.json({ alerts });
  } catch (error) {
    console.error("Error fetching performance alerts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has access to performance alerts
    const isAdmin = user.user_metadata?.role === "admin";
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { action, ...params } = body;

    if (action === "resolve_alert") {
      const { alert_id } = params;

      if (!alert_id) {
        return NextResponse.json(
          { error: "Missing required parameter: alert_id" },
          { status: 400 },
        );
      }

      // Resolve the alert
      performanceMonitor.resolveAlert(alert_id);

      return NextResponse.json({
        message: "Alert resolved successfully",
      });
    } else if (action === "resolve_all") {
      // Resolve all unresolved alerts
      const unresolvedAlerts = performanceMonitor.getAlerts(false);

      for (const alert of unresolvedAlerts) {
        performanceMonitor.resolveAlert(alert.id);
      }

      return NextResponse.json({
        message: `${unresolvedAlerts.length} alerts resolved successfully`,
      });
    } else if (action === "subscribe") {
      // Subscribe to performance alerts (WebSocket would be implemented here)
      // For now, return success
      return NextResponse.json({
        message: "Subscribed to performance alerts",
      });
    } else {
      return NextResponse.json(
        { error: "Invalid action parameter" },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error("Error handling performance alerts request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
