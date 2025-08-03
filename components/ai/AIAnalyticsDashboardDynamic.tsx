"use client";

import dynamic from "next/dynamic";

// Loading component for AI Analytics Dashboard
function AIAnalyticsDashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-8 bg-border-primary/20 rounded animate-pulse max-w-md" />
        <div className="h-4 bg-border-primary/20 rounded animate-pulse max-w-lg" />
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-32 bg-border-primary/20 rounded-lg animate-pulse"
          />
        ))}
      </div>
      <div className="h-96 bg-border-primary/20 rounded-lg animate-pulse" />
    </div>
  );
}

// Dynamic import of the AI Analytics Dashboard with lazy loading
const AIAnalyticsDashboardContent = dynamic(
  () =>
    import("./AIAnalyticsDashboard").then((mod) => ({
      default: mod.AIAnalyticsDashboard,
    })),
  {
    ssr: false, // Disable SSR for complex AI analytics components
    loading: () => <AIAnalyticsDashboardLoading />,
  },
);

export default function AIAnalyticsDashboardDynamic() {
  return <AIAnalyticsDashboardContent />;
}
