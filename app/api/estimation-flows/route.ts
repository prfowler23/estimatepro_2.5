import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/server";
import { createServerSupabaseClient } from "@/lib/auth/server";
import {
  estimationFlowSchema,
  validateRequest,
  sanitizeObject,
} from "@/lib/schemas/api-validation";
import { generalRateLimiter } from "@/lib/utils/rate-limit";
import { ErrorResponses, logApiError } from "@/lib/api/error-responses";

export async function POST(request: NextRequest) {
  try {
    // Authenticate request
    const { user, error: authError } = await authenticateRequest(request);
    if (authError || !user) {
      return ErrorResponses.unauthorized(authError || "Unauthorized");
    }

    // Apply rate limiting
    const rateLimitResult = await generalRateLimiter(request);
    if (!rateLimitResult.allowed) {
      return ErrorResponses.rateLimitExceeded();
    }

    const supabase = createServerSupabaseClient();
    const requestBody = await request.json();

    // Validate step transition if updating existing flow
    if (requestBody.flow_id) {
      const { data: existingFlow, error: fetchError } = await supabase
        .from("estimation_flows")
        .select("current_step, user_id")
        .eq("id", requestBody.flow_id)
        .single();

      if (fetchError || !existingFlow) {
        return ErrorResponses.notFound("Estimation flow not found");
      }

      // Verify ownership
      if (existingFlow.user_id !== user.id) {
        return ErrorResponses.forbidden(
          "You don't have permission to modify this flow",
        );
      }

      // Validate step progression (only allow next/previous step)
      const currentStep = existingFlow.current_step;
      const requestedStep = requestBody.step;
      if (Math.abs(currentStep - requestedStep) > 1) {
        return ErrorResponses.badRequest("Invalid step transition");
      }
    }

    // Validate and sanitize input
    const validation = validateRequest(estimationFlowSchema, {
      ...requestBody,
      userId: user.id,
    });

    if (!validation.success) {
      return ErrorResponses.badRequest(validation.error || "Validation failed");
    }

    const sanitizedData = sanitizeObject(validation.data!);

    // Create new estimation flow
    const { data: flow, error: flowError } = await supabase
      .from("estimation_flows")
      .insert({
        customer_id: sanitizedData.customer_id,
        status: "draft",
        current_step: 1,
        user_id: user.id,
        step: sanitizedData.step,
        data: sanitizedData.data,
      })
      .select()
      .single();

    if (flowError) {
      logApiError(flowError, {
        endpoint: "/api/estimation-flows",
        method: "POST",
        userId: user.id,
      });
      return ErrorResponses.databaseError("Create estimation flow");
    }

    return NextResponse.json({ flow }, { status: 201 });
  } catch (error) {
    logApiError(error, {
      endpoint: "/api/estimation-flows",
      method: "POST",
    });
    return ErrorResponses.internalError();
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Authenticate request
    const { user, error: authError } = await authenticateRequest(request);
    if (authError || !user) {
      return ErrorResponses.unauthorized(authError || "Unauthorized");
    }

    // Apply rate limiting
    const rateLimitResult = await generalRateLimiter(request);
    if (!rateLimitResult.allowed) {
      return ErrorResponses.rateLimitExceeded();
    }

    const supabase = createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const flowId = searchParams.get("id");

    if (!flowId) {
      return ErrorResponses.badRequest("Flow ID is required");
    }

    const requestBody = await request.json();

    // Verify ownership and validate step transition
    const { data: existingFlow, error: fetchError } = await supabase
      .from("estimation_flows")
      .select("current_step, user_id")
      .eq("id", flowId)
      .single();

    if (fetchError || !existingFlow) {
      return ErrorResponses.notFound("Estimation flow not found");
    }

    if (existingFlow.user_id !== user.id) {
      return ErrorResponses.forbidden(
        "You don't have permission to modify this flow",
      );
    }

    // Validate step transition
    if (requestBody.current_step !== undefined) {
      const currentStep = existingFlow.current_step;
      const requestedStep = requestBody.current_step;
      if (Math.abs(currentStep - requestedStep) > 1) {
        return ErrorResponses.badRequest("Invalid step transition");
      }
    }

    // Update the flow
    const { data: updatedFlow, error: updateError } = await supabase
      .from("estimation_flows")
      .update({
        ...requestBody,
        updated_at: new Date().toISOString(),
      })
      .eq("id", flowId)
      .eq("user_id", user.id) // Double-check ownership
      .select()
      .single();

    if (updateError) {
      logApiError(updateError, {
        endpoint: "/api/estimation-flows",
        method: "PUT",
        userId: user.id,
      });
      return ErrorResponses.databaseError("Update estimation flow");
    }

    return NextResponse.json({ flow: updatedFlow });
  } catch (error) {
    logApiError(error, {
      endpoint: "/api/estimation-flows",
      method: "PUT",
    });
    return ErrorResponses.internalError();
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate request
    const { user, error: authError } = await authenticateRequest(request);
    if (authError || !user) {
      return ErrorResponses.unauthorized(authError || "Unauthorized");
    }

    const supabase = createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    let query = supabase
      .from("estimation_flows")
      .select(
        `
        *,
        estimates!inner(
          id,
          quote_number,
          customer_name,
          created_at,
          created_by
        )
      `,
      )
      .eq("estimates.created_by", user.id);

    if (status) {
      query = query.eq("status", status);
    }

    const { data: flows, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      logApiError(error, {
        endpoint: "/api/estimation-flows",
        method: "GET",
        userId: user.id,
      });
      return ErrorResponses.databaseError("Fetch estimation flows");
    }

    return NextResponse.json({ flows });
  } catch (error) {
    logApiError(error, {
      endpoint: "/api/estimation-flows",
      method: "GET",
    });
    return ErrorResponses.internalError();
  }
}
