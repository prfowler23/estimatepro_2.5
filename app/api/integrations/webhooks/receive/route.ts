// Webhook Receiver API
// Handles incoming webhooks from external services

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { webhookSystem } from "@/lib/integrations/webhook-system";
import { AuditSystem } from "@/lib/audit/audit-system";
import { withAuditLogging } from "@/lib/audit/audit-middleware";
import { z } from "zod";

// Supported webhook sources
const WEBHOOK_SOURCES = {
  quickbooks: "QuickBooks",
  zapier: "Zapier",
  make: "Make.com",
  stripe: "Stripe",
  custom: "Custom",
} as const;

type WebhookSource = keyof typeof WEBHOOK_SOURCES;

// Incoming webhook payload schema
const IncomingWebhookSchema = z.object({
  source: z.string(),
  event_type: z.string(),
  data: z.record(z.any()),
  timestamp: z.string().optional(),
  signature: z.string().optional(),
});

async function handlePOST(request: NextRequest) {
  const auditSystem = AuditSystem.getInstance();
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const source = searchParams.get("source") as WebhookSource;
    const token = searchParams.get("token");

    if (!source || !WEBHOOK_SOURCES[source]) {
      return NextResponse.json(
        { error: "Invalid or missing webhook source" },
        { status: 400 },
      );
    }

    // Verify webhook token/authentication
    if (!token) {
      return NextResponse.json(
        { error: "Missing authentication token" },
        { status: 401 },
      );
    }

    // Get raw payload for signature verification
    const rawPayload = await request.text();
    let payload;

    try {
      payload = JSON.parse(rawPayload);
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 },
      );
    }

    // Validate payload structure
    const validationResult = IncomingWebhookSchema.safeParse(payload);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid webhook payload",
          details: validationResult.error.errors,
        },
        { status: 400 },
      );
    }

    const webhookData = validationResult.data;

    // Verify webhook signature if provided
    if (webhookData.signature) {
      const isValid = await verifyWebhookSignature(
        source,
        rawPayload,
        webhookData.signature,
        request.headers,
      );

      if (!isValid) {
        await auditSystem.logSecurityEvent("security_violation", "high", {
          source,
          event_type: "invalid_webhook_signature",
          ip_address: request.headers.get("x-forwarded-for") || "unknown",
          user_agent: request.headers.get("user-agent") || "unknown",
        });

        return NextResponse.json(
          { error: "Invalid webhook signature" },
          { status: 401 },
        );
      }
    }

    // Process webhook based on source
    const processingResult = await processIncomingWebhook(
      source,
      webhookData,
      token,
    );

    if (!processingResult.success) {
      return NextResponse.json(
        { error: processingResult.error },
        { status: 400 },
      );
    }

    // Log successful webhook receipt
    await auditSystem.logEvent({
      event_type: "webhook_received",
      severity: "low",
      action: "process_incoming_webhook",
      details: {
        source,
        event_type: webhookData.event_type,
        data_size: JSON.stringify(webhookData.data).length,
        processing_result: processingResult.result,
      },
      compliance_tags: ["webhook_processing", "integration"],
    });

    return NextResponse.json({
      message: "Webhook processed successfully",
      source,
      event_type: webhookData.event_type,
      result: processingResult.result,
    });
  } catch (error) {
    console.error("Error processing incoming webhook:", error);

    // Log webhook processing error
    await auditSystem.logEvent({
      event_type: "webhook_received",
      severity: "high",
      action: "process_incoming_webhook_failed",
      details: {
        error: error instanceof Error ? error.message : "Unknown error",
        ip_address: request.headers.get("x-forwarded-for") || "unknown",
      },
      compliance_tags: ["webhook_processing", "integration", "error"],
    });

    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 },
    );
  }
}

async function verifyWebhookSignature(
  source: WebhookSource,
  payload: string,
  signature: string,
  headers: Headers,
): Promise<boolean> {
  try {
    switch (source) {
      case "quickbooks":
        // QuickBooks webhook signature verification
        const qbToken = process.env.QUICKBOOKS_WEBHOOK_TOKEN;
        if (!qbToken) return false;
        return await webhookSystem.verifyWebhookSignature(
          payload,
          signature,
          qbToken,
        );

      case "stripe":
        // Stripe webhook signature verification
        const stripeSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!stripeSecret) return false;
        const stripeSignature = headers.get("stripe-signature");
        if (!stripeSignature) return false;
        return await webhookSystem.verifyWebhookSignature(
          payload,
          stripeSignature,
          stripeSecret,
        );

      case "zapier":
      case "make":
        // Custom signature verification for automation platforms
        const customSecret = process.env.CUSTOM_WEBHOOK_SECRET;
        if (!customSecret) return false;
        return await webhookSystem.verifyWebhookSignature(
          payload,
          signature,
          customSecret,
        );

      case "custom":
        // Custom webhook signature verification
        return true; // Implement based on specific requirements

      default:
        return false;
    }
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}

async function processIncomingWebhook(
  source: WebhookSource,
  webhookData: z.infer<typeof IncomingWebhookSchema>,
  token: string,
): Promise<{ success: boolean; error?: string; result?: any }> {
  const supabase = await createClient();

  try {
    switch (source) {
      case "quickbooks":
        return await processQuickBooksWebhook(supabase, webhookData);

      case "stripe":
        return await processStripeWebhook(supabase, webhookData);

      case "zapier":
      case "make":
        return await processAutomationWebhook(supabase, webhookData, source);

      case "custom":
        return await processCustomWebhook(supabase, webhookData, token);

      default:
        return {
          success: false,
          error: `Unsupported webhook source: ${source}`,
        };
    }
  } catch (error) {
    console.error(`Error processing ${source} webhook:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Processing failed",
    };
  }
}

async function processQuickBooksWebhook(
  supabase: any,
  webhookData: z.infer<typeof IncomingWebhookSchema>,
): Promise<{ success: boolean; error?: string; result?: any }> {
  const { event_type, data } = webhookData;

  switch (event_type) {
    case "Customer":
      // Sync customer data from QuickBooks
      if (data.eventNotifications) {
        for (const notification of data.eventNotifications) {
          const customerData = notification.dataChangeEvent?.entities?.[0];
          if (customerData) {
            // Update or create customer in our system
            await supabase.from("customers").upsert({
              quickbooks_id: customerData.id,
              name: customerData.name || customerData.companyName,
              email: customerData.primaryEmailAddr?.address,
              phone: customerData.primaryPhone?.freeFormNumber,
              address: customerData.billAddr
                ? `${customerData.billAddr.line1}, ${customerData.billAddr.city}, ${customerData.billAddr.countrySubDivisionCode}`
                : null,
              updated_at: new Date().toISOString(),
            });
          }
        }
      }
      break;

    case "Invoice":
      // Handle invoice updates from QuickBooks
      // Implement based on your business logic
      break;

    default:
      console.log(`Unhandled QuickBooks event: ${event_type}`);
  }

  return { success: true, result: { processed_events: event_type } };
}

async function processStripeWebhook(
  supabase: any,
  webhookData: z.infer<typeof IncomingWebhookSchema>,
): Promise<{ success: boolean; error?: string; result?: any }> {
  const { event_type, data } = webhookData;

  switch (event_type) {
    case "payment_intent.succeeded":
      // Handle successful payment
      const paymentData = data.object;
      await supabase.from("payments").insert({
        stripe_payment_id: paymentData.id,
        amount: paymentData.amount,
        currency: paymentData.currency,
        status: "completed",
        customer_email: paymentData.receipt_email,
        created_at: new Date(paymentData.created * 1000).toISOString(),
      });
      break;

    case "payment_intent.payment_failed":
      // Handle failed payment
      const failedPaymentData = data.object;
      await supabase.from("payments").insert({
        stripe_payment_id: failedPaymentData.id,
        amount: failedPaymentData.amount,
        currency: failedPaymentData.currency,
        status: "failed",
        failure_reason: failedPaymentData.last_payment_error?.message,
        created_at: new Date(failedPaymentData.created * 1000).toISOString(),
      });
      break;

    default:
      console.log(`Unhandled Stripe event: ${event_type}`);
  }

  return { success: true, result: { processed_events: event_type } };
}

async function processAutomationWebhook(
  supabase: any,
  webhookData: z.infer<typeof IncomingWebhookSchema>,
  source: "zapier" | "make",
): Promise<{ success: boolean; error?: string; result?: any }> {
  const { event_type, data } = webhookData;

  switch (event_type) {
    case "lead_created":
      // Create new customer/lead from automation platform
      await supabase.from("customers").insert({
        name: data.name || data.company_name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        source: source,
        created_at: new Date().toISOString(),
      });
      break;

    case "form_submission":
      // Handle form submission from website
      await supabase.from("form_submissions").insert({
        form_name: data.form_name,
        submission_data: data,
        source: source,
        created_at: new Date().toISOString(),
      });
      break;

    case "task_completed":
      // Handle task completion from automation
      // Implement based on your workflow requirements
      break;

    default:
      console.log(`Unhandled ${source} event: ${event_type}`);
  }

  return { success: true, result: { processed_events: event_type } };
}

async function processCustomWebhook(
  supabase: any,
  webhookData: z.infer<typeof IncomingWebhookSchema>,
  token: string,
): Promise<{ success: boolean; error?: string; result?: any }> {
  // Implement custom webhook processing based on your specific requirements
  // This could include:
  // - CRM integrations
  // - Project management tools
  // - Custom business applications
  // - Third-party services

  const { event_type, data } = webhookData;

  // Store webhook data for manual processing or custom logic
  await supabase.from("webhook_logs").insert({
    source: "custom",
    event_type,
    payload: webhookData,
    token,
    processed: false,
    created_at: new Date().toISOString(),
  });

  return {
    success: true,
    result: { message: "Custom webhook logged for processing", event_type },
  };
}

// Export wrapped handler with audit logging
export const POST = withAuditLogging(handlePOST, {
  logLevel: "all",
  sensitiveRoutes: ["/api/integrations/webhooks/receive"],
});
