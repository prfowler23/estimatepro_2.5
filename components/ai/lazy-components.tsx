// Lazy-loaded AI components for better performance
"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { Card } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";

// Loading component for dashboards
const DashboardLoader = () => (
  <div className="flex items-center justify-center h-96">
    <Card className="p-6">
      <div className="flex items-center gap-3">
        <RefreshCw className="h-6 w-6 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">
          Loading dashboard...
        </span>
      </div>
    </Card>
  </div>
);

// Loading component for smaller components
const ComponentLoader = () => (
  <div className="flex items-center justify-center p-4">
    <RefreshCw className="h-5 w-5 animate-spin text-primary" />
    <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
  </div>
);

// Lazy load heavy dashboard components
export const AIAnalyticsDashboard = dynamic(
  () =>
    import("./AIAnalyticsDashboard").then((mod) => ({
      default: mod.AIAnalyticsDashboard,
    })),
  {
    loading: () => <DashboardLoader />,
    ssr: false, // Disable SSR for client-side heavy components
  },
);

export const AIMetricsDashboard = dynamic(
  () =>
    import("./AIMetricsDashboard").then((mod) => ({
      default: mod.AIMetricsDashboard,
    })),
  {
    loading: () => <DashboardLoader />,
    ssr: false,
  },
);

// Lazy load AI assistant components
export const AIAssistantChat = dynamic(() => import("./AIAssistantChat"), {
  loading: () => <ComponentLoader />,
  ssr: false,
});

export const AIAssistantChatEnhanced = dynamic(
  () => import("./AIAssistantChatEnhanced"),
  {
    loading: () => <ComponentLoader />,
    ssr: false,
  },
);

export const AIAssistantWithTools = dynamic(
  () => import("./AIAssistantWithTools"),
  {
    loading: () => <ComponentLoader />,
    ssr: false,
  },
);

// Lazy load facade analyzer components
export const FacadeAnalyzer = dynamic(() => import("./facade-analyzer"), {
  loading: () => <ComponentLoader />,
  ssr: false,
});

// Lazy load service suggestion components
export const IntelligentServiceSuggestions = dynamic(
  () => import("./service-suggestions/IntelligentServiceSuggestions"),
  {
    loading: () => <ComponentLoader />,
  },
);

// Wrapper component with Suspense for manual lazy loading
export function LazyComponentWrapper({
  children,
  fallback = <ComponentLoader />,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return <Suspense fallback={fallback}>{children}</Suspense>;
}

// Utility to create lazy versions of any component
export function createLazyComponent<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T } | T>,
  fallback: React.ReactNode = <ComponentLoader />,
) {
  const LazyComponent = dynamic(
    async () => {
      const moduleResult = await importFn();
      return "default" in moduleResult
        ? moduleResult
        : { default: moduleResult };
    },
    {
      loading: () => <>{fallback}</>,
      ssr: false,
    },
  );

  return LazyComponent;
}
