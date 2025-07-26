"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

// Loading component while the 3D module loads
function Building3DLoader() {
  return (
    <div className="w-full h-[600px] relative">
      <Skeleton className="w-full h-full" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-sm text-muted-foreground">
            Loading 3D Visualization...
          </p>
        </div>
      </div>
    </div>
  );
}

// Lazy load the 3D component with no SSR
export const LazyBuilding3D = dynamic(
  () => import("./enhanced-building-3d").then((mod) => mod.EnhancedBuilding3D),
  {
    loading: () => <Building3DLoader />,
    ssr: false, // Disable SSR for Three.js components
  },
);

// Re-export the props type
export type { Enhanced3DProps } from "./enhanced-building-3d";
