/**
 * Mobile Measurements Step
 *
 * Mobile-optimized measurement input with:
 * - Touch-friendly measurement controls
 * - Voice input for dimensions
 * - Camera integration for photos
 * - Smart unit conversion
 * - Visual measurement helpers
 * - Haptic feedback for adjustments
 *
 * Part of Phase 4 Priority 4: Create Responsive Mobile Layouts
 */

"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { EnhancedMobileInput } from "@/components/ui/mobile/EnhancedMobileInput";
import { MobileStepper } from "@/components/ui/mobile/EnhancedMobileInput";
import {
  useHapticFeedback,
  useDeviceCapabilities,
} from "@/components/providers/MobileGestureProvider";
import {
  Ruler,
  Camera,
  Calculator,
  Plus,
  Minus,
  ChevronDown,
  ChevronUp,
  Square,
  Triangle,
  Circle,
  Edit3,
  Trash2,
  Copy,
  CheckCircle2,
  AlertCircle,
  Info,
  Maximize,
  Eye,
} from "lucide-react";

interface MeasurementArea {
  id: string;
  name: string;
  shape: "rectangle" | "triangle" | "circle" | "custom";
  dimensions: {
    width?: number;
    height?: number;
    radius?: number;
    area?: number;
    custom?: Record<string, number>;
  };
  unit: "ft" | "m" | "in" | "cm";
  notes?: string;
  photos?: string[];
}

interface MobileMeasurementsProps {
  data: any;
  onUpdate: (data: any) => void;
  isMobile?: boolean;
  screenSize?: { width: number; height: number; orientation: string };
}

const SHAPE_OPTIONS = [
  {
    value: "rectangle",
    label: "Rectangle",
    icon: Square,
    description: "Most common building surfaces",
  },
  {
    value: "triangle",
    label: "Triangle",
    icon: Triangle,
    description: "Gabled surfaces, rooflines",
  },
  {
    value: "circle",
    label: "Circle",
    icon: Circle,
    description: "Round windows, features",
  },
  {
    value: "custom",
    label: "Custom",
    icon: Edit3,
    description: "Irregular shapes",
  },
] as const;

const UNIT_OPTIONS = [
  { value: "ft", label: "Feet", symbol: "ft" },
  { value: "m", label: "Meters", symbol: "m" },
  { value: "in", label: "Inches", symbol: '"' },
  { value: "cm", label: "Centimeters", symbol: "cm" },
] as const;

/**
 * Mobile Measurements Component
 */
export function MobileMeasurements({
  data,
  onUpdate,
  isMobile = true,
  screenSize,
}: MobileMeasurementsProps) {
  const { haptic } = useHapticFeedback();
  const { isTouch, hasCamera } = useDeviceCapabilities();

  const [areas, setAreas] = useState<MeasurementArea[]>(data?.areas || []);
  const [activeAreaId, setActiveAreaId] = useState<string | null>(null);
  const [showAddArea, setShowAddArea] = useState(false);
  const [defaultUnit, setDefaultUnit] = useState<"ft" | "m" | "in" | "cm">(
    data?.defaultUnit || "ft",
  );

  // Update parent component when data changes
  const updateData = useCallback(() => {
    const totalArea = areas.reduce(
      (sum, area) => sum + (area.dimensions.area || 0),
      0,
    );
    onUpdate({
      ...data,
      areas,
      defaultUnit,
      totalArea,
      isCompleted:
        areas.length > 0 &&
        areas.every((area) => area.dimensions.area && area.dimensions.area > 0),
    });
  }, [data, areas, defaultUnit, onUpdate]);

  useEffect(() => {
    updateData();
  }, [updateData]);

  // Calculate area based on shape and dimensions
  const calculateArea = useCallback((area: MeasurementArea): number => {
    const { shape, dimensions } = area;
    const { width, height, radius } = dimensions;

    switch (shape) {
      case "rectangle":
        return (width || 0) * (height || 0);
      case "triangle":
        return ((width || 0) * (height || 0)) / 2;
      case "circle":
        return Math.PI * Math.pow(radius || 0, 2);
      case "custom":
        return dimensions.area || 0;
      default:
        return 0;
    }
  }, []);

  // Add new measurement area
  const addArea = useCallback(
    (shape: MeasurementArea["shape"]) => {
      haptic("impact", "medium");
      const newArea: MeasurementArea = {
        id: `area-${Date.now()}`,
        name: `${shape.charAt(0).toUpperCase() + shape.slice(1)} ${areas.length + 1}`,
        shape,
        dimensions: {},
        unit: defaultUnit,
      };
      setAreas((prev) => [...prev, newArea]);
      setActiveAreaId(newArea.id);
      setShowAddArea(false);
    },
    [haptic, areas.length, defaultUnit],
  );

  // Update area
  const updateArea = useCallback(
    (areaId: string, updates: Partial<MeasurementArea>) => {
      setAreas((prev) =>
        prev.map((area) => {
          if (area.id === areaId) {
            const updatedArea = { ...area, ...updates };
            // Recalculate area if dimensions changed
            if (updates.dimensions) {
              updatedArea.dimensions = {
                ...updatedArea.dimensions,
                area: calculateArea(updatedArea),
              };
            }
            return updatedArea;
          }
          return area;
        }),
      );
    },
    [calculateArea],
  );

  // Delete area
  const deleteArea = useCallback(
    (areaId: string) => {
      haptic("impact", "heavy");
      setAreas((prev) => prev.filter((area) => area.id !== areaId));
      if (activeAreaId === areaId) {
        setActiveAreaId(null);
      }
    },
    [haptic, activeAreaId],
  );

  // Duplicate area
  const duplicateArea = useCallback(
    (areaId: string) => {
      haptic("impact", "light");
      const originalArea = areas.find((area) => area.id === areaId);
      if (originalArea) {
        const duplicatedArea: MeasurementArea = {
          ...originalArea,
          id: `area-${Date.now()}`,
          name: `${originalArea.name} Copy`,
        };
        setAreas((prev) => [...prev, duplicatedArea]);
      }
    },
    [haptic, areas],
  );

  // Total measurements
  const totalArea = useMemo(() => {
    return areas.reduce((sum, area) => sum + (area.dimensions.area || 0), 0);
  }, [areas]);

  const totalPhotos = useMemo(() => {
    return areas.reduce((sum, area) => sum + (area.photos?.length || 0), 0);
  }, [areas]);

  return (
    <div className="space-y-4 pb-6">
      {/* Header with Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ruler className="h-5 w-5" />
            Measurements
          </CardTitle>
          <div className="flex items-center gap-4 text-sm text-text-secondary">
            <span>{areas.length} areas</span>
            <span>
              {totalArea.toFixed(1)} {defaultUnit}²
            </span>
            <span>{totalPhotos} photos</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Unit Selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Default Unit:</span>
            <div className="flex rounded-lg bg-gray-100 p-1">
              {UNIT_OPTIONS.map((unit) => (
                <button
                  key={unit.value}
                  onClick={() => {
                    haptic("selection");
                    setDefaultUnit(unit.value);
                  }}
                  className={cn(
                    "px-3 py-1 rounded-md text-sm font-medium transition-all",
                    defaultUnit === unit.value
                      ? "bg-white text-text-primary shadow-sm"
                      : "text-text-secondary",
                  )}
                >
                  {unit.symbol}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                haptic("selection");
                setShowAddArea(!showAddArea);
              }}
              className="flex-1"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Area
            </Button>
            {hasCamera && (
              <Button variant="outline" size="sm" className="px-3">
                <Camera className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Area Selector */}
      <AnimatePresence>
        {showAddArea && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Select Shape</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {SHAPE_OPTIONS.map((shape) => {
                    const Icon = shape.icon;
                    return (
                      <motion.button
                        key={shape.value}
                        onClick={() => addArea(shape.value)}
                        className="flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-200 bg-white hover:border-primary-300 transition-all touch-manipulation min-h-[80px]"
                        whileTap={{ scale: 0.98 }}
                      >
                        <Icon className="h-6 w-6 text-primary-600" />
                        <div className="text-center">
                          <div className="font-medium text-sm">
                            {shape.label}
                          </div>
                          <div className="text-xs text-text-secondary">
                            {shape.description}
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Measurement Areas */}
      <div className="space-y-3">
        {areas.map((area) => {
          const isActive = activeAreaId === area.id;
          const shapeOption = SHAPE_OPTIONS.find((s) => s.value === area.shape);
          const ShapeIcon = shapeOption?.icon || Square;

          return (
            <Card
              key={area.id}
              className={cn(isActive && "ring-2 ring-primary-500")}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => {
                      haptic("selection");
                      setActiveAreaId(isActive ? null : area.id);
                    }}
                    className="flex items-center gap-3 flex-1 text-left"
                  >
                    <ShapeIcon className="h-5 w-5 text-primary-600" />
                    <div>
                      <div className="font-medium">{area.name}</div>
                      <div className="text-sm text-text-secondary">
                        {area.dimensions.area?.toFixed(1) || "0"} {area.unit}²
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => duplicateArea(area.id)}
                      className="h-8 w-8 p-0"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteArea(area.id)}
                      className="h-8 w-8 p-0 text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-text-secondary transition-transform",
                        isActive && "rotate-180",
                      )}
                    />
                  </div>
                </div>
              </CardHeader>

              <AnimatePresence>
                {isActive && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <CardContent className="pt-0 space-y-4">
                      {/* Area Name */}
                      <EnhancedMobileInput
                        label="Area Name"
                        value={area.name}
                        onChange={(value) =>
                          updateArea(area.id, { name: value.toString() })
                        }
                        placeholder="Enter area name"
                        enableVoiceInput={isTouch}
                      />

                      {/* Dimensions based on shape */}
                      {area.shape === "rectangle" && (
                        <div className="grid grid-cols-2 gap-3">
                          <EnhancedMobileInput
                            label={`Width (${area.unit})`}
                            type="number"
                            value={area.dimensions.width || ""}
                            onChange={(value) => {
                              const width = parseFloat(value.toString()) || 0;
                              updateArea(area.id, {
                                dimensions: { ...area.dimensions, width },
                              });
                            }}
                            placeholder="0"
                            min={0}
                            step={0.1}
                            inputMode="decimal"
                          />
                          <EnhancedMobileInput
                            label={`Height (${area.unit})`}
                            type="number"
                            value={area.dimensions.height || ""}
                            onChange={(value) => {
                              const height = parseFloat(value.toString()) || 0;
                              updateArea(area.id, {
                                dimensions: { ...area.dimensions, height },
                              });
                            }}
                            placeholder="0"
                            min={0}
                            step={0.1}
                            inputMode="decimal"
                          />
                        </div>
                      )}

                      {area.shape === "triangle" && (
                        <div className="grid grid-cols-2 gap-3">
                          <EnhancedMobileInput
                            label={`Base (${area.unit})`}
                            type="number"
                            value={area.dimensions.width || ""}
                            onChange={(value) => {
                              const width = parseFloat(value.toString()) || 0;
                              updateArea(area.id, {
                                dimensions: { ...area.dimensions, width },
                              });
                            }}
                            placeholder="0"
                            min={0}
                            step={0.1}
                            inputMode="decimal"
                          />
                          <EnhancedMobileInput
                            label={`Height (${area.unit})`}
                            type="number"
                            value={area.dimensions.height || ""}
                            onChange={(value) => {
                              const height = parseFloat(value.toString()) || 0;
                              updateArea(area.id, {
                                dimensions: { ...area.dimensions, height },
                              });
                            }}
                            placeholder="0"
                            min={0}
                            step={0.1}
                            inputMode="decimal"
                          />
                        </div>
                      )}

                      {area.shape === "circle" && (
                        <EnhancedMobileInput
                          label={`Radius (${area.unit})`}
                          type="number"
                          value={area.dimensions.radius || ""}
                          onChange={(value) => {
                            const radius = parseFloat(value.toString()) || 0;
                            updateArea(area.id, {
                              dimensions: { ...area.dimensions, radius },
                            });
                          }}
                          placeholder="0"
                          min={0}
                          step={0.1}
                          inputMode="decimal"
                        />
                      )}

                      {area.shape === "custom" && (
                        <EnhancedMobileInput
                          label={`Total Area (${area.unit}²)`}
                          type="number"
                          value={area.dimensions.area || ""}
                          onChange={(value) => {
                            const customArea =
                              parseFloat(value.toString()) || 0;
                            updateArea(area.id, {
                              dimensions: {
                                ...area.dimensions,
                                area: customArea,
                              },
                            });
                          }}
                          placeholder="0"
                          min={0}
                          step={0.1}
                          inputMode="decimal"
                        />
                      )}

                      {/* Calculated Area Display */}
                      {area.shape !== "custom" && (
                        <div className="bg-primary-50 rounded-lg p-3">
                          <div className="flex items-center gap-2">
                            <Calculator className="h-4 w-4 text-primary-600" />
                            <span className="text-sm font-medium text-primary-700">
                              Calculated Area:{" "}
                              {area.dimensions.area?.toFixed(2) || "0"}{" "}
                              {area.unit}²
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-text-primary">
                          Notes (Optional)
                        </label>
                        <textarea
                          value={area.notes || ""}
                          onChange={(e) =>
                            updateArea(area.id, { notes: e.target.value })
                          }
                          placeholder="Add measurement notes, access details, special considerations..."
                          rows={2}
                          className={cn(
                            "w-full px-3 py-2 border border-border-primary rounded-lg",
                            "resize-none text-base md:text-sm",
                            "focus:outline-none focus:ring-2 focus:ring-primary-500",
                            "touch-manipulation",
                          )}
                        />
                      </div>

                      {/* Photo Actions */}
                      {hasCamera && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                          >
                            <Camera className="h-4 w-4 mr-2" />
                            Add Photo
                          </Button>
                          {area.photos && area.photos.length > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="px-3"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {areas.length === 0 && (
        <Card className="border-dashed border-2 border-gray-300">
          <CardContent className="py-8 text-center">
            <Ruler className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="font-medium text-text-primary mb-2">
              No Measurements Yet
            </h3>
            <p className="text-text-secondary mb-4">
              Add your first measurement area to get started
            </p>
            <Button
              onClick={() => {
                haptic("selection");
                setShowAddArea(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add First Area
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Summary Card */}
      {areas.length > 0 && (
        <Card className="bg-gray-50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-text-primary">
                  Total Measurements
                </h4>
                <p className="text-sm text-text-secondary">
                  {areas.length} area{areas.length !== 1 ? "s" : ""} measured
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary-600">
                  {totalArea.toFixed(1)}
                </div>
                <div className="text-sm text-text-secondary">
                  {defaultUnit}²
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validation */}
      {areas.length === 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-800">
                  Measurements Required
                </h4>
                <p className="text-sm text-amber-700 mt-1">
                  Add at least one measurement area to continue with your
                  estimate.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default MobileMeasurements;
