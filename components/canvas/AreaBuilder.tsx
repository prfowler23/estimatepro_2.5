"use client";

import React, { useState, useCallback, useMemo } from "react";
import { DrawingCanvas } from "./DrawingCanvas";
import { AreaSummary } from "./AreaSummary";
import { ToolPalette } from "./ToolPalette";
import { ScaleSetter } from "./ScaleSetter";
import {
  Shape,
  Measurement,
  DrawingTool,
  Scale,
  TakeoffData,
  AreaBuilderProps,
  MAX_FILE_SIZE_MB,
  ALLOWED_IMAGE_TYPES,
} from "./types";
import { Button } from "@/components/ui/button";
import { Save, AlertCircle } from "lucide-react";

export function AreaBuilder({
  onSave,
  initialData,
  height = 400,
}: AreaBuilderProps) {
  const [shapes, setShapes] = useState<Shape[]>(initialData?.shapes || []);
  const [measurements, setMeasurements] = useState<Measurement[]>(
    initialData?.measurements || [],
  );
  const [currentTool, setCurrentTool] = useState<DrawingTool>("select");
  const [scale, setScale] = useState<Scale>(
    initialData?.scale || { pixelsPerFoot: 10 },
  );
  const [backgroundImage, setBackgroundImage] = useState<string | undefined>(
    initialData?.backgroundImage,
  );
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleShapesChange = useCallback(
    (newShapes: Shape[], newMeasurements: Measurement[]) => {
      setShapes(newShapes);
      setMeasurements(newMeasurements);
    },
    [],
  );

  const handleSave = useCallback(() => {
    const totalArea = shapes.reduce((total, shape) => {
      return total + (shape.area || 0);
    }, 0);

    const totalPerimeter = shapes.reduce((total, shape) => {
      return total + (shape.perimeter || 0);
    }, 0);

    const data: TakeoffData = {
      shapes,
      measurements,
      scale,
      backgroundImage,
      calculations: {
        totalArea,
        totalPerimeter,
        shapeCount: shapes.length,
        measurementCount: measurements.length,
      },
    };

    onSave(data);
  }, [shapes, measurements, scale, backgroundImage, onSave]);

  const handleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setUploadError(null);
      const file = e.target.files?.[0];

      if (!file) return;

      // Validate file type
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        setUploadError(
          `Please upload a valid image file (${ALLOWED_IMAGE_TYPES.join(", ")})`,
        );
        return;
      }

      // Validate file size
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > MAX_FILE_SIZE_MB) {
        setUploadError(`File size must be less than ${MAX_FILE_SIZE_MB}MB`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result;
        if (typeof result === "string") {
          setBackgroundImage(result);
        }
      };
      reader.onerror = () => {
        setUploadError("Failed to load image. Please try again.");
      };
      reader.readAsDataURL(file);
    },
    [],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <ToolPalette
          currentTool={currentTool}
          onToolChange={setCurrentTool}
          onClearAll={() => {
            setShapes([]);
            setMeasurements([]);
          }}
        />
        <ScaleSetter scale={scale} onScaleChange={setScale} />

        <div className="flex-1">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
            id="upload-background"
          />
          <label
            htmlFor="upload-background"
            className="btn btn-secondary cursor-pointer"
          >
            Upload Floor Plan
          </label>
        </div>

        <Button onClick={handleSave} className="gap-2">
          <Save className="h-4 w-4" />
          Save Measurements
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <DrawingCanvas
          backgroundImage={backgroundImage}
          onShapesChange={handleShapesChange}
          currentTool={currentTool}
          scale={scale}
          onScaleChange={setScale}
          width={800}
          height={height}
        />
      </div>

      {uploadError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{uploadError}</span>
        </div>
      )}

      {shapes.length > 0 && <AreaSummary shapes={shapes} scale={scale} />}
    </div>
  );
}
