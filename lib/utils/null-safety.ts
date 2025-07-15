// Null safety utilities for TypeScript

// Type guards
export function isNotNull<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

export function isNull<T>(value: T | null | undefined): value is null | undefined {
  return value === null || value === undefined;
}

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

export function isArray<T>(value: unknown): value is T[] {
  return Array.isArray(value);
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function isFunction(value: unknown): value is Function {
  return typeof value === 'function';
}

// Safe property access
export function safeGet<T, K extends keyof T>(obj: T | null | undefined, key: K): T[K] | undefined {
  return obj?.[key];
}

export function safeGetDeep<T>(obj: T | null | undefined, path: string): unknown {
  if (!obj || typeof obj !== 'object') return undefined;
  
  const keys = path.split('.');
  let current: any = obj;
  
  for (const key of keys) {
    if (current === null || current === undefined) return undefined;
    current = current[key];
  }
  
  return current;
}

// Safe array operations
export function safeMap<T, U>(
  array: T[] | null | undefined,
  mapper: (item: T, index: number) => U
): U[] {
  if (!array || !Array.isArray(array)) return [];
  return array.map(mapper);
}

export function safeFilter<T>(
  array: T[] | null | undefined,
  predicate: (item: T, index: number) => boolean
): T[] {
  if (!array || !Array.isArray(array)) return [];
  return array.filter(predicate);
}

export function safeFind<T>(
  array: T[] | null | undefined,
  predicate: (item: T, index: number) => boolean
): T | undefined {
  if (!array || !Array.isArray(array)) return undefined;
  return array.find(predicate);
}

export function safeLength(array: unknown[] | null | undefined): number {
  if (!array || !Array.isArray(array)) return 0;
  return array.length;
}

// Safe string operations
export function safeString(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

export function safeTrim(value: string | null | undefined): string {
  return (value || '').trim();
}

export function safeToLowerCase(value: string | null | undefined): string {
  return (value || '').toLowerCase();
}

export function safeToUpperCase(value: string | null | undefined): string {
  return (value || '').toUpperCase();
}

export function safeSubstring(
  value: string | null | undefined,
  start: number,
  end?: number
): string {
  if (!value) return '';
  return value.substring(start, end);
}

export function safeIncludes(
  value: string | null | undefined,
  searchString: string
): boolean {
  if (!value) return false;
  return value.includes(searchString);
}

// Safe number operations
export function safeNumber(value: unknown): number {
  if (typeof value === 'number' && !isNaN(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export function safeInteger(value: unknown): number {
  if (typeof value === 'number' && !isNaN(value)) return Math.floor(value);
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export function safeAdd(a: number | null | undefined, b: number | null | undefined): number {
  return safeNumber(a) + safeNumber(b);
}

export function safeSubtract(a: number | null | undefined, b: number | null | undefined): number {
  return safeNumber(a) - safeNumber(b);
}

export function safeMultiply(a: number | null | undefined, b: number | null | undefined): number {
  return safeNumber(a) * safeNumber(b);
}

export function safeDivide(a: number | null | undefined, b: number | null | undefined): number {
  const divisor = safeNumber(b);
  return divisor === 0 ? 0 : safeNumber(a) / divisor;
}

// Safe date operations
export function safeDate(value: unknown): Date {
  if (value instanceof Date && !isNaN(value.getTime())) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? new Date() : date;
  }
  return new Date();
}

export function safeDateString(value: unknown): string {
  const date = safeDate(value);
  return date.toISOString();
}

export function safeFormatDate(value: unknown, locale: string = 'en-US'): string {
  try {
    const date = safeDate(value);
    return date.toLocaleDateString(locale);
  } catch {
    return '';
  }
}

// Safe JSON operations
export function safeJSONParse<T>(value: string | null | undefined, defaultValue: T): T {
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
    return '{}';
  }
}

// Safe async operations
export async function safeAsync<T>(
  promise: Promise<T>,
  defaultValue: T
): Promise<T> {
  try {
    return await promise;
  } catch {
    return defaultValue;
  }
}

export async function safeAsyncWithError<T>(
  promise: Promise<T>
): Promise<{ success: true; data: T } | { success: false; error: Error }> {
  try {
    const data = await promise;
    return { success: true, data };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error : new Error(String(error)) 
    };
  }
}

// Validation utilities
export function required<T>(value: T | null | undefined, fieldName: string): T {
  if (value === null || value === undefined) {
    throw new Error(`${fieldName} is required`);
  }
  return value;
}

export function validate<T>(
  value: T | null | undefined,
  validator: (value: T) => boolean,
  errorMessage: string
): T {
  if (value === null || value === undefined) {
    throw new Error(errorMessage);
  }
  if (!validator(value)) {
    throw new Error(errorMessage);
  }
  return value;
}

// Default value utilities
export function withDefault<T>(value: T | null | undefined, defaultValue: T): T {
  return value ?? defaultValue;
}

export function withDefaultArray<T>(value: T[] | null | undefined): T[] {
  return value ?? [];
}

export function withDefaultObject<T extends Record<string, unknown>>(
  value: T | null | undefined
): T {
  return value ?? ({} as T);
}

export function withDefaultString(value: string | null | undefined): string {
  return value ?? '';
}

export function withDefaultNumber(value: number | null | undefined): number {
  return value ?? 0;
}

export function withDefaultBoolean(value: boolean | null | undefined): boolean {
  return value ?? false;
}

// React hook for safe state management
export function useSafeState<T>(
  initialValue: T | null | undefined,
  defaultValue: T
): [T, (value: T | null | undefined) => void] {
  const [state, setState] = useState<T>(initialValue ?? defaultValue);
  
  const setSafeState = (value: T | null | undefined) => {
    setState(value ?? defaultValue);
  };
  
  return [state, setSafeState];
}

// Assertion utilities
export function assertExists<T>(
  value: T | null | undefined,
  message?: string
): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message || 'Value must exist');
  }
}

export function assertType<T>(
  value: unknown,
  typeGuard: (value: unknown) => value is T,
  message?: string
): asserts value is T {
  if (!typeGuard(value)) {
    throw new Error(message || 'Value must be of correct type');
  }
}

// Chain safe operations
export class SafeChain<T> {
  constructor(private value: T | null | undefined) {}
  
  map<U>(mapper: (value: T) => U): SafeChain<U> {
    if (this.value === null || this.value === undefined) {
      return new SafeChain<U>(null);
    }
    try {
      return new SafeChain(mapper(this.value));
    } catch {
      return new SafeChain<U>(null);
    }
  }
  
  filter(predicate: (value: T) => boolean): SafeChain<T> {
    if (this.value === null || this.value === undefined) {
      return this;
    }
    try {
      return predicate(this.value) ? this : new SafeChain<T>(null);
    } catch {
      return new SafeChain<T>(null);
    }
  }
  
  get(): T | null {
    return this.value ?? null;
  }
  
  getOrDefault(defaultValue: T): T {
    return this.value ?? defaultValue;
  }
  
  getOrThrow(message?: string): T {
    if (this.value === null || this.value === undefined) {
      throw new Error(message || 'Value is null or undefined');
    }
    return this.value;
  }
}

export function chain<T>(value: T | null | undefined): SafeChain<T> {
  return new SafeChain(value);
}

// Import useState for the hook
import { useState } from 'react';

export default {
  isNotNull,
  isNull,
  safeGet,
  safeString,
  safeNumber,
  safeArray: withDefaultArray,
  safeObject: withDefaultObject,
  chain,
  required,
  validate,
  withDefault
};