import { NextRequest, NextResponse } from "next/server";
import {
  generateFollowUpPlan,
  generateFollowUpEmail,
  generateCallScript,
  analyzeEngagement,
} from "../../../../lib/ai/follow-up-automation";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data } = body;

    if (!action) {
      return NextResponse.json(
        { error: "Action type is required" },
        { status: 400 },
      );
    }

    let result;

    switch (action) {
      case "generate_plan":
        if (!data.extractedData) {
          return NextResponse.json(
            { error: "Extracted data is required for plan generation" },
            { status: 400 },
          );
        }
        result = await generateFollowUpPlan(data);
        break;

      case "generate_email":
        if (!data.extractedData || !data.emailType) {
          return NextResponse.json(
            { error: "Extracted data and email type are required" },
            { status: 400 },
          );
        }
        result = await generateFollowUpEmail(
          data.extractedData,
          data.emailType,
          data.previousEmails,
        );
        break;

      case "generate_script":
        if (!data.extractedData || !data.callType) {
          return NextResponse.json(
            { error: "Extracted data and call type are required" },
            { status: 400 },
          );
        }
        result = await generateCallScript(data.extractedData, data.callType);
        break;

      case "analyze_engagement":
        if (!data.extractedData) {
          return NextResponse.json(
            { error: "Extracted data is required for engagement analysis" },
            { status: 400 },
          );
        }
        result = await analyzeEngagement(
          data.extractedData,
          data.recentActivity,
        );
        break;

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }

    return NextResponse.json({
      success: true,
      action,
      result,
      processedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Follow-up automation error:", error);
    return NextResponse.json(
      { error: "Failed to process follow-up automation request" },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Follow-up automation endpoint",
    methods: ["POST"],
    supported_actions: {
      generate_plan: {
        description: "Generate comprehensive follow-up plan",
        required_fields: ["extractedData"],
        optional_fields: ["quote", "previousInteractions", "customerBehavior"],
      },
      generate_email: {
        description: "Generate personalized follow-up email",
        required_fields: ["extractedData", "emailType"],
        optional_fields: ["previousEmails"],
        email_types: [
          "initial",
          "reminder",
          "value_add",
          "objection_handling",
          "final",
        ],
      },
      generate_script: {
        description: "Generate call script",
        required_fields: ["extractedData", "callType"],
        call_types: ["initial", "follow_up", "objection_handling", "closing"],
      },
      analyze_engagement: {
        description: "Analyze customer engagement and suggest actions",
        required_fields: ["extractedData"],
        optional_fields: ["recentActivity"],
      },
    },
  });
}
