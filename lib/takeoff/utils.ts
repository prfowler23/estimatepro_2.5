/**
 * Utility functions for takeoff services
 */

/**
 * Generate a secure, unique identifier
 * Uses crypto.randomUUID when available, with fallback for older environments
 */
export function generateUniqueId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback with timestamp for uniqueness and random for additional entropy
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Escape CSV cell content to prevent injection and formatting issues
 */
export function escapeCsvCell(cell: string | number): string {
  const cellStr = String(cell);

  // If cell contains comma, quote, or newline, wrap in quotes and escape quotes
  if (
    cellStr.includes(",") ||
    cellStr.includes('"') ||
    cellStr.includes("\n") ||
    cellStr.includes("\r")
  ) {
    return `"${cellStr.replace(/"/g, '""')}"`;
  }

  // Prevent formula injection
  if (cellStr.match(/^[=+\-@\t\r]/)) {
    return `'${cellStr}`;
  }

  return cellStr;
}

/**
 * Convert category name to display-friendly format
 */
export function formatCategoryName(category: string): string {
  return category.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

/**
 * Clean sheet name for Excel compatibility
 * Excel sheet names cannot exceed 31 characters and cannot contain certain characters
 */
export function cleanExcelSheetName(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/[\\\/\*\?\[\]:]/g, "")
    .substring(0, 31)
    .trim();
}

/**
 * Sanitize string input to prevent XSS and injection attacks
 */
export function sanitizeInput(input: string): string {
  if (!input) return "";

  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;")
    .replace(/\\/g, "&#x5C;")
    .replace(/`/g, "&#x60;")
    .trim();
}

/**
 * Parse numeric value safely with fallback
 */
export function parseNumber(value: any, fallback: number = 0): number {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  const parsed = Number(value);
  return isNaN(parsed) || !isFinite(parsed) ? fallback : parsed;
}

/**
 * Calculate area with proper validation
 */
export function calculateArea(
  width: number,
  height: number,
  quantity: number = 1,
): number {
  if (width < 0 || height < 0 || quantity < 0) {
    return 0;
  }

  const area = width * height * quantity;
  return isFinite(area) ? area : 0;
}

/**
 * Convert units to square feet
 */
export function convertToSquareFeet(value: number, unit: string): number {
  const lowerUnit = unit?.toLowerCase() || "sqft";

  const conversionFactors: Record<string, number> = {
    sq_m: 10.764,
    sqm: 10.764,
    m2: 10.764,
    sq_yd: 9,
    sqyd: 9,
    yd2: 9,
    sq_ft: 1,
    sqft: 1,
    ft2: 1,
  };

  const factor = conversionFactors[lowerUnit] || 1;
  const converted = value * factor;

  return isFinite(converted) ? converted : value;
}

/**
 * Group array items by a key function
 */
export function groupBy<T, K extends string | number>(
  items: T[],
  keyFn: (item: T) => K,
): Record<K, T[]> {
  return items.reduce(
    (groups, item) => {
      const key = keyFn(item);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      return groups;
    },
    {} as Record<K, T[]>,
  );
}

/**
 * Debounce function for performance optimization
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      func(...args);
      timeout = null;
    }, wait);
  };
}

/**
 * Check if two numbers are approximately equal within a tolerance
 */
export function approximatelyEqual(
  a: number,
  b: number,
  tolerance: number = 0.01,
): boolean {
  return Math.abs(a - b) <= tolerance;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
