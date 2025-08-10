/**
 * Main utility exports for EstimatePro
 *
 * This file provides convenient access to commonly used utilities.
 * For the complete set of utilities, import from specific modules in lib/utils/
 *
 * @module lib/utils
 */

// ============================================================================
// Core UI Utilities
// ============================================================================

/**
 * Class name utility for merging Tailwind CSS classes
 * @example
 * cn("px-2 py-1", "px-3") // Returns "py-1 px-3"
 * cn("text-red-500", { "text-blue-500": isActive }) // Conditional classes
 */
export { cn } from "./utils/cn";

// ============================================================================
// Formatting Utilities
// ============================================================================

export {
  // Currency formatting
  formatCurrency,
  formatCurrencyRange,
  parseCurrency,

  // Number formatting
  formatNumber,
  formatPercentage,
  safeParseNumber,

  // Date and time formatting
  formatDate,
  formatDuration,

  // Text formatting
  formatPhoneNumber,
  truncateText,
  formatBytes,
} from "./utils/format";

export {
  // Currency calculations
  calculateMarkup,
  calculateTax,
  calculateTotal,
  calculatePercentageChange,
  roundToCents,
  isValidCurrencyAmount,
} from "./utils/currency";

// ============================================================================
// Validation Utilities
// ============================================================================

export {
  // Input validation - only export what actually exists
  validateEmail,
} from "./utils/validation";

// ============================================================================
// Performance Utilities
// ============================================================================

export {
  // Debouncing
  debounce,
  throttle,
} from "./utils/debounce";

export {
  // Retry logic
  withRetry,
  withApiRetry,
  withDatabaseRetry,
  withAIRetry,
} from "./utils/retry-logic";

// ============================================================================
// Security Utilities
// ============================================================================

export {
  // Input sanitization
  sanitizeUserInput,
  sanitizeHtml,
  sanitizeText,
  sanitizeUrl,
} from "./utils/input-sanitization";

// ============================================================================
// Data Utilities
// ============================================================================

export {
  // Deep comparison
  deepEqual,
} from "./utils/deep-compare";

export {
  // Null safety
  isNotNull,
  isNull,
  safeGet,
  safeGetDeep,
  withDefault,
  assertExists,
  chain,
} from "./utils/null-safety";

// ============================================================================
// Type Guards and Assertions
// ============================================================================

/**
 * Type guard to check if a value is defined (not null or undefined)
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Type guard to check if a value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Type guard to check if a value is a valid number
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === "number" && !isNaN(value) && isFinite(value);
}

/**
 * Assert that a value is defined, throwing an error if not
 */
export function assertDefined<T>(
  value: T | null | undefined,
  message: string = "Value is required",
): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
}

// ============================================================================
// Array Utilities
// ============================================================================

/**
 * Remove duplicate values from an array
 */
export function unique<T>(array: T[]): T[] {
  return Array.from(new Set(array));
}

/**
 * Group array items by a key
 */
export function groupBy<T, K extends keyof T>(
  array: T[],
  key: K,
): Record<string, T[]> {
  return array.reduce(
    (groups, item) => {
      const groupKey = String(item[key]);
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(item);
      return groups;
    },
    {} as Record<string, T[]>,
  );
}

/**
 * Chunk an array into smaller arrays of specified size
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// ============================================================================
// Object Utilities
// ============================================================================

/**
 * Omit specified keys from an object
 */
export function omit<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[],
): Omit<T, K> {
  const result = { ...obj };
  keys.forEach((key) => delete result[key]);
  return result;
}

/**
 * Pick specified keys from an object
 */
export function pick<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[],
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  keys.forEach((key) => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
}

// ============================================================================
// Async Utilities
// ============================================================================

/**
 * Sleep for a specified number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Run async functions in parallel with a concurrency limit
 */
export async function parallelLimit<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  limit: number,
): Promise<R[]> {
  const results: R[] = [];
  const executing: Promise<void>[] = [];

  for (const item of items) {
    const promise = fn(item).then((result) => {
      results.push(result);
    });

    executing.push(promise as Promise<void>);

    if (executing.length >= limit) {
      await Promise.race(executing);
      executing.splice(
        executing.findIndex((p) => p === promise),
        1,
      );
    }
  }

  await Promise.all(executing);
  return results;
}
