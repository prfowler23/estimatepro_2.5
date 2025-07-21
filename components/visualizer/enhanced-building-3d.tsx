"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Building,
  Layers,
  Ruler,
  Camera,
  Download,
  Upload,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Grid3x3,
  Lightbulb,
  Settings,
  Save,
  Share2,
  Eye,
  MousePointer,
  Maximize,
  Minimize,
} from "lucide-react";
import {
  Visualization3DEngine,
  BuildingModel,
  BuildingTemplates,
  type ViewingOptions,
  type ServiceArea,
  type MeasurementOverlay,
} from "@/lib/visualization/3d-engine";
import { config } from "@/lib/config";

interface Enhanced3DProps {
  buildingData?: {
    height: number;
    width: number;
    depth: number;
    stories: number;
    buildingType: string;
    materials?: string[];
    features?: any[];
  };
  measurements?: any[];
  serviceAreas?: any[];
  onMeasurementAdd?: (measurement: MeasurementOverlay) => void;
  onServiceAreaAdd?: (area: ServiceArea) => void;
  onAnalysisUpdate?: (analysis: any) => void;
}

export function EnhancedBuilding3D({
  buildingData,
  measurements = [],
  serviceAreas = [],
  onMeasurementAdd,
  onServiceAreaAdd,
  onAnalysisUpdate,
}: Enhanced3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [engine, setEngine] = useState<Visualization3DEngine | null>(null);
  const [activeTab, setActiveTab] = useState("view");
  const [isEnabled, setIsEnabled] = useState(config.features.threeDimensional);

  const [dimensions, setDimensions] = useState({
    height: buildingData?.height || 50,
    width: buildingData?.width || 100,
    depth: buildingData?.depth || 80,
    stories: buildingData?.stories || 3,
    buildingType: buildingData?.buildingType || "commercial",
  });

  const [viewingOptions, setViewingOptions] = useState<ViewingOptions>({
    perspective: "isometric",
    zoom: 1.0,
    lighting: "natural",
    showGrid: true,
    showMeasurements: true,
    showMaterials: true,
    wireframe: false,
  });

  const [analysisData, setAnalysisData] = useState({
    totalArea: 0,
    totalTime: 0,
    equipmentNeeds: [] as string[],
    riskLevel: "low" as "low" | "medium" | "high",
    riskFactors: [] as string[],
  });

  const [selectedTool, setSelectedTool] = useState<
    "select" | "measure" | "area"
  >("select");
  const [isDrawing, setIsDrawing] = useState(false);

  // Initialize 3D engine
  useEffect(() => {
    if (!isEnabled) return;

    if (canvasRef.current) {
      const newEngine = new Visualization3DEngine(canvasRef.current);
      setEngine(newEngine);

      // Add initial building
      const buildingTemplate =
        buildingData?.buildingType === "residential"
          ? BuildingTemplates.residential
          : buildingData?.buildingType === "industrial"
            ? BuildingTemplates.industrial
            : BuildingTemplates.commercial;

      const building = buildingTemplate(
        dimensions.width,
        dimensions.height,
        dimensions.depth,
      );

      newEngine.addBuilding(building);
      newEngine.setViewingOptions(viewingOptions);
      newEngine.render();

      // Update analysis
      updateAnalysis(newEngine);
    }
  }, [isEnabled, canvasRef.current]);

  // Update engine when dimensions change
  useEffect(() => {
    if (engine) {
      // Remove existing buildings and add updated one
      engine.removeBuilding("residential-0");
      engine.removeBuilding("commercial-0");
      engine.removeBuilding("industrial-0");

      const buildingTemplate =
        dimensions.buildingType === "residential"
          ? BuildingTemplates.residential
          : dimensions.buildingType === "industrial"
            ? BuildingTemplates.industrial
            : BuildingTemplates.commercial;

      const building = buildingTemplate(
        dimensions.width,
        dimensions.height,
        dimensions.depth,
      );

      engine.addBuilding(building);
      engine.render();
      updateAnalysis(engine);
    }
  }, [dimensions, engine]);

  // Update viewing options
  useEffect(() => {
    if (engine) {
      engine.setViewingOptions(viewingOptions);
      engine.render();
    }
  }, [viewingOptions, engine]);

  const updateAnalysis = (engineInstance: Visualization3DEngine) => {
    const analysis = {
      totalArea: engineInstance.calculateTotalArea(),
      totalTime: engineInstance.calculateTotalTime(),
      equipmentNeeds: engineInstance.getEquipmentRequirements(),
      riskLevel: engineInstance.getRiskAssessment().level,
      riskFactors: engineInstance.getRiskAssessment().factors,
    };

    setAnalysisData(analysis);
    onAnalysisUpdate?.(analysis);
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!engine || selectedTool === "select") return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (selectedTool === "measure") {
      // Add measurement logic here
      const measurement: MeasurementOverlay = {
        id: `measure-${Date.now()}`,
        startPoint: { x: x - 50, y: y - 50, z: 0 },
        endPoint: { x: x + 50, y: y + 50, z: 0 },
        measurement: 10, // Default 10 feet
        unit: "ft",
        label: "Custom Measurement",
        color: "#ff6b35",
      };

      engine.addMeasurement(measurement);
      engine.render();
      onMeasurementAdd?.(measurement);
    }

    if (selectedTool === "area") {
      // Add service area logic here
      const serviceArea: ServiceArea = {
        id: `area-${Date.now()}`,
        name: "New Service Area",
        surface: "exterior_wall",
        coordinates: [
          { x: x - 30, y: y - 30, z: 0 },
          { x: x + 30, y: y - 30, z: 0 },
          { x: x + 30, y: y + 30, z: 0 },
          { x: x - 30, y: y + 30, z: 0 },
        ],
        area: 3600, // Default area
        material: {
          type: "concrete",
          color: "#gray",
          reflectivity: 0.3,
        },
        complexity: "medium",
        accessMethod: "ladder",
        estimatedTime: 4,
        riskFactors: ["Working at Height"],
      };

      engine.addServiceArea(serviceArea);
      engine.render();
      updateAnalysis(engine);
      onServiceAreaAdd?.(serviceArea);
    }
  };

  const exportData = () => {
    if (!engine) return;

    const data = engine.exportToJSON();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `3d-building-model-${Date.now()}.json`;
    link.click();
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !engine) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonData = e.target?.result as string;
        engine.importFromJSON(jsonData);
        engine.render();
        updateAnalysis(engine);
      } catch (error) {
        alert("Error importing 3D model data");
      }
    };
    reader.readAsText(file);
  };

  if (!isEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            3D Visualization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <Lightbulb className="h-4 w-4" />
            <AlertDescription>
              3D visualization features are currently disabled. Contact your
              administrator to enable advanced 3D building analysis.
            </AlertDescription>
          </Alert>
          <div className="mt-4">
            <Button
              onClick={() => setIsEnabled(true)}
              variant="outline"
              className="w-full"
            >
              Enable 3D Features (Demo Mode)
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Building className="w-6 h-6 text-blue-500" />
          Enhanced 3D Building Visualizer
        </h2>
        <p className="text-muted-foreground">
          Advanced 3D building analysis with measurements and service area
          mapping
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="view">3D View</TabsTrigger>
          <TabsTrigger value="controls">Controls</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
        </TabsList>

        <TabsContent value="view" className="space-y-4">
          {/* 3D Canvas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  3D Building Model
                </span>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={selectedTool === "select" ? "default" : "outline"}
                  >
                    <MousePointer className="w-3 h-3 mr-1" />
                    Select
                  </Badge>
                  <Badge
                    variant={selectedTool === "measure" ? "default" : "outline"}
                  >
                    <Ruler className="w-3 h-3 mr-1" />
                    Measure
                  </Badge>
                  <Badge
                    variant={selectedTool === "area" ? "default" : "outline"}
                  >
                    <Layers className="w-3 h-3 mr-1" />
                    Area
                  </Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Tool Selection */}
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={selectedTool === "select" ? "default" : "outline"}
                    onClick={() => setSelectedTool("select")}
                  >
                    <MousePointer className="w-4 h-4 mr-1" />
                    Select
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedTool === "measure" ? "default" : "outline"}
                    onClick={() => setSelectedTool("measure")}
                  >
                    <Ruler className="w-4 h-4 mr-1" />
                    Measure
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedTool === "area" ? "default" : "outline"}
                    onClick={() => setSelectedTool("area")}
                  >
                    <Layers className="w-4 h-4 mr-1" />
                    Service Area
                  </Button>
                </div>

                {/* Canvas */}
                <div className="border rounded-lg overflow-hidden bg-gray-50">
                  <canvas
                    ref={canvasRef}
                    width={800}
                    height={600}
                    className="w-full cursor-crosshair"
                    onClick={handleCanvasClick}
                  />
                </div>

                {/* View Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setViewingOptions((prev) => ({
                          ...prev,
                          zoom: Math.min(prev.zoom + 0.2, 3.0),
                        }))
                      }
                    >
                      <ZoomIn className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setViewingOptions((prev) => ({
                          ...prev,
                          zoom: Math.max(prev.zoom - 0.2, 0.2),
                        }))
                      }
                    >
                      <ZoomOut className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setViewingOptions((prev) => ({ ...prev, zoom: 1.0 }))
                      }
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={viewingOptions.showGrid}
                      onCheckedChange={(checked) =>
                        setViewingOptions((prev) => ({
                          ...prev,
                          showGrid: checked,
                        }))
                      }
                    />
                    <Label className="text-sm">Grid</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {analysisData.totalArea.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Total Area (sq ft)
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {analysisData.totalTime}
                  </p>
                  <p className="text-sm text-muted-foreground">Est. Hours</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">
                    {analysisData.equipmentNeeds.length}
                  </p>
                  <p className="text-sm text-muted-foreground">Equipment</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <Badge
                    className={
                      analysisData.riskLevel === "low"
                        ? "bg-green-500"
                        : analysisData.riskLevel === "medium"
                          ? "bg-yellow-500"
                          : "bg-red-500"
                    }
                  >
                    {analysisData.riskLevel.toUpperCase()}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-1">
                    Risk Level
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="controls" className="space-y-6">
          {/* Building Dimensions */}
          <Card>
            <CardHeader>
              <CardTitle>Building Dimensions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="height">Height (ft)</Label>
                  <Input
                    id="height"
                    type="number"
                    value={dimensions.height}
                    onChange={(e) =>
                      setDimensions((prev) => ({
                        ...prev,
                        height: Number(e.target.value),
                      }))
                    }
                    min="10"
                    max="500"
                  />
                </div>
                <div>
                  <Label htmlFor="width">Width (ft)</Label>
                  <Input
                    id="width"
                    type="number"
                    value={dimensions.width}
                    onChange={(e) =>
                      setDimensions((prev) => ({
                        ...prev,
                        width: Number(e.target.value),
                      }))
                    }
                    min="10"
                    max="500"
                  />
                </div>
                <div>
                  <Label htmlFor="depth">Depth (ft)</Label>
                  <Input
                    id="depth"
                    type="number"
                    value={dimensions.depth}
                    onChange={(e) =>
                      setDimensions((prev) => ({
                        ...prev,
                        depth: Number(e.target.value),
                      }))
                    }
                    min="10"
                    max="500"
                  />
                </div>
                <div>
                  <Label htmlFor="buildingType">Building Type</Label>
                  <Select
                    value={dimensions.buildingType}
                    onValueChange={(value) =>
                      setDimensions((prev) => ({
                        ...prev,
                        buildingType: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="residential">Residential</SelectItem>
                      <SelectItem value="commercial">Commercial</SelectItem>
                      <SelectItem value="industrial">Industrial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* View Options */}
          <Card>
            <CardHeader>
              <CardTitle>Viewing Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Perspective</Label>
                  <Select
                    value={viewingOptions.perspective}
                    onValueChange={(value: any) =>
                      setViewingOptions((prev) => ({
                        ...prev,
                        perspective: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="front">Front View</SelectItem>
                      <SelectItem value="back">Back View</SelectItem>
                      <SelectItem value="left">Left View</SelectItem>
                      <SelectItem value="right">Right View</SelectItem>
                      <SelectItem value="top">Top View</SelectItem>
                      <SelectItem value="isometric">Isometric</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Lighting</Label>
                  <Select
                    value={viewingOptions.lighting}
                    onValueChange={(value: any) =>
                      setViewingOptions((prev) => ({
                        ...prev,
                        lighting: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="natural">Natural</SelectItem>
                      <SelectItem value="studio">Studio</SelectItem>
                      <SelectItem value="night">Night</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Show Measurements</Label>
                  <Switch
                    checked={viewingOptions.showMeasurements}
                    onCheckedChange={(checked) =>
                      setViewingOptions((prev) => ({
                        ...prev,
                        showMeasurements: checked,
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Show Materials</Label>
                  <Switch
                    checked={viewingOptions.showMaterials}
                    onCheckedChange={(checked) =>
                      setViewingOptions((prev) => ({
                        ...prev,
                        showMaterials: checked,
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Wireframe Mode</Label>
                  <Switch
                    checked={viewingOptions.wireframe}
                    onCheckedChange={(checked) =>
                      setViewingOptions((prev) => ({
                        ...prev,
                        wireframe: checked,
                      }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          {/* Risk Assessment */}
          <Card>
            <CardHeader>
              <CardTitle>Risk Assessment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Overall Risk Level:</span>
                  <Badge
                    className={
                      analysisData.riskLevel === "low"
                        ? "bg-green-500"
                        : analysisData.riskLevel === "medium"
                          ? "bg-yellow-500"
                          : "bg-red-500"
                    }
                  >
                    {analysisData.riskLevel.toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <Label className="font-medium">Risk Factors:</Label>
                  <div className="mt-2 space-y-1">
                    {analysisData.riskFactors.map((factor, index) => (
                      <Badge key={index} variant="outline" className="mr-2">
                        {factor}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Equipment Requirements */}
          <Card>
            <CardHeader>
              <CardTitle>Equipment Requirements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analysisData.equipmentNeeds.map((equipment, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    <span>{equipment}</span>
                  </div>
                ))}
                {analysisData.equipmentNeeds.length === 0 && (
                  <p className="text-muted-foreground">
                    No special equipment required
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Time and Area Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Project Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-medium">Total Area:</Label>
                  <p className="text-2xl font-bold">
                    {analysisData.totalArea.toLocaleString()} sq ft
                  </p>
                </div>
                <div>
                  <Label className="font-medium">Estimated Time:</Label>
                  <p className="text-2xl font-bold">
                    {analysisData.totalTime} hours
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                Export & Import
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Button
                  onClick={exportData}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export 3D Model
                </Button>
                <div>
                  <input
                    type="file"
                    accept=".json"
                    onChange={importData}
                    className="hidden"
                    id="import-file"
                  />
                  <Button
                    variant="outline"
                    onClick={() =>
                      document.getElementById("import-file")?.click()
                    }
                    className="flex items-center gap-2 w-full"
                  >
                    <Upload className="w-4 h-4" />
                    Import 3D Model
                  </Button>
                </div>
              </div>

              <div className="text-center text-sm text-muted-foreground">
                Export includes building model, measurements, and service areas
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
