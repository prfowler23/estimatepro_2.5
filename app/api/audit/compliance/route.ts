// Audit Compliance API
// Handles compliance reporting and violation management

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

    // Check if user is admin
    const isAdmin = user.user_metadata?.role === "admin";
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (action === "reports") {
      // Get compliance reports
      const { data: reports, error } = await supabase
        .from("compliance_reports")
        .select("*")
        .order("generated_at", { ascending: false })
        .limit(20);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ reports });
    } else if (action === "violations") {
      // Get compliance violations
      const { data: violations, error } = await supabase
        .from("compliance_violations")
        .select("*")
        .order("detected_at", { ascending: false })
        .limit(50);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ violations });
    } else if (action === "statistics") {
      // Get compliance statistics
      const startDate =
        searchParams.get("start_date") ||
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = searchParams.get("end_date") || new Date().toISOString();

      const { data: stats, error } = await supabase.rpc(
        "get_compliance_statistics",
        {
          start_date: startDate,
          end_date: endDate,
        },
      );

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ statistics: stats });
    } else {
      return NextResponse.json(
        { error: "Invalid action parameter" },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error("Error handling compliance request:", error);
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

    // Check if user is admin
    const isAdmin = user.user_metadata?.role === "admin";
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { action, ...params } = body;

    if (action === "generate_report") {
      const { standard, start_date, end_date } = params;

      if (!standard || !start_date || !end_date) {
        return NextResponse.json(
          {
            error:
              "Missing required parameters: standard, start_date, end_date",
          },
          { status: 400 },
        );
      }

      // Generate compliance report
      const report = await auditSystem.generateComplianceReport(
        standard,
        start_date,
        end_date,
      );

      return NextResponse.json({
        report,
        message: "Compliance report generated successfully",
      });
    } else if (action === "export_data") {
      const { user_id } = params;

      if (!user_id) {
        return NextResponse.json(
          { error: "Missing required parameter: user_id" },
          { status: 400 },
        );
      }

      // Export user data for GDPR compliance
      const exportedData = await auditSystem.exportUserData(user_id);

      return NextResponse.json({
        data: exportedData,
        message: "User data exported successfully",
      });
    } else if (action === "anonymize_data") {
      const { user_id } = params;

      if (!user_id) {
        return NextResponse.json(
          { error: "Missing required parameter: user_id" },
          { status: 400 },
        );
      }

      // Anonymize user data for GDPR compliance
      const anonymizedCount = await auditSystem.anonymizeUserData(user_id);

      return NextResponse.json({
        anonymized_count: anonymizedCount,
        message: "User data anonymized successfully",
      });
    } else if (action === "detect_suspicious") {
      const { user_id, hours_back = 24 } = params;

      // Detect suspicious activity
      const { data: suspiciousActivity, error } = await supabase.rpc(
        "detect_suspicious_activity",
        {
          target_user_id: user_id || null,
          hours_back: hours_back,
        },
      );

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        suspicious_activity: suspiciousActivity,
        message: "Suspicious activity detection completed",
      });
    } else {
      return NextResponse.json(
        { error: "Invalid action parameter" },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error("Error handling compliance action:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

async function handleDELETE(request: NextRequest) {
  try {
    const supabase = createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const isAdmin = user.user_metadata?.role === "admin";
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (action === "purge_expired") {
      // Purge expired audit events
      const purgedCount = await auditSystem.purgeExpiredEvents();

      return NextResponse.json({
        purged_count: purgedCount,
        message: "Expired audit events purged successfully",
      });
    } else {
      return NextResponse.json(
        { error: "Invalid action parameter" },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error("Error handling compliance deletion:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Export wrapped handlers with audit logging
export const GET = withAuditLogging(handleGET, { logLevel: "sensitive_only" });
export const POST = withAuditLogging(handlePOST, { logLevel: "all" });
export const DELETE = withAuditLogging(handleDELETE, { logLevel: "all" });
