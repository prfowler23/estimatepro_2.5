import { NextRequest, NextResponse } from "next/server";
import { unifiedEstimateService } from "@/lib/services/estimate-service-unified";
import { getUser } from "@/lib/auth/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch estimate using the business service
    const { id } = await params;
    const estimate = await unifiedEstimateService.getEstimateById(id);

    if (!estimate) {
      return NextResponse.json(
        { error: "Estimate not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      estimate,
    });
  } catch (error) {
    console.error("Error fetching estimate:", error);
    return NextResponse.json(
      { error: "Failed to fetch estimate" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id } = await params;

    // Update estimate using the business service
    const success = await unifiedEstimateService.updateEstimate(id, body);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to update estimate" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Estimate updated successfully",
    });
  } catch (error) {
    console.error("Error updating estimate:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update estimate",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete estimate using the business service
    const { id } = await params;
    const success = await unifiedEstimateService.deleteEstimate(id);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to delete estimate" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Estimate deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting estimate:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete estimate",
      },
      { status: 500 },
    );
  }
}
