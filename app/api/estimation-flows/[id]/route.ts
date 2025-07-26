import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/server";
import { createServerSupabaseClient } from "@/lib/auth/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Authenticate request
    const { user, error: authError } = await authenticateRequest(request);
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || "Unauthorized" },
        { status: 401 },
      );
    }

    const supabase = createServerSupabaseClient();
    const { id: flowId } = await params;

    // Get estimation flow with access control via RLS
    const { data: flow, error } = await supabase
      .from("estimation_flows")
      .select(
        `
        *,
        estimates!inner(
          id,
          quote_number,
          customer_name,
          customer_email,
          building_name,
          total_price,
          status,
          created_at,
          created_by
        )
      `,
      )
      .eq("id", flowId)
      .eq("estimates.created_by", user.id)
      .single();

    if (error) {
      console.error("Error fetching estimation flow:", error);
      return NextResponse.json(
        { error: "Estimation flow not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ flow });
  } catch (error) {
    console.error("Estimation flow fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Authenticate request
    const { user, error: authError } = await authenticateRequest(request);
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || "Unauthorized" },
        { status: 401 },
      );
    }

    const supabase = createServerSupabaseClient();
    const { id: flowId } = await params;
    const body = await request.json();

    // Update estimation flow (RLS will ensure user can only update their own)
    const { data: flow, error } = await supabase
      .from("estimation_flows")
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq("id", flowId)
      .select()
      .single();

    if (error) {
      console.error("Error updating estimation flow:", error);
      return NextResponse.json(
        { error: "Failed to update estimation flow" },
        { status: 500 },
      );
    }

    return NextResponse.json({ flow });
  } catch (error) {
    console.error("Estimation flow update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Authenticate request
    const { user, error: authError } = await authenticateRequest(request);
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || "Unauthorized" },
        { status: 401 },
      );
    }

    const supabase = createServerSupabaseClient();
    const { id: flowId } = await params;

    // Delete estimation flow (RLS will ensure user can only delete their own)
    const { error } = await supabase
      .from("estimation_flows")
      .delete()
      .eq("id", flowId);

    if (error) {
      console.error("Error deleting estimation flow:", error);
      return NextResponse.json(
        { error: "Failed to delete estimation flow" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Estimation flow deletion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
