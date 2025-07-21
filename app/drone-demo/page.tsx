"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Plane,
  Camera,
  MapPin,
  Wind,
  Shield,
  Calendar,
  BarChart3,
  Settings,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Wifi,
  Battery,
  Navigation,
  FileText,
  Map,
  Eye,
} from "lucide-react";
import { DroneDashboard } from "@/components/drone/drone-dashboard";
import Link from "next/link";
import { config } from "@/lib/config";

export default function DroneDemo() {
  const [activeDemo, setActiveDemo] = useState<"dashboard" | "integration">(
    "dashboard",
  );

  // Sample integration data
  const integrationFeatures = [
    {
      title: "Aerial Photo Analysis",
      description: "AI-powered analysis of drone-captured building images",
      status: "implemented",
      icon: <Camera className="w-5 h-5" />,
      features: [
        "Roof condition assessment",
        "Facade damage detection",
        "Material identification",
        "Measurement extraction",
      ],
    },
    {
      title: "Flight Planning",
      description: "Automated waypoint generation for building inspections",
      status: "implemented",
      icon: <Navigation className="w-5 h-5" />,
      features: [
        "Objective-based planning",
        "Safety compliance checking",
        "Weather integration",
        "No-fly zone detection",
      ],
    },
    {
      title: "Compliance Management",
      description: "FAA Part 107 and regulatory compliance tracking",
      status: "implemented",
      icon: <Shield className="w-5 h-5" />,
      features: [
        "Pilot certification tracking",
        "Permit management",
        "Flight log maintenance",
        "Incident reporting",
      ],
    },
    {
      title: "Real-time Monitoring",
      description: "Live flight tracking and telemetry data",
      status: "simulated",
      icon: <Wifi className="w-5 h-5" />,
      features: [
        "GPS tracking",
        "Battery monitoring",
        "Weather updates",
        "Emergency protocols",
      ],
    },
  ];

  const specifications = [
    {
      model: "DJI Mavic 3 Enterprise",
      type: "Commercial Quadcopter",
      specs: {
        "Flight Time": "45 minutes",
        "Max Range": "15 km",
        Camera: "5.1K with thermal imaging",
        "Wind Resistance": "23 mph",
        Weight: "915g",
        Certifications: "Part 107, CE, FCC",
      },
    },
    {
      model: "DJI Matrice 300 RTK",
      type: "Professional Drone",
      specs: {
        "Flight Time": "55 minutes",
        "Max Range": "15 km",
        Camera: "6K with 200x zoom",
        "Wind Resistance": "30 mph",
        Weight: "3.8kg",
        Certifications: "Part 107, CE, FCC, IP45",
      },
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
            <Plane className="w-8 h-8 text-blue-500" />
            Drone Integration Demo
          </h1>
          <p className="text-muted-foreground">
            Advanced aerial inspection and compliance management system
          </p>
        </div>
      </div>

      {/* Feature Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Feature Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Badge
              className={config.features.drone ? "bg-green-500" : "bg-red-500"}
            >
              Drone Integration:{" "}
              {config.features.drone ? "ENABLED" : "DISABLED"}
            </Badge>
            <Badge variant="outline">Demo Mode: Active</Badge>
            <Badge variant="outline">Fleet: 2 Drones Available</Badge>
            <Badge variant="outline">Compliance: Part 107 Ready</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Demo Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Demo Components</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button
              variant={activeDemo === "dashboard" ? "default" : "outline"}
              onClick={() => setActiveDemo("dashboard")}
              className="flex items-center gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              Operations Dashboard
            </Button>
            <Button
              variant={activeDemo === "integration" ? "default" : "outline"}
              onClick={() => setActiveDemo("integration")}
              className="flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Integration Overview
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Demo Content */}
      {activeDemo === "dashboard" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Drone Operations Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DroneDashboard
              projectId="demo-project"
              location={{ latitude: 40.7128, longitude: -74.006 }}
              onFlightPlanCreated={(plan) => {
                console.log("Flight plan created:", plan);
              }}
              onAnalysisComplete={(analysis) => {
                console.log("Analysis complete:", analysis);
              }}
            />
          </CardContent>
        </Card>
      )}

      {activeDemo === "integration" && (
        <div className="space-y-6">
          {/* Integration Features */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Integration Features
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {integrationFeatures.map((feature, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-3">
                      {feature.icon}
                      <div>
                        <h4 className="font-medium">{feature.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {feature.description}
                        </p>
                      </div>
                      <Badge
                        className={
                          feature.status === "implemented"
                            ? "bg-green-500"
                            : "bg-blue-500"
                        }
                      >
                        {feature.status}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      {feature.features.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 text-sm"
                        >
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Drone Specifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plane className="w-5 h-5" />
                Drone Fleet Specifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {specifications.map((drone, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="mb-4">
                      <h4 className="font-bold text-lg">{drone.model}</h4>
                      <p className="text-sm text-muted-foreground">
                        {drone.type}
                      </p>
                    </div>
                    <div className="space-y-2">
                      {Object.entries(drone.specs).map(([key, value]) => (
                        <div key={key} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{key}:</span>
                          <span className="font-medium">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* API Integration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                API Integration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <Settings className="h-4 w-4" />
                  <AlertDescription>
                    Drone operations are accessible via RESTful API at{" "}
                    <code>/api/drone/operations</code>
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border rounded p-4">
                    <h5 className="font-medium mb-2">GET Endpoints</h5>
                    <div className="space-y-1 text-sm">
                      <code className="block">
                        GET /api/drone/operations?operation=fleet
                      </code>
                      <code className="block">
                        GET /api/drone/operations?operation=flight-plans
                      </code>
                      <code className="block">
                        GET /api/drone/operations?operation=flight-history
                      </code>
                      <code className="block">
                        GET /api/drone/operations?operation=validate-plan
                      </code>
                    </div>
                  </div>
                  <div className="border rounded p-4">
                    <h5 className="font-medium mb-2">POST Endpoints</h5>
                    <div className="space-y-1 text-sm">
                      <code className="block">
                        POST /api/drone/operations?operation=create-flight-plan
                      </code>
                      <code className="block">
                        POST /api/drone/operations?operation=execute-flight
                      </code>
                      <code className="block">
                        POST /api/drone/operations?operation=analyze-photo
                      </code>
                      <code className="block">
                        POST /api/drone/operations?operation=weather-check
                      </code>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Compliance & Safety */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Compliance & Safety
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded">
                  <Shield className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <h4 className="font-medium mb-1">FAA Part 107</h4>
                  <p className="text-sm text-muted-foreground">
                    Remote pilot certification tracking and compliance
                  </p>
                </div>
                <div className="text-center p-4 border rounded">
                  <MapPin className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                  <h4 className="font-medium mb-1">Airspace Authorization</h4>
                  <p className="text-sm text-muted-foreground">
                    LAANC integration for controlled airspace
                  </p>
                </div>
                <div className="text-center p-4 border rounded">
                  <FileText className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                  <h4 className="font-medium mb-1">Flight Logging</h4>
                  <p className="text-sm text-muted-foreground">
                    Comprehensive flight records and reporting
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Implementation Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Implementation Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-green-500">✓</Badge>
              <span className="text-sm">
                Drone service framework implemented
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-500">✓</Badge>
              <span className="text-sm">
                Flight planning and execution system
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-500">✓</Badge>
              <span className="text-sm">Aerial photo analysis integration</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-500">✓</Badge>
              <span className="text-sm">Weather and compliance checking</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-500">✓</Badge>
              <span className="text-sm">RESTful API with rate limiting</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-500">✓</Badge>
              <span className="text-sm">
                Operations dashboard with live data
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-500">✓</Badge>
              <span className="text-sm">
                Feature flag enabled (NEXT_PUBLIC_ENABLE_DRONE=true)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-500">!</Badge>
              <span className="text-sm">
                Ready for production hardware integration
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
