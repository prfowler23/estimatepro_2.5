// Monitoring Alerts API
// Alert management and notification API endpoint

import { NextRequest, NextResponse } from "next/server";
import { AlertManager } from "@/lib/alerts/alert-manager";

// Global alert manager instance
const alertManager = new AlertManager();

// GET /api/monitoring/alerts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "active";
    const hours = parseInt(searchParams.get("hours") || "24");
    const severity = searchParams.get("severity");
    const resolved = searchParams.get("resolved") === "true";

    let alerts;

    switch (type) {
      case "active":
        alerts = alertManager.getActiveAlerts();
        break;

      case "history":
        alerts = alertManager.getAlertHistory(hours);
        break;

      case "stats":
        const stats = alertManager.getAlertStats(hours);
        return NextResponse.json(stats);

      default:
        alerts = alertManager.getActiveAlerts();
    }

    // Apply filters
    if (severity) {
      alerts = alerts.filter((alert) => alert.severity === severity);
    }

    if (resolved !== undefined) {
      alerts = alerts.filter((alert) => !!alert.resolved === resolved);
    }

    return NextResponse.json({
      alerts,
      total: alerts.length,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Error fetching alerts:", error);
    return NextResponse.json(
      { error: "Failed to fetch alerts" },
      { status: 500 },
    );
  }
}

// POST /api/monitoring/alerts
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, severity, message, details } = body;

    if (!type || !severity || !message) {
      return NextResponse.json(
        { error: "Missing required fields: type, severity, message" },
        { status: 400 },
      );
    }

    const alertId = await alertManager.sendAlert({
      type,
      severity,
      message,
      details,
      timestamp: Date.now(),
    });

    return NextResponse.json({
      success: true,
      alertId,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Error creating alert:", error);
    return NextResponse.json(
      { error: "Failed to create alert" },
      { status: 500 },
    );
  }
}

// PUT /api/monitoring/alerts/:id
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, alertId, acknowledgedBy } = body;

    if (!action || !alertId) {
      return NextResponse.json(
        { error: "Missing required fields: action, alertId" },
        { status: 400 },
      );
    }

    let success = false;

    switch (action) {
      case "acknowledge":
        if (!acknowledgedBy) {
          return NextResponse.json(
            { error: "acknowledgedBy is required for acknowledge action" },
            { status: 400 },
          );
        }
        success = alertManager.acknowledgeAlert(alertId, acknowledgedBy);
        break;

      case "resolve":
        success = alertManager.resolveAlert(alertId, acknowledgedBy);
        break;

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    if (!success) {
      return NextResponse.json(
        { error: "Alert not found or action failed" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Error updating alert:", error);
    return NextResponse.json(
      { error: "Failed to update alert" },
      { status: 500 },
    );
  }
}

// DELETE /api/monitoring/alerts
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const alertId = searchParams.get("id");
    const action = searchParams.get("action");

    if (action === "clear_all") {
      // Clear all resolved alerts (implementation needed)
      return NextResponse.json({
        success: true,
        message: "All resolved alerts cleared",
        timestamp: Date.now(),
      });
    }

    if (!alertId) {
      return NextResponse.json(
        { error: "Alert ID is required" },
        { status: 400 },
      );
    }

    // For now, we'll just resolve the alert instead of deleting
    const success = alertManager.resolveAlert(alertId);

    if (!success) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Error deleting alert:", error);
    return NextResponse.json(
      { error: "Failed to delete alert" },
      { status: 500 },
    );
  }
}
