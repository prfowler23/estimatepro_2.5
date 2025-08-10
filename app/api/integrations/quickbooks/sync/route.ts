// QuickBooks manual sync endpoint
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { QuickBooksIntegration } from "@/lib/integrations/providers/quickbooks-integration";
import {
  withAutoRateLimit,
  withWriteRateLimit,
} from "@/lib/middleware/rate-limit-middleware";

async function syncHandler(
  request: NextRequest,
  context: { params?: Promise<Record<string, string>> },
) {
  try {
    const { searchParams } = new URL(request.url);
    const direction =
      (searchParams.get("direction") as
        | "inbound"
        | "outbound"
        | "bidirectional") || "bidirectional";
    const force = searchParams.get("force") === "true";

    const supabase = createClient();
    const { data: user } = await supabase.auth.getUser();

    if (!user.user) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 },
      );
    }

    // Get QuickBooks integration config
    const { data: integrationConfig, error: configError } = await supabase
      .from("integrations")
      .select("*")
      .eq("provider", "quickbooks")
      .eq("created_by", user.user.id)
      .eq("enabled", true)
      .single();

    if (configError || !integrationConfig) {
      return NextResponse.json(
        { error: "QuickBooks integration not found or not enabled" },
        { status: 404 },
      );
    }

    // Check if sync is needed (unless forced)
    if (!force) {
      const lastSync = (integrationConfig.sync_settings as any)?.last_sync;
      if (lastSync) {
        const lastSyncDate = new Date(lastSync);
        const timeSinceLastSync = Date.now() - lastSyncDate.getTime();
        const minSyncInterval = 5 * 60 * 1000; // 5 minutes

        if (timeSinceLastSync < minSyncInterval) {
          return NextResponse.json({
            success: true,
            message: "Sync skipped - too soon since last sync",
            last_sync: lastSync,
          });
        }
      }
    }

    // Initialize QuickBooks integration
    const quickbooks = new QuickBooksIntegration(integrationConfig as any);

    // Perform sync
    const syncResult = await quickbooks.syncData(direction);

    if (syncResult.success) {
      // Update last sync timestamp
      const currentSettings = (integrationConfig.sync_settings as any) || {};
      const updatedSyncSettings = {
        ...currentSettings,
        last_sync: new Date().toISOString(),
      };

      await supabase
        .from("integrations")
        .update({
          sync_settings: updatedSyncSettings,
        })
        .eq("id", integrationConfig.id);
    }

    return NextResponse.json({
      success: syncResult.success,
      data: syncResult.data,
      warnings: syncResult.warnings,
      error: syncResult.error,
      direction,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("QuickBooks sync error:", error);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}

export const POST = withWriteRateLimit(syncHandler);
export const GET = withAutoRateLimit(syncHandler);
