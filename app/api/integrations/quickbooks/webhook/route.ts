// QuickBooks webhook endpoint
import { NextRequest, NextResponse } from "next/server";
import { integrationManager } from "@/lib/integrations/integration-framework";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const signature = request.headers.get("intuit-signature");

    console.log("QuickBooks webhook received:", {
      payload: JSON.stringify(payload, null, 2),
      signature,
    });

    // Verify webhook signature and process
    const result = await integrationManager.handleWebhook(
      "quickbooks",
      payload,
      signature || undefined,
    );

    if (!result.success) {
      console.error("Webhook processing failed:", result.error);
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      processed: result.data?.processed_events || 0,
    });
  } catch (error) {
    console.error("QuickBooks webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}

// QuickBooks requires a GET endpoint to verify webhook URLs
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: "QuickBooks webhook endpoint is active",
    timestamp: new Date().toISOString(),
  });
}
