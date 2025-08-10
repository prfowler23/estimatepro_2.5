/**
 * Null safety utilities for TypeScript
 * Provides comprehensive type-safe utilities for handling null/undefined values
 */

// Enhanced type guards with better type inference
export function isNotNull<T>(
  value: T | null | undefined,
): value is NonNullable<T> {
  return value !== null && value !== undefined;
}

/**
 * Type guard that specifically checks for null values only
 */
export function isNotUndefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

/**
 * Type guard that specifically checks for undefined values only
 */
export function isNotNullish<T>(value: T | null | undefined): value is T {
  return value != null; // Handles both null and undefined
}

export function isNullish<T>(
  value: T | null | undefined,
): value is null | undefined {
  return value == null; // Handles both null and undefined
}

export function isNull<T>(value: T | null): value is null {
  return value === null;
}

export function isUndefined<T>(value: T | undefined): value is undefined {
  return value === undefined;
}

export function isString(value: unknown): value is string {
  return typeof value === "string";
}

export function isNumber(value: unknown): value is number {
  return typeof value === "number" && !isNaN(value);
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

export function isArrayOf<T>(
  value: unknown,
  itemGuard: (item: unknown) => item is T,
): value is T[] {
  return Array.isArray(value) && value.every(itemGuard);
}

export function isNonEmptyArray(
  value: unknown,
): value is [unknown, ...unknown[]] {
  return Array.isArray(value) && value.length > 0;
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.prototype.toString.call(value) === "[object Object]"
  );
}

export function hasProperty<K extends PropertyKey>(
  obj: object,
  prop: K,
): obj is Record<K, unknown> {
  return prop in obj;
}

export function isFunction(value: unknown): value is Function {
  return typeof value === "function";
}

// Enhanced safe property access with better type safety
export function safeGet<T, K extends keyof T>(
  obj: T | null | undefined,
  key: K,
): T[K] | undefined {
  return obj?.[key];
}

export function safeGetNested<T>(
  obj: unknown,
  ...keys: PropertyKey[]
): T | undefined {
  let current = obj;

  for (const key of keys) {
    if (!isObject(current) && !Array.isArray(current)) {
      return undefined;
    }
    current = (current as any)[key];
  }

  return current as T | undefined;
}

export function safeGetDeep<T = unknown>(
  obj: unknown,
  path: string,
): T | undefined {
  if (!isObject(obj) && !Array.isArray(obj)) return undefined;

  const keys = path.split(".");
  let current: unknown = obj;

  for (const key of keys) {
    if (!isObject(current) && !Array.isArray(current)) {
      return undefined;
    }
    current = (current as any)[key];
  }

  return current as T | undefined;
}

// Safe array operations
export function safeMap<T, U>(
  array: readonly T[] | null | undefined,
  mapper: (item: T, index: number, array: readonly T[]) => U,
): U[] {
  if (!isArray(array)) return [];
  return array.map(mapper);
}

export function safeFilter<T>(
  array: readonly T[] | null | undefined,
  predicate: (item: T, index: number, array: readonly T[]) => boolean,
): T[] {
  if (!isArray(array)) return [];
  return array.filter(predicate);
}

export function safeFilterNonNullish<T>(
  array: readonly (T | null | undefined)[] | null | undefined,
): T[] {
  if (!isArray(array)) return [];
  return array.filter(isNotNull);
}

export function safeFind<T>(
  array: readonly T[] | null | undefined,
  predicate: (item: T, index: number, array: readonly T[]) => boolean,
): T | undefined {
  if (!isArray(array)) return undefined;
  return array.find(predicate);
}

export function safeLength(
  array: ArrayLike<unknown> | null | undefined,
): number {
  if (!array || typeof array.length !== "number") return 0;
  return array.length;
}

// Safe string operations
export function safeString(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

export function safeTrim(value: string | null | undefined): string {
  return (value || "").trim();
}

export function safeToLowerCase(value: string | null | undefined): string {
  return (value || "").toLowerCase();
}

export function safeToUpperCase(value: string | null | undefined): string {
  return (value || "").toUpperCase();
}

export function safeSubstring(
  value: string | null | undefined,
  start: number,
  end?: number,
): string {
  if (!value) return "";
  return value.substring(start, end);
}

export function safeIncludes(
  value: string | null | undefined,
  searchString: string,
): boolean {
  if (!value) return false;
  return value.includes(searchString);
}

// Safe number operations
export function safeNumber(value: unknown): number {
  if (typeof value === "number" && !isNaN(value)) return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export function safeInteger(value: unknown): number {
  if (typeof value === "number" && !isNaN(value)) return Math.floor(value);
  if (typeof value === "string") {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export function safeAdd(
  a: number | null | undefined,
  b: number | null | undefined,
): number {
  return safeNumber(a) + safeNumber(b);
}

export function safeSubtract(
  a: number | null | undefined,
  b: number | null | undefined,
): number {
  return safeNumber(a) - safeNumber(b);
}

export function safeMultiply(
  a: number | null | undefined,
  b: number | null | undefined,
): number {
  return safeNumber(a) * safeNumber(b);
}

export function safeDivide(
  a: number | null | undefined,
  b: number | null | undefined,
): number {
  const divisor = safeNumber(b);
  return divisor === 0 ? 0 : safeNumber(a) / divisor;
}

// Safe date operations
export function safeDate(value: unknown): Date {
  if (value instanceof Date && !isNaN(value.getTime())) return value;
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return isNaN(date.getTime()) ? new Date() : date;
  }
  return new Date();
}

export function safeDateString(value: unknown): string {
  const date = safeDate(value);
  return date.toISOString();
}

export function safeFormatDate(
  value: unknown,
  locale: string = "en-US",
): string {
  try {
    const date = safeDate(value);
    return date.toLocaleDateString(locale);
  } catch {
    return "";
  }
}

// Safe JSON operations
export function safeJSONParse<T>(
  value: string | null | undefined,
  defaultValue: T,
): T {
  if (!value) return defaultValue;

  try {
    return JSON.parse(value);
  } catch {
    return defaultValue;
  }
}

export function safeJSONStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return "{}";
  }
}

// Safe async operations
export async function safeAsync<T>(
  promise: Promise<T>,
  defaultValue: T,
): Promise<T> {
  try {
    return await promise;
  } catch {
    return defaultValue;
  }
}

export async function safeAsyncWithError<T>(
  promise: Promise<T>,
): Promise<{ success: true; data: T } | { success: false; error: Error }> {
  try {
    const data = await promise;
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

// Enhanced validation utilities with better error handling
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

export function required<T>(
  value: T | null | undefined,
  fieldName: string,
): NonNullable<T> {
  if (value == null) {
    throw new ValidationError(
      `${fieldName} is required`,
      fieldName,
      "REQUIRED",
    );
  }
  return value;
}

export function validate<T>(
  value: T | null | undefined,
  validator: (value: NonNullable<T>) => boolean,
  errorMessage: string,
  fieldName?: string,
): NonNullable<T> {
  if (value == null) {
    throw new ValidationError(errorMessage, fieldName, "NULL_VALUE");
  }
  if (!validator(value)) {
    throw new ValidationError(errorMessage, fieldName, "VALIDATION_FAILED");
  }
  return value;
}

export function validateType<T>(
  value: unknown,
  typeGuard: (val: unknown) => val is T,
  errorMessage: string,
  fieldName?: string,
): T {
  if (!typeGuard(value)) {
    throw new ValidationError(errorMessage, fieldName, "TYPE_MISMATCH");
  }
  return value;
}

// Default value utilities
export function withDefault<T>(
  value: T | null | undefined,
  defaultValue: T,
): T {
  return value ?? defaultValue;
}

export function withDefaultArray<T>(
  value: readonly T[] | null | undefined,
): T[] {
  return value ? [...value] : [];
}

export function withDefaultObject<T extends Record<string, unknown>>(
  value: T | null | undefined,
): T {
  return value ?? ({} as T);
}

export function withDefaultString(value: string | null | undefined): string {
  return value ?? "";
}

export function withDefaultNumber(value: number | null | undefined): number {
  return value ?? 0;
}

export function withDefaultBoolean(value: boolean | null | undefined): boolean {
  return value ?? false;
}

// React hook for safe state management (client-side only)
// Note: This function should only be used in client-side components
export function useSafeState<T>(
  initialValue: T | null | undefined,
  defaultValue: T,
): [T, (value: T | null | undefined) => void] {
  // Dynamic import to avoid server-side issues
  if (typeof window === "undefined") {
    throw new ValidationError(
      "useSafeState can only be used in client-side components",
      "useSafeState",
      "SSR_NOT_ALLOWED",
    );
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const React = require("react");
  const [state, setState] = React.useState(
    withDefault(initialValue, defaultValue),
  );

  const setSafeState = (value: T | null | undefined) => {
    setState(withDefault(value, defaultValue));
  };

  return [state, setSafeState];
}

// Enhanced assertion utilities with better error types
export function assertExists<T>(
  value: T | null | undefined,
  message?: string,
): asserts value is NonNullable<T> {
  if (value == null) {
    throw new ValidationError(
      message || "Value must exist",
      undefined,
      "ASSERTION_FAILED",
    );
  }
}

export function assertType<T>(
  value: unknown,
  typeGuard: (value: unknown) => value is T,
  message?: string,
): asserts value is T {
  if (!typeGuard(value)) {
    throw new ValidationError(
      message || "Value must be of correct type",
      undefined,
      "TYPE_ASSERTION_FAILED",
    );
  }
}

export function assertNever(value: never, message?: string): never {
  throw new ValidationError(
    message || `Unexpected value: ${JSON.stringify(value)}`,
    undefined,
    "EXHAUSTIVENESS_CHECK_FAILED",
  );
}

// Enhanced chain safe operations with better type safety
export class SafeChain<T> {
  constructor(private value: T | null | undefined) {}

  /**
   * Create a new SafeChain instance
   */
  static of<T>(value: T | null | undefined): SafeChain<T> {
    return new SafeChain(value);
  }

  /**
   * Transform the value if it exists, otherwise return a chain with null
   */
  map<U>(mapper: (value: NonNullable<T>) => U): SafeChain<U> {
    if (this.value == null) {
      return new SafeChain<U>(null);
    }
    try {
      return new SafeChain(mapper(this.value));
    } catch {
      return new SafeChain<U>(null);
    }
  }

  /**
   * Filter the value based on a predicate
   */
  filter(predicate: (value: NonNullable<T>) => boolean): SafeChain<T> {
    if (this.value == null) {
      return this;
    }
    try {
      return predicate(this.value) ? this : new SafeChain<T>(null);
    } catch {
      return new SafeChain<T>(null);
    }
  }

  /**
   * Get the value or null
   */
  get(): T | null {
    return this.value ?? null;
  }

  /**
   * Get the value or return a default
   */
  getOrDefault<U>(defaultValue: U): NonNullable<T> | U {
    return this.value ?? defaultValue;
  }

  /**
   * Get the value or throw an error
   */
  getOrThrow(message?: string): NonNullable<T> {
    if (this.value == null) {
      throw new ValidationError(
        message || "Value is null or undefined",
        undefined,
        "SAFE_CHAIN_NULL",
      );
    }
    return this.value;
  }

  /**
   * Execute a side effect if the value exists
   */
  tap(sideEffect: (value: NonNullable<T>) => void): SafeChain<T> {
    if (this.value != null) {
      try {
        sideEffect(this.value);
      } catch {
        // Ignore side effect errors
      }
    }
    return this;
  }

  /**
   * Flatten nested SafeChains
   */
  flatten<U>(this: SafeChain<SafeChain<U>>): SafeChain<U> {
    return this.value instanceof SafeChain
      ? this.value
      : new SafeChain<U>(null);
  }
}

/**
 * Create a new SafeChain instance
 */
export function chain<T>(value: T | null | undefined): SafeChain<T> {
  return SafeChain.of(value);
}

// Utility object for easier imports
const nullSafetyUtils = {
  // Type guards
  isNotNull,
  isNotUndefined,
  isNotNullish,
  isNullish,
  isNull,
  isUndefined,
  isString,
  isNumber,
  isBoolean,
  isArray,
  isArrayOf,
  isNonEmptyArray,
  isObject,
  isPlainObject,
  isFunction,
  hasProperty,

  // Safe accessors
  safeGet,
  safeGetNested,
  safeGetDeep,

  // Safe array operations
  safeMap,
  safeFilter,
  safeFilterNonNullish,
  safeFind,
  safeLength,

  // Safe primitive operations
  safeString,
  safeNumber,
  safeInteger,

  // Default value utilities
  withDefault,
  withDefaultArray,
  withDefaultObject,
  withDefaultString,
  withDefaultNumber,
  withDefaultBoolean,

  // Validation
  required,
  validate,
  validateType,
  assertExists,
  assertType,
  assertNever,

  // Chaining
  chain,
  SafeChain,

  // Error types
  ValidationError,
} as const;

export default nullSafetyUtils;
