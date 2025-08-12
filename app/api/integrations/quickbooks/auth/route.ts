// QuickBooks OAuth authentication flow
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { QuickBooksIntegration } from "@/lib/integrations/providers/quickbooks-integration";
import { integrationManager } from "@/lib/integrations/integration-framework";
import { ErrorResponses, logApiError } from "@/lib/api/error-responses";
import {
  encryptOAuthCredentials,
  validateEncryptionConfig,
} from "@/lib/utils/oauth-encryption";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const realmId = searchParams.get("realmId");
    const error = searchParams.get("error");

    if (error) {
      return ErrorResponses.badRequest(`OAuth error: ${error}`);
    }

    if (!code || !realmId) {
      return ErrorResponses.badRequest(
        "Missing authorization code or realm ID",
      );
    }

    // Verify CSRF state token
    if (!state) {
      return ErrorResponses.badRequest(
        "Missing state parameter - possible CSRF attack",
      );
    }

    const supabase = await createClient();
    const { data: user } = await supabase.auth.getUser();

    if (!user.user) {
      return ErrorResponses.unauthorized("User not authenticated");
    }

    // Retrieve and validate stored state
    const { data: storedState } = await supabase
      .from("oauth_states")
      .select("state")
      .eq("user_id", user.user.id)
      .eq("state", state)
      .single();

    if (!storedState) {
      return ErrorResponses.badRequest(
        "Invalid state parameter - possible CSRF attack",
      );
    }

    // Clean up used state
    await supabase.from("oauth_states").delete().eq("state", state);

    // Exchange code for access token
    const tokenResponse = await exchangeCodeForTokens(code, realmId);

    if (!tokenResponse.success) {
      return ErrorResponses.badRequest(
        tokenResponse.error || "Token exchange failed",
      );
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
      return ErrorResponses.badRequest(
        `Authentication failed: ${authResult.error}`,
      );
    }

    // Validate encryption configuration
    validateEncryptionConfig();

    // Save integration configuration
    // Variables already declared above, reuse them

    const expiresAt = new Date(Date.now() + expires_in * 1000);

    // Encrypt OAuth credentials before storage
    const encryptedCredentials = encryptOAuthCredentials({
      access_token,
      refresh_token,
      company_id: realmId,
    });

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
        credentials: encryptedCredentials,
        expires_at: expiresAt.toISOString(),
        refresh_token: encryptedCredentials.refresh_token,
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
      return ErrorResponses.internalError(
        createResult.error || "Failed to create integration",
      );
    }

    // Redirect to success page
    const redirectUrl = new URL(
      "/settings?tab=integrations&success=quickbooks",
      request.url,
    );
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    logApiError(error, {
      endpoint: "/api/integrations/quickbooks/auth",
      method: "GET",
    });
    return ErrorResponses.internalError();
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    if (action === "initiate") {
      // Get authenticated user
      const supabase = await createClient();
      const { data: user } = await supabase.auth.getUser();

      if (!user.user) {
        return NextResponse.json(
          { error: "User not authenticated" },
          { status: 401 },
        );
      }

      // Start OAuth flow with CSRF protection
      const authUrl = await buildAuthorizationUrl(user.user.id);
      return NextResponse.json({ auth_url: authUrl });
    }

    if (action === "disconnect") {
      // Disconnect QuickBooks integration
      const supabase = await createClient();
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

    return ErrorResponses.badRequest("Invalid action");
  } catch (error) {
    logApiError(error, {
      endpoint: "/api/integrations/quickbooks/auth",
      method: "POST",
    });
    return ErrorResponses.internalError();
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

async function buildAuthorizationUrl(userId: string): Promise<string> {
  const baseUrl =
    process.env.NODE_ENV === "production"
      ? "https://appcenter.intuit.com/connect/oauth2"
      : "https://appcenter.intuit.com/connect/oauth2";

  // Generate and store CSRF state token
  const state = crypto.randomUUID();
  const supabase = await createClient();

  // Store state with expiration (5 minutes)
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  await supabase.from("oauth_states").insert({
    user_id: userId,
    state: state,
    provider: "quickbooks",
    expires_at: expiresAt,
  });

  const params = new URLSearchParams({
    client_id: process.env.QUICKBOOKS_CLIENT_ID!,
    scope: "com.intuit.quickbooks.accounting",
    redirect_uri:
      process.env.QUICKBOOKS_REDIRECT_URI ||
      `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/quickbooks/auth`,
    response_type: "code",
    access_type: "offline",
    state: state,
  });

  return `${baseUrl}?${params.toString()}`;
}
