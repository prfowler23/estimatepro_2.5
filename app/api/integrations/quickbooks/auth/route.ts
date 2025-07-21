// QuickBooks OAuth authentication flow
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { QuickBooksIntegration } from "@/lib/integrations/providers/quickbooks-integration";
import { integrationManager } from "@/lib/integrations/integration-framework";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const realmId = searchParams.get("realmId");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.json(
        { error: `OAuth error: ${error}` },
        { status: 400 },
      );
    }

    if (!code || !realmId) {
      return NextResponse.json(
        { error: "Missing authorization code or realm ID" },
        { status: 400 },
      );
    }

    // Exchange code for access token
    const tokenResponse = await exchangeCodeForTokens(code, realmId);

    if (!tokenResponse.success) {
      return NextResponse.json({ error: tokenResponse.error }, { status: 400 });
    }

    const { access_token, refresh_token, expires_in } = tokenResponse.data || {
      access_token: "",
      refresh_token: "",
      expires_in: 0,
    };

    // Test the connection
    const quickbooks = new QuickBooksIntegration();
    const authResult = await quickbooks.authenticate({
      access_token,
      refresh_token,
      company_id: realmId,
    });

    if (!authResult.success) {
      return NextResponse.json(
        { error: `Authentication failed: ${authResult.error}` },
        { status: 400 },
      );
    }

    // Save integration configuration
    const supabase = createClient();
    const { data: user } = await supabase.auth.getUser();

    if (!user.user) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 },
      );
    }

    const expiresAt = new Date(Date.now() + expires_in * 1000);

    const integrationConfig = {
      provider: "quickbooks" as const,
      name: `QuickBooks Online - ${authResult.data.company_name}`,
      enabled: true,
      settings: {
        sandbox: process.env.NODE_ENV !== "production",
        company_name: authResult.data.company_name,
      },
      authentication: {
        type: "oauth2" as const,
        credentials: {
          access_token,
          refresh_token,
          company_id: realmId,
        },
        expires_at: expiresAt.toISOString(),
        refresh_token,
      },
      webhooks: [],
      sync_settings: {
        auto_sync: true,
        sync_frequency: "hourly" as const,
        sync_direction: "bidirectional" as const,
      },
      field_mappings: {
        "customer.name": "Name",
        "customer.email": "PrimaryEmailAddr.Address",
        "customer.phone": "PrimaryPhone.FreeFormNumber",
      },
      created_by: user.user.id,
    };

    const createResult =
      await integrationManager.createIntegration(integrationConfig);

    if (!createResult.success) {
      return NextResponse.json({ error: createResult.error }, { status: 500 });
    }

    // Redirect to success page
    const redirectUrl = new URL(
      "/settings?tab=integrations&success=quickbooks",
      request.url,
    );
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error("QuickBooks OAuth error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    if (action === "initiate") {
      // Start OAuth flow
      const authUrl = buildAuthorizationUrl();
      return NextResponse.json({ auth_url: authUrl });
    }

    if (action === "disconnect") {
      // Disconnect QuickBooks integration
      const supabase = createClient();
      const { data: user } = await supabase.auth.getUser();

      if (!user.user) {
        return NextResponse.json(
          { error: "User not authenticated" },
          { status: 401 },
        );
      }

      await supabase
        .from("integrations")
        .update({ enabled: false })
        .eq("provider", "quickbooks")
        .eq("created_by", user.user.id);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("QuickBooks auth API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Helper functions
async function exchangeCodeForTokens(code: string, realmId: string) {
  try {
    const tokenEndpoint =
      process.env.NODE_ENV === "production"
        ? "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer"
        : "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";

    const response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(
          `${process.env.QUICKBOOKS_CLIENT_ID}:${process.env.QUICKBOOKS_CLIENT_SECRET}`,
        ).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri:
          process.env.QUICKBOOKS_REDIRECT_URI ||
          `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/quickbooks/auth`,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return {
        success: false,
        error: `Token exchange failed: ${error}`,
      };
    }

    const data = await response.json();

    return {
      success: true,
      data: {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in,
        token_type: data.token_type,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Token exchange failed",
    };
  }
}

function buildAuthorizationUrl(): string {
  const baseUrl =
    process.env.NODE_ENV === "production"
      ? "https://appcenter.intuit.com/connect/oauth2"
      : "https://appcenter.intuit.com/connect/oauth2";

  const params = new URLSearchParams({
    client_id: process.env.QUICKBOOKS_CLIENT_ID!,
    scope: "com.intuit.quickbooks.accounting",
    redirect_uri:
      process.env.QUICKBOOKS_REDIRECT_URI ||
      `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/quickbooks/auth`,
    response_type: "code",
    access_type: "offline",
    state: crypto.randomUUID(),
  });

  return `${baseUrl}?${params.toString()}`;
}
