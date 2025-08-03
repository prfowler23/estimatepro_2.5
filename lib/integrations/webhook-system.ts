// Comprehensive Webhook Integration System
// Handles webhook registration, validation, processing, and delivery

import { z } from "zod";
import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";
import { AuditSystem } from "@/lib/audit/audit-system";
import { isNotNull, safeString } from "@/lib/utils/null-safety";
import { retryWithBackoff } from "@/lib/utils/retry-logic";

// Webhook Event Types
export type WebhookEvent =
  | "estimate.created"
  | "estimate.updated"
  | "estimate.approved"
  | "estimate.rejected"
  | "estimate.sent"
  | "customer.created"
  | "customer.updated"
  | "integration.sync.completed"
  | "integration.sync.failed"
  | "user.created"
  | "user.updated"
  | "payment.received"
  | "payment.failed"
  | "project.started"
  | "project.completed"
  | "notification.sent"
  | "alert.triggered"
  | "backup.completed"
  | "system.maintenance";

// Webhook Configuration Schema
export const WebhookConfigSchema = z.object({
  id: z.string().uuid(),
  url: z.string().url(),
  events: z.array(z.string()),
  secret: z.string().min(32),
  active: z.boolean().default(true),
  description: z.string().optional(),
  headers: z.record(z.string()).optional(),
  timeout_seconds: z.number().min(1).max(30).default(10),
  retry_attempts: z.number().min(0).max(5).default(3),
  retry_delay_seconds: z.number().min(1).max(300).default(5),
  created_by: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  last_triggered: z.string().datetime().optional(),
  failure_count: z.number().default(0),
  success_count: z.number().default(0),
});

export type WebhookConfig = z.infer<typeof WebhookConfigSchema>;

// Webhook Payload Schema
export const WebhookPayloadSchema = z.object({
  id: z.string().uuid(),
  event: z.string(),
  timestamp: z.string().datetime(),
  data: z.record(z.any()),
  metadata: z.object({
    source: z.string().default("estimatepro"),
    version: z.string().default("1.0"),
    environment: z.string().default("production"),
    signature: z.string(),
  }),
});

export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>;

// Webhook Delivery Schema
export const WebhookDeliverySchema = z.object({
  id: z.string().uuid(),
  webhook_id: z.string().uuid(),
  event: z.string(),
  payload: z.record(z.any()),
  status: z.enum(["pending", "delivered", "failed", "retrying"]),
  attempts: z.number().default(0),
  max_attempts: z.number().default(3),
  response_status: z.number().optional(),
  response_body: z.string().optional(),
  error_message: z.string().optional(),
  created_at: z.string().datetime(),
  delivered_at: z.string().datetime().optional(),
  next_retry_at: z.string().datetime().optional(),
});

export type WebhookDelivery = z.infer<typeof WebhookDeliverySchema>;

// Webhook Integration System Class
export class WebhookSystem {
  private static instance: WebhookSystem;
  private activeWebhooks: Map<string, WebhookConfig> = new Map();
  private deliveryQueue: WebhookDelivery[] = [];
  private isProcessing = false;
  private processingInterval?: NodeJS.Timeout;

  private constructor() {
    // Note: Don't load webhooks here as it creates Supabase client outside request context
    // Webhooks will be loaded lazily when first needed
    this.startDeliveryProcessor();
  }

  static getInstance(): WebhookSystem {
    if (!WebhookSystem.instance) {
      WebhookSystem.instance = new WebhookSystem();
    }
    return WebhookSystem.instance;
  }

  // Webhook Registration and Management
  async registerWebhook(config: Partial<WebhookConfig>): Promise<string> {
    const supabase = createClient();
    try {
      const auditSystem = AuditSystem.getInstance();
      const webhookId = crypto.randomUUID();
      const secret = this.generateWebhookSecret();

      const webhook: WebhookConfig = {
        id: webhookId,
        url: config.url!,
        events: config.events || [],
        secret,
        active: config.active !== false,
        description: config.description,
        headers: config.headers || {},
        timeout_seconds: config.timeout_seconds || 10,
        retry_attempts: config.retry_attempts || 3,
        retry_delay_seconds: config.retry_delay_seconds || 5,
        created_by: config.created_by!,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        failure_count: 0,
        success_count: 0,
      };

      // Validate webhook configuration
      const validatedWebhook = WebhookConfigSchema.parse(webhook);

      // Test webhook endpoint
      const testResult = await this.testWebhookEndpoint(validatedWebhook);
      if (!testResult.success) {
        throw new Error(`Webhook endpoint test failed: ${testResult.error}`);
      }

      // Store in database
      const { data, error } = await supabase
        .from("webhook_configs")
        .insert(validatedWebhook)
        .select("id")
        .single();

      if (error) {
        throw new Error(`Failed to register webhook: ${error.message}`);
      }

      // Add to active webhooks cache
      this.activeWebhooks.set(webhookId, validatedWebhook);

      // Log webhook registration
      await auditSystem.logEvent({
        event_type: "integration_created",
        severity: "medium",
        user_id: config.created_by,
        action: "register_webhook",
        resource_type: "webhook",
        resource_id: webhookId,
        details: {
          url: config.url,
          events: config.events,
          active: config.active,
        },
        compliance_tags: ["webhook_management", "integration"],
      });

      return webhookId;
    } catch (error) {
      console.error("Failed to register webhook:", error);
      throw error;
    }
  }

  async updateWebhook(
    webhookId: string,
    updates: Partial<WebhookConfig>,
    userId: string,
  ): Promise<void> {
    const supabase = createClient();
    try {
      await this.ensureWebhooksLoaded();
      const existingWebhook = this.activeWebhooks.get(webhookId);
      if (!existingWebhook) {
        throw new Error("Webhook not found");
      }

      const updatedWebhook = {
        ...existingWebhook,
        ...updates,
        updated_at: new Date().toISOString(),
      };

      // Validate updated configuration
      const validatedWebhook = WebhookConfigSchema.parse(updatedWebhook);

      // If URL or configuration changed, test the endpoint
      if (updates.url || updates.headers || updates.timeout_seconds) {
        const testResult = await this.testWebhookEndpoint(validatedWebhook);
        if (!testResult.success) {
          throw new Error(
            `Updated webhook endpoint test failed: ${testResult.error}`,
          );
        }
      }

      // Update in database
      const { error } = await supabase
        .from("webhook_configs")
        .update(validatedWebhook)
        .eq("id", webhookId);

      if (error) {
        throw new Error(`Failed to update webhook: ${error.message}`);
      }

      // Update cache
      this.activeWebhooks.set(webhookId, validatedWebhook);

      // Log webhook update
      await auditSystem.logEvent({
        event_type: "integration_updated",
        severity: "medium",
        user_id: userId,
        action: "update_webhook",
        resource_type: "webhook",
        resource_id: webhookId,
        details: {
          updates,
          url: validatedWebhook.url,
          active: validatedWebhook.active,
        },
        compliance_tags: ["webhook_management", "integration"],
      });
    } catch (error) {
      console.error("Failed to update webhook:", error);
      throw error;
    }
  }

  async deleteWebhook(webhookId: string, userId: string): Promise<void> {
    const supabase = createClient();
    try {
      await this.ensureWebhooksLoaded();
      const webhook = this.activeWebhooks.get(webhookId);
      if (!webhook) {
        throw new Error("Webhook not found");
      }

      // Mark as inactive first
      await supabase
        .from("webhook_configs")
        .update({ active: false, updated_at: new Date().toISOString() })
        .eq("id", webhookId);

      // Remove from cache
      this.activeWebhooks.delete(webhookId);

      // Cancel any pending deliveries
      await supabase
        .from("webhook_deliveries")
        .update({ status: "failed", error_message: "Webhook deleted" })
        .eq("webhook_id", webhookId)
        .in("status", ["pending", "retrying"]);

      // Log webhook deletion
      await auditSystem.logEvent({
        event_type: "integration_deleted",
        severity: "medium",
        user_id: userId,
        action: "delete_webhook",
        resource_type: "webhook",
        resource_id: webhookId,
        details: {
          url: webhook.url,
          events: webhook.events,
        },
        compliance_tags: ["webhook_management", "integration"],
      });
    } catch (error) {
      console.error("Failed to delete webhook:", error);
      throw error;
    }
  }

  // Event Publishing
  async publishEvent(
    event: WebhookEvent,
    data: Record<string, any>,
    metadata?: Record<string, any>,
  ): Promise<string[]> {
    try {
      await this.ensureWebhooksLoaded();
      const deliveryIds: string[] = [];
      const relevantWebhooks = Array.from(this.activeWebhooks.values()).filter(
        (webhook) => webhook.active && webhook.events.includes(event),
      );

      if (relevantWebhooks.length === 0) {
        console.log(`No active webhooks found for event: ${event}`);
        return deliveryIds;
      }

      for (const webhook of relevantWebhooks) {
        const deliveryId = await this.scheduleDelivery(
          webhook,
          event,
          data,
          metadata,
        );
        deliveryIds.push(deliveryId);
      }

      // Log event publication
      const auditSystem = AuditSystem.getInstance();
      await auditSystem.logEvent({
        event_type: "webhook_sent",
        severity: "low",
        action: "publish_webhook_event",
        details: {
          event,
          webhook_count: relevantWebhooks.length,
          delivery_ids: deliveryIds,
          data_size: JSON.stringify(data).length,
        },
        compliance_tags: ["webhook_delivery", "integration"],
      });

      return deliveryIds;
    } catch (error) {
      console.error("Failed to publish webhook event:", error);
      throw error;
    }
  }

  // Webhook Delivery Management
  private async scheduleDelivery(
    webhook: WebhookConfig,
    event: WebhookEvent,
    data: Record<string, any>,
    metadata?: Record<string, any>,
  ): Promise<string> {
    const supabase = createClient();
    const deliveryId = crypto.randomUUID();
    const payload = this.createWebhookPayload(event, data, metadata);

    const delivery: WebhookDelivery = {
      id: deliveryId,
      webhook_id: webhook.id,
      event,
      payload,
      status: "pending",
      attempts: 0,
      max_attempts: webhook.retry_attempts,
      created_at: new Date().toISOString(),
    };

    // Store delivery record
    await supabase.from("webhook_deliveries").insert(delivery);

    // Add to processing queue
    this.deliveryQueue.push(delivery);

    return deliveryId;
  }

  private async processDelivery(delivery: WebhookDelivery): Promise<void> {
    await this.ensureWebhooksLoaded();
    const webhook = this.activeWebhooks.get(delivery.webhook_id);
    if (!webhook || !webhook.active) {
      await this.updateDeliveryStatus(
        delivery.id,
        "failed",
        0,
        null,
        "Webhook inactive or deleted",
      );
      return;
    }

    try {
      delivery.attempts += 1;

      const result = await this.deliverWebhook(webhook, delivery.payload);

      if (result.success) {
        await this.updateDeliveryStatus(
          delivery.id,
          "delivered",
          result.status,
          result.response,
          null,
        );

        // Update webhook success count
        await this.updateWebhookStats(webhook.id, "success");
      } else {
        const shouldRetry = delivery.attempts < delivery.max_attempts;

        if (shouldRetry) {
          const nextRetry = new Date();
          nextRetry.setSeconds(
            nextRetry.getSeconds() + webhook.retry_delay_seconds,
          );

          await this.updateDeliveryStatus(
            delivery.id,
            "retrying",
            result.status,
            result.response,
            result.error,
            nextRetry.toISOString(),
          );

          // Re-schedule for retry
          setTimeout(() => {
            this.deliveryQueue.push({
              ...delivery,
              attempts: delivery.attempts,
            });
          }, webhook.retry_delay_seconds * 1000);
        } else {
          await this.updateDeliveryStatus(
            delivery.id,
            "failed",
            result.status,
            result.response,
            result.error,
          );

          // Update webhook failure count
          await this.updateWebhookStats(webhook.id, "failure");
        }
      }
    } catch (error) {
      console.error("Delivery processing error:", error);
      await this.updateDeliveryStatus(
        delivery.id,
        "failed",
        0,
        null,
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  }

  private async deliverWebhook(
    webhook: WebhookConfig,
    payload: WebhookPayload,
  ): Promise<{
    success: boolean;
    status?: number;
    response?: string;
    error?: string;
  }> {
    try {
      const signature = this.generateSignature(payload, webhook.secret);

      const response = await fetch(webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": signature,
          "X-Webhook-Event": payload.event,
          "X-Webhook-ID": payload.id,
          "User-Agent": "EstimatePro-Webhooks/1.0",
          ...webhook.headers,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(webhook.timeout_seconds * 1000),
      });

      const responseText = await response.text();

      return {
        success: response.ok,
        status: response.status,
        response: responseText,
        error: response.ok
          ? undefined
          : `HTTP ${response.status}: ${responseText}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Network error",
      };
    }
  }

  // Webhook Verification and Security
  async verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string,
  ): Promise<boolean> {
    try {
      const expectedSignature = this.generateSignatureFromString(
        payload,
        secret,
      );
      return this.secureCompare(signature, expectedSignature);
    } catch (error) {
      console.error("Signature verification error:", error);
      return false;
    }
  }

  private generateSignature(payload: WebhookPayload, secret: string): string {
    const payloadString = JSON.stringify(payload);
    return this.generateSignatureFromString(payloadString, secret);
  }

  private generateSignatureFromString(payload: string, secret: string): string {
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(payload);
    return `sha256=${hmac.digest("hex")}`;
  }

  private secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  private generateWebhookSecret(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  // Utility Methods
  private createWebhookPayload(
    event: WebhookEvent,
    data: Record<string, any>,
    metadata?: Record<string, any>,
  ): WebhookPayload {
    const payload = {
      id: crypto.randomUUID(),
      event,
      timestamp: new Date().toISOString(),
      data,
      metadata: {
        source: "estimatepro",
        version: "1.0",
        environment: process.env.NODE_ENV || "production",
        signature: "", // Will be set during delivery
        ...metadata,
      },
    };

    return WebhookPayloadSchema.parse(payload);
  }

  private async testWebhookEndpoint(webhook: WebhookConfig): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const testPayload = this.createWebhookPayload(
        "system.maintenance",
        { test: true, message: "Webhook endpoint test" },
        { test: true },
      );

      const result = await this.deliverWebhook(webhook, testPayload);

      if (!result.success) {
        return {
          success: false,
          error: result.error || "Endpoint test failed",
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Test failed",
      };
    }
  }

  private webhooksLoaded = false;

  private async ensureWebhooksLoaded(): Promise<void> {
    if (!this.webhooksLoaded) {
      await this.loadActiveWebhooks();
      this.webhooksLoaded = true;
    }
  }

  private async loadActiveWebhooks(): Promise<void> {
    const supabase = createClient();
    try {
      const { data: webhooks, error } = await supabase
        .from("webhook_configs")
        .select("*")
        .eq("active", true);

      if (error) {
        console.error("Failed to load active webhooks:", error);
        return;
      }

      this.activeWebhooks.clear();
      webhooks?.forEach((webhook) => {
        this.activeWebhooks.set(webhook.id, webhook);
      });

      console.log(`Loaded ${this.activeWebhooks.size} active webhooks`);
    } catch (error) {
      console.error("Error loading active webhooks:", error);
    }
  }

  private startDeliveryProcessor(): void {
    this.processingInterval = setInterval(async () => {
      if (this.isProcessing || this.deliveryQueue.length === 0) {
        return;
      }

      this.isProcessing = true;

      try {
        const delivery = this.deliveryQueue.shift();
        if (delivery) {
          await this.processDelivery(delivery);
        }
      } catch (error) {
        console.error("Delivery processor error:", error);
      } finally {
        this.isProcessing = false;
      }
    }, 1000); // Process every second
  }

  private async updateDeliveryStatus(
    deliveryId: string,
    status: string,
    responseStatus?: number,
    responseBody?: string,
    errorMessage?: string,
    nextRetryAt?: string,
  ): Promise<void> {
    const supabase = createClient();
    const updates: any = {
      status,
      response_status: responseStatus,
      response_body: responseBody,
      error_message: errorMessage,
      next_retry_at: nextRetryAt,
    };

    if (status === "delivered") {
      updates.delivered_at = new Date().toISOString();
    }

    await supabase
      .from("webhook_deliveries")
      .update(updates)
      .eq("id", deliveryId);
  }

  private async updateWebhookStats(
    webhookId: string,
    type: "success" | "failure",
  ): Promise<void> {
    const supabase = createClient();
    await this.ensureWebhooksLoaded();
    const webhook = this.activeWebhooks.get(webhookId);
    if (!webhook) return;

    const updates = {
      last_triggered: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (type === "success") {
      (updates as any).success_count = webhook.success_count + 1;
    } else {
      (updates as any).failure_count = webhook.failure_count + 1;
    }

    await supabase.from("webhook_configs").update(updates).eq("id", webhookId);

    // Update cache
    Object.assign(webhook, updates);
  }

  // Public Query Methods
  async getWebhooks(userId?: string): Promise<WebhookConfig[]> {
    const supabase = createClient();
    let query = supabase.from("webhook_configs").select("*");

    if (userId) {
      query = query.eq("created_by", userId);
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      throw new Error(`Failed to fetch webhooks: ${error.message}`);
    }

    return data || [];
  }

  async getWebhookDeliveries(
    webhookId: string,
    limit = 50,
    offset = 0,
  ): Promise<WebhookDelivery[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("webhook_deliveries")
      .select("*")
      .eq("webhook_id", webhookId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to fetch deliveries: ${error.message}`);
    }

    return data || [];
  }

  async getWebhookStats(webhookId: string): Promise<{
    total_deliveries: number;
    successful_deliveries: number;
    failed_deliveries: number;
    success_rate: number;
    average_response_time: number;
  }> {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("get_webhook_statistics", {
      webhook_id: webhookId,
    });

    if (error) {
      throw new Error(`Failed to fetch webhook stats: ${error.message}`);
    }

    return (
      data[0] || {
        total_deliveries: 0,
        successful_deliveries: 0,
        failed_deliveries: 0,
        success_rate: 0,
        average_response_time: 0,
      }
    );
  }

  // Cleanup
  destroy(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
    this.activeWebhooks.clear();
    this.deliveryQueue.length = 0;
  }
}

// Export singleton instance
export const webhookSystem = WebhookSystem.getInstance();

// Webhook Event Publishers (convenience functions)
export async function publishEstimateEvent(
  event:
    | "estimate.created"
    | "estimate.updated"
    | "estimate.approved"
    | "estimate.rejected"
    | "estimate.sent",
  estimateData: Record<string, any>,
): Promise<string[]> {
  return webhookSystem.publishEvent(event, estimateData);
}

export async function publishCustomerEvent(
  event: "customer.created" | "customer.updated",
  customerData: Record<string, any>,
): Promise<string[]> {
  return webhookSystem.publishEvent(event, customerData);
}

export async function publishIntegrationEvent(
  event: "integration.sync.completed" | "integration.sync.failed",
  integrationData: Record<string, any>,
): Promise<string[]> {
  return webhookSystem.publishEvent(event, integrationData);
}

export async function publishSystemEvent(
  event: "alert.triggered" | "backup.completed" | "system.maintenance",
  systemData: Record<string, any>,
): Promise<string[]> {
  return webhookSystem.publishEvent(event, systemData);
}
