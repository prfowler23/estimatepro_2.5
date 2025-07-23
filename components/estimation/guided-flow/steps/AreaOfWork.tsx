import React, { useState, useRef, useEffect, memo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Map,
  Download,
  Upload,
  FileImage,
  AlertCircle,
  Building,
  Layers,
  Sparkles,
} from "lucide-react";
import { DrawingCanvas } from "@/components/canvas/DrawingCanvas";
import { ToolPalette } from "@/components/canvas/ToolPalette";
import { ScaleSetter } from "@/components/canvas/ScaleSetter";
import { AreaSummary } from "@/components/canvas/AreaSummary";
import { EnhancedBuilding3D } from "@/components/visualizer/enhanced-building-3d";
import { MapImportService } from "@/lib/canvas/map-import";
import { Shape, Measurement } from "@/lib/canvas/drawing-service";
import { AreaOfWorkData, GuidedFlowData } from "@/lib/types/estimate-types";
import { calculationError as logError } from "@/lib/utils/logger";
import { config } from "@/lib/config";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";

type DrawingTool = "select" | "rectangle" | "polygon" | "measure";

interface AreaOfWorkProps {
  data: GuidedFlowData;
  onUpdate: (stepData: Partial<GuidedFlowData>) => void;
  onNext: () => void;
  onBack: () => void;
}

function AreaOfWorkComponent({
  data,
  onUpdate,
  onNext,
  onBack,
}: AreaOfWorkProps) {
  const [areaData, setAreaData] = useState<AreaOfWorkData>({
    workAreas: data?.areaOfWork?.workAreas || [],
    totalArea: data?.areaOfWork?.totalArea || 0,
    scale: data?.areaOfWork?.scale || 10,
    measurements: data?.areaOfWork?.measurements || [],
  });

  // Separate state for UI-specific properties not in AreaOfWorkData
  const [backgroundImage, setBackgroundImage] = useState<string | undefined>(
    data?.areaOfWork?.backgroundImage,
  );
  const [imageName, setImageName] = useState<string | undefined>(
    data?.areaOfWork?.imageName,
  );

  const [currentTool, setCurrentTool] = useState<DrawingTool>("select");
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [isScaleMode, setIsScaleMode] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mapImportService = new MapImportService();

  // Sync local state with parent data
  useEffect(() => {
    if (data?.areaOfWork) {
      setAreaData(data.areaOfWork);
      setBackgroundImage(data.areaOfWork.backgroundImage);
      setImageName(data.areaOfWork.imageName);
    }
  }, [data?.areaOfWork]);

  // Update canvas size based on viewport
  useEffect(() => {
    const updateCanvasSize = () => {
      const viewportWidth = window.innerWidth;
      const containerPadding = 64; // Account for padding

      if (viewportWidth < 640) {
        // mobile
        setCanvasSize({
          width: Math.min(400, viewportWidth - containerPadding),
          height: 300,
        });
      } else if (viewportWidth < 1024) {
        // tablet
        setCanvasSize({
          width: Math.min(600, viewportWidth - containerPadding),
          height: 450,
        });
      } else {
        // desktop
        setCanvasSize({ width: 800, height: 600 });
      }
    };

    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);
    return () => window.removeEventListener("resize", updateCanvasSize);
  }, []);

  useEffect(() => {
    // Convert existing work areas to shapes when component mounts
    if (areaData.workAreas.length > 0) {
      const convertedShapes = convertWorkAreasToShapes(areaData.workAreas);
      setShapes(convertedShapes);
    }
  }, [areaData.workAreas]);

  const convertWorkAreasToShapes = (
    workAreas: AreaOfWorkData["workAreas"],
  ): Shape[] => {
    return workAreas.map((area) => ({
      id: area.id,
      type: area.geometry.type === "rectangle" ? "rectangle" : "polygon",
      points: area.geometry.coordinates.map((coord) => ({
        x: coord[0],
        y: coord[1],
      })),
      area: area.geometry.area,
      label: area.name,
      color: "#3B82F6", // Default color
    }));
  };

  const convertShapesToWorkAreas = (
    shapes: Shape[],
  ): AreaOfWorkData["workAreas"] => {
    return shapes.map((shape) => ({
      id: shape.id,
      name: shape.label || `Area ${shape.id}`,
      type: "exterior" as const,
      geometry: {
        type: shape.type,
        coordinates: shape.points.map((point) => [point.x, point.y]),
        area: shape.area,
        perimeter: calculatePerimeter(shape.points),
      },
      surfaces: [],
      accessRequirements: [],
      riskFactors: [],
    }));
  };

  const calculatePerimeter = (points: { x: number; y: number }[]): number => {
    if (points.length < 2) return 0;
    let perimeter = 0;
    for (let i = 0; i < points.length; i++) {
      const current = points[i];
      const next = points[(i + 1) % points.length];
      const dx = next.x - current.x;
      const dy = next.y - current.y;
      perimeter += Math.sqrt(dx * dx + dy * dy);
    }
    const scale =
      typeof areaData.scale === "number"
        ? areaData.scale
        : areaData.scale?.pixelsPerFoot || 1;
    return perimeter / scale;
  };

  const handleShapesChange = (
    newShapes: Shape[],
    newMeasurements: Measurement[],
  ) => {
    setShapes(newShapes);
    setMeasurements(newMeasurements);

    // Convert shapes to work areas and update data
    const workAreas = convertShapesToWorkAreas(newShapes);
    setAreaData((prev) => ({ ...prev, workAreas }));
  };

  const handleScaleChange = (newScale: { pixelsPerFoot: number }) => {
    setAreaData((prev) => ({
      ...prev,
      scale: newScale.pixelsPerFoot,
    }));
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      let imageUrl: string;
      let detectedScale: { pixelsPerFoot: number } | null = null;

      if (
        file.name.toLowerCase().includes("nearmap") ||
        file.name.toLowerCase().includes("google")
      ) {
        // Use advanced map import service
        const importResult = await mapImportService.importFromNearmap(file);
        imageUrl = importResult.imageUrl;
        detectedScale = importResult.metadata?.scale
          ? { pixelsPerFoot: importResult.metadata.scale }
          : null;
      } else {
        // Standard image upload
        const reader = new FileReader();
        imageUrl = await new Promise<string>((resolve) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });
      }

      setBackgroundImage(imageUrl);
      setImageName(file.name);
      setAreaData((prev) => ({
        ...prev,
        scale: detectedScale?.pixelsPerFoot || prev.scale,
      }));
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Failed to upload image",
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleClearAll = () => {
    setShapes([]);
    setMeasurements([]);
    setAreaData((prev) => ({ ...prev, workAreas: [] }));
  };

  const handleExport = async () => {
    try {
      // Export using the drawing service
      const canvas = document.querySelector("canvas");
      if (!canvas) return;

      const link = document.createElement("a");
      link.download = `area-map-${imageName || "map"}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch (error) {
      logError(new Error("Area export failed"), {
        error,
        component: "AreaOfWork",
        action: "export_measurements",
      });
    }
  };

  const handleNext = () => {
    const hasAreas =
      areaData.workAreas.length > 0 &&
      areaData.workAreas.some((area) => area.geometry.area > 0);
    if (!hasAreas) {
      alert("Please define at least one work area before continuing");
      return;
    }

    onUpdate({ areaOfWork: areaData });
    onNext();
  };

  const totalArea = areaData.workAreas.reduce(
    (sum, area) => sum + area.geometry.area,
    0,
  );

  // Extract building data from initial contact if available
  const buildingData = {
    height: 50,
    width: 100,
    depth: 80,
    stories: 3,
    buildingType:
      data.initialContact?.aiExtractedData?.requirements?.buildingType ||
      "commercial",
    materials: [],
    features: [],
  };

  const handle3DAnalysisUpdate = (analysis: any) => {
    // Update area data with 3D analysis
    setAreaData((prev) => ({
      ...prev,
      totalArea: prev.totalArea + analysis.totalArea,
      analysisData: analysis,
    }));
  };

  return (
    <ErrorBoundary
      stepId="area-of-work"
      stepNumber={4}
      userId={data?.userId}
      flowData={data}
      fallback={
        <div className="p-6 text-center">
          <Building className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Area Mapping Error
          </h3>
          <p className="text-gray-600 mb-4">
            There was an issue with the drawing tools or 3D visualization. You
            can enter work areas manually.
          </p>
          <Button onClick={onNext} className="mr-2">
            Continue with Manual Entry
          </Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Retry Tools
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-4">Area of Work Mapping</h2>
          <p className="text-gray-600">
            Define work areas using 2D mapping or advanced 3D visualization
            tools.
          </p>
        </div>

        {/* Auto-populated Data Indicator */}
        {data?.areaOfWork?.autoPopulated && (
          <Alert variant="info">
            <Sparkles className="h-4 w-4" />
            <div>
              <h4 className="font-medium mb-1">✨ Areas Auto-generated</h4>
              <p className="text-sm">
                Work areas were automatically created based on your building
                type and requirements. You can refine these areas using the
                mapping tools below.
              </p>
              {data?.areaOfWork?.notes && (
                <p className="text-xs text-gray-600 mt-1 italic">
                  {data.areaOfWork.notes}
                </p>
              )}
            </div>
          </Alert>
        )}

        <Tabs defaultValue="2d-mapping" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="2d-mapping" className="flex items-center gap-2">
              <Map className="w-4 h-4" />
              2D Mapping
            </TabsTrigger>
            <TabsTrigger
              value="3d-visualization"
              className="flex items-center gap-2"
            >
              <Building className="w-4 h-4" />
              3D Visualization
            </TabsTrigger>
          </TabsList>

          <TabsContent value="2d-mapping" className="space-y-6">
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Upload building photos or maps and define work areas with
                measurements.
              </p>
            </div>

            {/* Upload Section */}
            <Card className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Map Upload</h3>
                {backgroundImage && (
                  <div className="text-sm text-gray-600">
                    Current: {areaData.imageName}
                  </div>
                )}
              </div>

              <div className="flex gap-2 mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <Upload className="w-4 h-4 mr-1" />
                  {isUploading ? "Uploading..." : "Upload Image"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  disabled={!backgroundImage || shapes.length === 0}
                >
                  <Download className="w-4 h-4 mr-1" />
                  Export Map
                </Button>
              </div>

              {uploadError && (
                <Alert className="mb-4">
                  <AlertCircle className="w-4 h-4" />
                  {uploadError}
                </Alert>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </Card>

            {/* Main Drawing Interface */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
              {/* Canvas Area */}
              <div className="lg:col-span-3">
                <Card className="p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold">Drawing Area</h3>
                    <div className="text-sm text-gray-600">
                      Total Area: {totalArea.toFixed(0)} sq ft
                    </div>
                  </div>

                  {backgroundImage ? (
                    <div className="space-y-4">
                      <ToolPalette
                        currentTool={currentTool}
                        onToolChange={(tool: string) =>
                          setCurrentTool(tool as DrawingTool)
                        }
                        onClearAll={handleClearAll}
                      />
                      <DrawingCanvas
                        backgroundImage={backgroundImage}
                        currentTool={currentTool}
                        scale={
                          typeof areaData.scale === "number"
                            ? { pixelsPerFoot: areaData.scale }
                            : areaData.scale
                        }
                        onShapesChange={handleShapesChange}
                        onScaleChange={handleScaleChange}
                        width={canvasSize.width}
                        height={canvasSize.height}
                      />
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 p-8 text-center">
                      <FileImage className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <h3 className="text-lg font-semibold mb-2">
                        No Map Loaded
                      </h3>
                      <p className="text-gray-600 mb-4">
                        Upload a building image or site map to start defining
                        work areas.
                      </p>
                      <Button onClick={() => fileInputRef.current?.click()}>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Image
                      </Button>
                    </div>
                  )}
                </Card>
              </div>

              {/* Side Panel */}
              <div className="space-y-4">
                <ScaleSetter
                  currentScale={
                    typeof areaData.scale === "number"
                      ? areaData.scale
                      : areaData.scale?.pixelsPerFoot
                  }
                  onScaleSet={(pixelsPerFoot) =>
                    setAreaData((prev) => ({
                      ...prev,
                      scale: pixelsPerFoot,
                    }))
                  }
                  isActive={isScaleMode}
                  onActivate={() => setIsScaleMode(true)}
                  onDeactivate={() => setIsScaleMode(false)}
                />
                <AreaSummary
                  shapes={shapes}
                  measurements={measurements as any}
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Additional Notes
              </label>
              <textarea
                className="w-full p-3 border rounded-lg"
                rows={3}
                placeholder="Any additional notes about the work areas..."
                value={areaData.notes}
                onChange={(e) =>
                  setAreaData((prev) => ({ ...prev, notes: e.target.value }))
                }
              />
            </div>
          </TabsContent>

          <TabsContent value="3d-visualization" className="space-y-6">
            <EnhancedBuilding3D
              buildingData={buildingData}
              measurements={measurements}
              serviceAreas={areaData.workAreas}
              onAnalysisUpdate={handle3DAnalysisUpdate}
            />
          </TabsContent>
        </Tabs>

        {/* Navigation */}
        <div className="flex justify-between pt-6">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button onClick={handleNext}>Continue to Takeoff</Button>
        </div>
      </div>
    </ErrorBoundary>
  );
}

// PHASE 3 FIX: Memoize to prevent expensive 3D visualization and canvas re-initialization
export const AreaOfWork = memo(AreaOfWorkComponent, (prevProps, nextProps) => {
  return (
    prevProps.data?.areaOfWork === nextProps.data?.areaOfWork &&
    prevProps.onUpdate === nextProps.onUpdate &&
    prevProps.onNext === nextProps.onNext &&
    prevProps.onBack === nextProps.onBack
  );
});
