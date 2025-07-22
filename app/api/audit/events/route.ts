// Audit Events API
// Handles querying and managing audit log events

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { auditSystem } from "@/lib/audit/audit-system";
import { withAuditLogging } from "@/lib/audit/audit-middleware";

async function handleGET(request: NextRequest) {
  try {
    const supabase = createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const eventTypes = searchParams.get("event_types")?.split(",");
    const severity = searchParams.get("severity")?.split(",");
    const resourceType = searchParams.get("resource_type");
    const resourceId = searchParams.get("resource_id");
    const userId = searchParams.get("user_id");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Check if user is admin (can view all events) or regular user (can only view own events)
    const isAdmin = user.user_metadata?.role === "admin";
    const targetUserId = isAdmin ? userId : user.id;

    // Query audit logs
    const events = await auditSystem.queryAuditLogs({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      userId: targetUserId || undefined,
      eventTypes: eventTypes as any,
      severity: severity as any,
      resourceType: resourceType || undefined,
      resourceId: resourceId || undefined,
      limit,
      offset,
    });

    // Get total count for pagination
    let totalCount = 0;
    if (events.length > 0) {
      let countQuery = supabase
        .from("audit_events")
        .select("*", { count: "exact", head: true });

      if (targetUserId) {
        countQuery = countQuery.eq("user_id", targetUserId);
      }

      const { count } = await countQuery;

      totalCount = count || 0;
    }

    return NextResponse.json({
      events,
      pagination: {
        total: totalCount,
        limit,
        offset,
        has_more: events.length === limit,
      },
    });
  } catch (error) {
    console.error("Error querying audit events:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const supabase = createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      event_type,
      severity = "medium",
      action,
      resource_type,
      resource_id,
      details = {},
      compliance_tags = [],
    } = body;

    // Validate required fields
    if (!event_type || !action) {
      return NextResponse.json(
        { error: "Missing required fields: event_type, action" },
        { status: 400 },
      );
    }

    // Log the event
    const eventId = await auditSystem.logEvent({
      event_type,
      severity,
      user_id: user.id,
      action,
      resource_type,
      resource_id,
      details,
      compliance_tags,
    });

    return NextResponse.json({
      event_id: eventId,
      message: "Audit event logged successfully",
    });
  } catch (error) {
    console.error("Error logging audit event:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Export wrapped handlers with audit logging
export const GET = withAuditLogging(handleGET, { logLevel: "sensitive_only" });
export const POST = withAuditLogging(handlePOST, { logLevel: "all" });
