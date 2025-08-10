import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Hook to debounce a value
 * @param value - The value to debounce
 * @param delay - The delay in milliseconds
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook to debounce a callback function
 * @param callback - The callback function to debounce
 * @param delay - The delay in milliseconds
 * @param deps - Dependencies array for the callback
 * @returns The debounced callback function
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: React.DependencyList = [],
): T {
  const timeoutRef = useRef<NodeJS.Timeout>();

  const debouncedCallback = useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    }) as T,
    [callback, delay, ...deps],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

/**
 * Hook for debounced search functionality
 * @param searchTerm - The search term to debounce
 * @param delay - The delay in milliseconds (default: 300ms)
 * @returns Object with debouncedSearchTerm and isSearching state
 */
export function useDebouncedSearch(searchTerm: string, delay: number = 300) {
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    setIsSearching(true);
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setIsSearching(false);
    }, delay);

    return () => {
      clearTimeout(handler);
      setIsSearching(false);
    };
  }, [searchTerm, delay]);

  return {
    debouncedSearchTerm,
    isSearching,
  };
}

/**
 * Hook for debounced form field updates
 * @param initialValue - Initial value for the field
 * @param onUpdate - Callback function called with debounced value
 * @param delay - The delay in milliseconds (default: 300ms)
 * @returns Object with value, setValue, and isUpdating state
 */
export function useDebouncedField<T>(
  initialValue: T,
  onUpdate: (value: T) => void,
  delay: number = 300,
) {
  const [value, setValue] = useState<T>(initialValue);
  const [isUpdating, setIsUpdating] = useState(false);
  const debouncedValue = useDebounce(value, delay);

  // Call onUpdate when debounced value changes
  useEffect(() => {
    if (debouncedValue !== initialValue) {
      setIsUpdating(true);
      onUpdate(debouncedValue);
      setIsUpdating(false);
    }
  }, [debouncedValue, onUpdate, initialValue]);

  // Update isUpdating state
  useEffect(() => {
    if (value !== debouncedValue) {
      setIsUpdating(true);
    } else {
      setIsUpdating(false);
    }
  }, [value, debouncedValue]);

  return {
    value,
    setValue,
    isUpdating,
  };
}
