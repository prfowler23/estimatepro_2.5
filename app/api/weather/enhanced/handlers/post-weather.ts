import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/server";
import {
  handleBulkWeatherAnalysis,
  handleLocationSearch,
  handleHistoricalLookup,
  handleAlertsSubscription,
} from "../services/weather-post-handlers";

export async function handlePOST(request: NextRequest) {
  try {
    // Authenticate the request
    const { user, error: authError } = await authenticateRequest(request);
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, parameters } = body;

    switch (action) {
      case "bulk_analysis":
        return await handleBulkWeatherAnalysis(parameters, user.id);

      case "location_search":
        return await handleLocationSearch(parameters, user.id);

      case "historical_lookup":
        return await handleHistoricalLookup(parameters, user.id);

      case "alerts_subscription":
        return await handleAlertsSubscription(parameters, user.id);

      default:
        return NextResponse.json(
          { error: "Invalid action parameter" },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("Enhanced weather POST error:", error);
    return NextResponse.json(
      { error: "Failed to process weather request" },
      { status: 500 },
    );
  }
}
