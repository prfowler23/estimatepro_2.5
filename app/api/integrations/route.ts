// Integration Management API
// Handles CRUD operations for integrations and webhook endpoints

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { integrationManager } from "@/lib/integrations/integration-framework";
import { QuickBooksIntegration } from "@/lib/integrations/providers/quickbooks-integration";
import { SalesforceIntegration } from "@/lib/integrations/providers/salesforce-integration";
import { WebhookIntegration } from "@/lib/integrations/providers/webhook-integration";

// Initialize integration providers
const initializeProviders = async () => {
  await integrationManager.registerIntegration(new QuickBooksIntegration());
  await integrationManager.registerIntegration(new SalesforceIntegration());
  await integrationManager.registerIntegration(new WebhookIntegration());
};

// Initialize providers on module load
initializeProviders().catch(console.error);

export async function GET(request: NextRequest) {
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
    const enabled = searchParams.get("enabled");
    const provider = searchParams.get("provider");

    let query = supabase
      .from("integrations")
      .select("*")
      .eq("created_by", user.id);

    if (enabled !== null) {
      query = query.eq("enabled", enabled === "true");
    }

    if (provider) {
      query = query.eq("provider", provider as any);
    }

    const { data: integrations, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      integrations: integrations || [],
      count: integrations?.length || 0,
    });
  } catch (error) {
    console.error("Error fetching integrations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
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
    const {
      provider,
      name,
      settings = {},
      authentication,
      webhooks = [],
      sync_settings = {
        auto_sync: true,
        sync_frequency: "hourly",
        sync_direction: "bidirectional",
      },
      field_mappings = {},
    } = body;

    // Validate required fields
    if (!provider || !name || !authentication) {
      return NextResponse.json(
        { error: "Missing required fields: provider, name, authentication" },
        { status: 400 },
      );
    }

    // Create integration configuration
    const integrationConfig = {
      provider,
      name,
      enabled: true,
      settings,
      authentication,
      webhooks,
      sync_settings,
      field_mappings,
      created_by: user.id,
    };

    // Create integration using the manager
    const result =
      await integrationManager.createIntegration(integrationConfig);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      integration: result.data,
      message: "Integration created successfully",
    });
  } catch (error) {
    console.error("Error creating integration:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
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
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Integration ID is required" },
        { status: 400 },
      );
    }

    // Update integration
    const { data: integration, error } = await supabase
      .from("integrations")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("created_by", user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!integration) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      integration,
      message: "Integration updated successfully",
    });
  } catch (error) {
    console.error("Error updating integration:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
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
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Integration ID is required" },
        { status: 400 },
      );
    }

    // Delete integration
    const { error } = await supabase
      .from("integrations")
      .delete()
      .eq("id", id)
      .eq("created_by", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: "Integration deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting integration:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
