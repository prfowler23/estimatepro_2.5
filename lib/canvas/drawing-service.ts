export interface Point {
  x: number;
  y: number;
}

export interface Shape {
  id: string;
  type: "rectangle" | "polygon";
  points: Point[];
  area: number;
  label?: string;
  color: string;
}

export interface Measurement {
  id: string;
  start: Point;
  end: Point;
  distance: number;
  label?: string;
  color: string;
}

export interface DirtyRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class DrawingService {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private scale: { pixelsPerFoot: number };
  private shapes: Shape[] = [];
  private measurements: Measurement[] = [];
  private colorIndex: number = 0;
  private colors: string[] = [
    "#3B82F6",
    "#EF4444",
    "#10B981",
    "#F59E0B",
    "#8B5CF6",
    "#EC4899",
  ];
  private dirtyRegions: DirtyRegion[] = [];
  private backgroundImage: HTMLImageElement | null = null;
  private isFullRedrawNeeded: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Unable to get canvas 2D context");
    }
    this.ctx = context;
    this.scale = { pixelsPerFoot: 10 }; // Default scale
  }

  /**
   * Set the scale for measurements and area calculations
   */
  setScale(referencePixels: number, referenceFeet: number) {
    this.scale.pixelsPerFoot = referencePixels / referenceFeet;
  }

  /**
   * Get the current scale
   */
  getScale(): { pixelsPerFoot: number } {
    return { ...this.scale };
  }

  /**
   * Draw a rectangle and return shape object
   */
  drawRectangle(start: Point, end: Point, label?: string): Shape {
    const id = `rect_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const color = this.colors[this.colorIndex % this.colors.length];
    this.colorIndex++;

    const points = [
      start,
      { x: end.x, y: start.y },
      end,
      { x: start.x, y: end.y },
    ];

    const area = this.calculateArea(points);
    const shape: Shape = {
      id,
      type: "rectangle",
      points,
      area,
      label: label || `Rectangle ${this.shapes.length + 1}`,
      color,
    };

    this.shapes.push(shape);
    this.renderShape(shape);
    return shape;
  }

  /**
   * Draw a polygon and return shape object
   */
  drawPolygon(points: Point[], label?: string): Shape {
    if (points.length < 3) {
      throw new Error("Polygon must have at least 3 points");
    }

    const id = `poly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const color = this.colors[this.colorIndex % this.colors.length];
    this.colorIndex++;

    const area = this.calculateArea(points);
    const shape: Shape = {
      id,
      type: "polygon",
      points,
      area,
      label: label || `Polygon ${this.shapes.length + 1}`,
      color,
    };

    this.shapes.push(shape);
    this.renderShape(shape);
    return shape;
  }

  /**
   * Draw a measurement line between two points
   */
  drawMeasurementLine(start: Point, end: Point, label?: string): Measurement {
    const id = `measure_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const color = this.colors[this.colorIndex % this.colors.length];
    this.colorIndex++;

    const distance = this.calculateDistance(start, end);
    const measurement: Measurement = {
      id,
      start,
      end,
      distance,
      label: label || `${distance.toFixed(1)} ft`,
      color,
    };

    this.measurements.push(measurement);
    this.renderMeasurement(measurement);
    return measurement;
  }

  /**
   * Calculate area using the shoelace formula
   */
  calculateArea(points: Point[]): number {
    if (points.length < 3) return 0;

    let area = 0;
    const n = points.length;

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }

    area = Math.abs(area) / 2;

    // Convert pixel area to square feet
    const pixelsPerSqFoot = this.scale.pixelsPerFoot * this.scale.pixelsPerFoot;
    return area / pixelsPerSqFoot;
  }

  /**
   * Calculate distance between two points in feet
   */
  calculateDistance(point1: Point, point2: Point): number {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    const pixelDistance = Math.sqrt(dx * dx + dy * dy);
    return pixelDistance / this.scale.pixelsPerFoot;
  }

  /**
   * Calculate the centroid of a polygon
   */
  calculateCentroid(points: Point[]): Point {
    const sum = points.reduce(
      (acc, point) => ({
        x: acc.x + point.x,
        y: acc.y + point.y,
      }),
      { x: 0, y: 0 },
    );

    return {
      x: sum.x / points.length,
      y: sum.y / points.length,
    };
  }

  /**
   * Render a shape on the canvas
   */
  private renderShape(shape: Shape) {
    this.ctx.save();
    this.ctx.strokeStyle = shape.color;
    this.ctx.fillStyle = shape.color + "20"; // Semi-transparent
    this.ctx.lineWidth = 2;

    if (shape.type === "rectangle" && shape.points.length >= 4) {
      const [topLeft, topRight, bottomRight, bottomLeft] = shape.points;
      const width = topRight.x - topLeft.x;
      const height = bottomLeft.y - topLeft.y;

      this.ctx.fillRect(topLeft.x, topLeft.y, width, height);
      this.ctx.strokeRect(topLeft.x, topLeft.y, width, height);

      // Draw label
      this.ctx.fillStyle = shape.color;
      this.ctx.font = "bold 12px Arial";
      this.ctx.fillText(shape.label || "", topLeft.x + 5, topLeft.y - 5);

      // Draw area text in center
      const centerX = topLeft.x + width / 2;
      const centerY = topLeft.y + height / 2;
      this.ctx.fillStyle = shape.color;
      this.ctx.font = "10px Arial";
      this.ctx.textAlign = "center";
      this.ctx.fillText(`${shape.area.toFixed(0)} sq ft`, centerX, centerY);
      this.ctx.textAlign = "left";
    } else if (shape.type === "polygon") {
      this.ctx.beginPath();
      this.ctx.moveTo(shape.points[0].x, shape.points[0].y);
      shape.points.forEach((point) => this.ctx.lineTo(point.x, point.y));
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();

      // Draw label at centroid
      const centroid = this.calculateCentroid(shape.points);
      this.ctx.fillStyle = shape.color;
      this.ctx.font = "bold 12px Arial";
      this.ctx.textAlign = "center";
      this.ctx.fillText(shape.label || "", centroid.x, centroid.y - 10);
      this.ctx.font = "10px Arial";
      this.ctx.fillText(
        `${shape.area.toFixed(0)} sq ft`,
        centroid.x,
        centroid.y + 5,
      );
      this.ctx.textAlign = "left";
    }

    this.ctx.restore();
  }

  /**
   * Render a measurement line on the canvas
   */
  private renderMeasurement(measurement: Measurement) {
    this.ctx.save();
    this.ctx.strokeStyle = measurement.color;
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 5]);

    // Draw main line
    this.ctx.beginPath();
    this.ctx.moveTo(measurement.start.x, measurement.start.y);
    this.ctx.lineTo(measurement.end.x, measurement.end.y);
    this.ctx.stroke();

    // Draw arrow endpoints
    this.drawArrowHead(measurement.start, measurement.end, measurement.color);
    this.drawArrowHead(measurement.end, measurement.start, measurement.color);

    // Draw distance label at midpoint
    const midpoint = {
      x: (measurement.start.x + measurement.end.x) / 2,
      y: (measurement.start.y + measurement.end.y) / 2,
    };

    this.ctx.setLineDash([]);
    this.ctx.fillStyle = measurement.color;
    this.ctx.font = "bold 12px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillRect(midpoint.x - 25, midpoint.y - 15, 50, 20);
    this.ctx.fillStyle = "white";
    this.ctx.fillText(measurement.label || "", midpoint.x, midpoint.y - 2);
    this.ctx.textAlign = "left";

    this.ctx.restore();
  }

  /**
   * Draw an arrow head at the end of a line
   */
  private drawArrowHead(from: Point, to: Point, color: string) {
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const arrowLength = 10;
    const arrowAngle = Math.PI / 6;

    this.ctx.save();
    this.ctx.strokeStyle = color;
    this.ctx.fillStyle = color;
    this.ctx.lineWidth = 2;

    this.ctx.beginPath();
    this.ctx.moveTo(from.x, from.y);
    this.ctx.lineTo(
      from.x + arrowLength * Math.cos(angle - arrowAngle),
      from.y + arrowLength * Math.sin(angle - arrowAngle),
    );
    this.ctx.moveTo(from.x, from.y);
    this.ctx.lineTo(
      from.x + arrowLength * Math.cos(angle + arrowAngle),
      from.y + arrowLength * Math.sin(angle + arrowAngle),
    );
    this.ctx.stroke();

    this.ctx.restore();
  }

  /**
   * Redraw all shapes and measurements with optimized dirty region tracking
   */
  redrawAll() {
    if (this.isFullRedrawNeeded || this.dirtyRegions.length === 0) {
      // Full redraw needed
      this.clearCanvas();
      if (this.backgroundImage) {
        this.ctx.drawImage(
          this.backgroundImage,
          0,
          0,
          this.canvas.width,
          this.canvas.height,
        );
      }
      this.shapes.forEach((shape) => this.renderShape(shape));
      this.measurements.forEach((measurement) =>
        this.renderMeasurement(measurement),
      );
      this.isFullRedrawNeeded = false;
      this.dirtyRegions = [];
    } else {
      // Selective redraw of dirty regions
      this.redrawDirtyRegions();
    }
  }

  /**
   * Redraw only the dirty regions for improved performance
   */
  private redrawDirtyRegions() {
    // Merge overlapping dirty regions to reduce redundant drawing
    const mergedRegions = this.mergeDirtyRegions(this.dirtyRegions);

    for (const region of mergedRegions) {
      // Save current context state
      this.ctx.save();

      // Set clipping region to limit drawing area
      this.ctx.beginPath();
      this.ctx.rect(region.x, region.y, region.width, region.height);
      this.ctx.clip();

      // Clear the dirty region
      this.ctx.clearRect(region.x, region.y, region.width, region.height);

      // Redraw background image in the dirty region
      if (this.backgroundImage) {
        this.ctx.drawImage(
          this.backgroundImage,
          region.x,
          region.y,
          region.width,
          region.height,
          region.x,
          region.y,
          region.width,
          region.height,
        );
      }

      // Redraw shapes that intersect with the dirty region
      this.shapes.forEach((shape) => {
        const shapeBounds = this.getShapeBoundingBox(shape);
        if (this.regionsIntersect(region, shapeBounds)) {
          this.renderShape(shape);
        }
      });

      // Redraw measurements that intersect with the dirty region
      this.measurements.forEach((measurement) => {
        const measurementBounds = this.getMeasurementBoundingBox(measurement);
        if (this.regionsIntersect(region, measurementBounds)) {
          this.renderMeasurement(measurement);
        }
      });

      // Restore context state
      this.ctx.restore();
    }

    // Clear dirty regions after redrawing
    this.dirtyRegions = [];
  }

  /**
   * Add a dirty region to the tracking list
   */
  addDirtyRegion(region: DirtyRegion) {
    this.dirtyRegions.push(region);
  }

  /**
   * Mark the entire canvas as needing a full redraw
   */
  markFullRedrawNeeded() {
    this.isFullRedrawNeeded = true;
  }

  /**
   * Get the bounding box of a shape for dirty region calculations
   */
  private getShapeBoundingBox(shape: Shape): DirtyRegion {
    const points = shape.points;
    let minX = points[0].x;
    let maxX = points[0].x;
    let minY = points[0].y;
    let maxY = points[0].y;

    for (const point of points) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    }

    // Add padding for borders and labels
    const padding = 20;
    return {
      x: minX - padding,
      y: minY - padding,
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2,
    };
  }

  /**
   * Get the bounding box of a measurement for dirty region calculations
   */
  private getMeasurementBoundingBox(measurement: Measurement): DirtyRegion {
    const { start, end } = measurement;
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);

    // Add padding for line width, arrows, and labels
    const padding = 30;
    return {
      x: minX - padding,
      y: minY - padding,
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2,
    };
  }

  /**
   * Merge overlapping dirty regions to optimize redrawing
   */
  private mergeDirtyRegions(regions: DirtyRegion[]): DirtyRegion[] {
    if (regions.length <= 1) return regions;

    const merged: DirtyRegion[] = [];
    const sorted = [...regions].sort((a, b) => a.x - b.x);

    for (const region of sorted) {
      let wasmerged = false;

      for (let i = 0; i < merged.length; i++) {
        const existing = merged[i];

        // Check if regions overlap or are adjacent
        if (this.regionsOverlap(region, existing)) {
          // Merge regions
          const minX = Math.min(region.x, existing.x);
          const minY = Math.min(region.y, existing.y);
          const maxX = Math.max(
            region.x + region.width,
            existing.x + existing.width,
          );
          const maxY = Math.max(
            region.y + region.height,
            existing.y + existing.height,
          );

          merged[i] = {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
          };

          wasmerged = true;
          break;
        }
      }

      if (!wasmerged) {
        merged.push(region);
      }
    }

    // If we merged regions, recursively merge again in case of chain merging
    if (merged.length < regions.length) {
      return this.mergeDirtyRegions(merged);
    }

    return merged;
  }

  /**
   * Check if two regions overlap or are adjacent
   */
  private regionsOverlap(a: DirtyRegion, b: DirtyRegion): boolean {
    return !(
      a.x + a.width < b.x ||
      b.x + b.width < a.x ||
      a.y + a.height < b.y ||
      b.y + b.height < a.y
    );
  }

  /**
   * Check if two regions intersect
   */
  private regionsIntersect(a: DirtyRegion, b: DirtyRegion): boolean {
    return !(
      a.x + a.width <= b.x ||
      b.x + b.width <= a.x ||
      a.y + a.height <= b.y ||
      b.y + b.height <= a.y
    );
  }

  /**
   * Clear the canvas
   */
  clearCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Clear all shapes and measurements
   */
  clearAll() {
    this.shapes = [];
    this.measurements = [];
    this.colorIndex = 0;
    this.clearCanvas();
  }

  /**
   * Remove a specific shape
   */
  removeShape(shapeId: string) {
    this.shapes = this.shapes.filter((shape) => shape.id !== shapeId);
    this.redrawAll();
  }

  /**
   * Remove a specific measurement
   */
  removeMeasurement(measurementId: string) {
    this.measurements = this.measurements.filter(
      (measurement) => measurement.id !== measurementId,
    );
    this.redrawAll();
  }

  /**
   * Get all shapes
   */
  getShapes(): Shape[] {
    return [...this.shapes];
  }

  /**
   * Get all measurements
   */
  getMeasurements(): Measurement[] {
    return [...this.measurements];
  }

  /**
   * Get total area of all shapes
   */
  getTotalArea(): number {
    return this.shapes.reduce((total, shape) => total + shape.area, 0);
  }

  /**
   * Export canvas as base64 image
   */
  exportAsImage(): string {
    return this.canvas.toDataURL("image/png");
  }

  /**
   * Load background image
   */
  loadBackgroundImage(imageUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.clearCanvas();
        this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
        this.redrawAll();
        resolve();
      };
      img.onerror = reject;
      img.src = imageUrl;
    });
  }

  /**
   * Set canvas size
   */
  setCanvasSize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  /**
   * Get canvas dimensions
   */
  getCanvasSize(): { width: number; height: number } {
    return {
      width: this.canvas.width,
      height: this.canvas.height,
    };
  }

  /**
   * Update shape label
   */
  updateShapeLabel(shapeId: string, label: string) {
    const shape = this.shapes.find((s) => s.id === shapeId);
    if (shape) {
      shape.label = label;
      this.redrawAll();
    }
  }

  /**
   * Update measurement label
   */
  updateMeasurementLabel(measurementId: string, label: string) {
    const measurement = this.measurements.find((m) => m.id === measurementId);
    if (measurement) {
      measurement.label = label;
      this.redrawAll();
    }
  }
}
