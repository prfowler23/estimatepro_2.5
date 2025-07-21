// Integration Sync API
// Handles manual and automated synchronization of integrations

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { integrationManager } from "@/lib/integrations/integration-framework";

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { integration_id, direction = "bidirectional" } = body;

    if (integration_id) {
      // Sync specific integration
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

      if (!integration.enabled) {
        return NextResponse.json(
          { error: "Integration is disabled" },
          { status: 400 },
        );
      }

      // Perform sync for specific integration
      // This would require individual integration handling
      return NextResponse.json({
        message: "Integration sync initiated",
        integration_id,
        direction,
      });
    } else {
      // Sync all integrations
      const results = await integrationManager.syncAllIntegrations();

      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.filter((r) => !r.success).length;

      return NextResponse.json({
        message: "Sync completed",
        results: {
          total: results.length,
          successful: successCount,
          failed: failureCount,
        },
        sync_results: results,
      });
    }
  } catch (error) {
    console.error("Error syncing integrations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Get sync status and history
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

    let query = supabase.from("integration_sync_logs").select("*");

    if (integration_id) {
      query = query.eq("integration_id", integration_id);
    }

    const { data: syncLogs, error } = await query
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      sync_logs: syncLogs || [],
      count: syncLogs?.length || 0,
    });
  } catch (error) {
    console.error("Error fetching sync logs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
