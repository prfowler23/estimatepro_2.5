// Integration Health Check API
// Monitors integration status and connection health

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { integrationManager } from "@/lib/integrations/integration-framework";

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const integration_id = searchParams.get("integration_id");

    if (integration_id) {
      // Check specific integration health
      const { data: integration, error } = await supabase
        .from("integrations")
        .select("*")
        .eq("id", integration_id)
        .eq("created_by", user.id)
        .single();

      if (error || !integration) {
        return NextResponse.json(
          { error: "Integration not found" },
          { status: 404 },
        );
      }

      const healthCheck = await integrationManager.checkIntegrationHealth();
      const status = healthCheck[integration_id];

      return NextResponse.json({
        integration_id,
        provider: integration.provider,
        name: integration.name,
        enabled: integration.enabled,
        health: status || { success: false, error: "Health check failed" },
        last_sync: (integration.sync_settings as any)?.last_sync,
        checked_at: new Date().toISOString(),
      });
    } else {
      // Check all integrations health
      const healthChecks = await integrationManager.checkIntegrationHealth();

      // Get all user integrations
      const { data: integrations, error } = await supabase
        .from("integrations")
        .select("*")
        .eq("created_by", user.id)
        .eq("enabled", true);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const healthReport = (integrations || []).map((integration) => ({
        integration_id: integration.id,
        provider: integration.provider,
        name: integration.name,
        enabled: integration.enabled,
        health: healthChecks[integration.id] || {
          success: false,
          error: "Health check failed",
        },
        last_sync: (integration.sync_settings as any)?.last_sync,
      }));

      const healthyCount = healthReport.filter((r) => r.health.success).length;
      const unhealthyCount = healthReport.filter(
        (r) => !r.health.success,
      ).length;

      return NextResponse.json({
        summary: {
          total: healthReport.length,
          healthy: healthyCount,
          unhealthy: unhealthyCount,
          checked_at: new Date().toISOString(),
        },
        integrations: healthReport,
      });
    }
  } catch (error) {
    console.error("Error checking integration health:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
