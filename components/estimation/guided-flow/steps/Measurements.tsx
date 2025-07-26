"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useEstimateFlow } from "../../EstimateFlowProvider";
import {
  WorkArea,
  Measurement,
  TakeoffData,
  ServiceType,
} from "@/lib/types/estimate-types";
import {
  Ruler,
  Camera,
  Map,
  Square,
  Building,
  Plus,
  Trash2,
  Calculator,
  AlertCircle,
  CheckCircle2,
  Upload,
  Layers,
  Maximize2,
} from "lucide-react";
import { AreaBuilder } from "@/components/canvas/AreaBuilder";
import { validateClientEnv } from "@/lib/config/env-validation";
import { cn } from "@/lib/utils";

interface AreaInput {
  id: string;
  name: string;
  length: string;
  width: string;
  height: string;
  calculated: number;
}

export default function Measurements() {
  const { flowData, updateFlowData, validateCurrentStep } = useEstimateFlow();
  const env = validateClientEnv();

  // Input method selection
  const [inputMethod, setInputMethod] = useState<
    "manual" | "photo" | "drawing"
  >("manual");

  // Manual input state
  const [areas, setAreas] = useState<AreaInput[]>([
    {
      id: "1",
      name: "Main Building",
      length: flowData.areaOfWork?.measurements?.[0]?.length?.toString() || "",
      width: flowData.areaOfWork?.measurements?.[0]?.width?.toString() || "",
      height: flowData.areaOfWork?.measurements?.[0]?.height?.toString() || "",
      calculated: 0,
    },
  ]);

  // Building details
  const [buildingType, setBuildingType] = useState(
    flowData.areaOfWork?.buildingDetails?.type || "office",
  );
  const [floors, setFloors] = useState(
    flowData.areaOfWork?.buildingDetails?.floors?.toString() || "1",
  );
  const [accessNotes, setAccessNotes] = useState(
    flowData.areaOfWork?.buildingDetails?.accessNotes || "",
  );

  // Photo analysis state
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  // Drawing state
  const [drawingData, setDrawingData] = useState<TakeoffData | null>(
    flowData.takeoff?.takeoffData || null,
  );

  // Validation state
  const [errors, setErrors] = useState<string[]>([]);

  // Calculate area for a single input
  const calculateArea = useCallback(
    (area: AreaInput): number => {
      const length = parseFloat(area.length) || 0;
      const width = parseFloat(area.width) || 0;
      const height = parseFloat(area.height) || 0;

      // Different calculations based on selected services
      const services = flowData.scopeDetails?.selectedServices || [];

      if (services.includes("WC")) {
        // Window cleaning: perimeter × height × floors
        const perimeter = 2 * (length + width);
        return perimeter * height * (parseInt(floors) || 1);
      } else if (services.includes("PW") || services.includes("PD")) {
        // Pressure washing: ground area
        return length * width;
      } else {
        // Default: total surface area
        return length * width;
      }
    },
    [flowData.scopeDetails?.selectedServices, floors],
  );

  // Update calculations when inputs change
  useEffect(() => {
    const updatedAreas = areas.map((area) => ({
      ...area,
      calculated: calculateArea(area),
    }));

    if (JSON.stringify(updatedAreas) !== JSON.stringify(areas)) {
      setAreas(updatedAreas);
    }
  }, [areas, calculateArea]);

  // Calculate total area
  const totalArea = areas.reduce((sum, area) => sum + area.calculated, 0);

  // Update flow data
  useEffect(() => {
    const measurements: Measurement[] = areas
      .filter((area) => area.calculated > 0)
      .map((area) => ({
        id: area.id,
        type: "area",
        label: area.name,
        length: parseFloat(area.length) || 0,
        width: parseFloat(area.width) || 0,
        height: parseFloat(area.height) || 0,
        area: area.calculated,
        unit: "sqft",
      }));

    updateFlowData({
      areaOfWork: {
        workAreas: measurements.map((m) => ({
          id: m.id,
          name: m.label || "Area",
          measurements: [m],
          totalArea: m.area,
          services: flowData.scopeDetails?.selectedServices || [],
        })),
        measurements,
        totalArea,
        buildingDetails: {
          type: buildingType,
          floors: parseInt(floors) || 1,
          height: parseFloat(areas[0]?.height) || 0,
          accessNotes,
        },
      },
      takeoff: {
        takeoffData: drawingData || {
          id: `takeoff-${Date.now()}`,
          workAreas: [],
          measurements,
          calculations: {
            totalArea,
            totalPerimeter: 0,
            complexityFactor: 1.0,
            accessDifficulty: 1.0,
          },
          accuracy: inputMethod === "manual" ? 0.9 : 0.95,
          method: inputMethod,
        },
        measurements,
      },
    });
  }, [
    areas,
    totalArea,
    buildingType,
    floors,
    accessNotes,
    inputMethod,
    drawingData,
  ]);

  // Add new area
  const addArea = () => {
    setAreas([
      ...areas,
      {
        id: Date.now().toString(),
        name: `Area ${areas.length + 1}`,
        length: "",
        width: "",
        height: "",
        calculated: 0,
      },
    ]);
  };

  // Remove area
  const removeArea = (id: string) => {
    if (areas.length > 1) {
      setAreas(areas.filter((area) => area.id !== id));
    }
  };

  // Update area field
  const updateArea = (id: string, field: keyof AreaInput, value: string) => {
    setAreas(
      areas.map((area) =>
        area.id === id ? { ...area, [field]: value } : area,
      ),
    );
  };

  // Handle photo upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedFiles(files);
  };

  // Analyze photos with AI
  const analyzePhotos = async () => {
    if (uploadedFiles.length === 0) return;

    setIsAnalyzing(true);
    try {
      // Simulate AI analysis (replace with actual API call)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Mock analysis result
      const result = {
        totalArea: 3500,
        measurements: [
          { name: "Front Facade", area: 1200, confidence: 0.92 },
          { name: "Side Wall", area: 800, confidence: 0.88 },
          { name: "Rear", area: 1500, confidence: 0.85 },
        ],
        buildingHeight: 35,
        floors: 3,
      };

      setAnalysisResult(result);

      // Auto-fill first area with results
      if (result.measurements.length > 0) {
        setAreas([
          {
            id: "1",
            name: "AI Analyzed Building",
            length: Math.sqrt(result.totalArea).toFixed(1),
            width: Math.sqrt(result.totalArea).toFixed(1),
            height: result.buildingHeight.toString(),
            calculated: result.totalArea,
          },
        ]);
        setFloors(result.floors.toString());
      }
    } catch (error) {
      console.error("Photo analysis failed:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle drawing save
  const handleDrawingSave = (data: TakeoffData) => {
    setDrawingData(data);
    // Extract total area from drawing
    if (data.calculations.totalArea > 0) {
      setAreas([
        {
          id: "1",
          name: "Drawn Area",
          length: Math.sqrt(data.calculations.totalArea).toFixed(1),
          width: Math.sqrt(data.calculations.totalArea).toFixed(1),
          height: areas[0]?.height || "20",
          calculated: data.calculations.totalArea,
        },
      ]);
    }
  };

  // Validate measurements
  useEffect(() => {
    const validation = validateCurrentStep();
    setErrors(validation.errors);
  }, [totalArea]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Input Method Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ruler className="h-5 w-5" />
            Measurement Method
          </CardTitle>
          <CardDescription>
            Choose how you'd like to input measurements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={inputMethod}
            onValueChange={(v) => setInputMethod(v as any)}
          >
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="manual" className="flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Manual Entry
              </TabsTrigger>
              <TabsTrigger value="photo" className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Photo Analysis
              </TabsTrigger>
              <TabsTrigger value="drawing" className="flex items-center gap-2">
                <Map className="h-4 w-4" />
                Draw on Map
              </TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="mt-6">
              <div className="space-y-4">
                {/* Building Details */}
                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <div className="space-y-2">
                    <Label htmlFor="buildingType">Building Type</Label>
                    <select
                      id="buildingType"
                      value={buildingType}
                      onChange={(e) => setBuildingType(e.target.value)}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background"
                    >
                      <option value="office">Office Building</option>
                      <option value="retail">Retail Store</option>
                      <option value="residential">Residential Complex</option>
                      <option value="industrial">Industrial Facility</option>
                      <option value="medical">Medical Facility</option>
                      <option value="educational">School/University</option>
                      <option value="hospitality">Hotel/Restaurant</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="floors" className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Number of Floors
                    </Label>
                    <Input
                      id="floors"
                      type="number"
                      min="1"
                      value={floors}
                      onChange={(e) => setFloors(e.target.value)}
                      placeholder="1"
                    />
                  </div>
                </div>

                <Separator />

                {/* Area Inputs */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base">Areas to Measure</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addArea}
                      className="flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      Add Area
                    </Button>
                  </div>

                  {areas.map((area, index) => (
                    <Card key={area.id} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Input
                            value={area.name}
                            onChange={(e) =>
                              updateArea(area.id, "name", e.target.value)
                            }
                            placeholder="Area name"
                            className="max-w-[200px]"
                          />
                          {areas.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeArea(area.id)}
                              className="text-red-500 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Length (ft)</Label>
                            <Input
                              type="number"
                              value={area.length}
                              onChange={(e) =>
                                updateArea(area.id, "length", e.target.value)
                              }
                              placeholder="0"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Width (ft)</Label>
                            <Input
                              type="number"
                              value={area.width}
                              onChange={(e) =>
                                updateArea(area.id, "width", e.target.value)
                              }
                              placeholder="0"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Height (ft)</Label>
                            <Input
                              type="number"
                              value={area.height}
                              onChange={(e) =>
                                updateArea(area.id, "height", e.target.value)
                              }
                              placeholder="0"
                            />
                          </div>
                        </div>

                        {area.calculated > 0 && (
                          <div className="text-sm text-text-secondary">
                            Calculated area:{" "}
                            <span className="font-medium text-text-primary">
                              {area.calculated.toLocaleString()} sq ft
                            </span>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accessNotes">Access Notes (optional)</Label>
                  <textarea
                    id="accessNotes"
                    value={accessNotes}
                    onChange={(e) => setAccessNotes(e.target.value)}
                    placeholder="Any special access requirements or considerations..."
                    className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background resize-none"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="photo" className="mt-6">
              <div className="space-y-4">
                {!analysisResult ? (
                  <>
                    <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                      <Upload className="h-12 w-12 mx-auto text-text-secondary mb-4" />
                      <Label htmlFor="photo-upload" className="cursor-pointer">
                        <span className="text-primary hover:underline">
                          Click to upload photos
                        </span>
                        <span className="text-text-secondary">
                          {" "}
                          or drag and drop
                        </span>
                      </Label>
                      <input
                        id="photo-upload"
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                      <p className="text-xs text-text-secondary mt-2">
                        PNG, JPG up to 10MB each
                      </p>
                    </div>

                    {uploadedFiles.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">
                          {uploadedFiles.length} photo
                          {uploadedFiles.length > 1 ? "s" : ""} selected
                        </p>
                        <Button
                          onClick={analyzePhotos}
                          disabled={isAnalyzing}
                          className="w-full"
                        >
                          {isAnalyzing
                            ? "Analyzing..."
                            : "Analyze Photos with AI"}
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <p className="font-medium text-green-900">
                          AI Analysis Complete
                        </p>
                      </div>
                      <div className="space-y-1 text-sm text-green-800">
                        <p>
                          Total Area:{" "}
                          {analysisResult.totalArea.toLocaleString()} sq ft
                        </p>
                        <p>
                          Building Height: {analysisResult.buildingHeight} ft
                        </p>
                        <p>Floors Detected: {analysisResult.floors}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium">Detected Areas:</p>
                      {analysisResult.measurements.map((m: any, i: number) => (
                        <div
                          key={i}
                          className="flex items-center justify-between text-sm p-2 bg-bg-subtle rounded"
                        >
                          <span>{m.name}</span>
                          <div className="flex items-center gap-2">
                            <span>{m.area.toLocaleString()} sq ft</span>
                            <Badge variant="secondary" className="text-xs">
                              {(m.confidence * 100).toFixed(0)}% confident
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Button
                      variant="outline"
                      onClick={() => {
                        setAnalysisResult(null);
                        setUploadedFiles([]);
                      }}
                      className="w-full"
                    >
                      Analyze Different Photos
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="drawing" className="mt-6">
              <div className="space-y-4">
                <div className="bg-bg-subtle border rounded-lg p-4">
                  <AreaBuilder
                    onSave={handleDrawingSave}
                    initialData={drawingData}
                    height={400}
                  />
                </div>

                {drawingData && drawingData.calculations.totalArea > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Layers className="h-5 w-5 text-blue-600" />
                      <p className="font-medium text-blue-900">Drawing Saved</p>
                    </div>
                    <p className="text-sm text-blue-800">
                      Total area:{" "}
                      {drawingData.calculations.totalArea.toLocaleString()} sq
                      ft
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Total Area Summary */}
      {totalArea > 0 && (
        <Card className="bg-bg-subtle">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Square className="h-4 w-4" />
              Measurement Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-text-secondary">Total Area</p>
                <p className="text-2xl font-semibold">
                  {totalArea.toLocaleString()} sq ft
                </p>
              </div>
              <div>
                <p className="text-text-secondary">Building Type</p>
                <p className="font-medium capitalize">{buildingType}</p>
              </div>
              <div>
                <p className="text-text-secondary">Floors</p>
                <p className="font-medium">{floors}</p>
              </div>
            </div>

            {/* Service-specific calculations */}
            <div className="mt-4 pt-4 border-t space-y-2">
              {flowData.scopeDetails?.selectedServices?.map((service) => {
                let calculation = "";
                switch (service) {
                  case "WC":
                    calculation = `Window area: ${totalArea.toLocaleString()} sq ft`;
                    break;
                  case "PW":
                  case "PD":
                    calculation = `Ground area: ${(totalArea / parseInt(floors)).toFixed(0)} sq ft`;
                    break;
                  default:
                    calculation = `Service area: ${totalArea.toLocaleString()} sq ft`;
                }
                return (
                  <div
                    key={service}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-text-secondary">{service}</span>
                    <span>{calculation}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validation Errors */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-4 w-4" />
            <p className="text-sm font-medium">Please fix the following:</p>
          </div>
          <ul className="list-disc list-inside space-y-1 mt-2">
            {errors.map((error, index) => (
              <li key={index} className="text-sm text-red-600">
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
