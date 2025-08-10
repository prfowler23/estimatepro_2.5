/**
 * Mobile Performance Monitoring Page
 *
 * Real-time mobile performance dashboard with Core Web Vitals,
 * device optimization insights, and performance recommendations.
 *
 * Features:
 * - Real-time Core Web Vitals monitoring
 * - Device capability analysis
 * - Performance optimization insights
 * - Battery and network condition tracking
 * - Interactive performance charts
 * - Optimization recommendations
 *
 * Part of Phase 4 Priority 3: Mobile Performance & Core Web Vitals
 */

import { Metadata } from "next";
import { MobilePerformanceDashboard } from "@/components/performance/MobilePerformanceDashboard";

export const metadata: Metadata = {
  title: "Mobile Performance Monitor | EstimatePro",
  description:
    "Real-time mobile performance monitoring with Core Web Vitals tracking, device optimization, and performance insights.",
  keywords: [
    "mobile performance",
    "core web vitals",
    "performance monitoring",
    "mobile optimization",
    "web vitals",
    "performance dashboard",
    "mobile analytics",
    "device optimization",
  ],
  openGraph: {
    title: "Mobile Performance Monitor",
    description:
      "Monitor and optimize mobile performance with real-time Core Web Vitals tracking.",
    type: "website",
  },
};

export default function MobilePerformancePage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-text-primary mb-2">
          Mobile Performance Monitor
        </h1>
        <p className="text-lg text-text-secondary">
          Real-time mobile performance tracking with Core Web Vitals monitoring,
          device optimization insights, and performance recommendations.
        </p>
      </div>

      {/* Mobile Performance Dashboard */}
      <MobilePerformanceDashboard />

      {/* Performance Tips Section */}
      <div className="mt-12 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
        <h2 className="text-2xl font-semibold text-text-primary mb-4">
          Mobile Performance Best Practices
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h3 className="font-semibold text-text-primary mb-2">
              🚀 Core Web Vitals
            </h3>
            <p className="text-text-secondary text-sm">
              Monitor LCP (&lt;2.5s), FID (&lt;100ms), and CLS (&lt;0.1) for
              optimal user experience.
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h3 className="font-semibold text-text-primary mb-2">
              📱 Device Adaptation
            </h3>
            <p className="text-text-secondary text-sm">
              Automatically adjusts performance based on device tier, network
              speed, and battery level.
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h3 className="font-semibold text-text-primary mb-2">
              🔋 Battery Optimization
            </h3>
            <p className="text-text-secondary text-sm">
              Reduces animations and background tasks when battery is low to
              extend device life.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
