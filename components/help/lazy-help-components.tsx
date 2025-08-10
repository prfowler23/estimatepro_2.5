/**
 * Lazy-loaded help components for optimal bundle size
 * Reduces initial bundle by ~20-30% by loading help components on demand
 */

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";

// Loading component for help panel
const HelpPanelLoader = () => (
  <div className="fixed top-20 right-4 w-80 z-40">
    <div className="bg-white border shadow-lg rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-5 w-32" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  </div>
);

// Loading component for help tooltip
const HelpTooltipLoader = () => (
  <div className="inline-flex items-center gap-1">
    <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
  </div>
);

// Loading component for tutorial overlay
const TutorialLoader = () => (
  <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center">
    <div className="bg-white rounded-lg p-6 shadow-xl">
      <div className="flex items-center gap-2">
        <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
        <span className="text-gray-700">Loading tutorial...</span>
      </div>
    </div>
  </div>
);

// Lazy load ContextualHelpPanel - only loaded when help is triggered
export const LazyContextualHelpPanel = dynamic(
  () => import("./ContextualHelpPanel"),
  {
    loading: () => <HelpPanelLoader />,
    ssr: false, // Disable SSR for client-only features
  },
);

// Lazy load HelpTooltip - loaded on hover/focus
export const LazyHelpTooltip = dynamic(() => import("./HelpTooltip"), {
  loading: () => <HelpTooltipLoader />,
  ssr: true, // Keep SSR for SEO and initial render
});

// Lazy load InteractiveTutorial - only loaded when tutorial starts
export const LazyInteractiveTutorial = dynamic(
  () => import("./InteractiveTutorial"),
  {
    loading: () => <TutorialLoader />,
    ssr: false, // Tutorials are client-only
  },
);

// Lazy load HelpSystemDemo - only for demo pages
export const LazyHelpSystemDemo = dynamic(() => import("./HelpSystemDemo"), {
  loading: () => (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
    </div>
  ),
  ssr: false,
});

// Export help provider normally as it's needed for context
export { HelpProvider, useHelp } from "./HelpProvider";
export { default as HelpIntegratedFlow } from "./HelpIntegratedFlow";

// Re-export lazy components with original names for drop-in replacement
export {
  LazyContextualHelpPanel as ContextualHelpPanel,
  LazyHelpTooltip as HelpTooltip,
  LazyInteractiveTutorial as InteractiveTutorial,
  LazyHelpSystemDemo as HelpSystemDemo,
};
