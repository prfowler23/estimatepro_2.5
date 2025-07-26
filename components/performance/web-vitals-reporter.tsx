"use client";

import { useEffect } from "react";
import { onCLS, onFCP, onLCP, onTTFB, onINP } from "web-vitals";

export function WebVitalsReporter() {
  useEffect(() => {
    function sendToAnalytics(metric: any) {
      // Log to console in development
      if (process.env.NODE_ENV === "development") {
        console.log(`[Web Vitals] ${metric.name}: ${metric.value}`, metric);
      }

      // Send to analytics service
      const body = JSON.stringify({
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta,
        id: metric.id,
        navigationType: metric.navigationType,
      });

      // Use sendBeacon for reliability
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/analytics/vitals", body);
      }
    }

    // Core Web Vitals
    onCLS(sendToAnalytics); // Cumulative Layout Shift
    onLCP(sendToAnalytics); // Largest Contentful Paint
    onINP(sendToAnalytics); // Interaction to Next Paint (replaces FID)

    // Other metrics
    onFCP(sendToAnalytics); // First Contentful Paint
    onTTFB(sendToAnalytics); // Time to First Byte
  }, []);

  return null;
}
