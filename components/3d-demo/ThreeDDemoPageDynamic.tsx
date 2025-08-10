"use client";

import dynamic from "next/dynamic";
import { Card, CardContent } from "@/components/ui/card";
import { Building, RefreshCw } from "lucide-react";

// Loading component for the entire 3D demo page
function ThreeDDemoPageLoading() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center gap-4">
        <div className="h-9 w-32 bg-border-primary/20 rounded-md animate-pulse" />
        <div>
          <div className="h-8 w-64 bg-border-primary/20 rounded-md animate-pulse mb-2" />
          <div className="h-5 w-96 bg-border-primary/20 rounded-md animate-pulse" />
        </div>
      </div>

      {/* Feature Status Card Skeleton */}
      <Card>
        <CardContent className="p-6">
          <div className="h-6 w-32 bg-border-primary/20 rounded-md animate-pulse mb-4" />
          <div className="flex items-center gap-4">
            <div className="h-6 w-40 bg-border-primary/20 rounded-md animate-pulse" />
            <div className="h-6 w-32 bg-border-primary/20 rounded-md animate-pulse" />
            <div className="h-6 w-36 bg-border-primary/20 rounded-md animate-pulse" />
          </div>
        </CardContent>
      </Card>

      {/* Demo Selection Card Skeleton */}
      <Card>
        <CardContent className="p-6">
          <div className="h-6 w-32 bg-border-primary/20 rounded-md animate-pulse mb-4" />
          <div className="flex gap-4">
            <div className="h-10 w-36 bg-border-primary/20 rounded-md animate-pulse" />
            <div className="h-10 w-44 bg-border-primary/20 rounded-md animate-pulse" />
          </div>
        </CardContent>
      </Card>

      {/* 3D Demo Content Loading */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center">
                <Building className="w-12 h-12 text-primary animate-pulse" />
              </div>
              <div className="flex items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-primary" />
                <p className="text-text-secondary">Loading 3D Demo...</p>
              </div>
              <p className="text-sm text-text-muted">
                Initializing Three.js and 3D visualization components
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instructions Card Skeleton */}
      <Card>
        <CardContent className="p-6">
          <div className="h-6 w-24 bg-border-primary/20 rounded-md animate-pulse mb-4" />
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="h-4 w-32 bg-border-primary/20 rounded-md animate-pulse" />
              <div className="space-y-1">
                <div className="h-3 w-80 bg-border-primary/20 rounded-md animate-pulse" />
                <div className="h-3 w-72 bg-border-primary/20 rounded-md animate-pulse" />
                <div className="h-3 w-76 bg-border-primary/20 rounded-md animate-pulse" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-4 w-40 bg-border-primary/20 rounded-md animate-pulse" />
              <div className="space-y-1">
                <div className="h-3 w-84 bg-border-primary/20 rounded-md animate-pulse" />
                <div className="h-3 w-88 bg-border-primary/20 rounded-md animate-pulse" />
                <div className="h-3 w-80 bg-border-primary/20 rounded-md animate-pulse" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Dynamic import of the 3D building component to avoid circular imports
const Demo3DPageContent = dynamic(
  () =>
    import("../visualizer/building-3d").then((mod) => ({
      default: mod.Building3D,
    })),
  {
    ssr: false, // Disable SSR for Three.js components
    loading: () => <ThreeDDemoPageLoading />,
  },
);

export default function ThreeDDemoPageDynamic() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center w-12 h-12 bg-primary rounded-lg">
          <span className="text-2xl">🏢</span>
        </div>
        <div>
          <h1 className="text-3xl font-bold text-text-primary">
            3D Building Visualizer
          </h1>
          <p className="text-text-secondary">
            Interactive 3D building modeling and analysis
          </p>
        </div>
      </div>

      <Demo3DPageContent />
    </div>
  );
}
