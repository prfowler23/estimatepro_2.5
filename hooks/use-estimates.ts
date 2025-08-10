import { useState, useEffect, useCallback } from "react";
import { unifiedEstimateService } from "@/lib/services/estimate-service-unified";
import type { Estimate, EstimateStatus } from "@/lib/types/estimate-types";

interface UseEstimatesOptions {
  limit?: number;
  status?: EstimateStatus;
  search?: string;
  autoFetch?: boolean;
}

interface UseEstimatesReturn {
  estimates: Estimate[];
  loading: boolean;
  error: string | null;
  total: number;
  hasMore: boolean;
  fetchEstimates: () => Promise<void>;
  createEstimate: (params: any) => Promise<string | null>;
  updateEstimate: (id: string, params: any) => Promise<boolean>;
  deleteEstimate: (id: string) => Promise<boolean>;
  changeEstimateStatus: (
    id: string,
    status: EstimateStatus,
  ) => Promise<boolean>;
  getEstimateById: (id: string) => Promise<Estimate | null>;
  refreshEstimates: () => Promise<void>;
}

export function useEstimates(
  options: UseEstimatesOptions = {},
): UseEstimatesReturn {
  const { limit = 50, status, search, autoFetch = true } = options;

  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const fetchEstimates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await unifiedEstimateService.getAllEstimates({
        limit,
        status,
        search,
      });

      setEstimates(result.estimates);
      setTotal(result.total);
      setHasMore(result.hasMore);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch estimates";
      setError(errorMessage);
      console.error("Error fetching estimates:", err);
    } finally {
      setLoading(false);
    }
  }, [limit, status, search]);

  const createEstimate = useCallback(
    async (params: any) => {
      try {
        setError(null);
        const estimateId = await unifiedEstimateService.createEstimate(params);
        if (estimateId) {
          // Refresh estimates to include the new one
          await fetchEstimates();
        }
        return estimateId;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to create estimate";
        setError(errorMessage);
        console.error("Error creating estimate:", err);
        return null;
      }
    },
    [fetchEstimates],
  );

  const updateEstimate = useCallback(
    async (id: string, params: any) => {
      try {
        setError(null);
        const success = await unifiedEstimateService.updateEstimate(id, params);
        if (success) {
          // Refresh estimates to reflect changes
          await fetchEstimates();
        }
        return success;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to update estimate";
        setError(errorMessage);
        console.error("Error updating estimate:", err);
        return false;
      }
    },
    [fetchEstimates],
  );

  const deleteEstimate = useCallback(async (id: string) => {
    try {
      setError(null);
      const success = await unifiedEstimateService.deleteEstimate(id);
      if (success) {
        // Remove from local state immediately for better UX
        setEstimates((prev) => prev.filter((estimate) => estimate.id !== id));
        setTotal((prev) => prev - 1);
      }
      return success;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to delete estimate";
      setError(errorMessage);
      console.error("Error deleting estimate:", err);
      return false;
    }
  }, []);

  const changeEstimateStatus = useCallback(
    async (id: string, status: EstimateStatus) => {
      try {
        setError(null);
        const success = await unifiedEstimateService.changeEstimateStatus(
          id,
          status,
        );
        if (success) {
          // Update local state immediately for better UX
          setEstimates((prev) =>
            prev.map((estimate) =>
              estimate.id === id ? { ...estimate, status } : estimate,
            ),
          );
        }
        return success;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to change estimate status";
        setError(errorMessage);
        console.error("Error changing estimate status:", err);
        return false;
      }
    },
    [],
  );

  const getEstimateById = useCallback(async (id: string) => {
    try {
      setError(null);
      return await unifiedEstimateService.getEstimateById(id);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch estimate";
      setError(errorMessage);
      console.error("Error fetching estimate by ID:", err);
      return null;
    }
  }, []);

  const refreshEstimates = useCallback(async () => {
    await fetchEstimates();
  }, [fetchEstimates]);

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    if (autoFetch) {
      fetchEstimates();
    }
  }, [fetchEstimates, autoFetch]);

  return {
    estimates,
    loading,
    error,
    total,
    hasMore,
    fetchEstimates,
    createEstimate,
    updateEstimate,
    deleteEstimate,
    changeEstimateStatus,
    getEstimateById,
    refreshEstimates,
  };
}
