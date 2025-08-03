import { Suspense } from "react";
import { PerformanceDashboard } from "@/components/performance/performance-dashboard";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "Performance Dashboard | EstimatePro",
  description: "Monitor web vitals, bundle sizes, and runtime performance",
};

export default function PerformancePage() {
  return (
    <div className="container mx-auto py-8">
      <Suspense
        fallback={
          <div className="space-y-6">
            <Skeleton className="h-12 w-64" />
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Skeleton className="h-64" />
              <Skeleton className="h-64" />
              <Skeleton className="h-64" />
            </div>
          </div>
        }
      >
        <PerformanceDashboard />
      </Suspense>
    </div>
  );
}
