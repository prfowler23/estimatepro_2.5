import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(request: NextRequest) {
  try {
    // Read bundle history file
    const historyPath = path.join(process.cwd(), "bundle-history.json");
    const metricsPath = path.join(process.cwd(), "bundle-metrics.json");

    let history = [];
    let currentMetrics = null;

    if (fs.existsSync(historyPath)) {
      const historyData = fs.readFileSync(historyPath, "utf8");
      history = JSON.parse(historyData);
    }

    if (fs.existsSync(metricsPath)) {
      const metricsData = fs.readFileSync(metricsPath, "utf8");
      currentMetrics = JSON.parse(metricsData);
    }

    return NextResponse.json({
      history,
      current: currentMetrics,
    });
  } catch (error) {
    console.error("Bundle metrics endpoint error:", error);
    return NextResponse.json(
      { error: "Failed to fetch bundle metrics" },
      { status: 500 },
    );
  }
}
