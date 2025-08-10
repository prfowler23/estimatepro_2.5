/**
 * Comprehensive TypeScript types for pricing components
 */

// ==================== Discount Approval Types ====================

export interface ApprovalHistory {
  id: string;
  approver: string;
  action: "approved" | "rejected" | "pending";
  timestamp: Date;
  notes?: string;
  level: ApprovalLevel;
}

export type ApprovalLevel = "manager" | "director" | "vp" | "ceo";

export type PaymentHistory = "excellent" | "good" | "fair" | "poor";

export interface CustomerHistory {
  totalProjects: number;
  avgDiscount: number;
  lifetimeValue: number;
  paymentHistory: PaymentHistory;
  lastProject: Date;
}

export interface ApprovalData {
  notes: string;
  conditions: string[];
  approver: string;
}

export interface DiscountApprovalProps {
  basePrice: number;
  requestedPrice: number;
  discountPercentage: number;
  reason: string;
  customerName?: string;
  customerHistory?: CustomerHistory;
  projectMargin?: number;
  competitorPrice?: number;
  urgency?: "low" | "medium" | "high";
  onApprove: (approvalData: ApprovalData) => void;
  onReject: (rejectionReason: string) => void;
  onRequestHigherApproval?: (level: string) => void;
}

export interface ApprovalLevelConfig {
  name: string;
  title: string;
  limit: number;
  color: string;
  icon: React.ReactNode;
}

// ==================== Win Probability Types ====================

export interface PricePoint {
  price: number;
  probability: number;
}

export interface WinProbabilityProps {
  currentPrice: number;
  winProbability: number;
  pricePoints: PricePoint[];
  optimalPrice: number;
  competitorPrices?: number[];
  marketMedian?: number;
  onPriceChange: (
    price: number,
    probability: number,
    expectedValue: number,
  ) => void;
}

export interface PriceSensitivityLevel {
  level: "low" | "medium" | "high";
  description: string;
  color: string;
}

export interface ProbabilityCurveData {
  price: number;
  probability: number;
}

// ==================== Strategy Comparison Types ====================

export interface PricingAdjustment {
  reason: string;
  percentage: number;
  amount?: number;
}

export interface PricingStrategy {
  name: string;
  price: number;
  baseCost?: number;
  adjustments: PricingAdjustment[];
  pros: string[];
  cons: string[];
  confidence: number;
  winProbability: number;
  expectedValue?: number;
  margin?: number;
  riskLevel?: RiskLevel;
  recommended?: boolean;
  description?: string;
}

export interface EnhancedPricingStrategy extends PricingStrategy {
  margin: number;
  expectedValue: number;
  riskLevel: RiskLevel;
  marketPosition: number;
}

export interface StrategyComparisonProps {
  strategies: PricingStrategy[];
  currentStrategy: PricingStrategy;
  onSelectStrategy: (strategy: PricingStrategy) => void;
  baseCost?: number;
  marketBenchmark?: number;
}

export type SortBy = "price" | "winProbability" | "expectedValue";

// ==================== Risk Factor Types ====================

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type RiskCategory =
  | "weather"
  | "access"
  | "complexity"
  | "client"
  | "timeline"
  | "safety"
  | "regulatory";

export interface RiskFactor {
  id: string;
  category: RiskCategory;
  title: string;
  description: string;
  impact: number; // Percentage impact on price
  probability: number; // 0-100 probability of occurrence
  severity: RiskLevel;
  mitigation: string;
  factors?: string[];
  costImpact?: number; // Dollar amount
  timeImpact?: number; // Days
  insuranceRequired?: boolean;
  contractClauses?: string[];
}

export interface RiskFactorProps {
  riskFactors: RiskFactor[];
  totalImpact: number;
  projectValue: number;
  onMitigationUpdate?: (riskId: string, mitigation: string) => void;
}

export interface RiskAssessment {
  level: string;
  color: string;
  description: string;
}

// ==================== Manual Price Override Types ====================

export interface PriceValidation {
  isValid: boolean;
  warnings: string[];
  requiresApproval: boolean;
  approvalLevel?: ApprovalLevel;
}

export interface PriceOverrideData {
  price: number;
  reason: string;
  category: string;
  impact: PriceImpact;
  validation: PriceValidation;
}

export interface PriceImpact {
  amount: number;
  percentage: number;
  marginImpact: number;
}

export interface ManualPriceOverrideProps {
  currentPrice: number;
  baseCost?: number;
  marketMedian?: number;
  competitorPrices?: number[];
  minPrice?: number;
  maxPrice?: number;
  customerBudget?: number;
  onOverride: (overrideData: PriceOverrideData) => void;
  onCancel?: () => void;
}

export interface ReasonCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  reasons: string[];
  color: string;
}

// ==================== Common Types ====================

export interface PricingMetrics {
  basePrice: number;
  finalPrice: number;
  discount: number;
  discountPercentage: number;
  margin: number;
  marginPercentage: number;
  expectedValue: number;
  winProbability: number;
  riskScore: number;
}

export interface MarketPosition {
  vsMarketMedian: number;
  vsCompetitorMin: number;
  vsCompetitorMax: number;
  vsCompetitorAvg: number;
  marketPercentile: number;
}

export interface PricingRecommendation {
  type: "increase" | "decrease" | "optimal";
  message: string;
  suggestedPrice?: number;
  expectedImpact?: PriceImpact;
  confidence: number;
}

// ==================== Utility Types ====================

export type PricingTab = "overview" | "analysis" | "comparison" | "approval";

export interface TabConfig {
  value: PricingTab;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface ChartConfig {
  width?: number;
  height?: number;
  showGrid?: boolean;
  showTooltip?: boolean;
  showLegend?: boolean;
  colors?: {
    primary?: string;
    secondary?: string;
    success?: string;
    warning?: string;
    danger?: string;
  };
}

// ==================== Event Handler Types ====================

export type PriceChangeHandler = (
  price: number,
  source: "slider" | "input" | "preset",
) => void;

export type StrategySelectHandler = (
  strategy: PricingStrategy,
  reason?: string,
) => void;

export type RiskUpdateHandler = (
  riskId: string,
  updates: Partial<RiskFactor>,
) => void;

export type ApprovalHandler = (
  decision: "approve" | "reject" | "escalate",
  data: ApprovalData | string,
) => void;

// ==================== Calculation Types ====================

export interface CalculationResult<T = number> {
  value: T;
  confidence: number;
  methodology: string;
  factors: Record<string, number>;
  warnings?: string[];
}

export interface PricingCalculation {
  calculateDiscount: (original: number, final: number) => CalculationResult;
  calculateMargin: (price: number, cost: number) => CalculationResult;
  calculateWinProbability: (
    price: number,
    pricePoints: PricePoint[],
  ) => CalculationResult;
  calculateExpectedValue: (
    price: number,
    probability: number,
  ) => CalculationResult;
  calculateRiskScore: (
    impact: number,
    probability: number,
  ) => CalculationResult;
}

// ==================== Constants ====================

export const APPROVAL_THRESHOLDS = {
  MANAGER: 10,
  DIRECTOR: 20,
  VP: 30,
  CEO: 100,
} as const;

export const RISK_THRESHOLDS = {
  LOW: 10,
  MEDIUM: 25,
  HIGH: 50,
} as const;

export const MARGIN_THRESHOLDS = {
  CRITICAL: 10,
  LOW: 20,
  ACCEPTABLE: 30,
  GOOD: 40,
} as const;

export const SENSITIVITY_THRESHOLDS = {
  LOW: 0.3,
  MEDIUM: 0.7,
} as const;
