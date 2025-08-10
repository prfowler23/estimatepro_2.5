/**
 * Currency Formatting Utilities
 * Centralized currency formatting and number handling for the pricing system
 */

/**
 * Format a number as USD currency
 */
export function formatCurrency(
  amount: number,
  options: {
    decimals?: number;
    showCents?: boolean;
    compact?: boolean;
  } = {},
): string {
  const { decimals = 0, showCents = false, compact = false } = options;

  if (compact && amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (compact && amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}K`;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: showCents ? 2 : decimals,
    maximumFractionDigits: showCents ? 2 : decimals,
  }).format(amount);
}

/**
 * Parse a currency string to number
 */
export function parseCurrency(value: string): number {
  // Remove currency symbols and commas
  const cleaned = value.replace(/[$,]/g, "").trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Format a percentage
 */
export function formatPercentage(
  value: number,
  options: {
    decimals?: number;
    showSign?: boolean;
  } = {},
): string {
  const { decimals = 1, showSign = false } = options;
  const sign = showSign && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
}

/**
 * Calculate percentage change between two values
 */
export function calculatePercentageChange(
  oldValue: number,
  newValue: number,
): number {
  if (oldValue === 0) return newValue > 0 ? 100 : 0;
  return ((newValue - oldValue) / Math.abs(oldValue)) * 100;
}

/**
 * Round to nearest currency value (cents)
 */
export function roundToCents(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Calculate markup amount
 */
export function calculateMarkup(
  baseAmount: number,
  markupPercentage: number,
): number {
  return roundToCents(baseAmount * (markupPercentage / 100));
}

/**
 * Calculate tax amount
 */
export function calculateTax(
  amount: number,
  taxRate: number,
  includeTax: boolean = true,
): number {
  if (!includeTax) return 0;
  return roundToCents(amount * (taxRate / 100));
}

/**
 * Format large numbers with abbreviations
 */
export function formatNumber(
  value: number,
  options: {
    decimals?: number;
    compact?: boolean;
  } = {},
): string {
  const { decimals = 1, compact = false } = options;

  if (compact) {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(decimals)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(decimals)}K`;
    }
  }

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Safely parse a number from various input types
 */
export function safeParseNumber(
  value: string | number | null | undefined,
  defaultValue: number = 0,
): number {
  if (value === null || value === undefined) return defaultValue;
  if (typeof value === "number") return isNaN(value) ? defaultValue : value;

  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Calculate total with adjustments
 */
export function calculateTotal(
  baseAmount: number,
  adjustments: Array<{
    value: number;
    isPercentage: boolean;
    type: "add" | "subtract";
  }>,
): number {
  let total = baseAmount;

  for (const adjustment of adjustments) {
    const adjustmentAmount = adjustment.isPercentage
      ? baseAmount * (adjustment.value / 100)
      : adjustment.value;

    total =
      adjustment.type === "add"
        ? total + adjustmentAmount
        : total - adjustmentAmount;
  }

  return roundToCents(total);
}

/**
 * Format currency range
 */
export function formatCurrencyRange(
  min: number,
  max: number,
  options?: Parameters<typeof formatCurrency>[1],
): string {
  if (min === max) {
    return formatCurrency(min, options);
  }
  return `${formatCurrency(min, options)} - ${formatCurrency(max, options)}`;
}

/**
 * Validate if a value is a valid currency amount
 */
export function isValidCurrencyAmount(value: unknown): value is number {
  return (
    typeof value === "number" && !isNaN(value) && isFinite(value) && value >= 0
  );
}
