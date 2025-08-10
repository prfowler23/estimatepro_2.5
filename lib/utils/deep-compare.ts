"use client";

// Deep comparison utility for efficient object/array comparison
// Replaces inefficient JSON.stringify comparisons

import { useMemo, useRef } from "react";

/**
 * Performs deep equality comparison between two values
 * More efficient than JSON.stringify for comparison
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;

  if (a === null || b === null) return false;
  if (a === undefined || b === undefined) return false;

  const typeA = typeof a;
  const typeB = typeof b;

  if (typeA !== typeB) return false;

  // Handle primitive types
  if (typeA !== "object") return a === b;

  // Handle dates
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  // Handle arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  // Only one is array
  if (Array.isArray(a) || Array.isArray(b)) return false;

  // Handle objects
  const objA = a as Record<string, unknown>;
  const objB = b as Record<string, unknown>;

  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(objA[key], objB[key])) return false;
  }

  return true;
}

/**
 * React hook that memoizes a value using deep comparison
 * More efficient than useMemo with dependency arrays for complex objects
 */
export function useDeepCompareMemo<T>(
  factory: () => T,
  dependencies: readonly unknown[],
): T {
  const prevDepsRef = useRef<readonly unknown[]>([]);
  const memoizedValueRef = useRef<T>();

  const dependenciesChanged = !deepEqual(prevDepsRef.current, dependencies);

  return useMemo(() => {
    if (dependenciesChanged || memoizedValueRef.current === undefined) {
      prevDepsRef.current = dependencies;
      memoizedValueRef.current = factory();
    }
    return memoizedValueRef.current as T;
  }, [dependenciesChanged, factory, dependencies]);
}
