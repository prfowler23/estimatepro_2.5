"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface Building3DProps {
  buildingData?: {
    height: number;
    width: number;
    depth: number;
    stories: number;
    buildingType: string;
  };
}

export function Building3D({ buildingData }: Building3DProps = {}) {
  const [dimensions, setDimensions] = useState({
    height: buildingData?.height || 50,
    width: buildingData?.width || 100,
    depth: buildingData?.depth || 80,
    stories: buildingData?.stories || 3,
  });

  const [isRotating, setIsRotating] = useState(false);

  // Simple CSS-based 3D building representation
  const buildingStyle = {
    width: `${Math.min(dimensions.width * 2, 200)}px`,
    height: `${Math.min(dimensions.height * 3, 300)}px`,
    background: `linear-gradient(135deg, #e3f2fd 0%, #bbdefb 50%, #90caf9 100%)`,
    border: "2px solid #1976d2",
    position: "relative" as const,
    transform: isRotating
      ? "rotateY(15deg) rotateX(5deg)"
      : "rotateY(0deg) rotateX(0deg)",
    transformStyle: "preserve-3d" as const,
    transition: "transform 0.5s ease-in-out",
    margin: "20px auto",
    borderRadius: "4px",
  };

  // Calculate building metrics
  const totalArea = dimensions.width * dimensions.depth;
  const facadeArea =
    (dimensions.width + dimensions.depth) * 2 * dimensions.height;
  const windowCount = Math.floor(
    (dimensions.width / 8) * (dimensions.height / 12) * 4,
  ); // Estimate windows

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">3D Building Visualizer</h2>
        <p className="text-muted-foreground">
          Interactive building visualization for better project understanding
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Building Controls */}
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
                <Label htmlFor="stories">Stories</Label>
                <Input
                  id="stories"
                  type="number"
                  value={dimensions.stories}
                  onChange={(e) =>
                    setDimensions((prev) => ({
                      ...prev,
                      stories: Number(e.target.value),
                    }))
                  }
                  min="1"
                  max="50"
                />
              </div>
            </div>

            <Button
              onClick={() => setIsRotating(!isRotating)}
              variant="outline"
              className="w-full"
            >
              {isRotating ? "Stop Rotation" : "Rotate View"}
            </Button>
          </CardContent>
        </Card>

        {/* 3D Visualization */}
        <Card>
          <CardHeader>
            <CardTitle>3D Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center space-y-4">
              <div style={buildingStyle} className="relative shadow-lg">
                {/* Building facade details */}
                <div className="absolute inset-0 opacity-20">
                  {/* Draw stories */}
                  {Array.from({ length: dimensions.stories }, (_, i) => (
                    <div
                      key={i}
                      className="absolute left-0 right-0 border-b border-blue-400"
                      style={{
                        top: `${(i + 1) * (100 / dimensions.stories)}%`,
                      }}
                    />
                  ))}

                  {/* Draw window grid */}
                  <div className="grid grid-cols-6 grid-rows-4 h-full w-full gap-1 p-2">
                    {Array.from({ length: 24 }, (_, i) => (
                      <div
                        key={i}
                        className="bg-blue-200 border border-blue-300 rounded-sm opacity-60"
                      />
                    ))}
                  </div>
                </div>

                {/* Building label */}
                <div className="absolute bottom-2 left-2 text-xs font-bold text-blue-900">
                  {dimensions.stories} Stories
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 w-full text-center">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Floor Area</p>
                  <Badge variant="outline">
                    {totalArea.toLocaleString()} sq ft
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Facade Area</p>
                  <Badge variant="outline">
                    {facadeArea.toLocaleString()} sq ft
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Est. Windows</p>
                  <Badge variant="outline">{windowCount}</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Volume</p>
                  <Badge variant="outline">
                    {(totalArea * dimensions.height).toLocaleString()} cu ft
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Building Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Building Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h4 className="font-medium mb-2">Access Complexity</h4>
              <Badge
                className={`${
                  dimensions.height > 100
                    ? "bg-red-100 text-red-800"
                    : dimensions.height > 50
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-green-100 text-green-800"
                }`}
              >
                {dimensions.height > 100
                  ? "High"
                  : dimensions.height > 50
                    ? "Medium"
                    : "Low"}
              </Badge>
              <p className="text-sm text-muted-foreground mt-1">
                Based on building height and accessibility
              </p>
            </div>

            <div>
              <h4 className="font-medium mb-2">Equipment Needs</h4>
              <div className="space-y-1">
                {dimensions.height > 100 && (
                  <Badge variant="outline">Aerial Lift</Badge>
                )}
                {dimensions.height > 50 && (
                  <Badge variant="outline">Extension Ladder</Badge>
                )}
                {dimensions.height <= 50 && (
                  <Badge variant="outline">Standard Ladder</Badge>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Estimated Duration</h4>
              <Badge variant="outline">
                {Math.ceil((facadeArea / 1000) * 2)} hours
              </Badge>
              <p className="text-sm text-muted-foreground mt-1">
                Window cleaning estimate
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-center text-sm text-muted-foreground">
        <p>
          📊 This is a simplified 3D visualization. For advanced 3D features and
          drone integration, please contact support.
        </p>
      </div>
    </div>
  );
}
