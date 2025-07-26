"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  FacadeAnalysis,
  FacadeAnalysisImage,
} from "@/lib/types/facade-analysis-types";
import {
  Building2,
  Camera,
  Sparkles,
  FileText,
  Download,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Square,
  Maximize2,
  Layers,
  MapPin,
} from "lucide-react";
import { formatNumber } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { FacadeImageGallery } from "./facade-image-gallery";
import { FacadeMaterialsList } from "./facade-materials-list";
import { FacadeAnalysisActions } from "./facade-analysis-actions";

interface FacadeAnalysisDetailProps {
  analysis: FacadeAnalysis;
  images: FacadeAnalysisImage[];
  measurements?: {
    totalFacadeSqft: number;
    totalGlassSqft: number;
    avgConfidence: number;
    materialBreakdown: Record<string, number>;
  };
  onRunAnalysis?: () => Promise<void>;
  onExport?: () => Promise<void>;
  onDelete?: () => Promise<void>;
  isLoading?: boolean;
}

export function FacadeAnalysisDetail({
  analysis,
  images,
  measurements,
  onRunAnalysis,
  onExport,
  onDelete,
  isLoading = false,
}: FacadeAnalysisDetailProps) {
  const [activeTab, setActiveTab] = useState("overview");

  const hasAIAnalysis = analysis.ai_model_version !== null;
  const confidenceLevel = analysis.confidence_level || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            {analysis.building_name || "Facade Analysis"}
          </h2>
          {(analysis.building_type || analysis.location) && (
            <div className="text-muted-foreground flex items-center gap-2">
              {analysis.building_type && (
                <span className="capitalize">{analysis.building_type}</span>
              )}
              {analysis.building_type && analysis.location && " • "}
              {analysis.location && (
                <>
                  <MapPin className="h-4 w-4" />
                  {analysis.location}
                </>
              )}
            </div>
          )}
        </div>
        <FacadeAnalysisActions
          hasAIAnalysis={hasAIAnalysis}
          onRunAnalysis={onRunAnalysis}
          onExport={onExport}
          onDelete={onDelete}
          isLoading={isLoading}
        />
      </div>

      {/* Status Bar */}
      {(hasAIAnalysis || analysis.requires_field_verification) && (
        <div className="flex flex-wrap items-center gap-4">
          {hasAIAnalysis && (
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="h-3 w-3" />
              AI Analysis Complete
            </Badge>
          )}
          {analysis.requires_field_verification && (
            <Badge
              variant="outline"
              className="gap-1 border-amber-200 bg-amber-50 text-amber-700"
            >
              <AlertTriangle className="h-3 w-3" />
              Field Verification Needed
            </Badge>
          )}
          {confidenceLevel > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Confidence:</span>
              <Progress value={confidenceLevel} className="w-24 h-2" />
              <span
                className={cn(
                  "text-sm font-medium",
                  confidenceLevel >= 80
                    ? "text-green-600"
                    : confidenceLevel >= 60
                      ? "text-yellow-600"
                      : "text-red-600",
                )}
              >
                {confidenceLevel}%
              </span>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="images">Images ({images.length})</TabsTrigger>
          <TabsTrigger value="materials">Materials</TabsTrigger>
          <TabsTrigger value="measurements">Measurements</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Facade Area Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Square className="h-4 w-4" />
                  Total Facade Area
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(analysis.total_facade_sqft || 0)} sq ft
                </div>
                {analysis.facade_complexity && (
                  <Badge
                    variant="secondary"
                    className={cn(
                      "mt-2 capitalize",
                      analysis.facade_complexity === "simple" &&
                        "bg-green-100 text-green-800",
                      analysis.facade_complexity === "moderate" &&
                        "bg-yellow-100 text-yellow-800",
                      analysis.facade_complexity === "complex" &&
                        "bg-red-100 text-red-800",
                    )}
                  >
                    {analysis.facade_complexity} complexity
                  </Badge>
                )}
              </CardContent>
            </Card>

            {/* Glass Area Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Maximize2 className="h-4 w-4" />
                  Glass Area
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(analysis.total_glass_sqft || 0)} sq ft
                </div>
                {analysis.glass_to_facade_ratio !== null && (
                  <div className="text-sm text-muted-foreground mt-1">
                    {Math.round((analysis.glass_to_facade_ratio || 0) * 100)}%
                    of facade
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Ground Surfaces Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  Ground Surfaces
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analysis.sidewalk_sqft !== null &&
                    analysis.sidewalk_sqft > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Sidewalk</span>
                        <span className="font-medium">
                          {formatNumber(analysis.sidewalk_sqft)} sq ft
                        </span>
                      </div>
                    )}
                  {analysis.parking_sqft !== null &&
                    analysis.parking_sqft > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Parking</span>
                        <span className="font-medium">
                          {formatNumber(analysis.parking_sqft)} sq ft
                        </span>
                      </div>
                    )}
                  {analysis.loading_dock_sqft !== null &&
                    analysis.loading_dock_sqft > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Loading Dock
                        </span>
                        <span className="font-medium">
                          {formatNumber(analysis.loading_dock_sqft)} sq ft
                        </span>
                      </div>
                    )}
                  {(analysis.sidewalk_sqft === 0 ||
                    analysis.sidewalk_sqft === null) &&
                    (analysis.parking_sqft === 0 ||
                      analysis.parking_sqft === null) &&
                    (analysis.loading_dock_sqft === 0 ||
                      analysis.loading_dock_sqft === null) && (
                      <div className="text-sm text-muted-foreground">
                        No ground surfaces detected
                      </div>
                    )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Additional Notes */}
          {analysis.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {analysis.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Images Tab */}
        <TabsContent value="images">
          <FacadeImageGallery images={images} />
        </TabsContent>

        {/* Materials Tab */}
        <TabsContent value="materials">
          <FacadeMaterialsList
            materials={analysis.materials || []}
            measurements={measurements}
          />
        </TabsContent>

        {/* Measurements Tab */}
        <TabsContent value="measurements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Measurements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Primary Measurements */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground">
                    Facade Measurements
                  </h4>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Total Facade Area</span>
                      <span className="font-semibold">
                        {formatNumber(analysis.total_facade_sqft || 0)} sq ft
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Glass Area</span>
                      <span className="font-semibold">
                        {formatNumber(analysis.total_glass_sqft || 0)} sq ft
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Glass-to-Facade Ratio</span>
                      <span className="font-semibold">
                        {Math.round(
                          (analysis.glass_to_facade_ratio || 0) * 100,
                        )}
                        %
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground">
                    Ground Surfaces
                  </h4>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Sidewalk</span>
                      <span className="font-semibold">
                        {formatNumber(analysis.sidewalk_sqft || 0)} sq ft
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Parking</span>
                      <span className="font-semibold">
                        {formatNumber(analysis.parking_sqft || 0)} sq ft
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Loading Dock</span>
                      <span className="font-semibold">
                        {formatNumber(analysis.loading_dock_sqft || 0)} sq ft
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Manual Adjustments */}
              {analysis.manual_adjustments &&
                Object.keys(analysis.manual_adjustments).length > 0 && (
                  <div className="pt-4 border-t">
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">
                      Manual Adjustments Applied
                    </h4>
                    <div className="space-y-1">
                      {Object.entries(analysis.manual_adjustments).map(
                        ([key, value]) => (
                          <div
                            key={key}
                            className="flex justify-between text-sm"
                          >
                            <span className="capitalize">
                              {key.replace(/_/g, " ")}
                            </span>
                            <span className="font-medium">{value}</span>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
