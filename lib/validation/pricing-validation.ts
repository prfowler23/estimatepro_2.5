/**
 * Pricing validation logic extracted from components
 */

import {
  PriceValidation,
  ApprovalLevel,
  APPROVAL_THRESHOLDS,
  MARGIN_THRESHOLDS,
} from "@/lib/types/pricing-types";

/**
 * Validate a price override with comprehensive checks
 */
export function validatePriceOverride(
  price: number,
  currentPrice: number,
  baseCost: number = 0,
  marketMedian?: number,
  competitorPrices: number[] = [],
  minPrice?: number,
  maxPrice?: number,
  customerBudget?: number,
): PriceValidation {
  const warnings: string[] = [];
  let requiresApproval = false;
  let approvalLevel: ApprovalLevel | undefined;

  // Calculate discount percentage
  const priceChange = price - currentPrice;
  const percentageChange =
    currentPrice > 0 ? (priceChange / currentPrice) * 100 : 0;
  const discountPercent = Math.abs(percentageChange);

  // Discount-based validation
  if (price < currentPrice) {
    if (discountPercent > APPROVAL_THRESHOLDS.CEO) {
      warnings.push("Extreme discount may not be profitable");
      requiresApproval = true;
      approvalLevel = "ceo";
    } else if (discountPercent > APPROVAL_THRESHOLDS.VP) {
      warnings.push("Large discount requires executive approval");
      requiresApproval = true;
      approvalLevel = "vp";
    } else if (discountPercent > APPROVAL_THRESHOLDS.DIRECTOR) {
      warnings.push("Significant discount requires director approval");
      requiresApproval = true;
      approvalLevel = "director";
    } else if (discountPercent > APPROVAL_THRESHOLDS.MANAGER) {
      warnings.push("Discount requires management approval");
      requiresApproval = true;
      approvalLevel = "manager";
    }
  }

  // Margin-based validation
  if (baseCost > 0) {
    const marginPercent = ((price - baseCost) / price) * 100;

    if (price <= baseCost) {
      warnings.push("Price is at or below cost - no profit margin");
    } else if (marginPercent < MARGIN_THRESHOLDS.CRITICAL) {
      warnings.push("Very low profit margin - high risk");
    } else if (marginPercent < MARGIN_THRESHOLDS.LOW) {
      warnings.push("Below recommended minimum margin");
    }
  }

  // Market position validation
  if (marketMedian && price < marketMedian * 0.8) {
    warnings.push("Significantly below market median");
  }

  // Competitor comparison
  if (competitorPrices.length > 0) {
    const minCompetitor = Math.min(...competitorPrices);
    if (price < minCompetitor * 0.9) {
      warnings.push("Below lowest known competitor price");
    }
  }

  // Price range validation
  if (minPrice && price < minPrice) {
    warnings.push(
      `Below minimum allowed price of $${minPrice.toLocaleString()}`,
    );
  }
  if (maxPrice && price > maxPrice) {
    warnings.push(
      `Above maximum allowed price of $${maxPrice.toLocaleString()}`,
    );
  }

  // Customer budget comparison
  if (customerBudget && price > customerBudget * 1.1) {
    warnings.push("Significantly above customer budget");
  }

  return {
    isValid: warnings.length === 0 || (warnings.length > 0 && price > baseCost),
    warnings,
    requiresApproval,
    approvalLevel,
  };
}

/**
 * Validate discount approval requirements
 */
export function validateDiscountApproval(
  basePrice: number,
  requestedPrice: number,
  projectMargin: number = 0,
): {
  isValid: boolean;
  requiresApproval: boolean;
  approvalLevel?: ApprovalLevel;
  riskLevel: "low" | "medium" | "high" | "critical";
  warnings: string[];
} {
  const discountAmount = basePrice - requestedPrice;
  const discountPercentage = (discountAmount / basePrice) * 100;
  const warnings: string[] = [];
  let approvalLevel: ApprovalLevel | undefined;
  let requiresApproval = false;
  let riskLevel: "low" | "medium" | "high" | "critical" = "low";

  // Determine approval level
  if (discountPercentage < APPROVAL_THRESHOLDS.MANAGER) {
    requiresApproval = false;
  } else if (discountPercentage < APPROVAL_THRESHOLDS.DIRECTOR) {
    requiresApproval = true;
    approvalLevel = "manager";
  } else if (discountPercentage < APPROVAL_THRESHOLDS.VP) {
    requiresApproval = true;
    approvalLevel = "director";
  } else if (discountPercentage < APPROVAL_THRESHOLDS.CEO) {
    requiresApproval = true;
    approvalLevel = "vp";
  } else {
    requiresApproval = true;
    approvalLevel = "ceo";
  }

  // Determine risk level
  if (discountPercentage < 5) {
    riskLevel = "low";
  } else if (discountPercentage < 15) {
    riskLevel = "medium";
    warnings.push("Moderate impact on profitability");
  } else if (discountPercentage < 25) {
    riskLevel = "high";
    warnings.push("Significant impact on profitability");
  } else {
    riskLevel = "critical";
    warnings.push(
      "Major impact on profitability - exceptional circumstances only",
    );
  }

  // Margin impact warnings
  if (projectMargin > 0) {
    const marginImpact = (discountAmount / projectMargin) * 100;
    if (marginImpact > 50) {
      warnings.push("Discount exceeds 50% of project margin");
    }
  }

  return {
    isValid: requestedPrice > 0 && requestedPrice <= basePrice,
    requiresApproval,
    approvalLevel,
    riskLevel,
    warnings,
  };
}

/**
 * Validate pricing strategy selection
 */
export function validateStrategySelection(
  strategy: {
    price: number;
    baseCost?: number;
    winProbability: number;
    margin?: number;
  },
  currentPrice: number,
  minAcceptableMargin: number = MARGIN_THRESHOLDS.LOW,
): {
  isValid: boolean;
  warnings: string[];
  recommendations: string[];
} {
  const warnings: string[] = [];
  const recommendations: string[] = [];
  let isValid = true;

  // Validate price
  if (strategy.price <= 0) {
    isValid = false;
    warnings.push("Price must be greater than zero");
  }

  // Validate margin
  if (strategy.baseCost && strategy.baseCost > 0) {
    const margin =
      ((strategy.price - strategy.baseCost) / strategy.price) * 100;

    if (margin < 0) {
      isValid = false;
      warnings.push("Price is below cost - negative margin");
    } else if (margin < minAcceptableMargin) {
      warnings.push(
        `Margin ${margin.toFixed(1)}% is below recommended minimum of ${minAcceptableMargin}%`,
      );
      recommendations.push("Consider increasing price or reducing costs");
    }
  }

  // Validate win probability
  if (strategy.winProbability < 0.2) {
    warnings.push("Very low win probability - high risk of losing the deal");
    recommendations.push(
      "Consider reducing price or enhancing value proposition",
    );
  } else if (strategy.winProbability < 0.5) {
    warnings.push("Below 50% win probability");
  }

  // Price change warnings
  const priceChange = ((strategy.price - currentPrice) / currentPrice) * 100;
  if (Math.abs(priceChange) > 20) {
    warnings.push(
      `Large price change of ${priceChange.toFixed(1)}% from current price`,
    );
    if (priceChange > 0) {
      recommendations.push(
        "Consider gradual price increases to test market response",
      );
    } else {
      recommendations.push("Ensure discount is justified by strategic value");
    }
  }

  return {
    isValid,
    warnings,
    recommendations,
  };
}

/**
 * Validate risk factors and their impact
 */
export function validateRiskFactors(
  riskFactors: Array<{
    impact: number;
    probability: number;
    severity: "low" | "medium" | "high" | "critical";
  }>,
  projectValue: number,
  maxAcceptableRiskScore: number = 50,
): {
  isValid: boolean;
  totalRiskScore: number;
  totalImpact: number;
  warnings: string[];
  requiresReview: boolean;
} {
  const warnings: string[] = [];
  let requiresReview = false;

  // Calculate total risk score and impact
  const totalRiskScore = riskFactors.reduce(
    (total, factor) => total + (factor.impact * factor.probability) / 100,
    0,
  );

  const totalImpact = riskFactors.reduce(
    (total, factor) => total + factor.impact,
    0,
  );

  // Validate total risk score
  if (totalRiskScore > maxAcceptableRiskScore) {
    warnings.push(
      `Total risk score ${totalRiskScore.toFixed(1)} exceeds acceptable threshold`,
    );
    requiresReview = true;
  }

  // Check for critical risks
  const criticalRisks = riskFactors.filter((f) => f.severity === "critical");
  if (criticalRisks.length > 0) {
    warnings.push(`${criticalRisks.length} critical risk(s) identified`);
    requiresReview = true;
  }

  // Check for high-probability high-impact risks
  const highRisks = riskFactors.filter(
    (f) => f.probability > 70 && f.impact > 15,
  );
  if (highRisks.length > 0) {
    warnings.push(
      `${highRisks.length} high-probability high-impact risk(s) detected`,
    );
  }

  // Validate financial impact
  const financialImpact = (projectValue * totalImpact) / 100;
  if (financialImpact > projectValue * 0.3) {
    warnings.push("Risk factors could impact more than 30% of project value");
    requiresReview = true;
  }

  return {
    isValid: totalRiskScore <= maxAcceptableRiskScore,
    totalRiskScore,
    totalImpact,
    warnings,
    requiresReview,
  };
}

/**
 * Validate win probability calculation inputs
 */
export function validateWinProbabilityInputs(
  pricePoints: Array<{ price: number; probability: number }>,
  currentPrice: number,
  optimalPrice: number,
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  let isValid = true;

  // Validate price points
  if (pricePoints.length < 2) {
    errors.push("At least 2 price points required for probability calculation");
    isValid = false;
  }

  // Check for invalid values
  pricePoints.forEach((point, index) => {
    if (point.price <= 0) {
      errors.push(`Price point ${index + 1} has invalid price`);
      isValid = false;
    }
    if (point.probability < 0 || point.probability > 1) {
      errors.push(`Price point ${index + 1} has invalid probability`);
      isValid = false;
    }
  });

  // Validate current and optimal prices
  if (currentPrice <= 0) {
    errors.push("Current price must be greater than zero");
    isValid = false;
  }
  if (optimalPrice <= 0) {
    errors.push("Optimal price must be greater than zero");
    isValid = false;
  }

  // Check for logical consistency
  if (pricePoints.length > 1) {
    const sortedPoints = [...pricePoints].sort((a, b) => a.price - b.price);

    // Generally, probability should decrease as price increases
    let inversionCount = 0;
    for (let i = 0; i < sortedPoints.length - 1; i++) {
      if (sortedPoints[i].probability < sortedPoints[i + 1].probability) {
        inversionCount++;
      }
    }

    if (inversionCount > sortedPoints.length * 0.3) {
      warnings.push("Price-probability relationship appears inverted");
    }
  }

  // Check if current price is within reasonable range
  const prices = pricePoints.map((p) => p.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  if (currentPrice < minPrice * 0.5 || currentPrice > maxPrice * 2) {
    warnings.push(
      "Current price is significantly outside the range of price points",
    );
  }

  return {
    isValid,
    errors,
    warnings,
  };
}
