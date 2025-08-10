"use client";

// Deep comparison React hooks for client components
// These hooks use the pure deepEqual function from lib/utils

import { useRef, useEffect, useMemo, useCallback } from "react";
import { deepEqual } from "@/lib/utils";

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
