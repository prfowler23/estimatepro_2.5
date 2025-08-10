import React from "react";
import { CalculatorFormProps } from "../types";

/**
 * Higher-order component that memoizes calculator forms for better performance.
 * Only re-renders when props actually change.
 */
export function withMemoization<P extends CalculatorFormProps>(
  Component: React.ComponentType<P>,
  displayName?: string,
) {
  const MemoizedComponent = React.memo(Component, (prevProps, nextProps) => {
    // Custom comparison - only re-render if these props change
    return (
      prevProps.estimateId === nextProps.estimateId &&
      prevProps.onSubmit === nextProps.onSubmit &&
      prevProps.onCancel === nextProps.onCancel
    );
  });

  MemoizedComponent.displayName =
    displayName ||
    `Memoized(${Component.displayName || Component.name || "Component"})`;

  return MemoizedComponent;
}

/**
 * Hook for memoizing expensive calculations in forms
 */
export function useFormCalculation<T>(
  calculator: () => T,
  dependencies: React.DependencyList,
): T {
  return React.useMemo(calculator, dependencies);
}

/**
 * Hook for debouncing form field changes to reduce re-renders
 */
export function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
