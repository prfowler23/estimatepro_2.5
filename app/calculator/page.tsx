"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { ProtectedRoute } from "@/components/auth/protected-route";

// Lazy load the heavy service calculator component
const ServiceCalculator = dynamic(
  () =>
    import("@/components/calculator/service-calculator").then((mod) => ({
      default: mod.ServiceCalculator,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="container mx-auto py-8">
        <div className="space-y-8">
          <div className="text-center space-y-4">
            <div className="h-12 bg-border-primary/20 rounded animate-pulse" />
            <div className="h-6 bg-border-primary/20 rounded animate-pulse mx-auto max-w-md" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="h-48 bg-border-primary/20 rounded-lg animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    ),
  },
);

export default function CalculatorPage() {
  return (
    <ProtectedRoute>
      <Suspense
        fallback={
          <div className="container mx-auto py-8">
            <div className="space-y-8">
              <div className="text-center space-y-4">
                <div className="h-12 bg-border-primary/20 rounded animate-pulse" />
                <div className="h-6 bg-border-primary/20 rounded animate-pulse mx-auto max-w-md" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-48 bg-border-primary/20 rounded-lg animate-pulse"
                  />
                ))}
              </div>
            </div>
          </div>
        }
      >
        <ServiceCalculator />
      </Suspense>
    </ProtectedRoute>
  );
}
