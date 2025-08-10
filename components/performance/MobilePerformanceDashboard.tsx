/**
 * Mobile Performance Dashboard
 *
 * Real-time mobile performance monitoring dashboard with Core Web Vitals,
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

"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMobilePerformanceOptimizer } from "@/lib/performance/mobile-performance-optimizer";
import {
  Activity,
  Battery,
  Cpu,
  Globe,
  Image,
  MemoryStick,
  Monitor,
  Smartphone,
  TrendingUp,
  Wifi,
  Zap,
  AlertTriangle,
  CheckCircle,
  Info,
  Lightbulb,
  Settings,
  BarChart3,
  Gauge,
  Clock,
  Eye,
} from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  target?: number;
  status: "good" | "needs-improvement" | "poor";
  icon: React.ComponentType<{ className?: string }>;
  trend?: "up" | "down" | "stable";
  description?: string;
}

const MetricCard = React.memo(function MetricCard({
  title,
  value,
  unit = "",
  target,
  status,
  icon: Icon,
  trend,
  description,
}: MetricCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case "good":
        return "text-green-600 bg-green-50";
      case "needs-improvement":
        return "text-yellow-600 bg-yellow-50";
      case "poor":
        return "text-red-600 bg-red-50";
    }
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    return (
      <div
        className={cn(
          "ml-2 text-xs",
          trend === "up"
            ? "text-green-500"
            : trend === "down"
              ? "text-red-500"
              : "text-gray-500",
        )}
      >
        {trend === "up" ? "↗" : trend === "down" ? "↘" : "→"}
      </div>
    );
  };

  const progressValue = target
    ? Math.min((Number(value) / target) * 100, 100)
    : 0;

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg", getStatusColor())}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-medium text-sm text-text-secondary">{title}</h3>
            <div className="flex items-center mt-1">
              <span className="text-2xl font-bold text-text-primary">
                {value}
              </span>
              {unit && (
                <span className="text-sm text-text-secondary ml-1">{unit}</span>
              )}
              {getTrendIcon()}
            </div>
            {description && (
              <p className="text-xs text-text-tertiary mt-1">{description}</p>
            )}
          </div>
        </div>
        <Badge
          variant={
            status === "good"
              ? "secondary"
              : status === "needs-improvement"
                ? "secondary"
                : "destructive"
          }
          className="text-xs"
        >
          {status.replace("-", " ")}
        </Badge>
      </div>

      {target && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-text-secondary mb-1">
            <span>Progress to target</span>
            <span>
              {target}
              {unit}
            </span>
          </div>
          <Progress
            value={progressValue}
            className={cn(
              "h-2",
              status === "good"
                ? "[&>div]:bg-green-500"
                : status === "needs-improvement"
                  ? "[&>div]:bg-yellow-500"
                  : "[&>div]:bg-red-500",
            )}
          />
        </div>
      )}
    </Card>
  );
});

interface DeviceInfoCardProps {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  details?: Array<{ label: string; value: string }>;
}

const DeviceInfoCard = React.memo(function DeviceInfoCard({
  title,
  value,
  icon: Icon,
  details,
}: DeviceInfoCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="p-4">
      <div
        className="flex items-center gap-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-sm text-text-secondary">{title}</h3>
          <p className="font-semibold text-text-primary">{value}</p>
        </div>
        <Button variant="ghost" size="sm" className="p-1">
          <Eye
            className={cn(
              "h-4 w-4 transition-transform",
              expanded && "rotate-180",
            )}
          />
        </Button>
      </div>

      <AnimatePresence>
        {expanded && details && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-3 pt-3 border-t border-border-primary"
          >
            <div className="space-y-2">
              {details.map((detail, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-text-secondary">{detail.label}</span>
                  <span className="text-text-primary font-medium">
                    {detail.value}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
});

interface RecommendationProps {
  recommendations: string[];
}

const Recommendations = React.memo(function Recommendations({
  recommendations,
}: RecommendationProps) {
  if (recommendations.length === 0) {
    return (
      <Card className="p-6 text-center">
        <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
        <h3 className="font-semibold text-text-primary mb-1">All Good!</h3>
        <p className="text-text-secondary">
          Your mobile performance is optimized.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {recommendations.map((recommendation, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-1 bg-blue-50 text-blue-600 rounded">
                <Lightbulb className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-text-primary">{recommendation}</p>
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
});

export function MobilePerformanceDashboard() {
  const {
    optimizer,
    isInitialized,
    optimizationResult,
    performanceProfile,
    currentStrategy,
    performanceBudget,
  } = useMobilePerformanceOptimizer();

  const [activeTab, setActiveTab] = useState("vitals");
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Mock Core Web Vitals data (in real implementation, this would come from the monitor)
  const [vitalsData, setVitalsData] = useState({
    lcp: { value: 2800, status: "needs-improvement" as const },
    inp: { value: 120, status: "needs-improvement" as const },
    cls: { value: 0.15, status: "needs-improvement" as const },
    fcp: { value: 1600, status: "good" as const },
    ttfb: { value: 800, status: "needs-improvement" as const },
  });

  // Simulate real-time updates
  useEffect(() => {
    if (!autoRefresh || !isInitialized) return;

    const interval = setInterval(() => {
      setVitalsData((prev) => ({
        lcp: {
          value: Math.max(1000, prev.lcp.value + (Math.random() - 0.5) * 200),
          status:
            prev.lcp.value < 2500
              ? "good"
              : prev.lcp.value < 4000
                ? "needs-improvement"
                : "poor",
        },
        inp: {
          value: Math.max(10, prev.inp.value + (Math.random() - 0.5) * 20),
          status:
            prev.inp.value < 100
              ? "good"
              : prev.inp.value < 300
                ? "needs-improvement"
                : "poor",
        },
        cls: {
          value: Math.max(0, prev.cls.value + (Math.random() - 0.5) * 0.02),
          status:
            prev.cls.value < 0.1
              ? "good"
              : prev.cls.value < 0.25
                ? "needs-improvement"
                : "poor",
        },
        fcp: {
          value: Math.max(500, prev.fcp.value + (Math.random() - 0.5) * 100),
          status:
            prev.fcp.value < 1800
              ? "good"
              : prev.fcp.value < 3000
                ? "needs-improvement"
                : "poor",
        },
        ttfb: {
          value: Math.max(100, prev.ttfb.value + (Math.random() - 0.5) * 50),
          status:
            prev.ttfb.value < 800
              ? "good"
              : prev.ttfb.value < 1800
                ? "needs-improvement"
                : "poor",
        },
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, [autoRefresh, isInitialized]);

  const deviceDetails = useMemo(() => {
    if (!performanceProfile) return [];

    return [
      { label: "Memory Pressure", value: performanceProfile.memoryPressure },
      { label: "CPU Utilization", value: performanceProfile.cpuUtilization },
      { label: "Thermal State", value: performanceProfile.thermalState },
      {
        label: "Data Saver",
        value: performanceProfile.dataSaverMode ? "Enabled" : "Disabled",
      },
    ];
  }, [performanceProfile]);

  const networkDetails = useMemo(() => {
    if (!performanceProfile) return [];

    return [
      {
        label: "Effective Type",
        value: performanceProfile.networkSpeed.toUpperCase(),
      },
      {
        label: "Data Saver",
        value: performanceProfile.dataSaverMode ? "On" : "Off",
      },
    ];
  }, [performanceProfile]);

  const batteryDetails = useMemo(() => {
    if (!performanceProfile) return [];

    return [
      { label: "Level", value: performanceProfile.batteryLevel },
      { label: "Charging", value: "Unknown" }, // Would need battery API
    ];
  }, [performanceProfile]);

  const optimizationDetails = useMemo(() => {
    if (!currentStrategy) return [];

    return [
      {
        label: "Image Quality",
        value: `${Math.round(currentStrategy.imageQuality * 100)}%`,
      },
      {
        label: "Animations",
        value: currentStrategy.enableAnimations ? "Enabled" : "Disabled",
      },
      {
        label: "Prefetching",
        value: currentStrategy.prefetchEnabled ? "Enabled" : "Disabled",
      },
      {
        label: "Max Requests",
        value: currentStrategy.maxConcurrentRequests.toString(),
      },
    ];
  }, [currentStrategy]);

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-text-secondary">
            Initializing performance monitor...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Mobile Performance
          </h1>
          <p className="text-text-secondary">
            Real-time performance monitoring and optimization
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="flex items-center gap-2"
          >
            <Activity
              className={cn("h-4 w-4", autoRefresh && "animate-pulse")}
            />
            {autoRefresh ? "Live" : "Paused"}
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Performance Status Overview */}
      {optimizationResult && (
        <Card className="p-4 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                <Gauge className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-text-primary">
                  Optimization Active
                </h3>
                <p className="text-text-secondary text-sm">
                  Device: {performanceProfile?.deviceTier} • Network:{" "}
                  {performanceProfile?.networkSpeed}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">
                {Math.round(optimizationResult.estimatedImpact.lcpImprovement)}
                ms
              </div>
              <div className="text-xs text-text-secondary">
                Est. LCP improvement
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="vitals" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Core Web Vitals
          </TabsTrigger>
          <TabsTrigger value="device" className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            Device Info
          </TabsTrigger>
          <TabsTrigger value="optimization" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Optimization
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vitals" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <MetricCard
              title="Largest Contentful Paint"
              value={Math.round(vitalsData.lcp.value)}
              unit="ms"
              target={performanceBudget?.maxLCP}
              status={vitalsData.lcp.status}
              icon={Clock}
              trend="down"
              description="Time to render the largest content element"
            />
            <MetricCard
              title="First Input Delay"
              value={Math.round(vitalsData.inp.value)}
              unit="ms"
              target={performanceBudget?.maxINP}
              status={vitalsData.inp.status}
              icon={Activity}
              trend="stable"
              description="Responsiveness metric for user interactions"
            />
            <MetricCard
              title="Cumulative Layout Shift"
              value={vitalsData.cls.value.toFixed(3)}
              target={performanceBudget?.maxCLS}
              status={vitalsData.cls.status}
              icon={Monitor}
              trend="up"
              description="Visual stability score"
            />
            <MetricCard
              title="First Contentful Paint"
              value={Math.round(vitalsData.fcp.value)}
              unit="ms"
              target={performanceBudget?.maxFCP}
              status={vitalsData.fcp.status}
              icon={Eye}
              trend="down"
              description="Time to first text or image paint"
            />
            <MetricCard
              title="Time to First Byte"
              value={Math.round(vitalsData.ttfb.value)}
              unit="ms"
              target={performanceBudget?.maxTTFB}
              status={vitalsData.ttfb.status}
              icon={Globe}
              trend="stable"
              description="Server response time"
            />
          </div>
        </TabsContent>

        <TabsContent value="device" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <DeviceInfoCard
              title="Device Performance"
              value={performanceProfile?.deviceTier || "Unknown"}
              icon={Smartphone}
              details={deviceDetails}
            />
            <DeviceInfoCard
              title="Network Condition"
              value={
                performanceProfile?.networkSpeed?.toUpperCase() || "Unknown"
              }
              icon={Wifi}
              details={networkDetails}
            />
            <DeviceInfoCard
              title="Battery Status"
              value={performanceProfile?.batteryLevel || "Unknown"}
              icon={Battery}
              details={batteryDetails}
            />
          </div>
        </TabsContent>

        <TabsContent value="optimization" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Current Strategy
              </h3>
              {optimizationDetails.length > 0 ? (
                <div className="space-y-3">
                  {optimizationDetails.map((detail, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center"
                    >
                      <span className="text-text-secondary">
                        {detail.label}
                      </span>
                      <Badge variant="outline">{detail.value}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-text-secondary">
                  No optimization strategy active.
                </p>
              )}
            </Card>

            {optimizationResult && (
              <Card className="p-6">
                <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Estimated Impact
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary">LCP Improvement</span>
                    <Badge variant="secondary">
                      {Math.round(
                        optimizationResult.estimatedImpact.lcpImprovement,
                      )}
                      ms
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary">
                      Bandwidth Savings
                    </span>
                    <Badge variant="secondary">
                      {Math.round(
                        optimizationResult.estimatedImpact.bandwidthSavings,
                      )}
                      %
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary">Battery Impact</span>
                    <Badge variant="secondary">
                      +
                      {Math.round(
                        optimizationResult.estimatedImpact.batteryImpact,
                      )}
                      %
                    </Badge>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4 mt-6">
          <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Performance Recommendations
          </h3>
          <Recommendations
            recommendations={optimizationResult?.recommendations || []}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default MobilePerformanceDashboard;
