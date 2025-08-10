import {
  WebhookConfig,
  WebhookDelivery,
  WebhookStats,
  WebhookPayload,
  WEBHOOK_EVENTS,
} from "@/lib/types/webhook-types";
import {
  generateWebhookSignature,
  generateWebhookSecret,
  validateWebhookURL,
  createWebhookHeaders,
  calculateBackoffDelay,
  sanitizeWebhookPayload,
} from "@/lib/utils/webhook-security";

export class WebhookService {
  private static instance: WebhookService;

  private constructor() {}

  static getInstance(): WebhookService {
    if (!WebhookService.instance) {
      WebhookService.instance = new WebhookService();
    }
    return WebhookService.instance;
  }

  /**
   * Fetch all webhooks with optional pagination
   */
  async getWebhooks(
    page: number = 1,
    limit: number = 20,
    filters?: {
      active?: boolean;
      event?: string;
      search?: string;
    },
  ): Promise<{ webhooks: WebhookConfig[]; total: number; pages: number }> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (filters?.active !== undefined) {
        params.append("active", filters.active.toString());
      }
      if (filters?.event) {
        params.append("event", filters.event);
      }
      if (filters?.search) {
        params.append("search", filters.search);
      }

      const response = await fetch(`/api/integrations/webhooks?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch webhooks");
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching webhooks:", error);
      return { webhooks: [], total: 0, pages: 0 };
    }
  }

  /**
   * Get a single webhook by ID
   */
  async getWebhook(id: string): Promise<WebhookConfig | null> {
    try {
      const response = await fetch(`/api/integrations/webhooks/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch webhook");
      }
      return await response.json();
    } catch (error) {
      console.error("Error fetching webhook:", error);
      return null;
    }
  }

  /**
   * Create a new webhook with security features
   */
  async createWebhook(
    webhook: Omit<
      WebhookConfig,
      "id" | "created_at" | "success_count" | "failure_count"
    >,
  ): Promise<{ success: boolean; webhook?: WebhookConfig; error?: string }> {
    try {
      // Validate URL
      const urlValidation = validateWebhookURL(webhook.url);
      if (!urlValidation.valid) {
        return { success: false, error: urlValidation.error };
      }

      // Generate secret if not provided
      const secret = generateWebhookSecret();

      const response = await fetch("/api/integrations/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...webhook,
          secret,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.message || "Failed to create webhook",
        };
      }

      const createdWebhook = await response.json();
      return { success: true, webhook: createdWebhook };
    } catch (error) {
      console.error("Error creating webhook:", error);
      return { success: false, error: "Failed to create webhook" };
    }
  }

  /**
   * Update an existing webhook
   */
  async updateWebhook(
    id: string,
    updates: Partial<WebhookConfig>,
  ): Promise<{ success: boolean; webhook?: WebhookConfig; error?: string }> {
    try {
      // Validate URL if it's being updated
      if (updates.url) {
        const urlValidation = validateWebhookURL(updates.url);
        if (!urlValidation.valid) {
          return { success: false, error: urlValidation.error };
        }
      }

      const response = await fetch(`/api/integrations/webhooks?id=${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.message || "Failed to update webhook",
        };
      }

      const updatedWebhook = await response.json();
      return { success: true, webhook: updatedWebhook };
    } catch (error) {
      console.error("Error updating webhook:", error);
      return { success: false, error: "Failed to update webhook" };
    }
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(
    id: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`/api/integrations/webhooks?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.message || "Failed to delete webhook",
        };
      }

      return { success: true };
    } catch (error) {
      console.error("Error deleting webhook:", error);
      return { success: false, error: "Failed to delete webhook" };
    }
  }

  /**
   * Get webhook deliveries with pagination
   */
  async getWebhookDeliveries(
    webhookId: string,
    page: number = 1,
    limit: number = 50,
    filters?: {
      status?: WebhookDelivery["status"];
      event?: string;
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<{
    deliveries: WebhookDelivery[];
    stats: WebhookStats;
    total: number;
    pages: number;
  }> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (filters?.status) {
        params.append("status", filters.status);
      }
      if (filters?.event) {
        params.append("event", filters.event);
      }
      if (filters?.startDate) {
        params.append("start_date", filters.startDate.toISOString());
      }
      if (filters?.endDate) {
        params.append("end_date", filters.endDate.toISOString());
      }

      const response = await fetch(
        `/api/integrations/webhooks/${webhookId}/deliveries?${params}`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch deliveries");
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching deliveries:", error);
      return {
        deliveries: [],
        stats: {
          total_deliveries: 0,
          successful_deliveries: 0,
          failed_deliveries: 0,
          pending_deliveries: 0,
          success_rate: 0,
          average_response_time: 0,
          last_24h_deliveries: 0,
          last_7d_deliveries: 0,
        },
        total: 0,
        pages: 0,
      };
    }
  }

  /**
   * Send a test webhook
   */
  async sendTestWebhook(
    webhookId: string,
    samplePayload?: any,
  ): Promise<{ success: boolean; delivery?: WebhookDelivery; error?: string }> {
    try {
      const response = await fetch(
        `/api/integrations/webhooks/${webhookId}/deliveries`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "test",
            payload:
              samplePayload || this.generateSamplePayload("test.webhook"),
          }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.message || "Failed to send test webhook",
        };
      }

      const delivery = await response.json();
      return { success: true, delivery };
    } catch (error) {
      console.error("Error sending test webhook:", error);
      return { success: false, error: "Failed to send test webhook" };
    }
  }

  /**
   * Retry failed webhook deliveries
   */
  async retryFailedDeliveries(
    webhookId: string,
    deliveryIds?: string[],
  ): Promise<{ success: boolean; retriedCount: number; error?: string }> {
    try {
      const response = await fetch(
        `/api/integrations/webhooks/${webhookId}/deliveries`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "retry_failed",
            delivery_ids: deliveryIds,
          }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        return { success: false, retriedCount: 0, error: error.message };
      }

      const result = await response.json();
      return { success: true, retriedCount: result.retried_count };
    } catch (error) {
      console.error("Error retrying deliveries:", error);
      return {
        success: false,
        retriedCount: 0,
        error: "Failed to retry deliveries",
      };
    }
  }

  /**
   * Trigger a webhook event
   */
  async triggerWebhook(
    event: string,
    data: any,
    metadata?: any,
  ): Promise<{ success: boolean; triggered: number; error?: string }> {
    try {
      const payload: WebhookPayload = {
        event,
        timestamp: new Date().toISOString(),
        data: sanitizeWebhookPayload(data),
        metadata,
      };

      const response = await fetch("/api/integrations/webhooks/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        return { success: false, triggered: 0, error: error.message };
      }

      const result = await response.json();
      return { success: true, triggered: result.triggered_count };
    } catch (error) {
      console.error("Error triggering webhook:", error);
      return {
        success: false,
        triggered: 0,
        error: "Failed to trigger webhook",
      };
    }
  }

  /**
   * Generate sample payload for testing
   */
  generateSamplePayload(eventType: string): any {
    const event = WEBHOOK_EVENTS.find((e) => e.type === eventType);

    if (event?.sample_payload) {
      return event.sample_payload;
    }

    // Generate default sample based on event category
    const [category, action] = eventType.split(".");

    switch (category) {
      case "estimate":
        return {
          id: "sample-estimate-id",
          customer_id: "sample-customer-id",
          total_amount: 1500.0,
          status: action || "draft",
          created_at: new Date().toISOString(),
        };
      case "customer":
        return {
          id: "sample-customer-id",
          name: "Sample Customer",
          email: "customer@example.com",
          phone: "+1234567890",
          created_at: new Date().toISOString(),
        };
      case "payment":
        return {
          id: "sample-payment-id",
          amount: 500.0,
          currency: "USD",
          status: action === "failed" ? "failed" : "succeeded",
          created_at: new Date().toISOString(),
        };
      default:
        return {
          id: "sample-id",
          event: eventType,
          timestamp: new Date().toISOString(),
        };
    }
  }

  /**
   * Validate webhook events selection
   */
  validateEvents(events: string[]): {
    valid: boolean;
    invalidEvents: string[];
  } {
    const validEventTypes = WEBHOOK_EVENTS.map((e) => e.type);
    const invalidEvents = events.filter((e) => !validEventTypes.includes(e));

    return {
      valid: invalidEvents.length === 0,
      invalidEvents,
    };
  }

  /**
   * Get webhook statistics
   */
  async getWebhookStats(
    webhookId?: string,
    period?: "day" | "week" | "month" | "all",
  ): Promise<WebhookStats> {
    try {
      const params = new URLSearchParams();
      if (webhookId) params.append("webhook_id", webhookId);
      if (period) params.append("period", period);

      const response = await fetch(
        `/api/integrations/webhooks/stats?${params}`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch stats");
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching stats:", error);
      return {
        total_deliveries: 0,
        successful_deliveries: 0,
        failed_deliveries: 0,
        pending_deliveries: 0,
        success_rate: 0,
        average_response_time: 0,
        last_24h_deliveries: 0,
        last_7d_deliveries: 0,
      };
    }
  }

  /**
   * Bulk operations on webhooks
   */
  async bulkUpdateWebhooks(
    webhookIds: string[],
    updates: Partial<WebhookConfig>,
  ): Promise<{ success: boolean; updated: number; errors: string[] }> {
    try {
      const response = await fetch("/api/integrations/webhooks/bulk", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhook_ids: webhookIds, updates }),
      });

      if (!response.ok) {
        const error = await response.json();
        return { success: false, updated: 0, errors: [error.message] };
      }

      const result = await response.json();
      return {
        success: true,
        updated: result.updated,
        errors: result.errors || [],
      };
    } catch (error) {
      console.error("Error in bulk update:", error);
      return {
        success: false,
        updated: 0,
        errors: ["Failed to perform bulk update"],
      };
    }
  }

  /**
   * Export webhook configurations
   */
  async exportWebhooks(format: "json" | "csv" = "json"): Promise<Blob | null> {
    try {
      const response = await fetch(
        `/api/integrations/webhooks/export?format=${format}`,
      );

      if (!response.ok) {
        throw new Error("Failed to export webhooks");
      }

      return await response.blob();
    } catch (error) {
      console.error("Error exporting webhooks:", error);
      return null;
    }
  }

  /**
   * Import webhook configurations
   */
  async importWebhooks(
    file: File,
  ): Promise<{ success: boolean; imported: number; errors: string[] }> {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/integrations/webhooks/import", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        return { success: false, imported: 0, errors: [error.message] };
      }

      const result = await response.json();
      return {
        success: true,
        imported: result.imported,
        errors: result.errors || [],
      };
    } catch (error) {
      console.error("Error importing webhooks:", error);
      return {
        success: false,
        imported: 0,
        errors: ["Failed to import webhooks"],
      };
    }
  }
}

export const webhookService = WebhookService.getInstance();
