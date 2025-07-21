import { NextRequest, NextResponse } from "next/server";
import { DroneService, type FlightObjective } from "@/lib/drone/drone-service";
import { apiRateLimit } from "@/lib/utils/rate-limiter";

const droneService = new DroneService();

async function handleDroneOperations(request: NextRequest) {
  try {
    const { method } = request;
    const { searchParams } = new URL(request.url);
    const operation = searchParams.get("operation");

    switch (method) {
      case "GET":
        return handleGetOperations(operation, searchParams);

      case "POST":
        return handlePostOperations(operation, request);

      default:
        return NextResponse.json(
          { error: "Method not allowed" },
          { status: 405 },
        );
    }
  } catch (error) {
    console.error("Drone operations error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

async function handleGetOperations(
  operation: string | null,
  searchParams: URLSearchParams,
): Promise<NextResponse> {
  switch (operation) {
    case "fleet":
      const drones = droneService.getAvailableDrones();
      return NextResponse.json({ drones });

    case "flight-plans":
      const flightPlans = droneService.getFlightPlans();
      return NextResponse.json({ flightPlans });

    case "flight-history":
      const flightHistory = droneService.getFlightHistory();
      return NextResponse.json({ flightHistory });

    case "validate-plan":
      const planId = searchParams.get("planId");
      if (!planId) {
        return NextResponse.json(
          { error: "Plan ID required" },
          { status: 400 },
        );
      }

      const validation = await droneService.validateFlightPlan(planId);
      return NextResponse.json({ validation });

    case "drone-specs":
      const droneId = searchParams.get("droneId");
      if (!droneId) {
        return NextResponse.json(
          { error: "Drone ID required" },
          { status: 400 },
        );
      }

      const drone = droneService.getDroneById(droneId);
      if (!drone) {
        return NextResponse.json({ error: "Drone not found" }, { status: 404 });
      }

      return NextResponse.json({ drone });

    default:
      return NextResponse.json({ error: "Invalid operation" }, { status: 400 });
  }
}

async function handlePostOperations(
  operation: string | null,
  request: NextRequest,
): Promise<NextResponse> {
  const body = await request.json();

  switch (operation) {
    case "create-flight-plan":
      const { projectId, objectives, location, droneId, pilotId } = body;

      if (!projectId || !objectives || !location || !pilotId) {
        return NextResponse.json(
          { error: "Missing required fields" },
          { status: 400 },
        );
      }

      // Validate objectives
      const validObjectives: FlightObjective[] = objectives.map((obj: any) => ({
        id: obj.id || `obj-${Date.now()}`,
        type: obj.type,
        priority: obj.priority || "medium",
        description: obj.description || "",
        expectedOutcome: obj.expectedOutcome || "",
        captureRequirements: {
          photoCount: obj.captureRequirements?.photoCount || 10,
          videoLength: obj.captureRequirements?.videoLength,
          resolutionRequired:
            obj.captureRequirements?.resolutionRequired || "4K",
          angles: obj.captureRequirements?.angles || ["overhead"],
        },
      }));

      const flightPlan = await droneService.createFlightPlan({
        projectId,
        objectives: validObjectives,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
        },
        droneId,
        pilotId,
      });

      return NextResponse.json({
        success: true,
        flightPlan,
        message: "Flight plan created successfully",
      });

    case "execute-flight":
      const { flightPlanId } = body;

      if (!flightPlanId) {
        return NextResponse.json(
          { error: "Flight plan ID required" },
          { status: 400 },
        );
      }

      const flightResult = await droneService.executeFlightPlan(flightPlanId);

      return NextResponse.json({
        success: true,
        flightResult,
        message: "Flight executed successfully",
      });

    case "analyze-photo":
      const {
        photoId,
        flightId,
        imageUrl,
        location: photoLocation,
        analysisType,
      } = body;

      if (
        !photoId ||
        !flightId ||
        !imageUrl ||
        !photoLocation ||
        !analysisType
      ) {
        return NextResponse.json(
          { error: "Missing required fields for photo analysis" },
          { status: 400 },
        );
      }

      const analysis = await droneService.analyzeAerialPhoto({
        photoId,
        flightId,
        imageUrl,
        location: {
          latitude: photoLocation.latitude,
          longitude: photoLocation.longitude,
          altitude: photoLocation.altitude || 100,
        },
        timestamp: new Date(),
        analysisType,
      });

      return NextResponse.json({
        success: true,
        analysis,
        message: "Photo analysis completed",
      });

    case "weather-check":
      const { lat, lng } = body;

      if (!lat || !lng) {
        return NextResponse.json(
          { error: "Latitude and longitude required" },
          { status: 400 },
        );
      }

      // Simulate weather API call
      const weatherData = {
        windSpeed: 5 + Math.random() * 15, // 5-20 mph
        visibility: 8000 + Math.random() * 4000, // 8-12km
        temperature: 60 + Math.random() * 40, // 60-100°F
        precipitation: Math.random() > 0.8 ? Math.random() * 0.2 : 0, // 20% chance of rain
        cloudCeiling: 2000 + Math.random() * 8000, // 2000-10000 ft
        conditions: "Clear",
        humidity: 40 + Math.random() * 40, // 40-80%
        pressure: 29.8 + Math.random() * 0.4, // 29.8-30.2 inHg
        timestamp: new Date().toISOString(),
      };

      // Determine flight suitability
      const flightSuitability = {
        suitable:
          weatherData.windSpeed < 20 &&
          weatherData.visibility > 3000 &&
          weatherData.precipitation < 0.1,
        issues: [] as string[],
        warnings: [] as string[],
      };

      if (weatherData.windSpeed >= 20) {
        flightSuitability.issues.push("Wind speed too high for safe operation");
      } else if (weatherData.windSpeed >= 15) {
        flightSuitability.warnings.push("Wind speed approaching maximum limit");
      }

      if (weatherData.visibility < 3000) {
        flightSuitability.issues.push("Visibility too low for safe operation");
      } else if (weatherData.visibility < 5000) {
        flightSuitability.warnings.push("Reduced visibility conditions");
      }

      if (weatherData.precipitation >= 0.1) {
        flightSuitability.issues.push(
          "Precipitation detected - flight not recommended",
        );
      }

      return NextResponse.json({
        success: true,
        weather: weatherData,
        flightSuitability,
        message: "Weather data retrieved",
      });

    default:
      return NextResponse.json({ error: "Invalid operation" }, { status: 400 });
  }
}

// Apply rate limiting
export const GET = (req: NextRequest) =>
  apiRateLimit({})(req, handleDroneOperations);
export const POST = (req: NextRequest) =>
  apiRateLimit({})(req, handleDroneOperations);
