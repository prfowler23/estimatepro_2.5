import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  DrawingService,
  Shape,
  Measurement,
  Point,
} from "@/lib/canvas/drawing-service";

interface DrawingCanvasProps {
  backgroundImage?: string;
  onShapesChange: (shapes: Shape[], measurements: Measurement[]) => void;
  currentTool: "select" | "rectangle" | "polygon" | "measure";
  scale?: { pixelsPerFoot: number };
  width?: number;
  height?: number;
  onScaleChange?: (scale: { pixelsPerFoot: number }) => void;
}

interface ShapeManager {
  shapes: Shape[];
  measurements: Measurement[];
  selectedShapeId: string | null;
  selectedMeasurementId: string | null;
}

export function DrawingCanvas({
  backgroundImage,
  onShapesChange,
  currentTool,
  scale = { pixelsPerFoot: 10 },
  width = 800,
  height = 600,
  onScaleChange,
}: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawingService, setDrawingService] = useState<DrawingService | null>(
    null,
  );
  const [shapeManager, setShapeManager] = useState<ShapeManager>({
    shapes: [],
    measurements: [],
    selectedShapeId: null,
    selectedMeasurementId: null,
  });
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [previewShape, setPreviewShape] = useState<Shape | null>(null);

  // Initialize drawing service
  useEffect(() => {
    if (canvasRef.current) {
      const service = new DrawingService(canvasRef.current);
      service.setScale(scale.pixelsPerFoot, 1);
      setDrawingService(service);
    }
  }, []);

  // Update scale when changed
  useEffect(() => {
    if (drawingService) {
      drawingService.setScale(scale.pixelsPerFoot, 1);
    }
  }, [scale, drawingService]);

  // Load background image
  useEffect(() => {
    if (drawingService && backgroundImage) {
      drawingService
        .loadBackgroundImage(backgroundImage)
        .then(() => {
          redrawCanvas();
        })
        .catch((error) => {
          console.error("Failed to load background image:", error);
        });
    }
  }, [backgroundImage, drawingService]);

  // Set canvas size
  useEffect(() => {
    if (drawingService) {
      drawingService.setCanvasSize(width, height);
      redrawCanvas();
    }
  }, [width, height, drawingService]);

  const redrawCanvas = useCallback(() => {
    if (!drawingService) return;

    drawingService.clearCanvas();

    // Reload background if exists
    if (backgroundImage) {
      drawingService.loadBackgroundImage(backgroundImage).then(() => {
        drawingService.redrawAll();
      });
    } else {
      drawingService.redrawAll();
    }
  }, [drawingService, backgroundImage]);

  const updateShapeManager = useCallback(
    (newShapes?: Shape[], newMeasurements?: Measurement[]) => {
      const shapes = newShapes || drawingService?.getShapes() || [];
      const measurements =
        newMeasurements || drawingService?.getMeasurements() || [];

      setShapeManager((prev) => ({
        ...prev,
        shapes,
        measurements,
      }));

      onShapesChange(shapes, measurements);
    },
    [drawingService, onShapesChange],
  );

  const getMousePosition = useCallback((e: React.MouseEvent): Point => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };

    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  const selectShapeAt = useCallback(
    (point: Point): boolean => {
      if (!drawingService) return false;

      const shapes = drawingService.getShapes();
      const measurements = drawingService.getMeasurements();

      // Check shapes first
      for (const shape of shapes.reverse()) {
        // Check from top to bottom
        if (isPointInShape(point, shape)) {
          setShapeManager((prev) => ({
            ...prev,
            selectedShapeId: shape.id,
            selectedMeasurementId: null,
          }));
          return true;
        }
      }

      // Check measurements
      for (const measurement of measurements.reverse()) {
        if (isPointNearLine(point, measurement.start, measurement.end, 10)) {
          setShapeManager((prev) => ({
            ...prev,
            selectedShapeId: null,
            selectedMeasurementId: measurement.id,
          }));
          return true;
        }
      }

      // Clear selection if nothing found
      setShapeManager((prev) => ({
        ...prev,
        selectedShapeId: null,
        selectedMeasurementId: null,
      }));

      return false;
    },
    [drawingService],
  );

  const isPointInShape = (point: Point, shape: Shape): boolean => {
    if (shape.type === "rectangle" && shape.points.length >= 4) {
      const [topLeft, topRight, bottomRight, bottomLeft] = shape.points;
      return (
        point.x >= topLeft.x &&
        point.x <= bottomRight.x &&
        point.y >= topLeft.y &&
        point.y <= bottomRight.y
      );
    } else if (shape.type === "polygon") {
      return isPointInPolygon(point, shape.points);
    }
    return false;
  };

  const isPointInPolygon = (point: Point, polygon: Point[]): boolean => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      if (
        polygon[i].y > point.y !== polygon[j].y > point.y &&
        point.x <
          ((polygon[j].x - polygon[i].x) * (point.y - polygon[i].y)) /
            (polygon[j].y - polygon[i].y) +
            polygon[i].x
      ) {
        inside = !inside;
      }
    }
    return inside;
  };

  const isPointNearLine = (
    point: Point,
    start: Point,
    end: Point,
    threshold: number,
  ): boolean => {
    const A = point.x - start.x;
    const B = point.y - start.y;
    const C = end.x - start.x;
    const D = end.y - start.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) {
      param = dot / lenSq;
    }

    let xx, yy;
    if (param < 0) {
      xx = start.x;
      yy = start.y;
    } else if (param > 1) {
      xx = end.x;
      yy = end.y;
    } else {
      xx = start.x + param * C;
      yy = start.y + param * D;
    }

    const dx = point.x - xx;
    const dy = point.y - yy;
    return Math.sqrt(dx * dx + dy * dy) <= threshold;
  };

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!drawingService) return;

      const point = getMousePosition(e);

      switch (currentTool) {
        case "select":
          selectShapeAt(point);
          break;

        case "rectangle":
          setIsDrawing(true);
          setCurrentPoints([point]);
          break;

        case "polygon":
          const newPoints = [...currentPoints, point];
          setCurrentPoints(newPoints);

          // Check for polygon completion (double-click or near first point)
          if (newPoints.length >= 3) {
            const firstPoint = newPoints[0];
            const distance = Math.sqrt(
              Math.pow(point.x - firstPoint.x, 2) +
                Math.pow(point.y - firstPoint.y, 2),
            );

            if (distance < 10) {
              // Complete polygon
              try {
                const shape = drawingService.drawPolygon(newPoints);
                updateShapeManager();
                setCurrentPoints([]);
              } catch (error) {
                console.error("Error creating polygon:", error);
              }
            }
          }
          break;

        case "measure":
          if (currentPoints.length === 0) {
            setCurrentPoints([point]);
          } else {
            // Complete measurement
            try {
              const measurement = drawingService.drawMeasurementLine(
                currentPoints[0],
                point,
              );
              updateShapeManager();
              setCurrentPoints([]);
            } catch (error) {
              console.error("Error creating measurement:", error);
            }
          }
          break;
      }
    },
    [
      drawingService,
      currentTool,
      currentPoints,
      getMousePosition,
      selectShapeAt,
      updateShapeManager,
    ],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!drawingService || !isDrawing || currentTool !== "rectangle") return;

      const point = getMousePosition(e);

      // Show preview rectangle
      drawingService.clearCanvas();
      if (backgroundImage) {
        drawingService.loadBackgroundImage(backgroundImage);
      }
      drawingService.redrawAll();

      // Draw preview rectangle
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx && currentPoints.length > 0) {
        ctx.save();
        ctx.strokeStyle = "#3B82F6";
        ctx.fillStyle = "#3B82F620";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);

        const width = point.x - currentPoints[0].x;
        const height = point.y - currentPoints[0].y;

        ctx.fillRect(currentPoints[0].x, currentPoints[0].y, width, height);
        ctx.strokeRect(currentPoints[0].x, currentPoints[0].y, width, height);

        ctx.restore();
      }
    },
    [
      drawingService,
      isDrawing,
      currentTool,
      currentPoints,
      getMousePosition,
      backgroundImage,
    ],
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (!drawingService || !isDrawing || currentTool !== "rectangle") return;

      const endPoint = getMousePosition(e);

      // Only create rectangle if it has meaningful size
      const width = Math.abs(endPoint.x - currentPoints[0].x);
      const height = Math.abs(endPoint.y - currentPoints[0].y);

      if (width > 10 && height > 10) {
        try {
          const shape = drawingService.drawRectangle(
            currentPoints[0],
            endPoint,
          );
          updateShapeManager();
        } catch (error) {
          console.error("Error creating rectangle:", error);
        }
      }

      setIsDrawing(false);
      setCurrentPoints([]);
      redrawCanvas();
    },
    [
      drawingService,
      isDrawing,
      currentTool,
      currentPoints,
      getMousePosition,
      updateShapeManager,
      redrawCanvas,
    ],
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (currentTool === "polygon" && currentPoints.length >= 3) {
        // Complete polygon on double-click
        try {
          const shape = drawingService?.drawPolygon(currentPoints);
          updateShapeManager();
          setCurrentPoints([]);
        } catch (error) {
          console.error("Error creating polygon:", error);
        }
      }
    },
    [currentTool, currentPoints, drawingService, updateShapeManager],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Cancel current drawing
        setIsDrawing(false);
        setCurrentPoints([]);
        redrawCanvas();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        // Delete selected shape or measurement
        if (shapeManager.selectedShapeId) {
          drawingService?.removeShape(shapeManager.selectedShapeId);
          updateShapeManager();
        } else if (shapeManager.selectedMeasurementId) {
          drawingService?.removeMeasurement(shapeManager.selectedMeasurementId);
          updateShapeManager();
        }
      }
    },
    [isDrawing, shapeManager, drawingService, updateShapeManager, redrawCanvas],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const getCursorStyle = (): string => {
    switch (currentTool) {
      case "select":
        return "cursor-pointer";
      case "rectangle":
      case "polygon":
      case "measure":
        return "cursor-crosshair";
      default:
        return "cursor-default";
    }
  };

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className={`border border-gray-300 ${getCursorStyle()}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      />

      {/* Drawing instructions */}
      {currentTool === "polygon" && currentPoints.length > 0 && (
        <div className="absolute top-2 left-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-sm">
          {currentPoints.length < 3
            ? `Click to add points (${3 - currentPoints.length} more needed)`
            : "Click near start point or double-click to complete"}
        </div>
      )}

      {currentTool === "measure" && currentPoints.length === 1 && (
        <div className="absolute top-2 left-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-sm">
          Click second point to complete measurement
        </div>
      )}

      {currentTool === "rectangle" && isDrawing && (
        <div className="absolute top-2 left-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-sm">
          Drag to create rectangle
        </div>
      )}
    </div>
  );
}
