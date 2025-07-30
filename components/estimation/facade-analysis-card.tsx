"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Building2,
  Upload,
  Sparkles,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { FacadeAnalysis } from "@/lib/types/facade-analysis-types";
import { useFacadeAnalysis } from "@/hooks/use-facade-analysis-form";
import { FacadeVisualization } from "@/components/visualizer/facade-visualization";
import { MaterialBreakdown } from "@/components/calculator/material-breakdown";
import { toast } from "@/components/ui/use-toast";

interface FacadeAnalysisCardProps {
  estimateId: string;
  onAnalysisComplete?: (analysis: Partial<FacadeAnalysis>) => void;
}

export function FacadeAnalysisCard({
  estimateId,
  onAnalysisComplete,
}: FacadeAnalysisCardProps) {
  const { analyzeImages, isAnalyzing, progress, results } = useFacadeAnalysis();
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<
    Array<{
      url: string;
      type: string;
      view_angle: string;
    }>
  >([]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    // For demo purposes, we'll use object URLs
    const newImages = files.map((file) => ({
      url: URL.createObjectURL(file),
      type: "ground" as const,
      view_angle: "front" as const,
    }));

    setUploadedImages(newImages);
  };

  const runAnalysis = async () => {
    if (uploadedImages.length === 0) {
      toast({
        title: "No images uploaded",
        description: "Please upload at least one building image",
        variant: "destructive",
      });
      return;
    }

    try {
      const analysisResults = await analyzeImages({
        building_address: "Building Address", // This would come from the estimate
        building_type: "office",
        images: uploadedImages,
      });

      if (onAnalysisComplete) {
        onAnalysisComplete(analysisResults);
      }

      toast({
        title: "Analysis complete",
        description: "Building measurements have been calculated",
      });
    } catch (error) {
      toast({
        title: "Analysis failed",
        description: "Please try again or enter measurements manually",
        variant: "destructive",
      });
    }
  };

  if (results && !isAnalyzing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              AI Facade Analysis
            </span>
            <Badge variant="secondary" className="gap-1">
              <CheckCircle className="h-3 w-3" />
              Complete
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Facade</p>
              <p className="text-lg font-semibold">
                {results.total_facade_sqft?.toLocaleString()} sq ft
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Glass Area</p>
              <p className="text-lg font-semibold">
                {results.total_glass_sqft?.toLocaleString()} sq ft
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Building Height</p>
              <p className="text-lg font-semibold">
                {results.building_height_feet} ft
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Confidence</p>
              <p className="text-lg font-semibold">
                {results.confidence_level}%
              </p>
            </div>
          </div>

          {results.materials && results.materials.length > 0 && (
            <div className="pt-4 border-t">
              <MaterialBreakdown materials={results.materials} />
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={() => setShowAnalysis(!showAnalysis)}
              variant="outline"
              className="flex-1"
            >
              {showAnalysis ? "Hide" : "Show"} Details
            </Button>
            <Button
              onClick={() => {
                setUploadedImages([]);
                // Reset the results by calling analyzeImages with empty data
                // This is a workaround - in production you'd have a proper reset method
                window.location.reload();
              }}
              variant="outline"
            >
              New Analysis
            </Button>
          </div>

          {showAnalysis && (
            <div className="space-y-4 pt-4 border-t">
              <FacadeVisualization analysis={results} />

              {results.recommended_services && (
                <div className="space-y-2">
                  <h4 className="font-medium">Recommended Services</h4>
                  {results.recommended_services.map((service, index) => (
                    <div
                      key={index}
                      className="p-3 bg-muted rounded-lg flex justify-between items-center"
                    >
                      <div>
                        <p className="font-medium">{service.service}</p>
                        <p className="text-sm text-muted-foreground">
                          {service.reason}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {service.estimated_sqft.toLocaleString()} sq ft
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {service.confidence}% confidence
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          AI Facade Analysis (Optional)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Upload building photos to automatically calculate measurements using
          AI
        </p>

        {!isAnalyzing && uploadedImages.length === 0 && (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id="facade-image-upload"
            />
            <label
              htmlFor="facade-image-upload"
              className="cursor-pointer flex flex-col items-center"
            >
              <Upload className="h-12 w-12 text-gray-400 mb-2" />
              <span className="text-sm text-gray-600">
                Click to upload building photos
              </span>
              <span className="text-xs text-gray-500 mt-1">
                JPG, PNG up to 10MB each
              </span>
            </label>
          </div>
        )}

        {uploadedImages.length > 0 && !isAnalyzing && (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {uploadedImages.length} image
                {uploadedImages.length > 1 ? "s" : ""} ready for analysis
              </AlertDescription>
            </Alert>

            <Button onClick={runAnalysis} className="w-full gap-2">
              <Sparkles className="h-4 w-4" />
              Analyze Building
            </Button>
          </div>
        )}

        {isAnalyzing && (
          <div className="space-y-4">
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Analyzing facade...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
