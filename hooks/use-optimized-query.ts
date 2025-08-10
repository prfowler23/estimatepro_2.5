// Performance optimization hooks
// React hooks for optimized query execution

"use client";

import { useState, useEffect } from "react";
import { QueryResult } from "@/lib/performance/query-optimization";

export const useOptimizedQuery = <T>(
  queryFn: () => Promise<QueryResult<T>>,
  dependencies: any[] = [],
) => {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [cached, setCached] = useState(false);

  useEffect(() => {
    let mounted = true;

    const executeQuery = async () => {
      try {
        setLoading(true);
        setError(null);

        const result = await queryFn();

        if (mounted) {
          setData(result.data);
          setHasMore(result.hasMore || false);
          setCached(result.fromCache || false);
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    executeQuery();

    return () => {
      mounted = false;
    };
  }, dependencies);

  return { data, loading, error, hasMore, cached };
};
