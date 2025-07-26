// Webhook Handler API
// Handles incoming webhooks from various integration providers

import { NextRequest, NextResponse } from "next/server";
import { integrationManager } from "@/lib/integrations/integration-framework";
import { IntegrationProvider } from "@/lib/integrations/integration-framework";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  try {
    const { provider: providerParam } = await params;
    const provider = providerParam as IntegrationProvider;
    const body = await request.json();

    // Get signature from headers (different providers use different header names)
    const signature =
      request.headers.get("X-Hub-Signature-256") || // GitHub
      request.headers.get("X-Signature") || // Custom
      request.headers.get("X-Stripe-Signature") || // Stripe
      request.headers.get("X-Zapier-Signature") || // Zapier
      request.headers.get("Intuit-Signature") || // QuickBooks
      request.headers.get("X-SFDC-Signature") || // Salesforce
      undefined;

    // Process webhook using the integration manager
    const result = await integrationManager.handleWebhook(
      provider,
      body,
      signature,
    );

    if (!result.success) {
      console.error(`Webhook processing failed for ${provider}:`, result.error);
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Webhook processed successfully",
      data: result.data,
    });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Health check endpoint for webhook URLs
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  try {
    const { provider: providerParam } = await params;
    const provider = providerParam as IntegrationProvider;

    return NextResponse.json({
      provider,
      status: "active",
      timestamp: new Date().toISOString(),
      message: `Webhook endpoint for ${provider} is active`,
    });
  } catch (error) {
    console.error("Webhook health check error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Handle webhook verification challenges (for providers that require it)
export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  return new NextResponse(null, { status: 200 });
}
