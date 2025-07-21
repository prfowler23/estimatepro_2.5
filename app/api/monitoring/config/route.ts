// Monitoring Configuration API
// Configuration management for monitoring and alerting systems

import { NextRequest, NextResponse } from "next/server";
import { systemMonitor } from "@/lib/monitoring/system-monitor";
import { AlertManager } from "@/lib/alerts/alert-manager";

// Global alert manager instance
const alertManager = new AlertManager();

// GET /api/monitoring/config
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const section = searchParams.get("section") || "all";

    const response: any = {};

    if (section === "all" || section === "monitoring") {
      response.monitoring = {
        enabled: true, // Get from systemMonitor config
        interval: 30000,
        retentionDays: 30,
        thresholds: {
          cpu: { warning: 70, critical: 90 },
          memory: { warning: 80, critical: 95 },
          disk: { warning: 85, critical: 95 },
          responseTime: { warning: 2000, critical: 5000 },
          errorRate: { warning: 5, critical: 10 },
        },
      };
    }

    if (section === "all" || section === "alerts") {
      response.alerts = alertManager.getConfig();
    }

    if (section === "all" || section === "healthChecks") {
      response.healthChecks = {
        interval: 60000,
        timeout: 10000,
        checks: [
          { name: "database", enabled: true },
          { name: "api", enabled: true },
          { name: "external-services", enabled: true },
        ],
      };
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching monitoring config:", error);
    return NextResponse.json(
      { error: "Failed to fetch monitoring configuration" },
      { status: 500 },
    );
  }
}

// PUT /api/monitoring/config
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { section, config } = body;

    if (!section || !config) {
      return NextResponse.json(
        { error: "Missing required fields: section, config" },
        { status: 400 },
      );
    }

    switch (section) {
      case "monitoring":
        systemMonitor.updateConfig(config);
        break;

      case "alerts":
        alertManager.updateConfig(config);
        break;

      case "thresholds":
        systemMonitor.updateConfig({ thresholds: config });
        break;

      default:
        return NextResponse.json(
          { error: "Unknown configuration section" },
          { status: 400 },
        );
    }

    return NextResponse.json({
      success: true,
      message: `${section} configuration updated`,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Error updating monitoring config:", error);
    return NextResponse.json(
      { error: "Failed to update monitoring configuration" },
      { status: 500 },
    );
  }
}

// POST /api/monitoring/config
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case "add_alert_rule":
        if (!data || !data.rule) {
          return NextResponse.json(
            { error: "Alert rule data is required" },
            { status: 400 },
          );
        }
        alertManager.addAlertRule(data.rule);
        break;

      case "add_notification_channel":
        if (!data || !data.channel) {
          return NextResponse.json(
            { error: "Notification channel data is required" },
            { status: 400 },
          );
        }
        const currentConfig = alertManager.getConfig();
        currentConfig.channels.push(data.channel);
        alertManager.updateConfig(currentConfig);
        break;

      case "test_notification":
        if (!data || !data.channel) {
          return NextResponse.json(
            { error: "Channel configuration is required" },
            { status: 400 },
          );
        }

        // Send test alert
        await alertManager.sendAlert({
          type: "test",
          severity: "info",
          message: "Test notification from EstimatePro monitoring system",
          details: { test: true, channel: data.channel },
          timestamp: Date.now(),
        });

        break;

      case "reset_to_defaults":
        // Reset configuration to defaults
        systemMonitor.updateConfig({
          enabled: true,
          interval: 30000,
          retentionDays: 30,
        });
        break;

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Action ${action} completed`,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Error processing monitoring config action:", error);
    return NextResponse.json(
      { error: "Failed to process configuration action" },
      { status: 500 },
    );
  }
}

// DELETE /api/monitoring/config
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const id = searchParams.get("id");

    if (!type || !id) {
      return NextResponse.json(
        { error: "Type and ID are required" },
        { status: 400 },
      );
    }

    switch (type) {
      case "alert_rule":
        const success = alertManager.removeAlertRule(id);
        if (!success) {
          return NextResponse.json(
            { error: "Alert rule not found" },
            { status: 404 },
          );
        }
        break;

      case "notification_channel":
        const currentConfig = alertManager.getConfig();
        const channelIndex = currentConfig.channels.findIndex(
          (c) => c.name === id,
        );
        if (channelIndex === -1) {
          return NextResponse.json(
            { error: "Notification channel not found" },
            { status: 404 },
          );
        }
        currentConfig.channels.splice(channelIndex, 1);
        alertManager.updateConfig(currentConfig);
        break;

      default:
        return NextResponse.json({ error: "Unknown type" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `${type} deleted successfully`,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Error deleting monitoring config:", error);
    return NextResponse.json(
      { error: "Failed to delete configuration" },
      { status: 500 },
    );
  }
}
