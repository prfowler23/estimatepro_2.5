import React, { useState } from "react";
import { DrawingCanvas } from "@/components/canvas/DrawingCanvas";
import { ToolPalette } from "@/components/canvas/ToolPalette";
import { ScaleSetter } from "@/components/canvas/ScaleSetter";
import { AreaSummary } from "@/components/canvas/AreaSummary";
import { MapImportService } from "@/lib/canvas/map-import";
import { exportMapWithMeasurements } from "@/lib/canvas/import-export";
import { GuidedFlowData } from "@/lib/types/estimate-types";
import { Measurement as CanvasMeasurement } from "@/lib/canvas/drawing-service";
import { Measurement as EstimateMeasurement } from "@/lib/types/estimate-types";

interface AreaOfWorkCompleteProps {
  data: GuidedFlowData;
  onUpdate: (data: Partial<GuidedFlowData>) => void;
  onNext: () => void;
  onBack: () => void;
}

// Main component that combines all the canvas features
export function AreaOfWorkComplete({
  data,
  onUpdate,
  onNext,
  onBack,
}: AreaOfWorkCompleteProps) {
  const [currentTool, setCurrentTool] = useState<
    "select" | "rectangle" | "polygon" | "measure"
  >("select");
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [shapes, setShapes] = useState<
    Array<{
      id: string;
      type: "rectangle" | "polygon";
      points: Array<{ x: number; y: number }>;
      area: number;
      label?: string;
    }>
  >([]);
  const [measurements, setMeasurements] = useState<CanvasMeasurement[]>([]);
  const [scale, setScale] = useState<{ pixelsPerFoot: number } | null>(null);

  const handleFileUpload = async (file: File) => {
    const importService = new MapImportService();

    if (file.name.includes("nearmap")) {
      const result = await importService.importFromNearmap(file);
      setBackgroundImage(result.imageUrl);
      if (result.metadata?.scale) {
        setScale({ pixelsPerFoot: result.metadata.scale });
      }
    } else {
      // Handle other file types
      const url = URL.createObjectURL(file);
      setBackgroundImage(url);
    }
  };

  const handleExport = async () => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return;

    const blob = await exportMapWithMeasurements(canvas, shapes, measurements);

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "area-measurements.png";
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <ToolPalette
            currentTool={currentTool}
            onToolChange={(tool: string) =>
              setCurrentTool(
                tool as "select" | "rectangle" | "polygon" | "measure",
              )
            }
            onClearAll={() => {
              setShapes([]);
              setMeasurements([]);
            }}
          />
          <DrawingCanvas
            backgroundImage={backgroundImage || undefined}
            currentTool={currentTool}
            onShapesChange={(s, m) => {
              setShapes(s);
              setMeasurements(m);
            }}
          />
        </div>
        <div className="space-y-4">
          <ScaleSetter
            onScaleSet={(pixelsPerFoot: number) => setScale({ pixelsPerFoot })}
          />
          <AreaSummary shapes={shapes} measurements={measurements} />
          <button onClick={handleExport}>Export Map</button>
        </div>
      </div>
    </div>
  );
}
