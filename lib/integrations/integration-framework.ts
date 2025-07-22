// Enhanced integration framework for third-party systems
// Supports webhooks, API synchronization, and event-driven architecture

import { z } from "zod";
import { withRetry } from "@/lib/utils/retry-logic";
import { isNotNull, safeString, safeNumber } from "@/lib/utils/null-safety";
import { createClient } from "@/lib/supabase/client";

// Integration Provider Types
export type IntegrationProvider =
  | "quickbooks"
  | "sage"
  | "xero"
  | "salesforce"
  | "hubspot"
  | "zapier"
  | "microsoft_dynamics"
  | "stripe"
  | "square"
  | "buildium"
  | "appfolio"
  | "custom_webhook"
  | "custom_api";

// Integration Configuration Schema
export const IntegrationConfigSchema = z.object({
  id: z.string().uuid(),
  provider: z.enum([
    "quickbooks",
    "sage",
    "xero",
    "salesforce",
    "hubspot",
    "zapier",
    "microsoft_dynamics",
    "stripe",
    "square",
    "buildium",
    "appfolio",
    "custom_webhook",
    "custom_api",
  ]),
  name: z.string().min(1),
  enabled: z.boolean().default(true),
  settings: z.record(z.any()),
  authentication: z.object({
    type: z.enum(["oauth2", "api_key", "basic", "bearer", "custom"]),
    credentials: z.record(z.string()),
    expires_at: z.string().datetime().optional(),
    refresh_token: z.string().optional(),
  }),
  webhooks: z
    .array(
      z.object({
        url: z.string().url(),
        events: z.array(z.string()),
        secret: z.string().optional(),
        enabled: z.boolean().default(true),
      }),
    )
    .default([]),
  sync_settings: z.object({
    auto_sync: z.boolean().default(true),
    sync_frequency: z
      .enum(["realtime", "hourly", "daily", "weekly"])
      .default("hourly"),
    sync_direction: z
      .enum(["bidirectional", "inbound", "outbound"])
      .default("bidirectional"),
    last_sync: z.string().datetime().optional(),
  }),
  field_mappings: z.record(z.string()).default({}),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  created_by: z.string().uuid(),
});

export type IntegrationConfig = z.infer<typeof IntegrationConfigSchema>;

// Integration Event Types
export type IntegrationEvent =
  | "estimate_created"
  | "estimate_updated"
  | "estimate_approved"
  | "estimate_rejected"
  | "customer_created"
  | "customer_updated"
  | "payment_received"
  | "invoice_sent"
  | "project_started"
  | "project_completed"
  | "sync_initiated"
  | "sync_completed"
  | "sync_failed"
  | "webhook_received"
  | "error_occurred";

// Integration Event Data Schema
export const IntegrationEventSchema = z.object({
  id: z.string().uuid(),
  integration_id: z.string().uuid(),
  event_type: z.string(),
  event_data: z.record(z.any()),
  status: z.enum(["pending", "processing", "completed", "failed"]),
  retries: z.number().default(0),
  max_retries: z.number().default(3),
  error_message: z.string().optional(),
  created_at: z.string().datetime(),
  processed_at: z.string().datetime().optional(),
});

export type IntegrationEventData = z.infer<typeof IntegrationEventSchema>;

// Integration Response Types
export interface IntegrationResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  warnings?: string[];
  metadata?: {
    provider: IntegrationProvider;
    request_id: string;
    timestamp: string;
    rate_limit?: {
      remaining: number;
      reset_at: string;
    };
  };
}

// Base Integration Interface
export interface BaseIntegration {
  provider: IntegrationProvider;
  name: string;
  description: string;
  version: string;

  // Core Methods
  authenticate(
    credentials: Record<string, string>,
  ): Promise<IntegrationResponse>;
  testConnection(): Promise<IntegrationResponse>;
  validateConfiguration(
    config: IntegrationConfig,
  ): Promise<IntegrationResponse>;

  // Data Synchronization
  syncData(
    direction: "inbound" | "outbound" | "bidirectional",
  ): Promise<IntegrationResponse>;
  mapFields(data: any, mappings: Record<string, string>): any;

  // Event Handling
  handleWebhook(payload: any, signature?: string): Promise<IntegrationResponse>;
  processEvent(event: IntegrationEventData): Promise<IntegrationResponse>;

  // Data Operations
  createRecord(recordType: string, data: any): Promise<IntegrationResponse>;
  updateRecord(
    recordType: string,
    id: string,
    data: any,
  ): Promise<IntegrationResponse>;
  deleteRecord(recordType: string, id: string): Promise<IntegrationResponse>;
  searchRecords(recordType: string, query: any): Promise<IntegrationResponse>;
}

// Enhanced Integration Manager
export class IntegrationManager {
  private static instance: IntegrationManager;
  private integrations: Map<string, BaseIntegration> = new Map();
  private supabase = createClient();

  static getInstance(): IntegrationManager {
    if (!IntegrationManager.instance) {
      IntegrationManager.instance = new IntegrationManager();
    }
    return IntegrationManager.instance;
  }

  // Integration Registration
  async registerIntegration(integration: BaseIntegration): Promise<void> {
    this.integrations.set(integration.provider, integration);
    console.log(`Integration registered: ${integration.name}`);
  }

  // Configuration Management
  async createIntegration(
    config: Omit<IntegrationConfig, "id" | "created_at" | "updated_at">,
  ): Promise<IntegrationResponse<IntegrationConfig>> {
    try {
      const integration = this.integrations.get(config.provider);
      if (!integration) {
        return {
          success: false,
          error: `Integration provider ${config.provider} not found`,
        };
      }

      // Validate configuration
      const validationResult = await integration.validateConfiguration(
        config as IntegrationConfig,
      );
      if (!validationResult.success) {
        return validationResult;
      }

      // Test connection
      const connectionResult = await integration.testConnection();
      if (!connectionResult.success) {
        return {
          success: false,
          error: `Connection test failed: ${connectionResult.error}`,
        };
      }

      // Save to database
      const { data, error } = await this.supabase
        .from("integrations")
        .insert({
          ...config,
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        data: data as IntegrationConfig,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Event Processing
  async processIntegrationEvent(
    event: IntegrationEventData,
  ): Promise<IntegrationResponse> {
    try {
      const integration = this.integrations.get(
        event.integration_id as IntegrationProvider,
      );
      if (!integration) {
        return {
          success: false,
          error: `Integration not found: ${event.integration_id}`,
        };
      }

      // Update event status
      await this.updateEventStatus(event.id, "processing");

      // Use retry logic with proper error handling
      const result = await withRetry(
        async () => {
          const integrationResult = await integration.processEvent(event);
          if (!integrationResult.success) {
            throw new Error(
              integrationResult.error || "Integration processing failed",
            );
          }
          return integrationResult;
        },
        {
          maxAttempts: 3,
          delayMs: 1000,
          backoffFactor: 1.5,
          maxDelayMs: 5000,
        },
      );

      if (result.success && result.data) {
        await this.updateEventStatus(event.id, "completed");
        return result.data;
      } else {
        const error = result.error?.message || "Retry failed";
        await this.updateEventStatus(event.id, "failed", error);
        return {
          success: false,
          error,
        };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      await this.updateEventStatus(event.id, "failed", errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  // Webhook Management
  async handleWebhook(
    provider: IntegrationProvider,
    payload: any,
    signature?: string,
  ): Promise<IntegrationResponse> {
    try {
      const integration = this.integrations.get(provider);
      if (!integration) {
        return {
          success: false,
          error: `Integration provider ${provider} not found`,
        };
      }

      // Process webhook
      const result = await integration.handleWebhook(payload, signature);

      // Log webhook event
      await this.logWebhookEvent(provider, payload, result);

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Data Synchronization
  async syncAllIntegrations(): Promise<IntegrationResponse[]> {
    const { data: configs } = await this.supabase
      .from("integrations")
      .select("*")
      .eq("enabled", true);

    if (!configs) return [];

    const results = await Promise.all(
      configs.map(async (config) => {
        const integration = this.integrations.get(config.provider);
        if (!integration) {
          return {
            success: false,
            error: `Integration provider ${config.provider} not found`,
          };
        }

        try {
          return await integration.syncData(
            (config.sync_settings as any)?.sync_direction || "bidirectional",
          );
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      }),
    );

    return results;
  }

  // Event Utilities
  async createEvent(
    integrationId: string,
    eventType: IntegrationEvent,
    eventData: any,
  ): Promise<string> {
    const { data, error } = await this.supabase
      .from("integration_events")
      .insert({
        id: crypto.randomUUID(),
        integration_id: integrationId,
        event_type: eventType,
        event_data: eventData,
        status: "pending",
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(`Failed to create event: ${error.message}`);
    }

    return data.id;
  }

  private async updateEventStatus(
    eventId: string,
    status: "pending" | "processing" | "completed" | "failed",
    errorMessage?: string,
  ): Promise<void> {
    const updates: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === "completed" || status === "failed") {
      updates.processed_at = new Date().toISOString();
    }

    if (errorMessage) {
      updates.error_message = errorMessage;
    }

    await this.supabase
      .from("integration_events")
      .update(updates)
      .eq("id", eventId);
  }

  private async logWebhookEvent(
    provider: IntegrationProvider,
    payload: any,
    result: IntegrationResponse,
  ): Promise<void> {
    // TODO: Add webhook_logs table to Supabase types
    // await this.supabase.from("webhook_logs").insert({
    //   id: crypto.randomUUID(),
    //   provider,
    //   payload,
    //   response: result,
    //   created_at: new Date().toISOString(),
    // });
  }

  // Health Check
  async checkIntegrationHealth(): Promise<Record<string, IntegrationResponse>> {
    const { data: configs } = await this.supabase
      .from("integrations")
      .select("*")
      .eq("enabled", true);

    if (!configs) return {};

    const healthChecks: Record<string, IntegrationResponse> = {};

    for (const config of configs) {
      const integration = this.integrations.get(config.provider);
      if (integration) {
        try {
          healthChecks[config.id] = await integration.testConnection();
        } catch (error) {
          healthChecks[config.id] = {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      }
    }

    return healthChecks;
  }
}

// Integration Event Dispatcher
export class IntegrationEventDispatcher {
  private static instance: IntegrationEventDispatcher;
  private manager = IntegrationManager.getInstance();

  static getInstance(): IntegrationEventDispatcher {
    if (!IntegrationEventDispatcher.instance) {
      IntegrationEventDispatcher.instance = new IntegrationEventDispatcher();
    }
    return IntegrationEventDispatcher.instance;
  }

  async dispatch(
    integrationId: string,
    eventType: IntegrationEvent,
    eventData: any,
  ): Promise<void> {
    const eventId = await this.manager.createEvent(
      integrationId,
      eventType,
      eventData,
    );

    // Process event asynchronously
    setTimeout(async () => {
      const event: IntegrationEventData = {
        id: eventId,
        integration_id: integrationId,
        event_type: eventType,
        event_data: eventData,
        status: "pending",
        retries: 0,
        max_retries: 3,
        created_at: new Date().toISOString(),
      };

      await this.manager.processIntegrationEvent(event);
    }, 0);
  }
}

// Export singleton instances
export const integrationManager = IntegrationManager.getInstance();
export const integrationEventDispatcher =
  IntegrationEventDispatcher.getInstance();
