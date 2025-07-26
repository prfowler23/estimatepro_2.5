"use client";

import React, { useState, useCallback } from "react";
import { DrawingCanvas } from "./DrawingCanvas";
import { AreaSummary } from "./AreaSummary";
import { ToolPalette } from "./ToolPalette";
import { ScaleSetter } from "./ScaleSetter";
import { Shape, Measurement } from "@/lib/canvas/drawing-service";
import { TakeoffData } from "@/lib/types/estimate-types";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";

interface AreaBuilderProps {
  onSave: (data: TakeoffData) => void;
  initialData?: TakeoffData | null;
  height?: number;
}

export function AreaBuilder({
  onSave,
  initialData,
  height = 400,
}: AreaBuilderProps) {
  const [shapes, setShapes] = useState<Shape[]>(initialData?.shapes || []);
  const [measurements, setMeasurements] = useState<Measurement[]>(
    initialData?.measurements || [],
  );
  const [currentTool, setCurrentTool] = useState<
    "select" | "rectangle" | "polygon" | "measure"
  >("select");
  const [scale, setScale] = useState(
    initialData?.scale || { pixelsPerFoot: 10 },
  );
  const [backgroundImage, setBackgroundImage] = useState<string | undefined>(
    initialData?.backgroundImage,
  );

  const handleShapesChange = useCallback(
    (newShapes: Shape[], newMeasurements: Measurement[]) => {
      setShapes(newShapes);
      setMeasurements(newMeasurements);
    },
    [],
  );

  const handleSave = () => {
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
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setBackgroundImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <ToolPalette currentTool={currentTool} onToolChange={setCurrentTool} />
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

      {shapes.length > 0 && <AreaSummary shapes={shapes} scale={scale} />}
    </div>
  );
}
