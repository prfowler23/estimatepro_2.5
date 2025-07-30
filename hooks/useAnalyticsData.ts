import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { AnalyticsData } from "@/lib/analytics/data";

// Analytics query keys
export const analyticsQueryKeys = {
  all: ["analytics"] as const,
  dashboard: () => [...analyticsQueryKeys.all, "dashboard"] as const,
  detailed: (userId: string) =>
    [...analyticsQueryKeys.all, "detailed", userId] as const,
};

// Lazy load analytics service
const getAnalyticsService = () =>
  import("@/lib/analytics/data").then((mod) => mod.AnalyticsService);

export function useAnalyticsData(userId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: analyticsQueryKeys.dashboard(),
    queryFn: async () => {
      const AnalyticsService = await getAnalyticsService();
      const data = await AnalyticsService.getFullAnalyticsData();
      return data;
    },
    // Cache for 5 minutes
    staleTime: 5 * 60 * 1000,
    // Keep in cache for 10 minutes
    gcTime: 10 * 60 * 1000,
    // Refetch on window focus if stale
    refetchOnWindowFocus: true,
    // Don't refetch on mount if data exists and is fresh
    refetchOnMount: true,
    // Retry failed requests
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Prefetch function for optimistic updates
  const prefetchAnalytics = async () => {
    await queryClient.prefetchQuery({
      queryKey: analyticsQueryKeys.dashboard(),
      queryFn: async () => {
        const AnalyticsService = await getAnalyticsService();
        return AnalyticsService.getFullAnalyticsData();
      },
      staleTime: 5 * 60 * 1000,
    });
  };

  // Invalidate analytics cache
  const invalidateAnalytics = () => {
    queryClient.invalidateQueries({ queryKey: analyticsQueryKeys.all });
  };

  // Refetch analytics data
  const refetchAnalytics = () => {
    return query.refetch();
  };

  return {
    data: query.data ?? null,
    loading: query.isLoading,
    error: query.error,
    isError: query.isError,
    isFetching: query.isFetching,
    isRefetching: query.isRefetching,
    refetch: refetchAnalytics,
    invalidate: invalidateAnalytics,
    prefetch: prefetchAnalytics,
  };
}

// Hook for invalidating analytics data from other components
export function useInvalidateAnalytics() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: analyticsQueryKeys.all });
  };
}
