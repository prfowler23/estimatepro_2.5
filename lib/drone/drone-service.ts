/**
 * Drone Integration Service
 * Comprehensive drone flight planning, management, and compliance system
 */

export interface DroneSpec {
  id: string;
  name: string;
  type: "quadcopter" | "fixed_wing" | "hybrid";
  maxFlightTime: number; // minutes
  maxRange: number; // meters
  cameraSpecs: {
    resolution: string;
    stabilization: boolean;
    zoomCapability: number;
    thermalImaging: boolean;
  };
  weatherLimits: {
    maxWindSpeed: number; // mph
    minVisibility: number; // meters
    temperatureRange: { min: number; max: number };
  };
  certifications: string[];
  batteryLife: number; // minutes
  weight: number; // grams
}

export interface FlightPlan {
  id: string;
  name: string;
  projectId: string;
  droneId: string;
  plannedDate: Date;
  estimatedDuration: number; // minutes
  waypoints: Waypoint[];
  flightPath: FlightPath;
  objectives: FlightObjective[];
  safetyChecklist: SafetyItem[];
  weatherRequirements: WeatherRequirements;
  permits: Permit[];
  status: "draft" | "approved" | "in_progress" | "completed" | "cancelled";
  pilot: {
    id: string;
    name: string;
    licenseNumber: string;
    certifications: string[];
  };
}

export interface Waypoint {
  id: string;
  latitude: number;
  longitude: number;
  altitude: number; // feet AGL
  action: "hover" | "photo" | "video" | "scan" | "survey";
  duration: number; // seconds
  cameraSettings: {
    angle: number;
    focus: "auto" | "manual";
    exposure: string;
  };
}

export interface FlightPath {
  takeoffPoint: { latitude: number; longitude: number };
  landingPoint: { latitude: number; longitude: number };
  totalDistance: number; // meters
  maxAltitude: number; // feet AGL
  noFlyZones: NoFlyZone[];
  emergencyLandingSites: EmergencyLandingSite[];
}

export interface FlightObjective {
  id: string;
  type:
    | "roof_inspection"
    | "facade_analysis"
    | "area_survey"
    | "damage_assessment"
    | "3d_mapping";
  priority: "high" | "medium" | "low";
  description: string;
  expectedOutcome: string;
  captureRequirements: {
    photoCount: number;
    videoLength?: number;
    resolutionRequired: string;
    angles: string[];
  };
}

export interface SafetyItem {
  id: string;
  category: "pre_flight" | "during_flight" | "post_flight";
  item: string;
  required: boolean;
  completed: boolean;
  completedBy?: string;
  completedAt?: Date;
}

export interface WeatherRequirements {
  maxWindSpeed: number;
  minVisibility: number;
  maxPrecipitation: number;
  temperatureRange: { min: number; max: number };
  cloudCeiling: number; // feet
}

export interface Permit {
  id: string;
  type:
    | "part_107"
    | "airspace_authorization"
    | "local_permit"
    | "property_permission";
  issuingAuthority: string;
  permitNumber: string;
  validFrom: Date;
  validUntil: Date;
  restrictions: string[];
  status: "pending" | "approved" | "expired" | "denied";
}

export interface NoFlyZone {
  id: string;
  name: string;
  coordinates: { latitude: number; longitude: number }[];
  type: "airport" | "military" | "prison" | "power_plant" | "restricted";
  maxAltitude: number;
  timeRestrictions?: string;
}

export interface EmergencyLandingSite {
  id: string;
  latitude: number;
  longitude: number;
  suitability: "excellent" | "good" | "fair" | "emergency_only";
  obstacles: string[];
  accessibility: string;
}

export interface DroneFlightResult {
  flightId: string;
  actualDuration: number;
  photosCapture: number;
  videoLength: number;
  batteryUsed: number;
  weatherConditions: {
    windSpeed: number;
    visibility: number;
    temperature: number;
    precipitation: number;
  };
  incidents: DroneIncident[];
  dataQuality: "excellent" | "good" | "fair" | "poor";
  completedObjectives: string[];
  issues: string[];
}

export interface DroneIncident {
  id: string;
  type:
    | "weather"
    | "mechanical"
    | "pilot_error"
    | "interference"
    | "emergency_landing";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  timestamp: Date;
  actionTaken: string;
  resolved: boolean;
}

export interface AerialPhotoAnalysis {
  photoId: string;
  flightId: string;
  location: { latitude: number; longitude: number; altitude: number };
  timestamp: Date;
  analysis: {
    roofCondition?: {
      overallCondition: "excellent" | "good" | "fair" | "poor";
      issues: string[];
      materialType: string;
      estimatedAge: number;
      damageAreas: DamageArea[];
    };
    facadeCondition?: {
      condition: "excellent" | "good" | "fair" | "poor";
      cleaningNeeded: boolean;
      materialCondition: string;
      accessPoints: AccessPoint[];
    };
    structuralIssues?: {
      issuesFound: boolean;
      issueTypes: string[];
      severity: "low" | "medium" | "high";
      recommendations: string[];
    };
  };
  measurements: {
    height: number;
    width: number;
    area: number;
    distances: { [key: string]: number };
  };
  aiConfidence: number;
}

export interface DamageArea {
  id: string;
  type:
    | "crack"
    | "missing_material"
    | "discoloration"
    | "vegetation"
    | "debris";
  severity: "minor" | "moderate" | "severe";
  coordinates: { x: number; y: number }[];
  estimatedRepairCost: number;
  priority: "low" | "medium" | "high" | "urgent";
}

export interface AccessPoint {
  id: string;
  type: "ground" | "ladder" | "lift" | "scaffold" | "rope_access";
  location: { x: number; y: number };
  difficulty: "easy" | "moderate" | "difficult" | "extreme";
  safetyRequirements: string[];
  estimatedTime: number;
}

export class DroneService {
  private droneFleet: DroneSpec[] = [];
  private flightPlans: FlightPlan[] = [];
  private flightResults: DroneFlightResult[] = [];

  constructor() {
    this.initializeDefaultDrones();
  }

  // Drone Fleet Management
  private initializeDefaultDrones(): void {
    this.droneFleet = [
      {
        id: "dji-mavic-3-enterprise",
        name: "DJI Mavic 3 Enterprise",
        type: "quadcopter",
        maxFlightTime: 45,
        maxRange: 15000,
        cameraSpecs: {
          resolution: "5.1K",
          stabilization: true,
          zoomCapability: 56,
          thermalImaging: true,
        },
        weatherLimits: {
          maxWindSpeed: 23,
          minVisibility: 500,
          temperatureRange: { min: -10, max: 40 },
        },
        certifications: ["Part 107", "CE", "FCC"],
        batteryLife: 45,
        weight: 915,
      },
      {
        id: "dji-matrice-300",
        name: "DJI Matrice 300 RTK",
        type: "quadcopter",
        maxFlightTime: 55,
        maxRange: 15000,
        cameraSpecs: {
          resolution: "6K",
          stabilization: true,
          zoomCapability: 200,
          thermalImaging: true,
        },
        weatherLimits: {
          maxWindSpeed: 30,
          minVisibility: 300,
          temperatureRange: { min: -20, max: 50 },
        },
        certifications: ["Part 107", "CE", "FCC", "IP45"],
        batteryLife: 55,
        weight: 3800,
      },
    ];
  }

  // Flight Planning
  async createFlightPlan(params: {
    projectId: string;
    objectives: FlightObjective[];
    location: { latitude: number; longitude: number };
    droneId?: string;
    pilotId: string;
  }): Promise<FlightPlan> {
    const drone = params.droneId
      ? this.getDroneById(params.droneId)
      : this.selectOptimalDrone(params.objectives);

    if (!drone) {
      throw new Error("No suitable drone available for this mission");
    }

    const waypoints = await this.generateWaypoints(
      params.objectives,
      params.location,
    );
    const flightPath = await this.calculateFlightPath(
      waypoints,
      params.location,
    );
    const safetyChecklist = this.generateSafetyChecklist();

    const flightPlan: FlightPlan = {
      id: `flight-${Date.now()}`,
      name: `Flight Plan - ${new Date().toLocaleDateString()}`,
      projectId: params.projectId,
      droneId: drone.id,
      plannedDate: new Date(),
      estimatedDuration: this.calculateFlightDuration(waypoints, drone),
      waypoints,
      flightPath,
      objectives: params.objectives,
      safetyChecklist,
      weatherRequirements: drone.weatherLimits,
      permits: await this.checkRequiredPermits(params.location),
      status: "draft",
      pilot: {
        id: params.pilotId,
        name: "Certified Pilot", // Would be fetched from database
        licenseNumber: "PART107-XXXXXX",
        certifications: ["Part 107", "Visual Observer"],
      },
    };

    this.flightPlans.push(flightPlan);
    return flightPlan;
  }

  private selectOptimalDrone(objectives: FlightObjective[]): DroneSpec | null {
    // Select drone based on mission requirements
    const requiresThermal = objectives.some(
      (obj) =>
        obj.type === "roof_inspection" || obj.type === "damage_assessment",
    );

    const requiresHighRes = objectives.some(
      (obj) =>
        obj.captureRequirements.resolutionRequired === "4K" ||
        obj.captureRequirements.resolutionRequired === "6K",
    );

    return (
      this.droneFleet.find((drone) => {
        if (requiresThermal && !drone.cameraSpecs.thermalImaging) return false;
        if (requiresHighRes && !drone.cameraSpecs.resolution.includes("K"))
          return false;
        return true;
      }) || this.droneFleet[0]
    );
  }

  private async generateWaypoints(
    objectives: FlightObjective[],
    baseLocation: { latitude: number; longitude: number },
  ): Promise<Waypoint[]> {
    const waypoints: Waypoint[] = [];
    let waypointId = 1;

    for (const objective of objectives) {
      switch (objective.type) {
        case "roof_inspection":
          waypoints.push(
            ...this.generateRoofInspectionWaypoints(baseLocation, waypointId),
          );
          waypointId += 8;
          break;
        case "facade_analysis":
          waypoints.push(
            ...this.generateFacadeWaypoints(baseLocation, waypointId),
          );
          waypointId += 12;
          break;
        case "area_survey":
          waypoints.push(
            ...this.generateSurveyWaypoints(baseLocation, waypointId),
          );
          waypointId += 16;
          break;
        case "3d_mapping":
          waypoints.push(
            ...this.generate3DMappingWaypoints(baseLocation, waypointId),
          );
          waypointId += 24;
          break;
      }
    }

    return waypoints;
  }

  private generateRoofInspectionWaypoints(
    baseLocation: { latitude: number; longitude: number },
    startId: number,
  ): Waypoint[] {
    // Generate waypoints for comprehensive roof inspection
    const waypoints: Waypoint[] = [];
    const altitudes = [100, 150, 200]; // feet AGL
    const directions = [0, 45, 90, 135, 180, 225, 270, 315]; // degrees

    directions.forEach((direction, index) => {
      altitudes.forEach((altitude, altIndex) => {
        const offsetLat =
          baseLocation.latitude +
          0.0001 * Math.cos((direction * Math.PI) / 180);
        const offsetLng =
          baseLocation.longitude +
          0.0001 * Math.sin((direction * Math.PI) / 180);

        waypoints.push({
          id: `wp-${startId + index * 3 + altIndex}`,
          latitude: offsetLat,
          longitude: offsetLng,
          altitude: altitude,
          action: "photo",
          duration: 5,
          cameraSettings: {
            angle: -90, // Straight down
            focus: "auto",
            exposure: "auto",
          },
        });
      });
    });

    return waypoints.slice(0, 8); // Limit to 8 waypoints for roof inspection
  }

  private generateFacadeWaypoints(
    baseLocation: { latitude: number; longitude: number },
    startId: number,
  ): Waypoint[] {
    const waypoints: Waypoint[] = [];
    const distances = [50, 100, 150]; // feet from building
    const heights = [30, 60, 90, 120]; // feet AGL
    const angles = [-30, 0, 30]; // camera angles

    distances.forEach((distance, distIndex) => {
      heights.forEach((height, heightIndex) => {
        angles.forEach((angle, angleIndex) => {
          const offsetLat = baseLocation.latitude + distance * 0.000003;
          const offsetLng = baseLocation.longitude + distance * 0.000003;

          waypoints.push({
            id: `wp-${startId + distIndex * 12 + heightIndex * 3 + angleIndex}`,
            latitude: offsetLat,
            longitude: offsetLng,
            altitude: height,
            action: "photo",
            duration: 3,
            cameraSettings: {
              angle: angle,
              focus: "auto",
              exposure: "auto",
            },
          });
        });
      });
    });

    return waypoints.slice(0, 12); // Limit to 12 waypoints for facade analysis
  }

  private generateSurveyWaypoints(
    baseLocation: { latitude: number; longitude: number },
    startId: number,
  ): Waypoint[] {
    // Generate grid pattern for area survey
    const waypoints: Waypoint[] = [];
    const gridSize = 4; // 4x4 grid
    const spacing = 0.0002; // Lat/lng spacing
    const altitude = 150; // feet AGL

    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        waypoints.push({
          id: `wp-${startId + x * gridSize + y}`,
          latitude: baseLocation.latitude + x * spacing,
          longitude: baseLocation.longitude + y * spacing,
          altitude: altitude,
          action: "photo",
          duration: 2,
          cameraSettings: {
            angle: -90,
            focus: "auto",
            exposure: "auto",
          },
        });
      }
    }

    return waypoints;
  }

  private generate3DMappingWaypoints(
    baseLocation: { latitude: number; longitude: number },
    startId: number,
  ): Waypoint[] {
    // Generate waypoints for 3D mapping with multiple angles and heights
    const waypoints: Waypoint[] = [];
    const altitudes = [80, 120, 160, 200]; // feet AGL
    const radii = [100, 150, 200]; // feet from center
    const positions = 8; // 8 positions around the building

    altitudes.forEach((altitude, altIndex) => {
      radii.forEach((radius, radiusIndex) => {
        for (let pos = 0; pos < positions; pos++) {
          const angle = (pos * 360) / positions;
          const offsetLat =
            baseLocation.latitude +
            radius * 0.000003 * Math.cos((angle * Math.PI) / 180);
          const offsetLng =
            baseLocation.longitude +
            radius * 0.000003 * Math.sin((angle * Math.PI) / 180);

          waypoints.push({
            id: `wp-${startId + altIndex * radii.length * positions + radiusIndex * positions + pos}`,
            latitude: offsetLat,
            longitude: offsetLng,
            altitude: altitude,
            action: "photo",
            duration: 4,
            cameraSettings: {
              angle: -45, // Angled toward building
              focus: "auto",
              exposure: "auto",
            },
          });
        }
      });
    });

    return waypoints.slice(0, 24); // Limit to 24 waypoints for 3D mapping
  }

  private async calculateFlightPath(
    waypoints: Waypoint[],
    baseLocation: { latitude: number; longitude: number },
  ): Promise<FlightPath> {
    const totalDistance = this.calculateTotalDistance(waypoints);
    const maxAltitude = Math.max(...waypoints.map((wp) => wp.altitude));

    return {
      takeoffPoint: baseLocation,
      landingPoint: baseLocation,
      totalDistance,
      maxAltitude,
      noFlyZones: await this.checkNoFlyZones(baseLocation),
      emergencyLandingSites: await this.findEmergencyLandingSites(baseLocation),
    };
  }

  private calculateTotalDistance(waypoints: Waypoint[]): number {
    let totalDistance = 0;
    for (let i = 1; i < waypoints.length; i++) {
      const prev = waypoints[i - 1];
      const curr = waypoints[i];
      totalDistance += this.haversineDistance(
        prev.latitude,
        prev.longitude,
        curr.latitude,
        curr.longitude,
      );
    }
    return totalDistance;
  }

  private haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  private calculateFlightDuration(
    waypoints: Waypoint[],
    drone: DroneSpec,
  ): number {
    const totalHoverTime = waypoints.reduce((sum, wp) => sum + wp.duration, 0);
    const totalDistance = this.calculateTotalDistance(waypoints);
    const avgSpeed = 15; // m/s average speed
    const travelTime = totalDistance / avgSpeed;

    return Math.ceil((totalHoverTime + travelTime) / 60); // Convert to minutes
  }

  private generateSafetyChecklist(): SafetyItem[] {
    return [
      {
        id: "pre-1",
        category: "pre_flight",
        item: "Check weather conditions",
        required: true,
        completed: false,
      },
      {
        id: "pre-2",
        category: "pre_flight",
        item: "Inspect drone for damage",
        required: true,
        completed: false,
      },
      {
        id: "pre-3",
        category: "pre_flight",
        item: "Verify battery charge level",
        required: true,
        completed: false,
      },
      {
        id: "pre-4",
        category: "pre_flight",
        item: "Check GPS signal strength",
        required: true,
        completed: false,
      },
      {
        id: "pre-5",
        category: "pre_flight",
        item: "Confirm airspace clearance",
        required: true,
        completed: false,
      },
      {
        id: "during-1",
        category: "during_flight",
        item: "Maintain visual line of sight",
        required: true,
        completed: false,
      },
      {
        id: "during-2",
        category: "during_flight",
        item: "Monitor battery levels",
        required: true,
        completed: false,
      },
      {
        id: "during-3",
        category: "during_flight",
        item: "Watch for obstacles and other aircraft",
        required: true,
        completed: false,
      },
      {
        id: "post-1",
        category: "post_flight",
        item: "Download and backup flight data",
        required: true,
        completed: false,
      },
      {
        id: "post-2",
        category: "post_flight",
        item: "Document any incidents or issues",
        required: true,
        completed: false,
      },
    ];
  }

  private async checkRequiredPermits(location: {
    latitude: number;
    longitude: number;
  }): Promise<Permit[]> {
    // Simulate permit checking - in reality would integrate with FAA/regulatory APIs
    return [
      {
        id: "part107-1",
        type: "part_107",
        issuingAuthority: "FAA",
        permitNumber: "PART107-REMOTE-PILOT",
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000), // 2 years
        restrictions: ["Daylight operations only", "Visual line of sight"],
        status: "approved",
      },
    ];
  }

  private async checkNoFlyZones(location: {
    latitude: number;
    longitude: number;
  }): Promise<NoFlyZone[]> {
    // Simulate no-fly zone checking - would integrate with FAA APIs
    return [];
  }

  private async findEmergencyLandingSites(location: {
    latitude: number;
    longitude: longitude;
  }): Promise<EmergencyLandingSite[]> {
    // Find suitable emergency landing sites near the flight area
    return [
      {
        id: "emergency-1",
        latitude: location.latitude + 0.001,
        longitude: location.longitude + 0.001,
        suitability: "good",
        obstacles: ["Some trees nearby"],
        accessibility: "Accessible by vehicle",
      },
    ];
  }

  // Drone Management Methods
  getDroneById(droneId: string): DroneSpec | null {
    return this.droneFleet.find((drone) => drone.id === droneId) || null;
  }

  getAvailableDrones(): DroneSpec[] {
    return this.droneFleet.filter((drone) =>
      drone.certifications.includes("Part 107"),
    );
  }

  // Flight Execution
  async executeFlightPlan(flightPlanId: string): Promise<DroneFlightResult> {
    const flightPlan = this.flightPlans.find((fp) => fp.id === flightPlanId);
    if (!flightPlan) {
      throw new Error("Flight plan not found");
    }

    // Simulate flight execution
    const result: DroneFlightResult = {
      flightId: flightPlan.id,
      actualDuration: flightPlan.estimatedDuration + Math.random() * 5, // Some variance
      photosCapture: flightPlan.waypoints.filter((wp) => wp.action === "photo")
        .length,
      videoLength:
        flightPlan.waypoints.filter((wp) => wp.action === "video").length * 30,
      batteryUsed: 70 + Math.random() * 20, // 70-90%
      weatherConditions: {
        windSpeed: 5 + Math.random() * 10,
        visibility: 8000 + Math.random() * 2000,
        temperature: 20 + Math.random() * 15,
        precipitation: 0,
      },
      incidents: [],
      dataQuality: "excellent",
      completedObjectives: flightPlan.objectives.map((obj) => obj.id),
      issues: [],
    };

    this.flightResults.push(result);
    return result;
  }

  // Photo Analysis
  async analyzeAerialPhoto(photoData: {
    photoId: string;
    flightId: string;
    imageUrl: string;
    location: { latitude: number; longitude: number; altitude: number };
    timestamp: Date;
    analysisType: "roof" | "facade" | "structural";
  }): Promise<AerialPhotoAnalysis> {
    // Simulate AI-powered photo analysis
    // In production, this would integrate with computer vision APIs

    const baseAnalysis: AerialPhotoAnalysis = {
      photoId: photoData.photoId,
      flightId: photoData.flightId,
      location: photoData.location,
      timestamp: photoData.timestamp,
      analysis: {},
      measurements: {
        height: 45 + Math.random() * 20,
        width: 80 + Math.random() * 40,
        area: 3600 + Math.random() * 1000,
        distances: {
          roof_perimeter: 240 + Math.random() * 60,
          facade_height: 45 + Math.random() * 15,
        },
      },
      aiConfidence: 0.85 + Math.random() * 0.1,
    };

    switch (photoData.analysisType) {
      case "roof":
        baseAnalysis.analysis.roofCondition = {
          overallCondition: "good",
          issues: ["Minor wear on shingles", "Gutter cleaning needed"],
          materialType: "Asphalt shingles",
          estimatedAge: 8,
          damageAreas: [
            {
              id: "damage-1",
              type: "missing_material",
              severity: "minor",
              coordinates: [
                { x: 100, y: 150 },
                { x: 120, y: 170 },
              ],
              estimatedRepairCost: 250,
              priority: "medium",
            },
          ],
        };
        break;

      case "facade":
        baseAnalysis.analysis.facadeCondition = {
          condition: "fair",
          cleaningNeeded: true,
          materialCondition: "Good overall, some staining",
          accessPoints: [
            {
              id: "access-1",
              type: "lift",
              location: { x: 50, y: 200 },
              difficulty: "moderate",
              safetyRequirements: ["Fall protection", "Lift certification"],
              estimatedTime: 240, // minutes
            },
          ],
        };
        break;

      case "structural":
        baseAnalysis.analysis.structuralIssues = {
          issuesFound: false,
          issueTypes: [],
          severity: "low",
          recommendations: ["Regular maintenance inspection recommended"],
        };
        break;
    }

    return baseAnalysis;
  }

  // Utility Methods
  getFlightHistory(): DroneFlightResult[] {
    return this.flightResults;
  }

  getFlightPlans(): FlightPlan[] {
    return this.flightPlans;
  }

  async validateFlightPlan(flightPlanId: string): Promise<{
    valid: boolean;
    issues: string[];
    warnings: string[];
  }> {
    const flightPlan = this.flightPlans.find((fp) => fp.id === flightPlanId);
    if (!flightPlan) {
      return { valid: false, issues: ["Flight plan not found"], warnings: [] };
    }

    const issues: string[] = [];
    const warnings: string[] = [];

    // Check pilot certification
    if (!flightPlan.pilot.certifications.includes("Part 107")) {
      issues.push("Pilot lacks required Part 107 certification");
    }

    // Check drone capabilities
    const drone = this.getDroneById(flightPlan.droneId);
    if (!drone) {
      issues.push("Selected drone not available");
    } else {
      if (flightPlan.estimatedDuration > drone.maxFlightTime) {
        warnings.push("Flight duration exceeds drone's maximum flight time");
      }
    }

    // Check permits
    const expiredPermits = flightPlan.permits.filter(
      (permit) =>
        permit.validUntil < new Date() || permit.status !== "approved",
    );
    if (expiredPermits.length > 0) {
      issues.push("Some required permits are expired or not approved");
    }

    return {
      valid: issues.length === 0,
      issues,
      warnings,
    };
  }
}
