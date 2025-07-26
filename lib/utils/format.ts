export function formatNumber(value: number | undefined | null): string {
  if (value === undefined || value === null) {
    return "0";
  }

  // Use toLocaleString for proper number formatting with commas
  return value.toLocaleString("en-US", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  });
}

export function formatCurrency(value: number | undefined | null): string {
  if (value === undefined || value === null) {
    return "$0";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercentage(value: number | undefined | null): string {
  if (value === undefined || value === null) {
    return "0%";
  }

  // If value is already in percentage form (0-100), just add %
  if (value > 1) {
    return `${Math.round(value)}%`;
  }

  // If value is in decimal form (0-1), multiply by 100
  return `${Math.round(value * 100)}%`;
}
