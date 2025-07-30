// Deep comparison utility for efficient object/array comparison
// Replaces inefficient JSON.stringify comparisons

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
 * Creates a memoized deep comparison function for use in React hooks
 * Useful for dependency arrays in useEffect, useMemo, etc.
 */
export function useDeepCompareMemoize<T>(value: T): T {
  const ref = useRef<T>(value);
  const signalRef = useRef<number>(0);

  if (!deepEqual(value, ref.current)) {
    ref.current = value;
    signalRef.current += 1;
  }

  return ref.current;
}

/**
 * Hook for deep comparison in useEffect
 */
export function useDeepCompareEffect(
  callback: React.EffectCallback,
  dependencies: React.DependencyList,
): void {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(callback, [useDeepCompareMemoize(dependencies)]);
}

/**
 * Hook for deep comparison in useMemo
 */
export function useDeepCompareMemo<T>(
  factory: () => T,
  dependencies: React.DependencyList,
): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(factory, [useDeepCompareMemoize(dependencies)]);
}

/**
 * Hook for deep comparison in useCallback
 */
export function useDeepCompareCallback<T extends (...args: any[]) => any>(
  callback: T,
  dependencies: React.DependencyList,
): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(callback, [useDeepCompareMemoize(dependencies)]);
}

// Import React hooks for the custom hooks
import { useRef, useEffect, useMemo, useCallback } from "react";
