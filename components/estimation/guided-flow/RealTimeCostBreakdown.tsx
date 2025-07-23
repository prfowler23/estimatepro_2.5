"use client";

// Real-time Cost Breakdown Display Component
// Shows live pricing updates throughout the guided workflow

import React, { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Calculator,
  DollarSign,
  Clock,
  BarChart3,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  XCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RealTimePricingService,
  RealTimePricingResult,
  ServicePricingBreakdown,
  PricingAdjustment,
} from "@/lib/services/real-time-pricing-service";
import { GuidedFlowData } from "@/lib/types/estimate-types";
import { CalculatorService } from "@/lib/services/calculator-service";

interface RealTimeCostBreakdownProps {
  flowData: GuidedFlowData;
  estimateId: string;
  isCompact?: boolean;
  showValidation?: boolean;
  showConfidenceMetrics?: boolean;
  enableLiveUpdates?: boolean;
  className?: string;
  onPricingUpdate?: (result: RealTimePricingResult) => void;
}

export function RealTimeCostBreakdown({
  flowData,
  estimateId,
  isCompact = false,
  showValidation = true,
  showConfidenceMetrics = true,
  enableLiveUpdates = true,
  className = "",
  onPricingUpdate,
}: RealTimeCostBreakdownProps) {
  // State management
  const [pricingResult, setPricingResult] =
    useState<RealTimePricingResult | null>(null);
  const [isExpanded, setIsExpanded] = useState(!isCompact);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [previousTotal, setPreviousTotal] = useState<number>(0);

  // Get pricing service instance
  const pricingService = useMemo(
    () => RealTimePricingService.getInstance(),
    [],
  );

  // Calculate pricing and subscribe to updates
  useEffect(() => {
    if (!estimateId || !flowData) return;

    // Initial calculation
    const calculateInitial = () => {
      setIsLoading(true);
      try {
        const result = pricingService.calculateRealTimePricing(
          flowData,
          estimateId,
        );
        setPreviousTotal(result.totalCost);
        setPricingResult(result);
        setLastUpdate(new Date());
        onPricingUpdate?.(result);
      } catch (error) {
        console.error("Failed to calculate initial pricing:", error);
      } finally {
        setIsLoading(false);
      }
    };

    calculateInitial();

    // Subscribe to live updates if enabled
    if (enableLiveUpdates) {
      const unsubscribe = pricingService.subscribe(estimateId, (result) => {
        setPreviousTotal(pricingResult?.totalCost || 0);
        setPricingResult(result);
        setLastUpdate(new Date());
        onPricingUpdate?.(result);
      });

      return unsubscribe;
    }
  }, [
    estimateId,
    flowData,
    enableLiveUpdates,
    pricingService,
    onPricingUpdate,
    pricingResult?.totalCost,
  ]);

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Get confidence color
  const getConfidenceColor = (
    confidence: "high" | "medium" | "low",
  ): string => {
    switch (confidence) {
      case "high":
        return "bg-green-100 text-green-800 border-green-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-red-100 text-red-800 border-red-200";
    }
  };

  // Get confidence icon
  const getConfidenceIcon = (confidence: "high" | "medium" | "low") => {
    switch (confidence) {
      case "high":
        return <CheckCircle className="h-4 w-4" />;
      case "medium":
        return <AlertCircle className="h-4 w-4" />;
      case "low":
        return <XCircle className="h-4 w-4" />;
    }
  };

  // Calculate price change
  const priceChange = pricingResult
    ? pricingResult.totalCost - previousTotal
    : 0;
  const priceChangePercent =
    previousTotal > 0 ? (priceChange / previousTotal) * 100 : 0;

  // Calculate completion percentage
  const completionPercentage = useMemo(() => {
    const totalSteps = 9; // Total guided flow steps
    const completedSteps = Object.keys(flowData || {}).filter(
      (key) =>
        flowData[key as keyof GuidedFlowData] && key !== "_templateMetadata",
    ).length;
    return Math.round((completedSteps / totalSteps) * 100);
  }, [flowData]);

  if (!pricingResult) {
    return (
      <Card className={`w-full ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-text-secondary">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-sm">Calculating costs...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={`w-full transition-all duration-300 ${className} ${
        pricingResult.confidence === "low"
          ? "border-orange-200 bg-orange-50/30"
          : ""
      }`}
    >
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Live Cost Estimate</CardTitle>
              {isLoading && (
                <RefreshCw className="h-4 w-4 animate-spin text-text-secondary" />
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Confidence indicator */}
              {showConfidenceMetrics && (
                <Badge
                  className={`text-xs ${getConfidenceColor(pricingResult.confidence)}`}
                  variant="outline"
                >
                  <div className="flex items-center gap-1">
                    {getConfidenceIcon(pricingResult.confidence)}
                    <span className="capitalize">
                      {pricingResult.confidence}
                    </span>
                  </div>
                </Badge>
              )}

              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>

          {/* Total cost display */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="text-2xl font-bold text-primary">
                {formatCurrency(pricingResult.totalCost)}
              </div>

              {/* Price change indicator */}
              {priceChange !== 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-1 text-sm"
                >
                  {priceChange > 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                  <span
                    className={
                      priceChange > 0 ? "text-green-600" : "text-red-600"
                    }
                  >
                    {priceChange > 0 ? "+" : ""}
                    {formatCurrency(priceChange)}
                    {Math.abs(priceChangePercent) > 0.1 && (
                      <span className="text-xs ml-1">
                        ({priceChange > 0 ? "+" : ""}
                        {priceChangePercent.toFixed(1)}%)
                      </span>
                    )}
                  </span>
                </motion.div>
              )}
            </div>

            {/* Quick stats */}
            <div className="flex items-center gap-4 text-sm text-text-secondary">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{pricingResult.totalHours.toFixed(1)} hours</span>
              </div>
              <div className="flex items-center gap-1">
                <BarChart3 className="h-4 w-4" />
                <span>{pricingResult.totalArea.toLocaleString()} sq ft</span>
              </div>
              <div className="text-xs">
                Updated {lastUpdate.toLocaleTimeString()}
              </div>
            </div>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Progress indicator */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-text-secondary">Estimate Completion</span>
                <span className="font-medium">{completionPercentage}%</span>
              </div>
              <Progress value={completionPercentage} className="h-2" />
            </div>

            {/* Service breakdown */}
            {pricingResult.serviceBreakdown.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Service Breakdown
                </h4>
                <div className="space-y-2">
                  {pricingResult.serviceBreakdown.map((service, index) => (
                    <motion.div
                      key={service.serviceType}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-3 bg-bg-secondary rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {service.serviceName}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-xs ${getConfidenceColor(service.confidence)}`}
                          >
                            {service.confidence}
                          </Badge>
                        </div>
                        <div className="text-xs text-text-secondary mt-1">
                          {service.area.toLocaleString()} sq ft •{" "}
                          {service.hours.toFixed(1)} hrs
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {formatCurrency(service.adjustedPrice)}
                        </div>
                        {service.basePrice !== service.adjustedPrice && (
                          <div className="text-xs text-text-secondary line-through">
                            {formatCurrency(service.basePrice)}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Adjustments */}
            {pricingResult.adjustments.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Price Adjustments
                </h4>
                <div className="space-y-2">
                  {pricingResult.adjustments.map((adjustment, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-bg-tertiary rounded"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {adjustment.type}
                        </Badge>
                        <span className="text-sm">
                          {adjustment.description}
                        </span>
                      </div>
                      <div
                        className={`text-sm font-medium ${
                          adjustment.value >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {adjustment.value >= 0 ? "+" : ""}
                        {adjustment.isPercentage
                          ? `${adjustment.value}%`
                          : formatCurrency(adjustment.value)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Validation warnings and errors */}
            {showValidation &&
              (pricingResult.warnings.length > 0 ||
                pricingResult.missingData.length > 0) && (
                <div className="space-y-2">
                  {pricingResult.warnings.map((warning, index) => (
                    <Alert
                      key={index}
                      className="border-orange-200 bg-orange-50"
                    >
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <AlertDescription className="text-orange-800">
                        {warning}
                      </AlertDescription>
                    </Alert>
                  ))}

                  {pricingResult.missingData.map((missing, index) => (
                    <Alert key={index} className="border-blue-200 bg-blue-50">
                      <Info className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-blue-800">
                        Missing data affects accuracy: {missing}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}

            {/* Update info */}
            <div className="text-xs text-text-secondary text-center pt-2 border-t">
              Last updated: {pricingResult.lastUpdated.toLocaleString()}
              {enableLiveUpdates && (
                <span className="ml-2">• Live updates enabled</span>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export default RealTimeCostBreakdown;
