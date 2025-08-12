// Webhook Management API
// Handles webhook registration, configuration, and management

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { webhookSystem } from "@/lib/integrations/webhook-system";
import { withAuditLogging } from "@/lib/audit/audit-middleware";
import { withAutoRateLimit } from "@/lib/middleware/rate-limit-middleware";
import { z } from "zod";

// Webhook Registration Schema
const WebhookRegistrationSchema = z.object({
  url: z.string().url("Invalid webhook URL"),
  events: z.array(z.string()).min(1, "At least one event is required"),
  description: z.string().optional(),
  headers: z.record(z.string()).optional(),
  timeout_seconds: z.number().min(1).max(30).optional(),
  retry_attempts: z.number().min(0).max(5).optional(),
  retry_delay_seconds: z.number().min(1).max(300).optional(),
  active: z.boolean().optional(),
});

const WebhookUpdateSchema = z.object({
  url: z.string().url().optional(),
  events: z.array(z.string()).optional(),
  description: z.string().optional(),
  headers: z.record(z.string()).optional(),
  timeout_seconds: z.number().min(1).max(30).optional(),
  retry_attempts: z.number().min(0).max(5).optional(),
  retry_delay_seconds: z.number().min(1).max(300).optional(),
  active: z.boolean().optional(),
});

async function handleGET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const webhookId = searchParams.get("id");

    if (webhookId) {
      // Get specific webhook
      const webhooks = await webhookSystem.getWebhooks(user.id);
      const webhook = webhooks.find((w) => w.id === webhookId);

      if (!webhook) {
        return NextResponse.json(
          { error: "Webhook not found" },
          { status: 404 },
        );
      }

      // Get webhook statistics
      const stats = await webhookSystem.getWebhookStats(webhookId);

      return NextResponse.json({
        webhook: {
          ...webhook,
          secret: "[REDACTED]", // Don't expose secret in API
        },
        stats,
      });
    } else {
      // Get all webhooks for user
      const webhooks = await webhookSystem.getWebhooks(user.id);

      // Redact secrets
      const sanitizedWebhooks = webhooks.map((webhook) => ({
        ...webhook,
        secret: "[REDACTED]",
      }));

      return NextResponse.json({
        webhooks: sanitizedWebhooks,
        total: sanitizedWebhooks.length,
      });
    }
  } catch (error) {
    console.error("Error fetching webhooks:", error);
    return NextResponse.json(
      { error: "Failed to fetch webhooks" },
      { status: 500 },
    );
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate request body
    const validationResult = WebhookRegistrationSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: validationResult.error.errors,
        },
        { status: 400 },
      );
    }

    const webhookData = validationResult.data;

    // Register webhook
    const webhookId = await webhookSystem.registerWebhook({
      ...webhookData,
      created_by: user.id,
    });

    // Get the created webhook (with redacted secret)
    const webhooks = await webhookSystem.getWebhooks(user.id);
    const createdWebhook = webhooks.find((w) => w.id === webhookId);

    return NextResponse.json(
      {
        message: "Webhook registered successfully",
        webhook: {
          ...createdWebhook,
          secret: "[REDACTED]",
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error registering webhook:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to register webhook",
      },
      { status: 500 },
    );
  }
}

async function handlePUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const webhookId = searchParams.get("id");

    if (!webhookId) {
      return NextResponse.json(
        { error: "Webhook ID is required" },
        { status: 400 },
      );
    }

    const body = await request.json();

    // Validate request body
    const validationResult = WebhookUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: validationResult.error.errors,
        },
        { status: 400 },
      );
    }

    const updateData = validationResult.data;

    // Verify webhook ownership
    const webhooks = await webhookSystem.getWebhooks(user.id);
    const webhook = webhooks.find((w) => w.id === webhookId);

    if (!webhook) {
      return NextResponse.json(
        { error: "Webhook not found or access denied" },
        { status: 404 },
      );
    }

    // Update webhook
    await webhookSystem.updateWebhook(webhookId, updateData, user.id);

    // Get updated webhook
    const updatedWebhooks = await webhookSystem.getWebhooks(user.id);
    const updatedWebhook = updatedWebhooks.find((w) => w.id === webhookId);

    return NextResponse.json({
      message: "Webhook updated successfully",
      webhook: {
        ...updatedWebhook,
        secret: "[REDACTED]",
      },
    });
  } catch (error) {
    console.error("Error updating webhook:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update webhook",
      },
      { status: 500 },
    );
  }
}

async function handleDELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const webhookId = searchParams.get("id");

    if (!webhookId) {
      return NextResponse.json(
        { error: "Webhook ID is required" },
        { status: 400 },
      );
    }

    // Verify webhook ownership
    const webhooks = await webhookSystem.getWebhooks(user.id);
    const webhook = webhooks.find((w) => w.id === webhookId);

    if (!webhook) {
      return NextResponse.json(
        { error: "Webhook not found or access denied" },
        { status: 404 },
      );
    }

    // Delete webhook
    await webhookSystem.deleteWebhook(webhookId, user.id);

    return NextResponse.json({
      message: "Webhook deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting webhook:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete webhook",
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
export const PUT = withAuditLogging(withAutoRateLimit(handlePUT), {
  logLevel: "all",
  sensitiveRoutes: ["/api/integrations/webhooks"],
});
export const DELETE = withAuditLogging(withAutoRateLimit(handleDELETE), {
  logLevel: "all",
  sensitiveRoutes: ["/api/integrations/webhooks"],
});
