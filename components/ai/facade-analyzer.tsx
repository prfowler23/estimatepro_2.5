"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AnalysisLoading } from "@/components/ui/analysis-loading";

interface FacadeAnalysisResult {
  windows: {
    count: number;
    totalArea: number;
    gridPattern: string;
    confidence: number;
    cleaningDifficulty: string;
  };
  materials: {
    breakdown: Record<string, number>;
    conditions: string[];
    cleaningDifficulty: number;
    dominant: string;
    weathering: string;
  };
  damage: {
    staining: string[];
    oxidation: string[];
    damage: string[];
    severity: string;
    affectedArea: number;
    repairUrgency: string;
  };
  safety: {
    hazards: string[];
    requirements: string[];
    riskLevel: string;
    accessChallenges: string[];
    equipmentNeeded: string[];
  };
  measurements: {
    buildingHeight: number;
    facadeWidth: number;
    confidence: number;
    estimatedSqft: number;
    stories: number;
  };
  recommendations: {
    services: string[];
    timeline: string;
    priority: string;
    estimatedCost: { min: number; max: number };
  };
  confidence: number;
}

export function FacadeAnalyzer() {
  const [imageUrl, setImageUrl] = useState("");
  const [buildingType, setBuildingType] = useState("commercial");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<FacadeAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!imageUrl.trim()) {
      setError("Please enter an image URL");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/ai/analyze-facade", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrl: imageUrl.trim(),
          buildingType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze facade");
      }

      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "low":
        return "bg-green-100 text-green-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "high":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Facade Analyzer</h2>
        <p className="text-muted-foreground">
          Comprehensive building facade analysis using AI-powered image
          processing
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Analysis Input</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="imageUrl">Building Image URL</Label>
            <Input
              id="imageUrl"
              placeholder="https://example.com/building-image.jpg"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="buildingType">Building Type</Label>
            <Select value={buildingType} onValueChange={setBuildingType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="commercial">Commercial</SelectItem>
                <SelectItem value="residential">Residential</SelectItem>
                <SelectItem value="industrial">Industrial</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !imageUrl.trim()}
            className="w-full"
          >
            {isAnalyzing ? "Analyzing..." : "Analyze Facade"}
          </Button>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-700">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {isAnalyzing && (
        <AnalysisLoading
          currentStep="Analyzing facade condition and materials..."
          progress={50}
        />
      )}

      {result && (
        <div className="space-y-6">
          {/* Windows Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Windows Analysis
                <Badge variant="outline">
                  Confidence: {Math.round(result.windows.confidence * 100)}%
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm font-medium">Count</p>
                  <p className="text-2xl font-bold">{result.windows.count}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Total Area</p>
                  <p className="text-2xl font-bold">
                    {result.windows.totalArea} sq ft
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Grid Pattern</p>
                  <p className="text-lg">{result.windows.gridPattern}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Cleaning Difficulty</p>
                  <Badge
                    className={getRiskColor(result.windows.cleaningDifficulty)}
                  >
                    {result.windows.cleaningDifficulty}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Materials Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Materials Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Dominant Material</p>
                  <p className="text-lg">{result.materials.dominant}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Weathering</p>
                  <Badge
                    className={getRiskColor(
                      result.materials.weathering === "heavy"
                        ? "high"
                        : result.materials.weathering === "moderate"
                          ? "medium"
                          : "low",
                    )}
                  >
                    {result.materials.weathering}
                  </Badge>
                </div>
              </div>

              {Object.keys(result.materials.breakdown).length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Material Breakdown</p>
                  <div className="space-y-1">
                    {Object.entries(result.materials.breakdown).map(
                      ([material, percentage]) => (
                        <div key={material} className="flex justify-between">
                          <span className="capitalize">{material}</span>
                          <span>{percentage}%</span>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}

              {result.materials.conditions.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Conditions</p>
                  <div className="flex flex-wrap gap-1">
                    {result.materials.conditions.map((condition, index) => (
                      <Badge key={index} variant="secondary">
                        {condition}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Damage Assessment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Damage Assessment
                <Badge className={getRiskColor(result.damage.severity)}>
                  {result.damage.severity} severity
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Affected Area</p>
                  <p className="text-lg">{result.damage.affectedArea}%</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Repair Urgency</p>
                  <Badge
                    className={getRiskColor(
                      result.damage.repairUrgency === "urgent"
                        ? "high"
                        : result.damage.repairUrgency === "moderate"
                          ? "medium"
                          : "low",
                    )}
                  >
                    {result.damage.repairUrgency}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {result.damage.staining.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-1">Staining</p>
                    <div className="space-y-1">
                      {result.damage.staining.map((item, index) => (
                        <Badge key={index} variant="outline" className="mr-1">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {result.damage.oxidation.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-1">Oxidation</p>
                    <div className="space-y-1">
                      {result.damage.oxidation.map((item, index) => (
                        <Badge key={index} variant="outline" className="mr-1">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {result.damage.damage.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-1">Physical Damage</p>
                    <div className="space-y-1">
                      {result.damage.damage.map((item, index) => (
                        <Badge key={index} variant="outline" className="mr-1">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Safety Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Safety Analysis
                <Badge className={getRiskColor(result.safety.riskLevel)}>
                  {result.safety.riskLevel} risk
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.safety.hazards.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">
                      Identified Hazards
                    </p>
                    <div className="space-y-1">
                      {result.safety.hazards.map((hazard, index) => (
                        <Badge
                          key={index}
                          variant="destructive"
                          className="mr-1"
                        >
                          {hazard}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {result.safety.requirements.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">
                      Safety Requirements
                    </p>
                    <div className="space-y-1">
                      {result.safety.requirements.map((req, index) => (
                        <Badge key={index} variant="secondary" className="mr-1">
                          {req}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.safety.accessChallenges.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">
                      Access Challenges
                    </p>
                    <div className="space-y-1">
                      {result.safety.accessChallenges.map(
                        (challenge, index) => (
                          <Badge key={index} variant="outline" className="mr-1">
                            {challenge}
                          </Badge>
                        ),
                      )}
                    </div>
                  </div>
                )}

                {result.safety.equipmentNeeded.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Equipment Needed</p>
                    <div className="space-y-1">
                      {result.safety.equipmentNeeded.map((equipment, index) => (
                        <Badge key={index} variant="outline" className="mr-1">
                          {equipment}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Measurements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Building Measurements
                <Badge variant="outline">
                  Confidence: {Math.round(result.measurements.confidence * 100)}
                  %
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm font-medium">Height</p>
                  <p className="text-2xl font-bold">
                    {result.measurements.buildingHeight} ft
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Width</p>
                  <p className="text-2xl font-bold">
                    {result.measurements.facadeWidth} ft
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Stories</p>
                  <p className="text-2xl font-bold">
                    {result.measurements.stories}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Total Area</p>
                  <p className="text-2xl font-bold">
                    {result.measurements.estimatedSqft} sq ft
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Recommendations
                <Badge
                  className={getRiskColor(result.recommendations.priority)}
                >
                  {result.recommendations.priority} priority
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {result.recommendations.services.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">
                    Recommended Services
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {result.recommendations.services.map((service, index) => (
                      <Badge key={index} variant="default">
                        {service}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.recommendations.timeline && (
                  <div>
                    <p className="text-sm font-medium">Timeline</p>
                    <p className="text-lg">{result.recommendations.timeline}</p>
                  </div>
                )}

                {result.recommendations.estimatedCost.min > 0 && (
                  <div>
                    <p className="text-sm font-medium">Estimated Cost</p>
                    <p className="text-lg">
                      $
                      {result.recommendations.estimatedCost.min.toLocaleString()}{" "}
                      - $
                      {result.recommendations.estimatedCost.max.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="text-center">
            <Badge variant="outline" className="text-lg px-4 py-2">
              Overall Analysis Confidence: {Math.round(result.confidence * 100)}
              %
            </Badge>
          </div>
        </div>
      )}
    </div>
  );
}
