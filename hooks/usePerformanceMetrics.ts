import { useEffect, useState } from "react";

interface PerformanceMetrics {
  pageLoadTime: number | null;
  domContentLoadedTime: number | null;
  firstPaintTime: number | null;
  firstContentfulPaintTime: number | null;
  resourceLoadTime: number | null;
}

export function usePerformanceMetrics() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    pageLoadTime: null,
    domContentLoadedTime: null,
    firstPaintTime: null,
    firstContentfulPaintTime: null,
    resourceLoadTime: null,
  });

  useEffect(() => {
    function collectMetrics() {
      if (typeof window === "undefined" || !window.performance) return;

      const perfData = window.performance.timing;
      const paintMetrics = performance.getEntriesByType("paint");

      const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
      const domContentLoadedTime =
        perfData.domContentLoadedEventEnd - perfData.navigationStart;

      // Find paint metrics
      const firstPaint = paintMetrics.find(
        (entry) => entry.name === "first-paint",
      );
      const firstContentfulPaint = paintMetrics.find(
        (entry) => entry.name === "first-contentful-paint",
      );

      // Calculate resource load time
      const resources = performance.getEntriesByType("resource");
      const totalResourceTime = resources.reduce(
        (total, resource) =>
          total + (resource.responseEnd - resource.startTime),
        0,
      );

      setMetrics({
        pageLoadTime: pageLoadTime > 0 ? pageLoadTime : null,
        domContentLoadedTime:
          domContentLoadedTime > 0 ? domContentLoadedTime : null,
        firstPaintTime: firstPaint ? firstPaint.startTime : null,
        firstContentfulPaintTime: firstContentfulPaint
          ? firstContentfulPaint.startTime
          : null,
        resourceLoadTime: totalResourceTime,
      });

      // Log metrics in development
      if (process.env.NODE_ENV === "development") {
        console.log("Performance Metrics:", {
          pageLoadTime: `${pageLoadTime}ms`,
          domContentLoadedTime: `${domContentLoadedTime}ms`,
          firstPaintTime: firstPaint ? `${firstPaint.startTime}ms` : "N/A",
          firstContentfulPaintTime: firstContentfulPaint
            ? `${firstContentfulPaint.startTime}ms`
            : "N/A",
          resourceLoadTime: `${totalResourceTime}ms`,
        });
      }
    }

    // Wait for page to be fully loaded
    if (document.readyState === "complete") {
      collectMetrics();
    } else {
      window.addEventListener("load", collectMetrics);
      return () => window.removeEventListener("load", collectMetrics);
    }
  }, []);

  return metrics;
}
