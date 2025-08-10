import { useState, useEffect, useCallback, useMemo } from "react";
import {
  WebhookConfig,
  WebhookDelivery,
  WebhookStats,
} from "@/lib/types/webhook-types";
import { webhookService } from "@/lib/services/webhook-service";
import { toast } from "@/components/ui/use-toast";

interface UseWebhooksOptions {
  page?: number;
  limit?: number;
  autoLoad?: boolean;
  filters?: {
    active?: boolean;
    event?: string;
    search?: string;
  };
}

/**
 * Custom hook for managing webhooks
 */
export function useWebhooks(options: UseWebhooksOptions = {}) {
  const { page = 1, limit = 20, autoLoad = true, filters } = options;

  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);

  // Load webhooks
  const loadWebhooks = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await webhookService.getWebhooks(page, limit, filters);
      setWebhooks(result.webhooks);
      setTotal(result.total);
      setPages(result.pages);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load webhooks";
      setError(message);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [page, limit, filters]);

  // Create webhook
  const createWebhook = useCallback(
    async (
      webhook: Omit<
        WebhookConfig,
        "id" | "created_at" | "success_count" | "failure_count"
      >,
    ) => {
      const result = await webhookService.createWebhook(webhook);

      if (result.success && result.webhook) {
        setWebhooks((prev) => [result.webhook!, ...prev]);
        setTotal((prev) => prev + 1);
        toast({
          title: "Success",
          description: "Webhook created successfully",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to create webhook",
          variant: "destructive",
        });
      }

      return result;
    },
    [],
  );

  // Update webhook
  const updateWebhook = useCallback(
    async (id: string, updates: Partial<WebhookConfig>) => {
      const result = await webhookService.updateWebhook(id, updates);

      if (result.success && result.webhook) {
        setWebhooks((prev) =>
          prev.map((w) => (w.id === id ? result.webhook! : w)),
        );
        toast({
          title: "Success",
          description: "Webhook updated successfully",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update webhook",
          variant: "destructive",
        });
      }

      return result;
    },
    [],
  );

  // Delete webhook
  const deleteWebhook = useCallback(async (id: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this webhook? This action cannot be undone.",
    );

    if (!confirmed) return { success: false };

    const result = await webhookService.deleteWebhook(id);

    if (result.success) {
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
      setTotal((prev) => prev - 1);
      toast({
        title: "Success",
        description: "Webhook deleted successfully",
      });
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to delete webhook",
        variant: "destructive",
      });
    }

    return result;
  }, []);

  // Toggle webhook active state
  const toggleWebhook = useCallback(
    async (id: string) => {
      const webhook = webhooks.find((w) => w.id === id);
      if (!webhook) return { success: false };

      return updateWebhook(id, { active: !webhook.active });
    },
    [webhooks, updateWebhook],
  );

  // Test webhook
  const testWebhook = useCallback(async (id: string) => {
    const result = await webhookService.sendTestWebhook(id);

    if (result.success) {
      toast({
        title: "Success",
        description: "Test webhook sent successfully",
      });
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to send test webhook",
        variant: "destructive",
      });
    }

    return result;
  }, []);

  // Bulk update webhooks
  const bulkUpdateWebhooks = useCallback(
    async (webhookIds: string[], updates: Partial<WebhookConfig>) => {
      const result = await webhookService.bulkUpdateWebhooks(
        webhookIds,
        updates,
      );

      if (result.success) {
        await loadWebhooks(); // Reload to get updated data
        toast({
          title: "Success",
          description: `${result.updated} webhooks updated successfully`,
        });
      } else {
        toast({
          title: "Error",
          description: result.errors.join(", ") || "Failed to update webhooks",
          variant: "destructive",
        });
      }

      return result;
    },
    [loadWebhooks],
  );

  // Auto-load on mount and when dependencies change
  useEffect(() => {
    if (autoLoad) {
      loadWebhooks();
    }
  }, [autoLoad, loadWebhooks]);

  // Memoized active/inactive counts
  const stats = useMemo(
    () => ({
      total: webhooks.length,
      active: webhooks.filter((w) => w.active).length,
      inactive: webhooks.filter((w) => !w.active).length,
    }),
    [webhooks],
  );

  return {
    webhooks,
    loading,
    error,
    total,
    pages,
    stats,
    loadWebhooks,
    createWebhook,
    updateWebhook,
    deleteWebhook,
    toggleWebhook,
    testWebhook,
    bulkUpdateWebhooks,
  };
}

interface UseWebhookDeliveriesOptions {
  webhookId: string;
  page?: number;
  limit?: number;
  autoLoad?: boolean;
  filters?: {
    status?: WebhookDelivery["status"];
    event?: string;
    startDate?: Date;
    endDate?: Date;
  };
}

/**
 * Custom hook for managing webhook deliveries
 */
export function useWebhookDeliveries(options: UseWebhookDeliveriesOptions) {
  const { webhookId, page = 1, limit = 50, autoLoad = true, filters } = options;

  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [stats, setStats] = useState<WebhookStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);

  // Load deliveries
  const loadDeliveries = useCallback(async () => {
    if (!webhookId) return;

    setLoading(true);
    setError(null);

    try {
      const result = await webhookService.getWebhookDeliveries(
        webhookId,
        page,
        limit,
        filters,
      );
      setDeliveries(result.deliveries);
      setStats(result.stats);
      setTotal(result.total);
      setPages(result.pages);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load deliveries";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [webhookId, page, limit, filters]);

  // Retry failed deliveries
  const retryFailedDeliveries = useCallback(
    async (deliveryIds?: string[]) => {
      if (!webhookId) return { success: false, retriedCount: 0 };

      const result = await webhookService.retryFailedDeliveries(
        webhookId,
        deliveryIds,
      );

      if (result.success) {
        await loadDeliveries(); // Reload to get updated status
        toast({
          title: "Success",
          description: `${result.retriedCount} deliveries scheduled for retry`,
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to retry deliveries",
          variant: "destructive",
        });
      }

      return result;
    },
    [webhookId, loadDeliveries],
  );

  // Auto-load on mount and when dependencies change
  useEffect(() => {
    if (autoLoad && webhookId) {
      loadDeliveries();
    }
  }, [autoLoad, webhookId, loadDeliveries]);

  // Memoized delivery statistics
  const deliveryStats = useMemo(() => {
    if (!stats) return null;

    return {
      ...stats,
      failureRate:
        stats.total_deliveries > 0
          ? ((stats.failed_deliveries / stats.total_deliveries) * 100).toFixed(
              2,
            )
          : "0",
      avgResponseTimeFormatted: `${stats.average_response_time.toFixed(2)}s`,
    };
  }, [stats]);

  return {
    deliveries,
    stats: deliveryStats,
    loading,
    error,
    total,
    pages,
    loadDeliveries,
    retryFailedDeliveries,
  };
}

/**
 * Custom hook for webhook form management
 */
export function useWebhookForm() {
  const [loading, setLoading] = useState(false);

  const validateWebhookURL = useCallback((url: string): boolean => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "https:";
    } catch {
      return false;
    }
  }, []);

  const validateEvents = useCallback((events: string[]) => {
    return webhookService.validateEvents(events);
  }, []);

  const generateSamplePayload = useCallback((eventType: string) => {
    return webhookService.generateSamplePayload(eventType);
  }, []);

  return {
    loading,
    setLoading,
    validateWebhookURL,
    validateEvents,
    generateSamplePayload,
  };
}
