"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, Calculator } from "lucide-react";

// Loading component for estimation steps
const EstimationStepLoader = () => (
  <div className="min-h-screen bg-bg-base p-6">
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 animate-pulse text-primary" />
          <CardTitle>Loading Estimation Step...</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-32 w-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          </div>
          <div className="space-y-4">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-48 w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-20" />
              <Skeleton className="h-10 w-20" />
            </div>
          </div>
        </div>
        <div className="flex justify-between">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </CardContent>
    </Card>
  </div>
);

// Lazy load MeasurementsWithFacade (35KB)
export const LazyMeasurementsWithFacade = dynamic(
  () => import("../estimation/guided-flow/steps/MeasurementsWithFacade"),
  {
    loading: () => <EstimationStepLoader />,
    ssr: false,
  },
);

// Lazy load Summary step (34KB)
export const LazySummary = dynamic(
  () => import("../estimation/guided-flow/steps/Summary"),
  {
    loading: () => <EstimationStepLoader />,
    ssr: false,
  },
);

// Lazy load InitialContact step (32KB)
export const LazyInitialContact = dynamic(
  () => import("../estimation/guided-flow/steps/InitialContact"),
  {
    loading: () => <EstimationStepLoader />,
    ssr: false,
  },
);

// Wrapper component for estimation steps
export function LazyEstimationWrapper({
  children,
  fallback = <EstimationStepLoader />,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return <Suspense fallback={fallback}>{children}</Suspense>;
}
