// Webhook Delivery Management API
// Handles webhook delivery logs, retry, and statistics

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { webhookSystem } from "@/lib/integrations/webhook-system";
import { withAuditLogging } from "@/lib/audit/audit-middleware";
import { withAutoRateLimit } from "@/lib/middleware/rate-limit-middleware";

async function handleGET(
  request: NextRequest,
  context?: { params?: { id: string } },
) {
  try {
    const supabase = createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const webhookId = context?.params?.id;
    if (!webhookId) {
      return NextResponse.json(
        { error: "Webhook ID required" },
        { status: 400 },
      );
    }
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Verify webhook ownership
    const webhooks = await webhookSystem.getWebhooks(user.id);
    const webhook = webhooks.find((w) => w.id === webhookId);

    if (!webhook) {
      return NextResponse.json(
        { error: "Webhook not found or access denied" },
        { status: 404 },
      );
    }

    // Get webhook deliveries
    const deliveries = await webhookSystem.getWebhookDeliveries(
      webhookId,
      limit,
      offset,
    );

    // Get webhook statistics
    const stats = await webhookSystem.getWebhookStats(webhookId);

    return NextResponse.json({
      deliveries,
      stats,
      pagination: {
        limit,
        offset,
        has_more: deliveries.length === limit,
      },
    });
  } catch (error) {
    console.error("Error fetching webhook deliveries:", error);
    return NextResponse.json(
      { error: "Failed to fetch webhook deliveries" },
      { status: 500 },
    );
  }
}

async function handlePOST(
  request: NextRequest,
  context?: { params?: { id: string } },
) {
  try {
    const supabase = createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const webhookId = context?.params?.id;
    if (!webhookId) {
      return NextResponse.json(
        { error: "Webhook ID required" },
        { status: 400 },
      );
    }
    const body = await request.json();
    const { action } = body;

    // Verify webhook ownership
    const webhooks = await webhookSystem.getWebhooks(user.id);
    const webhook = webhooks.find((w) => w.id === webhookId);

    if (!webhook) {
      return NextResponse.json(
        { error: "Webhook not found or access denied" },
        { status: 404 },
      );
    }

    if (action === "test") {
      // Test webhook endpoint
      const testData = {
        test: true,
        message: "Test webhook delivery",
        timestamp: new Date().toISOString(),
      };

      const deliveryIds = await webhookSystem.publishEvent(
        "system.maintenance",
        testData,
        { test: true },
      );

      return NextResponse.json({
        message: "Test webhook sent successfully",
        delivery_ids: deliveryIds,
      });
    } else if (action === "retry_failed") {
      // Retry failed deliveries
      const { data: failedDeliveries, error } = await supabase
        .from("webhook_deliveries")
        .select("*")
        .eq("webhook_id", webhookId)
        .eq("status", "failed")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        throw new Error(`Failed to fetch failed deliveries: ${error.message}`);
      }

      let retriedCount = 0;
      for (const delivery of failedDeliveries || []) {
        // Reset delivery status to pending for retry
        await supabase
          .from("webhook_deliveries")
          .update({
            status: "pending",
            attempts: 0,
            error_message: null,
            next_retry_at: null,
          })
          .eq("id", delivery.id);

        retriedCount++;
      }

      return NextResponse.json({
        message: `${retriedCount} failed deliveries scheduled for retry`,
        retried_count: retriedCount,
      });
    } else {
      return NextResponse.json(
        { error: "Invalid action. Supported actions: test, retry_failed" },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error("Error handling webhook delivery action:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to process webhook action",
      },
      { status: 500 },
    );
  }
}

// Export wrapped handlers with audit logging and rate limiting
export const GET = withAuditLogging(withAutoRateLimit(handleGET), {
  logLevel: "sensitive_only",
  sensitiveRoutes: ["/api/integrations/webhooks"],
});
export const POST = withAuditLogging(withAutoRateLimit(handlePOST), {
  logLevel: "all",
  sensitiveRoutes: ["/api/integrations/webhooks"],
});
