/**
 * Utility functions for pricing components
 */

import {
  PricePoint,
  PriceSensitivityLevel,
  RiskFactor,
  RiskLevel,
  RiskAssessment,
  CalculationResult,
  PriceImpact,
  PricingMetrics,
  MarketPosition,
  PricingRecommendation,
  APPROVAL_THRESHOLDS,
  RISK_THRESHOLDS,
  MARGIN_THRESHOLDS,
  SENSITIVITY_THRESHOLDS,
  ApprovalLevel,
} from "@/lib/types/pricing-types";

// ==================== Probability Calculations ====================

/**
 * Generate a smooth probability curve from price points
 */
export function generateProbabilityCurve(
  pricePoints: PricePoint[],
  steps: number = 100,
): Array<{ price: number; probability: number }> {
  if (pricePoints.length === 0) return [];

  const sortedPoints = [...pricePoints].sort((a, b) => a.price - b.price);
  const minPrice = sortedPoints[0].price * 0.7;
  const maxPrice = sortedPoints[sortedPoints.length - 1].price * 1.3;

  const result = [];

  for (let i = 0; i <= steps; i++) {
    const price = minPrice + (maxPrice - minPrice) * (i / steps);
    const probability = calculateProbabilityAtPrice(price, sortedPoints);
    result.push({ price: Math.round(price), probability });
  }

  return result;
}

/**
 * Calculate win probability at a specific price point
 */
export function calculateProbabilityAtPrice(
  price: number,
  pricePoints: PricePoint[],
): number {
  if (pricePoints.length === 0) return 0.5;

  const sortedPoints = [...pricePoints].sort((a, b) => a.price - b.price);

  // If price is outside range, extrapolate
  if (price <= sortedPoints[0].price) {
    return sortedPoints[0].probability;
  }
  if (price >= sortedPoints[sortedPoints.length - 1].price) {
    return sortedPoints[sortedPoints.length - 1].probability;
  }

  // Find surrounding points and interpolate
  for (let i = 0; i < sortedPoints.length - 1; i++) {
    const lower = sortedPoints[i];
    const upper = sortedPoints[i + 1];

    if (price >= lower.price && price <= upper.price) {
      // Linear interpolation
      const ratio = (price - lower.price) / (upper.price - lower.price);
      return (
        lower.probability + (upper.probability - lower.probability) * ratio
      );
    }
  }

  return 0.5; // Fallback
}

/**
 * Calculate price sensitivity from price points
 */
export function calculatePriceSensitivity(pricePoints: PricePoint[]): number {
  if (pricePoints.length < 2) return 0.5;

  const sortedPoints = [...pricePoints].sort((a, b) => a.price - b.price);
  let totalSensitivity = 0;
  let count = 0;

  for (let i = 0; i < sortedPoints.length - 1; i++) {
    const priceDiff = sortedPoints[i + 1].price - sortedPoints[i].price;
    const probDiff = Math.abs(
      sortedPoints[i + 1].probability - sortedPoints[i].probability,
    );

    if (priceDiff > 0) {
      // Calculate percentage change in probability per percentage change in price
      const priceChange = priceDiff / sortedPoints[i].price;
      const sensitivity = probDiff / priceChange;
      totalSensitivity += sensitivity;
      count++;
    }
  }

  return count > 0 ? totalSensitivity / count : 0.5;
}

/**
 * Get price sensitivity level description
 */
export function getPriceSensitivityLevel(
  sensitivity: number,
): PriceSensitivityLevel {
  if (sensitivity < SENSITIVITY_THRESHOLDS.LOW) {
    return {
      level: "low",
      description:
        "Customer is less sensitive to price changes - focus on value",
      color: "text-green-600",
    };
  } else if (sensitivity < SENSITIVITY_THRESHOLDS.MEDIUM) {
    return {
      level: "medium",
      description: "Moderate price sensitivity - balance price and value",
      color: "text-yellow-600",
    };
  } else {
    return {
      level: "high",
      description:
        "High price sensitivity - small changes significantly impact win rate",
      color: "text-red-600",
    };
  }
}

// ==================== Risk Calculations ====================

/**
 * Calculate risk score from impact and probability
 */
export function calculateRiskScore(
  impact: number,
  probability: number,
): number {
  return (impact * probability) / 100;
}

/**
 * Calculate total risk score from risk factors
 */
export function getTotalRiskScore(riskFactors: RiskFactor[]): number {
  return riskFactors.reduce(
    (total, factor) =>
      total + calculateRiskScore(factor.impact, factor.probability),
    0,
  );
}

/**
 * Get highest risk factors
 */
export function getHighestRisks(
  riskFactors: RiskFactor[],
  count: number = 3,
): RiskFactor[] {
  return [...riskFactors]
    .sort(
      (a, b) =>
        calculateRiskScore(b.impact, b.probability) -
        calculateRiskScore(a.impact, a.probability),
    )
    .slice(0, count);
}

/**
 * Group risks by category
 */
export function groupRisksByCategory(
  riskFactors: RiskFactor[],
): Record<string, RiskFactor[]> {
  return riskFactors.reduce(
    (groups, factor) => {
      const category = factor.category;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(factor);
      return groups;
    },
    {} as Record<string, RiskFactor[]>,
  );
}

/**
 * Get risk level assessment
 */
export function getRiskLevel(totalScore: number): RiskAssessment {
  if (totalScore < RISK_THRESHOLDS.LOW) {
    return {
      level: "Low",
      color: "text-green-600 bg-green-50",
      description: "Minimal impact on project execution and pricing",
    };
  }
  if (totalScore < RISK_THRESHOLDS.MEDIUM) {
    return {
      level: "Medium",
      color: "text-yellow-600 bg-yellow-50",
      description: "Moderate risks that require active management",
    };
  }
  if (totalScore < RISK_THRESHOLDS.HIGH) {
    return {
      level: "High",
      color: "text-orange-600 bg-orange-50",
      description:
        "Significant risks requiring careful planning and contingencies",
    };
  }
  return {
    level: "Critical",
    color: "text-red-600 bg-red-50",
    description:
      "Major risks that may require project restructuring or decline",
  };
}

/**
 * Determine risk level from win probability
 */
export function getRiskLevelFromProbability(probability: number): RiskLevel {
  if (probability > 0.7) return "low";
  if (probability > 0.4) return "medium";
  if (probability > 0.2) return "high";
  return "critical";
}

/**
 * Determine risk level from risk score
 */
export function getRiskLevelFromScore(score: number): RiskLevel {
  if (score < RISK_THRESHOLDS.LOW) return "low";
  if (score < RISK_THRESHOLDS.MEDIUM) return "medium";
  if (score < RISK_THRESHOLDS.HIGH) return "high";
  return "critical";
}

// ==================== Pricing Calculations ====================

/**
 * Calculate discount percentage
 */
export function calculateDiscountPercentage(
  originalPrice: number,
  finalPrice: number,
): number {
  if (originalPrice === 0) return 0;
  return ((originalPrice - finalPrice) / originalPrice) * 100;
}

/**
 * Calculate profit margin
 */
export function calculateMargin(price: number, cost: number): number {
  if (price === 0) return 0;
  return ((price - cost) / price) * 100;
}

/**
 * Calculate expected value
 */
export function calculateExpectedValue(
  price: number,
  probability: number,
): number {
  return price * probability;
}

/**
 * Calculate price impact
 */
export function calculatePriceImpact(
  currentPrice: number,
  newPrice: number,
  baseCost: number = 0,
): PriceImpact {
  const amount = newPrice - currentPrice;
  const percentage = currentPrice > 0 ? (amount / currentPrice) * 100 : 0;
  const marginImpact = baseCost > 0 ? calculateMargin(newPrice, baseCost) : 0;

  return {
    amount,
    percentage,
    marginImpact,
  };
}

/**
 * Calculate comprehensive pricing metrics
 */
export function calculatePricingMetrics(
  basePrice: number,
  finalPrice: number,
  baseCost: number,
  winProbability: number,
  riskScore: number,
): PricingMetrics {
  const discount = basePrice - finalPrice;
  const discountPercentage = calculateDiscountPercentage(basePrice, finalPrice);
  const margin = finalPrice - baseCost;
  const marginPercentage = calculateMargin(finalPrice, baseCost);
  const expectedValue = calculateExpectedValue(finalPrice, winProbability);

  return {
    basePrice,
    finalPrice,
    discount,
    discountPercentage,
    margin,
    marginPercentage,
    expectedValue,
    winProbability,
    riskScore,
  };
}

// ==================== Market Analysis ====================

/**
 * Calculate market position
 */
export function calculateMarketPosition(
  price: number,
  marketMedian: number,
  competitorPrices: number[],
): MarketPosition {
  const vsMarketMedian = marketMedian ? (price / marketMedian - 1) * 100 : 0;

  let vsCompetitorMin = 0;
  let vsCompetitorMax = 0;
  let vsCompetitorAvg = 0;
  let marketPercentile = 50;

  if (competitorPrices.length > 0) {
    const minCompetitor = Math.min(...competitorPrices);
    const maxCompetitor = Math.max(...competitorPrices);
    const avgCompetitor =
      competitorPrices.reduce((sum, p) => sum + p, 0) / competitorPrices.length;

    vsCompetitorMin = (price / minCompetitor - 1) * 100;
    vsCompetitorMax = (price / maxCompetitor - 1) * 100;
    vsCompetitorAvg = (price / avgCompetitor - 1) * 100;

    // Calculate market percentile
    const belowPrice = competitorPrices.filter((p) => p < price).length;
    marketPercentile = (belowPrice / competitorPrices.length) * 100;
  }

  return {
    vsMarketMedian,
    vsCompetitorMin,
    vsCompetitorMax,
    vsCompetitorAvg,
    marketPercentile,
  };
}

/**
 * Get pricing recommendation based on analysis
 */
export function getPricingRecommendation(
  currentPrice: number,
  optimalPrice: number,
  tolerance: number = 0.05,
): PricingRecommendation {
  const difference = currentPrice - optimalPrice;
  const percentDiff = Math.abs(difference / optimalPrice);

  if (currentPrice < optimalPrice * (1 - tolerance)) {
    return {
      type: "increase",
      message:
        "Consider increasing price - you may be leaving money on the table",
      suggestedPrice: optimalPrice,
      confidence: 0.8,
    };
  } else if (currentPrice > optimalPrice * (1 + tolerance)) {
    return {
      type: "decrease",
      message: "Consider reducing price to improve win probability",
      suggestedPrice: optimalPrice,
      confidence: 0.75,
    };
  } else {
    return {
      type: "optimal",
      message: "Price is well-optimized for expected value",
      confidence: 0.9,
    };
  }
}

// ==================== Approval Logic ====================

/**
 * Determine required approval level based on discount
 */
export function getRequiredApprovalLevel(
  discountPercentage: number,
): ApprovalLevel | null {
  const absDiscount = Math.abs(discountPercentage);

  if (absDiscount < APPROVAL_THRESHOLDS.MANAGER) {
    return null; // No approval required
  } else if (absDiscount < APPROVAL_THRESHOLDS.DIRECTOR) {
    return "manager";
  } else if (absDiscount < APPROVAL_THRESHOLDS.VP) {
    return "director";
  } else if (absDiscount < APPROVAL_THRESHOLDS.CEO) {
    return "vp";
  } else {
    return "ceo";
  }
}

/**
 * Check if margin is acceptable
 */
export function isMarginAcceptable(margin: number): {
  acceptable: boolean;
  level: "critical" | "low" | "acceptable" | "good";
  message: string;
} {
  if (margin < MARGIN_THRESHOLDS.CRITICAL) {
    return {
      acceptable: false,
      level: "critical",
      message: "Margin below critical threshold - high risk",
    };
  } else if (margin < MARGIN_THRESHOLDS.LOW) {
    return {
      acceptable: false,
      level: "low",
      message: "Low margin - requires approval",
    };
  } else if (margin < MARGIN_THRESHOLDS.ACCEPTABLE) {
    return {
      acceptable: true,
      level: "acceptable",
      message: "Acceptable margin",
    };
  } else {
    return {
      acceptable: true,
      level: "good",
      message: "Good margin - healthy profitability",
    };
  }
}

// ==================== Formatting Utilities ====================

/**
 * Format currency value
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format percentage value
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format large numbers with abbreviations
 */
export function formatLargeNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
}

// ==================== Color Utilities ====================

/**
 * Get color class based on value and thresholds
 */
export function getColorByValue(
  value: number,
  thresholds: { low: number; medium: number; high: number },
  inverse: boolean = false,
): string {
  const colors = {
    good: "text-green-600 bg-green-50",
    warning: "text-yellow-600 bg-yellow-50",
    danger: "text-orange-600 bg-orange-50",
    critical: "text-red-600 bg-red-50",
  };

  if (inverse) {
    if (value < thresholds.low) return colors.good;
    if (value < thresholds.medium) return colors.warning;
    if (value < thresholds.high) return colors.danger;
    return colors.critical;
  } else {
    if (value > thresholds.high) return colors.good;
    if (value > thresholds.medium) return colors.warning;
    if (value > thresholds.low) return colors.danger;
    return colors.critical;
  }
}

/**
 * Get trend color based on change
 */
export function getTrendColor(change: number): string {
  if (change > 0) return "text-green-600 bg-green-50";
  if (change < 0) return "text-red-600 bg-red-50";
  return "text-gray-600 bg-gray-50";
}
