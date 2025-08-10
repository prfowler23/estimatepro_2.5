// Shared hooks for AI components
import { useState, useEffect, useCallback, useRef } from "react";
import { APIResponse, DashboardState } from "./types";
import { debounce, retryWithBackoff, SimpleCache } from "./utils";
import { logger } from "@/lib/utils/logger";

// Generic data fetching hook with caching and retry logic
export function useDataFetch<T>(
  url: string,
  options?: {
    autoFetch?: boolean;
    cacheKey?: string;
    cacheTTL?: number;
    retries?: number;
    pollingInterval?: number;
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
  },
): {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  clearCache: () => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const cacheRef = useRef(new SimpleCache<T>(options?.cacheTTL || 60));
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    // Check cache first
    if (options?.cacheKey) {
      const cached = cacheRef.current.get(options.cacheKey);
      if (cached) {
        setData(cached);
        return;
      }
    }

    // Abort previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const fetchFn = async () => {
        const response = await fetch(url, {
          signal: abortControllerRef.current?.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response.json();
      };

      const result = await retryWithBackoff(fetchFn, options?.retries || 3);

      setData(result);

      // Cache the result
      if (options?.cacheKey) {
        cacheRef.current.set(options.cacheKey, result);
      }

      options?.onSuccess?.(result);
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        setError(err);
        logger.error("Data fetch error:", err);
        options?.onError?.(err);
      }
    } finally {
      setLoading(false);
    }
  }, [url, options]);

  const clearCache = useCallback(() => {
    if (options?.cacheKey) {
      cacheRef.current.delete(options.cacheKey);
    }
  }, [options?.cacheKey]);

  useEffect(() => {
    if (options?.autoFetch !== false) {
      fetchData();
    }

    // Set up polling if requested
    if (options?.pollingInterval) {
      const interval = setInterval(fetchData, options.pollingInterval);
      return () => clearInterval(interval);
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData, options?.autoFetch, options?.pollingInterval]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    clearCache,
  };
}

// Dashboard-specific hook with state management
export function useDashboard<T>(
  apiEndpoint: string,
  defaultTimeRange = "7d",
): DashboardState & {
  refetch: () => Promise<void>;
  setTimeRange: (range: string) => void;
  setAutoRefresh: (enabled: boolean) => void;
} {
  const [state, setState] = useState<DashboardState>({
    loading: true,
    error: null,
    autoRefresh: true,
    timeRange: defaultTimeRange,
    data: null,
  });

  const fetchData = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch(
        `${apiEndpoint}?timeRange=${state.timeRange}`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch dashboard data");
      }

      const data = await response.json();
      setState((prev) => ({ ...prev, data, loading: false }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error as Error,
        loading: false,
      }));
      logger.error("Dashboard fetch error:", error);
    }
  }, [apiEndpoint, state.timeRange]);

  useEffect(() => {
    fetchData();

    if (state.autoRefresh) {
      const interval = setInterval(fetchData, 60000); // Refresh every minute
      return () => clearInterval(interval);
    }
  }, [fetchData, state.autoRefresh, state.timeRange]);

  const setTimeRange = useCallback((range: string) => {
    setState((prev) => ({ ...prev, timeRange: range }));
  }, []);

  const setAutoRefresh = useCallback((enabled: boolean) => {
    setState((prev) => ({ ...prev, autoRefresh: enabled }));
  }, []);

  return {
    ...state,
    refetch: fetchData,
    setTimeRange,
    setAutoRefresh,
  };
}

// Debounced input hook
export function useDebouncedValue<T>(value: T, delay = 500): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

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

// Auto-save hook
export function useAutoSave<T>(
  data: T,
  saveFunction: (data: T) => Promise<void>,
  options?: {
    enabled?: boolean;
    delay?: number;
    onSuccess?: () => void;
    onError?: (error: Error) => void;
  },
): {
  saving: boolean;
  lastSaved: Date | null;
  error: Error | null;
  save: () => Promise<void>;
} {
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const debouncedData = useDebouncedValue(data, options?.delay || 1000);

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);

    try {
      await saveFunction(debouncedData);
      setLastSaved(new Date());
      options?.onSuccess?.();
    } catch (err) {
      const error = err as Error;
      setError(error);
      logger.error("Auto-save error:", error);
      options?.onError?.(error);
    } finally {
      setSaving(false);
    }
  }, [debouncedData, saveFunction, options]);

  useEffect(() => {
    if (options?.enabled !== false && debouncedData) {
      save();
    }
  }, [debouncedData, save, options?.enabled]);

  return { saving, lastSaved, error, save };
}

// Intersection observer hook for lazy loading
export function useIntersectionObserver(options?: IntersectionObserverInit): {
  ref: React.RefObject<HTMLElement>;
  isIntersecting: boolean;
} {
  const ref = useRef<HTMLElement>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [options]);

  return { ref, isIntersecting };
}

// Local storage hook with type safety
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      logger.error("Error reading from localStorage:", error);
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        logger.error("Error writing to localStorage:", error);
      }
    },
    [key, storedValue],
  );

  return [storedValue, setValue];
}
