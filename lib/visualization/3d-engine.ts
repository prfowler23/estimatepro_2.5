/**
 * 3D Visualization Engine for Building Analysis
 * Provides advanced 3D building visualization with measurement integration
 */

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface BuildingDimensions {
  width: number;
  height: number;
  depth: number;
  stories: number;
  roofType: "flat" | "gabled" | "hipped" | "shed";
}

export interface BuildingMaterial {
  type: "brick" | "concrete" | "glass" | "metal" | "wood" | "stucco";
  color: string;
  texture?: string;
  reflectivity: number;
}

export interface BuildingFeature {
  type: "window" | "door" | "balcony" | "overhang" | "column";
  position: Point3D;
  dimensions: { width: number; height: number; depth?: number };
  material: BuildingMaterial;
}

export interface BuildingModel {
  id: string;
  name: string;
  dimensions: BuildingDimensions;
  materials: BuildingMaterial[];
  features: BuildingFeature[];
  position: Point3D;
  rotation: Point3D;
  metadata: {
    buildingType: string;
    yearBuilt?: number;
    architect?: string;
    lastInspection?: Date;
  };
}

export interface ViewingOptions {
  perspective:
    | "front"
    | "back"
    | "left"
    | "right"
    | "top"
    | "isometric"
    | "custom";
  zoom: number;
  lighting: "natural" | "studio" | "night" | "custom";
  showGrid: boolean;
  showMeasurements: boolean;
  showMaterials: boolean;
  wireframe: boolean;
}

export interface MeasurementOverlay {
  id: string;
  startPoint: Point3D;
  endPoint: Point3D;
  measurement: number;
  unit: "ft" | "m" | "in" | "cm";
  label: string;
  color: string;
}

export interface ServiceArea {
  id: string;
  name: string;
  surface:
    | "exterior_wall"
    | "interior_wall"
    | "floor"
    | "ceiling"
    | "roof"
    | "window";
  coordinates: Point3D[];
  area: number;
  material: BuildingMaterial;
  complexity: "low" | "medium" | "high";
  accessMethod: "ground" | "ladder" | "lift" | "scaffold" | "rope";
  estimatedTime: number; // hours
  riskFactors: string[];
}

export class Visualization3DEngine {
  private canvas: HTMLCanvasElement | null = null;
  private buildings: BuildingModel[] = [];
  private viewingOptions: ViewingOptions = {
    perspective: "isometric",
    zoom: 1.0,
    lighting: "natural",
    showGrid: true,
    showMeasurements: true,
    showMaterials: true,
    wireframe: false,
  };
  private measurements: MeasurementOverlay[] = [];
  private serviceAreas: ServiceArea[] = [];

  constructor(canvas?: HTMLCanvasElement) {
    this.canvas = canvas || null;
  }

  // Building Management
  addBuilding(building: BuildingModel): void {
    this.buildings.push(building);
  }

  removeBuilding(buildingId: string): void {
    this.buildings = this.buildings.filter((b) => b.id !== buildingId);
  }

  updateBuilding(buildingId: string, updates: Partial<BuildingModel>): void {
    const buildingIndex = this.buildings.findIndex((b) => b.id === buildingId);
    if (buildingIndex !== -1) {
      this.buildings[buildingIndex] = {
        ...this.buildings[buildingIndex],
        ...updates,
      };
    }
  }

  // View Management
  setViewingOptions(options: Partial<ViewingOptions>): void {
    this.viewingOptions = { ...this.viewingOptions, ...options };
  }

  setPerspective(perspective: ViewingOptions["perspective"]): void {
    this.viewingOptions.perspective = perspective;
  }

  setZoom(zoom: number): void {
    this.viewingOptions.zoom = Math.max(0.1, Math.min(5.0, zoom));
  }

  // Measurement System
  addMeasurement(measurement: MeasurementOverlay): void {
    this.measurements.push(measurement);
  }

  removeMeasurement(measurementId: string): void {
    this.measurements = this.measurements.filter((m) => m.id !== measurementId);
  }

  clearMeasurements(): void {
    this.measurements = [];
  }

  // Service Area Management
  addServiceArea(area: ServiceArea): void {
    this.serviceAreas.push(area);
  }

  removeServiceArea(areaId: string): void {
    this.serviceAreas = this.serviceAreas.filter((a) => a.id !== areaId);
  }

  getServiceAreasByComplexity(
    complexity: ServiceArea["complexity"],
  ): ServiceArea[] {
    return this.serviceAreas.filter((area) => area.complexity === complexity);
  }

  // Analysis Functions
  calculateTotalArea(surface?: ServiceArea["surface"]): number {
    const relevantAreas = surface
      ? this.serviceAreas.filter((area) => area.surface === surface)
      : this.serviceAreas;

    return relevantAreas.reduce((total, area) => total + area.area, 0);
  }

  calculateTotalTime(service?: string): number {
    const relevantAreas = service
      ? this.serviceAreas.filter((area) => area.name.includes(service))
      : this.serviceAreas;

    return relevantAreas.reduce((total, area) => total + area.estimatedTime, 0);
  }

  getEquipmentRequirements(): string[] {
    const requirements = new Set<string>();

    this.serviceAreas.forEach((area) => {
      switch (area.accessMethod) {
        case "lift":
          requirements.add("Aerial Lift");
          break;
        case "scaffold":
          requirements.add("Scaffolding");
          break;
        case "ladder":
          requirements.add("Extension Ladder");
          break;
        case "rope":
          requirements.add("Rope Access Equipment");
          break;
      }
    });

    return Array.from(requirements);
  }

  getRiskAssessment(): { level: "low" | "medium" | "high"; factors: string[] } {
    const allRiskFactors = this.serviceAreas.flatMap(
      (area) => area.riskFactors,
    );
    const uniqueRisks = Array.from(new Set(allRiskFactors));

    const highRiskAreas = this.serviceAreas.filter(
      (area) => area.complexity === "high",
    ).length;
    const totalAreas = this.serviceAreas.length;

    let level: "low" | "medium" | "high" = "low";

    if (
      highRiskAreas > totalAreas * 0.5 ||
      uniqueRisks.includes("Working at Height")
    ) {
      level = "high";
    } else if (highRiskAreas > totalAreas * 0.25 || uniqueRisks.length > 3) {
      level = "medium";
    }

    return {
      level,
      factors: uniqueRisks,
    };
  }

  // Export Functions
  exportToJSON(): string {
    return JSON.stringify(
      {
        buildings: this.buildings,
        measurements: this.measurements,
        serviceAreas: this.serviceAreas,
        viewingOptions: this.viewingOptions,
        timestamp: new Date().toISOString(),
      },
      null,
      2,
    );
  }

  importFromJSON(jsonData: string): void {
    try {
      const data = JSON.parse(jsonData);
      this.buildings = data.buildings || [];
      this.measurements = data.measurements || [];
      this.serviceAreas = data.serviceAreas || [];
      this.viewingOptions = { ...this.viewingOptions, ...data.viewingOptions };
    } catch (error) {
      throw new Error("Invalid JSON data for 3D visualization import");
    }
  }

  // Canvas Rendering (simplified - in production would use Three.js or similar)
  render(): void {
    if (!this.canvas) return;

    const ctx = this.canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Set up perspective transformation
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const scale = this.viewingOptions.zoom * 50;

    // Draw grid if enabled
    if (this.viewingOptions.showGrid) {
      this.drawGrid(ctx, centerX, centerY, scale);
    }

    // Draw buildings
    this.buildings.forEach((building) => {
      this.drawBuilding(ctx, building, centerX, centerY, scale);
    });

    // Draw measurements if enabled
    if (this.viewingOptions.showMeasurements) {
      this.measurements.forEach((measurement) => {
        this.drawMeasurement(ctx, measurement, centerX, centerY, scale);
      });
    }

    // Draw service areas
    this.serviceAreas.forEach((area) => {
      this.drawServiceArea(ctx, area, centerX, centerY, scale);
    });
  }

  private drawGrid(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    scale: number,
  ): void {
    ctx.strokeStyle = "#e0e0e0";
    ctx.lineWidth = 1;

    // Draw grid lines
    for (let i = -10; i <= 10; i++) {
      const x = centerX + i * scale;
      const y = centerY + i * scale;

      // Vertical lines
      ctx.beginPath();
      ctx.moveTo(x, centerY - 10 * scale);
      ctx.lineTo(x, centerY + 10 * scale);
      ctx.stroke();

      // Horizontal lines
      ctx.beginPath();
      ctx.moveTo(centerX - 10 * scale, y);
      ctx.lineTo(centerX + 10 * scale, y);
      ctx.stroke();
    }
  }

  private drawBuilding(
    ctx: CanvasRenderingContext2D,
    building: BuildingModel,
    centerX: number,
    centerY: number,
    scale: number,
  ): void {
    const { dimensions } = building;
    const x = centerX + building.position.x * scale;
    const y = centerY + building.position.y * scale;

    // Simple isometric projection
    const width = dimensions.width * scale * 0.01;
    const height = dimensions.height * scale * 0.01;
    const depth = dimensions.depth * scale * 0.01;

    // Draw building base
    ctx.fillStyle = "#90caf9";
    ctx.strokeStyle = "#1976d2";
    ctx.lineWidth = 2;

    // Front face
    ctx.fillRect(x, y - height, width, height);
    ctx.strokeRect(x, y - height, width, height);

    // Top face (isometric)
    ctx.fillStyle = "#bbdefb";
    ctx.beginPath();
    ctx.moveTo(x, y - height);
    ctx.lineTo(x + width * 0.3, y - height - depth * 0.3);
    ctx.lineTo(x + width + width * 0.3, y - height - depth * 0.3);
    ctx.lineTo(x + width, y - height);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Right face
    ctx.fillStyle = "#81c784";
    ctx.beginPath();
    ctx.moveTo(x + width, y - height);
    ctx.lineTo(x + width + width * 0.3, y - height - depth * 0.3);
    ctx.lineTo(x + width + width * 0.3, y - depth * 0.3);
    ctx.lineTo(x + width, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Draw features
    building.features.forEach((feature) => {
      this.drawBuildingFeature(ctx, feature, x, y, scale);
    });
  }

  private drawBuildingFeature(
    ctx: CanvasRenderingContext2D,
    feature: BuildingFeature,
    baseX: number,
    baseY: number,
    scale: number,
  ): void {
    const x = baseX + feature.position.x * scale * 0.01;
    const y = baseY + feature.position.y * scale * 0.01;

    switch (feature.type) {
      case "window":
        ctx.fillStyle = "#e3f2fd";
        ctx.strokeStyle = "#1565c0";
        ctx.lineWidth = 1;
        ctx.fillRect(
          x,
          y,
          feature.dimensions.width * scale * 0.005,
          feature.dimensions.height * scale * 0.005,
        );
        ctx.strokeRect(
          x,
          y,
          feature.dimensions.width * scale * 0.005,
          feature.dimensions.height * scale * 0.005,
        );
        break;

      case "door":
        ctx.fillStyle = "#8d6e63";
        ctx.strokeStyle = "#5d4037";
        ctx.lineWidth = 1;
        ctx.fillRect(
          x,
          y,
          feature.dimensions.width * scale * 0.005,
          feature.dimensions.height * scale * 0.005,
        );
        ctx.strokeRect(
          x,
          y,
          feature.dimensions.width * scale * 0.005,
          feature.dimensions.height * scale * 0.005,
        );
        break;
    }
  }

  private drawMeasurement(
    ctx: CanvasRenderingContext2D,
    measurement: MeasurementOverlay,
    centerX: number,
    centerY: number,
    scale: number,
  ): void {
    const startX = centerX + measurement.startPoint.x * scale * 0.01;
    const startY = centerY + measurement.startPoint.y * scale * 0.01;
    const endX = centerX + measurement.endPoint.x * scale * 0.01;
    const endY = centerY + measurement.endPoint.y * scale * 0.01;

    ctx.strokeStyle = measurement.color;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);

    // Draw measurement line
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Draw measurement text
    ctx.fillStyle = measurement.color;
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    ctx.fillText(
      `${measurement.measurement}${measurement.unit}`,
      midX,
      midY - 5,
    );

    ctx.setLineDash([]);
  }

  private drawServiceArea(
    ctx: CanvasRenderingContext2D,
    area: ServiceArea,
    centerX: number,
    centerY: number,
    scale: number,
  ): void {
    if (area.coordinates.length < 3) return;

    // Set color based on complexity
    let fillColor = "rgba(76, 175, 80, 0.3)"; // Low complexity - green
    let strokeColor = "#4caf50";

    if (area.complexity === "medium") {
      fillColor = "rgba(255, 193, 7, 0.3)"; // Medium complexity - yellow
      strokeColor = "#ffc107";
    } else if (area.complexity === "high") {
      fillColor = "rgba(244, 67, 54, 0.3)"; // High complexity - red
      strokeColor = "#f44336";
    }

    ctx.fillStyle = fillColor;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;

    // Draw service area polygon
    ctx.beginPath();
    const firstPoint = area.coordinates[0];
    ctx.moveTo(
      centerX + firstPoint.x * scale * 0.01,
      centerY + firstPoint.y * scale * 0.01,
    );

    for (let i = 1; i < area.coordinates.length; i++) {
      const point = area.coordinates[i];
      ctx.lineTo(
        centerX + point.x * scale * 0.01,
        centerY + point.y * scale * 0.01,
      );
    }

    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Add area label
    const centerPoint = this.calculatePolygonCenter(area.coordinates);
    ctx.fillStyle = strokeColor;
    ctx.font = "10px Arial";
    ctx.textAlign = "center";
    ctx.fillText(
      area.name,
      centerX + centerPoint.x * scale * 0.01,
      centerY + centerPoint.y * scale * 0.01,
    );
  }

  private calculatePolygonCenter(coordinates: Point3D[]): Point3D {
    const sum = coordinates.reduce(
      (acc, point) => ({
        x: acc.x + point.x,
        y: acc.y + point.y,
        z: acc.z + point.z,
      }),
      { x: 0, y: 0, z: 0 },
    );

    return {
      x: sum.x / coordinates.length,
      y: sum.y / coordinates.length,
      z: sum.z / coordinates.length,
    };
  }
}

// Utility functions for building generation
export const BuildingTemplates = {
  residential: (
    width: number,
    height: number,
    depth: number,
  ): BuildingModel => ({
    id: `residential-${Date.now()}`,
    name: "Residential Building",
    dimensions: {
      width,
      height,
      depth,
      stories: Math.ceil(height / 12),
      roofType: "gabled",
    },
    materials: [
      {
        type: "brick",
        color: "#8d6e63",
        reflectivity: 0.3,
      },
    ],
    features: [],
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    metadata: {
      buildingType: "residential",
    },
  }),

  commercial: (
    width: number,
    height: number,
    depth: number,
  ): BuildingModel => ({
    id: `commercial-${Date.now()}`,
    name: "Commercial Building",
    dimensions: {
      width,
      height,
      depth,
      stories: Math.ceil(height / 14),
      roofType: "flat",
    },
    materials: [
      {
        type: "glass",
        color: "#81d4fa",
        reflectivity: 0.8,
      },
      {
        type: "metal",
        color: "#90a4ae",
        reflectivity: 0.6,
      },
    ],
    features: [],
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    metadata: {
      buildingType: "commercial",
    },
  }),

  industrial: (
    width: number,
    height: number,
    depth: number,
  ): BuildingModel => ({
    id: `industrial-${Date.now()}`,
    name: "Industrial Building",
    dimensions: {
      width,
      height,
      depth,
      stories: Math.ceil(height / 20),
      roofType: "shed",
    },
    materials: [
      {
        type: "metal",
        color: "#616161",
        reflectivity: 0.4,
      },
    ],
    features: [],
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    metadata: {
      buildingType: "industrial",
    },
  }),
};
