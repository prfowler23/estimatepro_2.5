"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Plane,
  MapPin,
  Clock,
  Battery,
  Camera,
  Wifi,
  AlertTriangle,
  CheckCircle,
  PlayCircle,
  Settings,
  Download,
  Upload,
  Map,
  BarChart3,
  FileText,
  Calendar,
  Shield,
  Wind,
  Thermometer,
  Eye,
  Navigation,
} from "lucide-react";
import {
  DroneService,
  type FlightPlan,
  type DroneSpec,
  type DroneFlightResult,
  type FlightObjective,
} from "@/lib/drone/drone-service";
import { config } from "@/lib/config";
import { DRONE_CONSTANTS } from "./constants";
import { logBusinessError } from "@/lib/services/error-service";

interface DroneDashboardProps {
  projectId?: string;
  location?: { latitude: number; longitude: number };
  onFlightPlanCreated?: (flightPlan: FlightPlan) => void;
  onAnalysisComplete?: (analysis: DroneFlightResult) => void;
}

export function DroneDashboard({
  projectId = DRONE_CONSTANTS.DEFAULT_PROJECT_ID,
  location = {
    latitude: DRONE_CONSTANTS.DEFAULT_LOCATION.latitude,
    longitude: DRONE_CONSTANTS.DEFAULT_LOCATION.longitude,
  },
  onFlightPlanCreated,
  onAnalysisComplete,
}: DroneDashboardProps) {
  const [droneService] = useState(() => new DroneService());
  const [activeTab, setActiveTab] = useState("overview");
  const [isEnabled, setIsEnabled] = useState(config.features.drone);
  const [availableDrones, setAvailableDrones] = useState<DroneSpec[]>([]);
  const [flightPlans, setFlightPlans] = useState<FlightPlan[]>([]);
  const [flightResults, setFlightResults] = useState<DroneFlightResult[]>([]);
  const [selectedDrone, setSelectedDrone] = useState<DroneSpec | null>(null);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);

  // Weather simulation
  const [weatherConditions, setWeatherConditions] = useState(
    DRONE_CONSTANTS.DEFAULT_WEATHER_CONDITIONS,
  );

  useEffect(() => {
    if (isEnabled) {
      const drones = droneService.getAvailableDrones();
      setAvailableDrones(drones);
      setSelectedDrone(drones[0] || null);
      setFlightPlans(droneService.getFlightPlans());
      setFlightResults(droneService.getFlightHistory());
    }
  }, [isEnabled, droneService]);

  const createQuickFlightPlan = async (objectives: FlightObjective[]) => {
    if (!selectedDrone) return;

    setIsCreatingPlan(true);
    try {
      const flightPlan = await droneService.createFlightPlan({
        projectId,
        objectives,
        location,
        droneId: selectedDrone.id,
        pilotId: DRONE_CONSTANTS.DEFAULT_PILOT_ID,
      });

      setFlightPlans([...flightPlans, flightPlan]);
      onFlightPlanCreated?.(flightPlan);
    } catch (error) {
      logBusinessError(error, {
        component: "DroneDashboard",
        action: "createQuickFlightPlan",
        metadata: { projectId, objectives, droneId: selectedDrone.id },
      });
    } finally {
      setIsCreatingPlan(false);
    }
  };

  const executeFlightPlan = async (flightPlanId: string) => {
    try {
      const result = await droneService.executeFlightPlan(flightPlanId);
      setFlightResults([...flightResults, result]);

      // Update flight plan status
      setFlightPlans((prev) =>
        prev.map((plan) =>
          plan.id === flightPlanId
            ? { ...plan, status: "completed" as const }
            : plan,
        ),
      );
    } catch (error) {
      logBusinessError(error, {
        component: "DroneDashboard",
        action: "executeFlightPlan",
        metadata: { flightPlanId },
      });
    }
  };

  const getFlightSuitability = () => {
    const drone = selectedDrone;
    if (!drone) return { suitable: false, issues: ["No drone selected"] };

    const issues: string[] = [];
    const warnings: string[] = [];

    if (weatherConditions.windSpeed > drone.weatherLimits.maxWindSpeed) {
      issues.push(
        `Wind speed too high (${weatherConditions.windSpeed} mph > ${drone.weatherLimits.maxWindSpeed} mph)`,
      );
    }

    if (weatherConditions.visibility < drone.weatherLimits.minVisibility) {
      issues.push(
        `Visibility too low (${weatherConditions.visibility}m < ${drone.weatherLimits.minVisibility}m)`,
      );
    }

    if (
      weatherConditions.temperature <
        drone.weatherLimits.temperatureRange.min ||
      weatherConditions.temperature > drone.weatherLimits.temperatureRange.max
    ) {
      warnings.push("Temperature outside optimal range");
    }

    if (weatherConditions.precipitation > 0) {
      issues.push("Precipitation detected");
    }

    return {
      suitable: issues.length === 0,
      issues,
      warnings,
    };
  };

  if (!isEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plane className="w-5 h-5" />
            Drone Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <Plane className="h-4 w-4" />
            <AlertDescription>
              Drone integration features are currently disabled. Contact your
              administrator to enable advanced aerial inspection capabilities.
            </AlertDescription>
          </Alert>
          <div className="mt-4">
            <Button
              onClick={() => setIsEnabled(true)}
              variant="outline"
              className="w-full"
            >
              Enable Drone Features (Demo Mode)
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const suitability = getFlightSuitability();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Plane className="w-6 h-6 text-primary-600" />
          Drone Operations Center
        </h2>
        <p className="text-muted-foreground">
          Advanced aerial inspection and analysis platform
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="fleet">Fleet</TabsTrigger>
          <TabsTrigger value="planning">Planning</TabsTrigger>
          <TabsTrigger value="execution">Execution</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Weather & Flight Conditions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wind className="w-5 h-5" />
                Flight Conditions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <Wind className="w-6 h-6 mx-auto mb-2 text-primary-600" />
                  <p className="text-sm text-muted-foreground">Wind Speed</p>
                  <p className="text-lg font-bold">
                    {weatherConditions.windSpeed} mph
                  </p>
                </div>
                <div className="text-center">
                  <Eye className="w-6 h-6 mx-auto mb-2 text-success-600" />
                  <p className="text-sm text-muted-foreground">Visibility</p>
                  <p className="text-lg font-bold">
                    {weatherConditions.visibility}m
                  </p>
                </div>
                <div className="text-center">
                  <Thermometer className="w-6 h-6 mx-auto mb-2 text-warning-600" />
                  <p className="text-sm text-muted-foreground">Temperature</p>
                  <p className="text-lg font-bold">
                    {weatherConditions.temperature}°F
                  </p>
                </div>
                <div className="text-center">
                  <Navigation className="w-6 h-6 mx-auto mb-2 text-primary-600" />
                  <p className="text-sm text-muted-foreground">Ceiling</p>
                  <p className="text-lg font-bold">
                    {weatherConditions.cloudCeiling}ft
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <Badge
                  className={`w-full justify-center ${
                    suitability.suitable
                      ? "bg-success-600 text-white"
                      : "bg-error-600 text-white"
                  }`}
                >
                  {suitability.suitable
                    ? "✓ FLIGHT CONDITIONS SUITABLE"
                    : "⚠ FLIGHT CONDITIONS NOT SUITABLE"}
                </Badge>

                {suitability.issues.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {suitability.issues.map((issue, index) => (
                      <Alert key={index} className="py-2">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="text-sm">
                          {issue}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Flight Plans</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button
                  onClick={() =>
                    createQuickFlightPlan([
                      DRONE_CONSTANTS.FLIGHT_OBJECTIVES.ROOF_INSPECTION,
                    ])
                  }
                  disabled={!suitability.suitable || isCreatingPlan}
                  className="h-20 flex-col"
                >
                  <Camera className="w-6 h-6 mb-2" />
                  Roof Inspection
                </Button>

                <Button
                  onClick={() =>
                    createQuickFlightPlan([
                      DRONE_CONSTANTS.FLIGHT_OBJECTIVES.FACADE_ANALYSIS,
                    ])
                  }
                  disabled={!suitability.suitable || isCreatingPlan}
                  variant="outline"
                  className="h-20 flex-col"
                >
                  <FileText className="w-6 h-6 mb-2" />
                  Facade Analysis
                </Button>

                <Button
                  onClick={() =>
                    createQuickFlightPlan([
                      DRONE_CONSTANTS.FLIGHT_OBJECTIVES.AREA_SURVEY,
                    ])
                  }
                  disabled={!suitability.suitable || isCreatingPlan}
                  variant="outline"
                  className="h-20 flex-col"
                >
                  <Map className="w-6 h-6 mb-2" />
                  Area Survey
                </Button>

                <Button
                  onClick={() =>
                    createQuickFlightPlan([
                      DRONE_CONSTANTS.FLIGHT_OBJECTIVES.MAPPING_3D,
                    ])
                  }
                  disabled={!suitability.suitable || isCreatingPlan}
                  variant="outline"
                  className="h-20 flex-col"
                >
                  <BarChart3 className="w-6 h-6 mb-2" />
                  3D Mapping
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Flight Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {flightResults.length > 0 ? (
                <div className="space-y-3">
                  {flightResults
                    .slice(-DRONE_CONSTANTS.RECENT_ACTIVITY_LIMIT)
                    .map((result) => (
                      <div
                        key={result.flightId}
                        className="flex items-center justify-between p-3 border rounded"
                      >
                        <div className="flex items-center gap-3">
                          <CheckCircle className="w-5 h-5 text-success-600" />
                          <div>
                            <p className="font-medium">
                              Flight {result.flightId}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {result.photosCapture} photos •{" "}
                              {result.actualDuration.toFixed(1)} min
                            </p>
                          </div>
                        </div>
                        <Badge className="bg-success-600 text-white">
                          Completed
                        </Badge>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No recent flight activity
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fleet" className="space-y-6">
          {/* Drone Fleet */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {availableDrones.map((drone) => (
              <Card
                key={drone.id}
                className={
                  selectedDrone?.id === drone.id
                    ? "ring-2 ring-primary-500"
                    : ""
                }
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Plane className="w-5 h-5" />
                      {drone.name}
                    </span>
                    <Badge
                      variant={
                        selectedDrone?.id === drone.id ? "default" : "outline"
                      }
                    >
                      {selectedDrone?.id === drone.id
                        ? "Selected"
                        : "Available"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Battery className="w-4 h-4" />
                        <span>{drone.batteryLife} min</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>{(drone.maxRange / 1000).toFixed(1)} km</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Camera className="w-4 h-4" />
                        <span>{drone.cameraSpecs.resolution}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Wind className="w-4 h-4" />
                        <span>≤{drone.weatherLimits.maxWindSpeed} mph</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {drone.certifications.map((cert) => (
                        <Badge key={cert} variant="outline" className="text-xs">
                          {cert}
                        </Badge>
                      ))}
                    </div>

                    <Button
                      onClick={() => setSelectedDrone(drone)}
                      variant={
                        selectedDrone?.id === drone.id ? "default" : "outline"
                      }
                      className="w-full"
                    >
                      {selectedDrone?.id === drone.id
                        ? "Selected"
                        : "Select Drone"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="planning" className="space-y-6">
          {/* Flight Plans */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Flight Plans</span>
                <Button
                  onClick={() => setActiveTab("overview")}
                  disabled={!suitability.suitable}
                >
                  Create New Plan
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {flightPlans.length > 0 ? (
                <div className="space-y-4">
                  {flightPlans.map((plan) => (
                    <div key={plan.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium">{plan.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {plan.objectives.length} objectives •{" "}
                            {plan.estimatedDuration} min •{" "}
                            {plan.waypoints.length} waypoints
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            className={
                              plan.status === "completed"
                                ? "bg-success-600 text-white"
                                : plan.status === "in_progress"
                                  ? "bg-primary-600 text-white"
                                  : "bg-bg-muted text-text-secondary"
                            }
                          >
                            {plan.status}
                          </Badge>
                          {plan.status === "draft" && (
                            <Button
                              size="sm"
                              onClick={() => executeFlightPlan(plan.id)}
                              disabled={!suitability.suitable}
                            >
                              <PlayCircle className="w-4 h-4 mr-1" />
                              Execute
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Objectives</p>
                          <div className="space-y-1">
                            {plan.objectives.map((obj) => (
                              <Badge
                                key={obj.id}
                                variant="outline"
                                className="text-xs"
                              >
                                {obj.type.replace("_", " ")}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Pilot</p>
                          <p className="font-medium">{plan.pilot.name}</p>
                          <p className="text-xs">{plan.pilot.licenseNumber}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Planned Date</p>
                          <p className="font-medium">
                            {plan.plannedDate.toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No flight plans created yet
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="execution" className="space-y-6">
          {/* Real-time Flight Monitoring */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wifi className="w-5 h-5" />
                Flight Monitoring
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Plane className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No Active Flights</h3>
                <p className="text-muted-foreground mb-4">
                  Execute a flight plan to monitor drone operations in real-time
                </p>
                <Button onClick={() => setActiveTab("planning")}>
                  View Flight Plans
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          {/* Analysis Results */}
          <Card>
            <CardHeader>
              <CardTitle>Aerial Analysis Results</CardTitle>
            </CardHeader>
            <CardContent>
              {flightResults.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 border rounded">
                      <h4 className="font-medium mb-2">Total Flights</h4>
                      <p className="text-2xl font-bold text-primary-600">
                        {flightResults.length}
                      </p>
                    </div>
                    <div className="text-center p-4 border rounded">
                      <h4 className="font-medium mb-2">Photos Captured</h4>
                      <p className="text-2xl font-bold text-success-600">
                        {flightResults.reduce(
                          (sum, result) => sum + result.photosCapture,
                          0,
                        )}
                      </p>
                    </div>
                    <div className="text-center p-4 border rounded">
                      <h4 className="font-medium mb-2">Flight Hours</h4>
                      <p className="text-2xl font-bold text-primary-600">
                        {(
                          flightResults.reduce(
                            (sum, result) => sum + result.actualDuration,
                            0,
                          ) / 60
                        ).toFixed(1)}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {flightResults.map((result) => (
                      <div key={result.flightId} className="border rounded p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium">
                            Flight {result.flightId}
                          </h5>
                          <Badge className="bg-success-600 text-white">
                            {result.dataQuality} Quality
                          </Badge>
                        </div>
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Duration</p>
                            <p className="font-medium">
                              {result.actualDuration.toFixed(1)} min
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Photos</p>
                            <p className="font-medium">
                              {result.photosCapture}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">
                              Battery Used
                            </p>
                            <p className="font-medium">
                              {result.batteryUsed.toFixed(0)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Weather</p>
                            <p className="font-medium">
                              {result.weatherConditions.windSpeed.toFixed(0)}{" "}
                              mph wind
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No analysis data available yet
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
