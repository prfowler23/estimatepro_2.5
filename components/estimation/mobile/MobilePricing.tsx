/**
 * Mobile Pricing Step
 *
 * Mobile-optimized pricing interface with:
 * - Touch-friendly price adjustments
 * - Smart pricing suggestions
 * - Margin and markup controls
 * - Competitive analysis
 * - Risk factor adjustments
 * - Haptic feedback for changes
 *
 * Part of Phase 4 Priority 4: Create Responsive Mobile Layouts
 */

"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  EnhancedMobileInput,
  MobileStepper,
} from "@/components/ui/mobile/EnhancedMobileInput";
import {
  useHapticFeedback,
  useDeviceCapabilities,
} from "@/components/providers/MobileGestureProvider";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Shield,
  Target,
  Zap,
  Calculator,
  Percent,
  Info,
  ChevronRight,
  ChevronDown,
  Edit,
  Check,
  X,
  ArrowUpDown,
} from "lucide-react";

interface PricingSection {
  id: string;
  name: string;
  basePrice: number;
  margin: number; // percentage
  markup: number; // percentage
  riskFactor: number; // 0-1 scale
  adjustments: PricingAdjustment[];
  finalPrice: number;
}

interface PricingAdjustment {
  id: string;
  type: "discount" | "premium" | "rush" | "complexity" | "access";
  label: string;
  percentage: number;
  amount: number;
  reason?: string;
}

interface MobilePricingProps {
  data: any;
  onUpdate: (data: any) => void;
  isMobile?: boolean;
  screenSize?: { width: number; height: number; orientation: string };
}

const RISK_FACTOR_OPTIONS = [
  {
    value: 0,
    label: "Low Risk",
    color: "text-green-600",
    description: "Standard project",
  },
  {
    value: 0.1,
    label: "Medium Risk",
    color: "text-yellow-600",
    description: "Some complications",
  },
  {
    value: 0.25,
    label: "High Risk",
    color: "text-red-600",
    description: "Complex access/conditions",
  },
];

const ADJUSTMENT_TYPES = [
  {
    type: "discount",
    label: "Discount",
    icon: TrendingDown,
    color: "text-red-600",
  },
  {
    type: "premium",
    label: "Premium",
    icon: TrendingUp,
    color: "text-green-600",
  },
  { type: "rush", label: "Rush Job", icon: Zap, color: "text-orange-600" },
  {
    type: "complexity",
    label: "Complexity",
    icon: AlertTriangle,
    color: "text-yellow-600",
  },
  {
    type: "access",
    label: "Access Premium",
    icon: Shield,
    color: "text-blue-600",
  },
];

/**
 * Mobile Pricing Component
 */
export function MobilePricing({
  data,
  onUpdate,
  isMobile = true,
  screenSize,
}: MobilePricingProps) {
  const { haptic } = useHapticFeedback();
  const { isTouch } = useDeviceCapabilities();

  const [pricingSections, setPricingSections] = useState<PricingSection[]>(
    data?.pricingSections || [],
  );
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [showPricingStrategy, setShowPricingStrategy] = useState(false);
  const [pricingStrategy, setPricingStrategy] = useState<
    "competitive" | "premium" | "value"
  >(data?.pricingStrategy || "competitive");

  // Calculate total pricing
  const totalPricing = useMemo(() => {
    const subtotal = pricingSections.reduce(
      (sum, section) => sum + section.finalPrice,
      0,
    );
    const tax = subtotal * (data?.taxRate || 0.1);
    const total = subtotal + tax;

    return {
      subtotal,
      tax,
      total,
      averageMargin:
        pricingSections.length > 0
          ? pricingSections.reduce((sum, s) => sum + s.margin, 0) /
            pricingSections.length
          : 0,
    };
  }, [pricingSections, data?.taxRate]);

  // Update parent component when data changes
  const updateData = useCallback(() => {
    onUpdate({
      ...data,
      pricingSections,
      pricingStrategy,
      totalPricing,
      isCompleted:
        pricingSections.length > 0 &&
        pricingSections.every((s) => s.finalPrice > 0),
    });
  }, [data, pricingSections, pricingStrategy, totalPricing, onUpdate]);

  useEffect(() => {
    updateData();
  }, [updateData]);

  // Calculate final price for a section
  const calculateFinalPrice = useCallback((section: PricingSection): number => {
    let price = section.basePrice;

    // Apply margin
    price *= 1 + section.margin / 100;

    // Apply markup
    price *= 1 + section.markup / 100;

    // Apply risk factor
    price *= 1 + section.riskFactor;

    // Apply adjustments
    section.adjustments.forEach((adj) => {
      if (adj.percentage > 0) {
        price *= 1 + adj.percentage / 100;
      } else {
        price += adj.amount;
      }
    });

    return Math.max(0, price);
  }, []);

  // Update section
  const updateSection = useCallback(
    (sectionId: string, updates: Partial<PricingSection>) => {
      setPricingSections((prev) =>
        prev.map((section) => {
          if (section.id === sectionId) {
            const updatedSection = { ...section, ...updates };
            updatedSection.finalPrice = calculateFinalPrice(updatedSection);
            return updatedSection;
          }
          return section;
        }),
      );
    },
    [calculateFinalPrice],
  );

  // Add adjustment
  const addAdjustment = useCallback(
    (sectionId: string, type: PricingAdjustment["type"]) => {
      haptic("impact", "light");
      const newAdjustment: PricingAdjustment = {
        id: `adj-${Date.now()}`,
        type,
        label: ADJUSTMENT_TYPES.find((t) => t.type === type)?.label || type,
        percentage: 0,
        amount: 0,
      };

      updateSection(sectionId, {
        adjustments: [
          ...(pricingSections.find((s) => s.id === sectionId)?.adjustments ||
            []),
          newAdjustment,
        ],
      });
    },
    [haptic, pricingSections, updateSection],
  );

  // Remove adjustment
  const removeAdjustment = useCallback(
    (sectionId: string, adjustmentId: string) => {
      haptic("impact", "medium");
      const section = pricingSections.find((s) => s.id === sectionId);
      if (section) {
        updateSection(sectionId, {
          adjustments: section.adjustments.filter(
            (adj) => adj.id !== adjustmentId,
          ),
        });
      }
    },
    [haptic, pricingSections, updateSection],
  );

  // Apply pricing strategy
  const applyPricingStrategy = useCallback(
    (strategy: typeof pricingStrategy) => {
      haptic("impact", "heavy");
      setPricingStrategy(strategy);

      // Adjust margins based on strategy
      const marginAdjustment = {
        competitive: 15,
        value: 25,
        premium: 35,
      }[strategy];

      setPricingSections((prev) =>
        prev.map((section) => ({
          ...section,
          margin: marginAdjustment,
          finalPrice: calculateFinalPrice({
            ...section,
            margin: marginAdjustment,
          }),
        })),
      );

      setShowPricingStrategy(false);
    },
    [haptic, calculateFinalPrice],
  );

  // Quick price adjustments
  const quickAdjustPrice = useCallback(
    (sectionId: string, percentage: number) => {
      haptic("impact", "light");
      const section = pricingSections.find((s) => s.id === sectionId);
      if (section) {
        const newBasePrice = section.basePrice * (1 + percentage / 100);
        updateSection(sectionId, { basePrice: Math.max(0, newBasePrice) });
      }
    },
    [haptic, pricingSections, updateSection],
  );

  return (
    <div className="space-y-4 pb-6">
      {/* Header with Strategy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Pricing & Margins
          </CardTitle>
          <div className="flex items-center justify-between">
            <div className="text-sm text-text-secondary">
              {pricingSections.length} sections •{" "}
              {totalPricing.averageMargin.toFixed(1)}% avg margin
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                haptic("selection");
                setShowPricingStrategy(!showPricingStrategy);
              }}
            >
              <Target className="h-4 w-4 mr-2" />
              {pricingStrategy} Strategy
            </Button>
          </div>
        </CardHeader>

        {/* Pricing Strategy Selector */}
        <AnimatePresence>
          {showPricingStrategy && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <h4 className="font-medium">Select Pricing Strategy</h4>
                  <div className="grid grid-cols-1 gap-3">
                    {[
                      {
                        key: "competitive" as const,
                        label: "Competitive",
                        margin: "15%",
                        description: "Market-rate pricing for competitive bids",
                      },
                      {
                        key: "value" as const,
                        label: "Value-Based",
                        margin: "25%",
                        description: "Balanced pricing for quality service",
                      },
                      {
                        key: "premium" as const,
                        label: "Premium",
                        margin: "35%",
                        description: "High-end pricing for specialized work",
                      },
                    ].map((strategy) => (
                      <motion.button
                        key={strategy.key}
                        onClick={() => applyPricingStrategy(strategy.key)}
                        className={cn(
                          "flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left",
                          pricingStrategy === strategy.key
                            ? "border-primary-500 bg-primary-50"
                            : "border-gray-200 bg-white hover:border-gray-300",
                          "touch-manipulation",
                        )}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{strategy.label}</h4>
                            <Badge variant="secondary">
                              {strategy.margin} margin
                            </Badge>
                          </div>
                          <p className="text-sm text-text-secondary mt-1">
                            {strategy.description}
                          </p>
                        </div>
                        {pricingStrategy === strategy.key && (
                          <Check className="h-5 w-5 text-primary-600" />
                        )}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Pricing Sections */}
      <div className="space-y-3">
        {pricingSections.map((section) => {
          const isActive = activeSectionId === section.id;

          return (
            <Card
              key={section.id}
              className={cn(isActive && "ring-2 ring-primary-500")}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => {
                      haptic("selection");
                      setActiveSectionId(isActive ? null : section.id);
                    }}
                    className="flex items-center gap-3 flex-1 text-left"
                  >
                    <DollarSign className="h-5 w-5 text-primary-600" />
                    <div>
                      <div className="font-medium">{section.name}</div>
                      <div className="text-sm text-text-secondary">
                        ${section.finalPrice.toFixed(2)} • {section.margin}%
                        margin
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="font-bold text-lg">
                        ${section.finalPrice.toFixed(2)}
                      </div>
                    </div>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-text-secondary transition-transform",
                        isActive && "rotate-180",
                      )}
                    />
                  </div>
                </div>
              </CardHeader>

              <AnimatePresence>
                {isActive && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <CardContent className="pt-0 space-y-4">
                      {/* Base Price */}
                      <div className="grid grid-cols-2 gap-3">
                        <EnhancedMobileInput
                          label="Base Price ($)"
                          type="number"
                          value={section.basePrice}
                          onChange={(value) =>
                            updateSection(section.id, {
                              basePrice: parseFloat(value.toString()) || 0,
                            })
                          }
                          placeholder="0.00"
                          min={0}
                          step={0.01}
                          inputMode="decimal"
                        />
                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            Quick Adjust
                          </label>
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => quickAdjustPrice(section.id, -10)}
                              className="flex-1 text-xs"
                            >
                              -10%
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => quickAdjustPrice(section.id, 10)}
                              className="flex-1 text-xs"
                            >
                              +10%
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Margin and Markup */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            Margin (%)
                          </label>
                          <MobileStepper
                            value={section.margin}
                            onChange={(value) =>
                              updateSection(section.id, { margin: value })
                            }
                            min={0}
                            max={50}
                            step={5}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            Markup (%)
                          </label>
                          <MobileStepper
                            value={section.markup}
                            onChange={(value) =>
                              updateSection(section.id, { markup: value })
                            }
                            min={0}
                            max={30}
                            step={5}
                          />
                        </div>
                      </div>

                      {/* Risk Factor */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Risk Assessment
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {RISK_FACTOR_OPTIONS.map((risk) => (
                            <button
                              key={risk.value}
                              onClick={() => {
                                haptic("selection");
                                updateSection(section.id, {
                                  riskFactor: risk.value,
                                });
                              }}
                              className={cn(
                                "p-3 rounded-lg border text-center transition-all touch-manipulation",
                                section.riskFactor === risk.value
                                  ? "border-primary-500 bg-primary-50"
                                  : "border-gray-200 bg-white",
                              )}
                            >
                              <div
                                className={cn(
                                  "font-medium text-sm",
                                  risk.color,
                                )}
                              >
                                {risk.label}
                              </div>
                              <div className="text-xs text-text-secondary mt-1">
                                {risk.description}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Adjustments */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Price Adjustments</h4>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              haptic("selection");
                              // Simple implementation - add discount by default
                              addAdjustment(section.id, "discount");
                            }}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add
                          </Button>
                        </div>

                        {section.adjustments.length > 0 ? (
                          <div className="space-y-2">
                            {section.adjustments.map((adjustment) => {
                              const adjustmentType = ADJUSTMENT_TYPES.find(
                                (t) => t.type === adjustment.type,
                              );
                              const Icon = adjustmentType?.icon || ArrowUpDown;

                              return (
                                <div
                                  key={adjustment.id}
                                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                                >
                                  <Icon
                                    className={cn(
                                      "h-4 w-4",
                                      adjustmentType?.color,
                                    )}
                                  />
                                  <div className="flex-1">
                                    <div className="text-sm font-medium">
                                      {adjustment.label}
                                    </div>
                                    <div className="text-xs text-text-secondary">
                                      {adjustment.percentage > 0
                                        ? `${adjustment.percentage}%`
                                        : `$${adjustment.amount.toFixed(2)}`}
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      removeAdjustment(
                                        section.id,
                                        adjustment.id,
                                      )
                                    }
                                    className="h-8 w-8 p-0 text-red-500"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-sm text-text-secondary text-center py-2">
                            No adjustments added
                          </p>
                        )}
                      </div>

                      {/* Price Breakdown */}
                      <div className="bg-primary-50 rounded-lg p-4 space-y-2">
                        <h4 className="font-medium text-primary-700">
                          Price Breakdown
                        </h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Base Price:</span>
                            <span>${section.basePrice.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Margin ({section.margin}%):</span>
                            <span>
                              +$
                              {(
                                (section.basePrice * section.margin) /
                                100
                              ).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Markup ({section.markup}%):</span>
                            <span>
                              +$
                              {(
                                (section.basePrice *
                                  (1 + section.margin / 100) *
                                  section.markup) /
                                100
                              ).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Risk Factor:</span>
                            <span>
                              +$
                              {(section.basePrice * section.riskFactor).toFixed(
                                2,
                              )}
                            </span>
                          </div>
                          {section.adjustments.length > 0 && (
                            <div className="flex justify-between">
                              <span>Adjustments:</span>
                              <span>
                                $
                                {section.adjustments
                                  .reduce(
                                    (sum, adj) =>
                                      sum +
                                      (adj.percentage > 0
                                        ? (section.basePrice * adj.percentage) /
                                          100
                                        : adj.amount),
                                    0,
                                  )
                                  .toFixed(2)}
                              </span>
                            </div>
                          )}
                          <Separator />
                          <div className="flex justify-between font-bold text-primary-700">
                            <span>Final Price:</span>
                            <span>${section.finalPrice.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {pricingSections.length === 0 && (
        <Card className="border-dashed border-2 border-gray-300">
          <CardContent className="py-8 text-center">
            <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="font-medium text-text-primary mb-2">
              No Pricing Sections
            </h3>
            <p className="text-text-secondary mb-4">
              Pricing sections will be automatically created based on your
              measurements and services
            </p>
            <div className="text-sm text-text-tertiary">
              Complete measurements to see pricing options
            </div>
          </CardContent>
        </Card>
      )}

      {/* Total Summary */}
      <Card className="bg-gradient-to-r from-primary-50 to-blue-50">
        <CardContent className="py-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-primary-700">Project Total</h3>
              <Badge
                variant="secondary"
                className="bg-primary-100 text-primary-700"
              >
                {pricingStrategy} Strategy
              </Badge>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-medium">
                  ${totalPricing.subtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Tax ({((data?.taxRate || 0.1) * 100).toFixed(1)}%):</span>
                <span className="font-medium">
                  ${totalPricing.tax.toFixed(2)}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold text-primary-700">
                <span>Total:</span>
                <span>${totalPricing.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-3 gap-4 pt-2">
              <div className="text-center">
                <div className="text-lg font-bold text-primary-600">
                  {totalPricing.averageMargin.toFixed(1)}%
                </div>
                <div className="text-xs text-text-secondary">Avg Margin</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-primary-600">
                  {pricingSections.length}
                </div>
                <div className="text-xs text-text-secondary">Sections</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-primary-600">
                  $
                  {(
                    totalPricing.subtotal / Math.max(1, data?.totalArea || 1)
                  ).toFixed(0)}
                </div>
                <div className="text-xs text-text-secondary">Per Sq Ft</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validation */}
      {pricingSections.length === 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-800">
                  Pricing Not Available
                </h4>
                <p className="text-sm text-amber-700 mt-1">
                  Complete your measurements and service selection to generate
                  pricing sections.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default MobilePricing;
