"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Map routes to their dynamic imports for preloading
const routePreloads = {
  "/dashboard": () => {
    import("@/components/analytics/analytics-overview");
    import("@/components/dashboard/AIBusinessInsights");
    import("@/lib/analytics/data");
  },
  "/calculator": () => {
    import("@/components/calculator/lazy-forms");
    import("@/lib/calculations/constants");
  },
  "/estimates/new/guided": () => {
    import("@/components/estimation/EstimateFlowProvider");
    import("@/components/estimation/guided-flow/steps/InitialContact");
  },
  "/3d-demo": () => {
    import("three");
    import("@react-three/fiber");
    import("@react-three/drei");
  },
  "/drone-demo": () => {
    import("@/components/drone/drone-dashboard");
    // Skip preloading drone-service due to server-side dependencies
  },
};

/**
 * Preload resources for likely next routes based on current route
 */
export function RoutePreloader() {
  const pathname = usePathname();

  useEffect(() => {
    // Don't preload on mobile or slow connections
    if ("connection" in navigator) {
      const connection = (navigator as any).connection;
      if (connection?.saveData || connection?.effectiveType === "slow-2g") {
        return;
      }
    }

    // Preload likely next routes based on current route
    const preloadNextRoutes = () => {
      if (pathname === "/") {
        // From homepage, likely to go to dashboard or new estimate
        routePreloads["/dashboard"]?.();
        routePreloads["/estimates/new/guided"]?.();
      } else if (pathname === "/dashboard") {
        // From dashboard, likely to create estimate or use calculator
        routePreloads["/estimates/new/guided"]?.();
        routePreloads["/calculator"]?.();
      } else if (pathname.startsWith("/estimates")) {
        // From estimates, might need calculator or 3D
        routePreloads["/calculator"]?.();
        routePreloads["/3d-demo"]?.();
      }
    };

    // Preload on idle
    if ("requestIdleCallback" in window) {
      requestIdleCallback(preloadNextRoutes, { timeout: 2000 });
    } else {
      setTimeout(preloadNextRoutes, 1000);
    }
  }, [pathname]);

  return null;
}
