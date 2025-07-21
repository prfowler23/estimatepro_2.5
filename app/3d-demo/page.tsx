"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building, Layers, Ruler, Home, ArrowLeft } from "lucide-react";
import { EnhancedBuilding3D } from "@/components/visualizer/enhanced-building-3d";
import { Building3D } from "@/components/visualizer/building-3d";
import Link from "next/link";
import { config } from "@/lib/config";

export default function Demo3DPage() {
  const [activeDemo, setActiveDemo] = useState<"basic" | "enhanced">(
    "enhanced",
  );

  const buildingData = {
    height: 75,
    width: 120,
    depth: 90,
    stories: 4,
    buildingType: "commercial",
    materials: ["glass", "concrete", "metal"],
    features: [],
  };

  const sampleMeasurements = [
    {
      id: "measure-1",
      startPoint: { x: 10, y: 10, z: 0 },
      endPoint: { x: 100, y: 10, z: 0 },
      measurement: 30,
      unit: "ft" as const,
      label: "Front Wall Width",
      color: "#ff6b35",
    },
    {
      id: "measure-2",
      startPoint: { x: 10, y: 10, z: 0 },
      endPoint: { x: 10, y: 80, z: 0 },
      measurement: 25,
      unit: "ft" as const,
      label: "Side Wall Length",
      color: "#4ecdc4",
    },
  ];

  const sampleServiceAreas = [
    {
      id: "area-1",
      name: "Front Facade",
      type: "exterior",
      geometry: {
        type: "rectangle",
        coordinates: [
          [0, 0],
          [120, 0],
          [120, 75],
          [0, 75],
        ],
        area: 9000,
        perimeter: 390,
      },
      surfaces: [],
      accessRequirements: [],
      riskFactors: ["Working at Height"],
    },
  ];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building className="w-8 h-8 text-blue-500" />
            3D Visualization Demo
          </h1>
          <p className="text-muted-foreground">
            Explore advanced 3D building visualization capabilities
          </p>
        </div>
      </div>

      {/* Feature Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5" />
            Feature Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Badge
              className={
                config.features.threeDimensional ? "bg-green-500" : "bg-red-500"
              }
            >
              3D Visualization:{" "}
              {config.features.threeDimensional ? "ENABLED" : "DISABLED"}
            </Badge>
            <Badge variant="outline">Demo Mode: Active</Badge>
            <Badge variant="outline">Building Type: Commercial</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Demo Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Demo Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button
              variant={activeDemo === "basic" ? "default" : "outline"}
              onClick={() => setActiveDemo("basic")}
              className="flex items-center gap-2"
            >
              <Home className="w-4 h-4" />
              Basic 3D Viewer
            </Button>
            <Button
              variant={activeDemo === "enhanced" ? "default" : "outline"}
              onClick={() => setActiveDemo("enhanced")}
              className="flex items-center gap-2"
            >
              <Building className="w-4 h-4" />
              Enhanced 3D Engine
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Demo Content */}
      {activeDemo === "basic" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="w-5 h-5" />
              Basic 3D Building Viewer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Building3D buildingData={buildingData} />
          </CardContent>
        </Card>
      )}

      {activeDemo === "enhanced" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              Enhanced 3D Visualization Engine
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EnhancedBuilding3D
              buildingData={buildingData}
              measurements={sampleMeasurements}
              serviceAreas={sampleServiceAreas}
              onMeasurementAdd={(measurement) => {
                // Measurement added successfully
              }}
              onServiceAreaAdd={(area) => {
                // Service area added successfully
              }}
              onAnalysisUpdate={(analysis) => {
                // Analysis updated successfully
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ruler className="w-5 h-5" />
            How to Use
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-sm">Basic 3D Viewer:</h4>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>Adjust building dimensions using the input controls</li>
                <li>
                  Use the rotation toggle to view the building from different
                  angles
                </li>
                <li>
                  View calculated metrics like floor area, facade area, and
                  window count
                </li>
                <li>Assess complexity and equipment requirements</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-sm">Enhanced 3D Engine:</h4>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>Use the 3D View tab to interact with the building model</li>
                <li>
                  Click the Measure tool and click on the canvas to add
                  measurements
                </li>
                <li>
                  Click the Area tool and click on the canvas to define service
                  areas
                </li>
                <li>
                  Use Controls tab to adjust building dimensions and viewing
                  options
                </li>
                <li>
                  Check Analysis tab for risk assessment and equipment
                  requirements
                </li>
                <li>Export/Import 3D models using the Export tab</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Integration Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-green-500">✓</Badge>
              <span className="text-sm">
                3D Visualization Engine implemented
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-500">✓</Badge>
              <span className="text-sm">
                Enhanced Building3D component created
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-500">✓</Badge>
              <span className="text-sm">Integrated into Area of Work step</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-500">✓</Badge>
              <span className="text-sm">
                Feature flag enabled (NEXT_PUBLIC_ENABLE_3D=true)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-500">!</Badge>
              <span className="text-sm">
                Canvas-based rendering (production ready for WebGL/Three.js
                upgrade)
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
