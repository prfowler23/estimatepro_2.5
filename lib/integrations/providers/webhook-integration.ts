// Generic Webhook Integration
// Supports custom webhook endpoints and flexible data transformation

import {
  BaseIntegration,
  IntegrationProvider,
  IntegrationResponse,
  IntegrationEventData,
  IntegrationConfig,
} from "../integration-framework";
import { withRetry } from "@/lib/utils/retry-logic";
import { isNotNull, safeString, safeNumber } from "@/lib/utils/null-safety";
import crypto from "crypto";

export class WebhookIntegration implements BaseIntegration {
  provider: IntegrationProvider = "custom_webhook";
  name = "Custom Webhook";
  description =
    "Send data to custom webhook endpoints with flexible transformation";
  version = "1.0.0";

  private config: IntegrationConfig | null = null;

  constructor(config?: IntegrationConfig) {
    this.config = config || null;
  }

  async authenticate(
    credentials: Record<string, string>,
  ): Promise<IntegrationResponse> {
    try {
      const {
        webhook_url,
        auth_method = "none",
        api_key,
        username,
        password,
      } = credentials;

      if (!webhook_url) {
        return {
          success: false,
          error: "Webhook URL is required",
        };
      }

      // Validate URL format
      try {
        new URL(webhook_url);
      } catch {
        return {
          success: false,
          error: "Invalid webhook URL format",
        };
      }

      // Test webhook endpoint with a ping
      const testResult = await this.testWebhookEndpoint(
        webhook_url,
        auth_method,
        { api_key, username, password },
      );

      return testResult;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Authentication failed",
      };
    }
  }

  async testConnection(): Promise<IntegrationResponse> {
    if (!this.config) {
      return {
        success: false,
        error: "No configuration provided",
      };
    }

    return this.authenticate(this.config.authentication.credentials);
  }

  async validateConfiguration(
    config: IntegrationConfig,
  ): Promise<IntegrationResponse> {
    const requiredFields = ["webhook_url"];
    const missingFields = requiredFields.filter(
      (field) => !config.authentication.credentials[field],
    );

    if (missingFields.length > 0) {
      return {
        success: false,
        error: `Missing required configuration: ${missingFields.join(", ")}`,
      };
    }

    // Validate webhook URL
    try {
      new URL(config.authentication.credentials.webhook_url);
    } catch {
      return {
        success: false,
        error: "Invalid webhook URL format",
      };
    }

    return {
      success: true,
      data: { valid: true },
    };
  }

  async syncData(
    direction: "inbound" | "outbound" | "bidirectional",
  ): Promise<IntegrationResponse> {
    if (!this.config) {
      return {
        success: false,
        error: "No configuration provided",
      };
    }

    // Webhook integrations are primarily outbound
    if (direction === "inbound") {
      return {
        success: true,
        data: { message: "Webhook integration is outbound only" },
      };
    }

    try {
      const results = [];

      // Sync pending events
      const pendingEvents = await this.getPendingEvents();

      for (const event of pendingEvents) {
        const result = await this.processEvent(event);
        results.push(result);
      }

      const hasErrors = results.some((r) => !r.success);

      return {
        success: !hasErrors,
        data: {
          processed_events: results.length,
          results,
          timestamp: new Date().toISOString(),
        },
        warnings: hasErrors ? ["Some events failed to process"] : undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Sync failed",
      };
    }
  }

  async handleWebhook(
    payload: any,
    signature?: string,
  ): Promise<IntegrationResponse> {
    // This method is for receiving webhooks, not used for outbound webhook integrations
    return {
      success: true,
      data: { message: "Webhook received and processed" },
    };
  }

  async processEvent(
    event: IntegrationEventData,
  ): Promise<IntegrationResponse> {
    if (!this.config) {
      return {
        success: false,
        error: "No configuration provided",
      };
    }

    try {
      const {
        webhook_url,
        auth_method = "none",
        api_key,
        username,
        password,
      } = this.config.authentication.credentials;

      // Transform event data using field mappings
      const transformedData = this.transformEventData(
        event.event_data,
        this.config.field_mappings,
      );

      // Prepare webhook payload
      const webhookPayload = {
        event_type: event.event_type,
        event_id: event.id,
        timestamp: event.created_at,
        data: transformedData,
        source: "EstimatePro",
        version: this.version,
      };

      // Prepare headers
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "User-Agent": `EstimatePro-Webhook/${this.version}`,
      };

      // Add authentication headers
      this.addAuthHeaders(headers, auth_method, {
        api_key,
        username,
        password,
      });

      // Add webhook signature if configured
      if (this.config.settings.sign_webhooks) {
        const signature = this.generateSignature(
          webhookPayload,
          this.config.settings.webhook_secret,
        );
        headers["X-EstimatePro-Signature"] = signature;
      }

      // Send webhook with retry logic
      const response = await withRetry(
        async () => {
          const res = await fetch(webhook_url, {
            method: "POST",
            headers,
            body: JSON.stringify(webhookPayload),
          });

          if (!res.ok) {
            const errorText = await res.text();
            throw new Error(
              `Webhook failed: ${res.status} ${res.statusText} - ${errorText}`,
            );
          }

          return res;
        },
        {
          maxRetries: this.config.settings.max_retries || 3,
          delay: this.config.settings.retry_delay || 1000,
        },
      );

      const responseData = await response.json().catch(() => null);

      return {
        success: true,
        data: {
          status: response.status,
          response_data: responseData,
          sent_at: new Date().toISOString(),
        },
        metadata: {
          provider: this.provider,
          request_id: event.id,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Event processing failed",
      };
    }
  }

  mapFields(data: any, mappings: Record<string, string>): any {
    const mapped: any = {};

    for (const [sourceField, targetField] of Object.entries(mappings)) {
      const value = this.getNestedValue(data, sourceField);
      if (value !== undefined) {
        this.setNestedValue(mapped, targetField, value);
      }
    }

    return mapped;
  }

  async createRecord(
    recordType: string,
    data: any,
  ): Promise<IntegrationResponse> {
    // Create a custom event for record creation
    const event: IntegrationEventData = {
      id: crypto.randomUUID(),
      integration_id: this.config?.id || "",
      event_type: `${recordType}_created`,
      event_data: data,
      status: "pending",
      retries: 0,
      max_retries: 3,
      created_at: new Date().toISOString(),
    };

    return this.processEvent(event);
  }

  async updateRecord(
    recordType: string,
    id: string,
    data: any,
  ): Promise<IntegrationResponse> {
    // Create a custom event for record update
    const event: IntegrationEventData = {
      id: crypto.randomUUID(),
      integration_id: this.config?.id || "",
      event_type: `${recordType}_updated`,
      event_data: { ...data, id },
      status: "pending",
      retries: 0,
      max_retries: 3,
      created_at: new Date().toISOString(),
    };

    return this.processEvent(event);
  }

  async deleteRecord(
    recordType: string,
    id: string,
  ): Promise<IntegrationResponse> {
    // Create a custom event for record deletion
    const event: IntegrationEventData = {
      id: crypto.randomUUID(),
      integration_id: this.config?.id || "",
      event_type: `${recordType}_deleted`,
      event_data: { id },
      status: "pending",
      retries: 0,
      max_retries: 3,
      created_at: new Date().toISOString(),
    };

    return this.processEvent(event);
  }

  async searchRecords(
    recordType: string,
    query: any,
  ): Promise<IntegrationResponse> {
    return {
      success: false,
      error: "Search not supported for webhook integrations",
    };
  }

  // Private helper methods
  private async testWebhookEndpoint(
    url: string,
    authMethod: string,
    credentials: Record<string, string>,
  ): Promise<IntegrationResponse> {
    try {
      const testPayload = {
        event_type: "test",
        timestamp: new Date().toISOString(),
        data: { test: true },
        source: "EstimatePro",
      };

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "User-Agent": `EstimatePro-Webhook/${this.version}`,
      };

      this.addAuthHeaders(headers, authMethod, credentials);

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(testPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Test failed: ${response.status} ${response.statusText} - ${errorText}`,
        };
      }

      const responseData = await response.json().catch(() => null);

      return {
        success: true,
        data: {
          status: response.status,
          response_data: responseData,
          test_completed: true,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Test failed",
      };
    }
  }

  private addAuthHeaders(
    headers: Record<string, string>,
    authMethod: string,
    credentials: Record<string, string>,
  ): void {
    const { api_key, username, password, bearer_token } = credentials;

    switch (authMethod) {
      case "api_key":
        if (api_key) {
          headers["Authorization"] = `ApiKey ${api_key}`;
        }
        break;

      case "bearer":
        if (bearer_token || api_key) {
          headers["Authorization"] = `Bearer ${bearer_token || api_key}`;
        }
        break;

      case "basic":
        if (username && password) {
          const credentials = btoa(`${username}:${password}`);
          headers["Authorization"] = `Basic ${credentials}`;
        }
        break;

      case "header":
        if (api_key) {
          headers["X-API-Key"] = api_key;
        }
        break;
    }
  }

  private generateSignature(payload: any, secret: string): string {
    const payloadString = JSON.stringify(payload);
    return crypto
      .createHmac("sha256", secret)
      .update(payloadString)
      .digest("hex");
  }

  private transformEventData(data: any, mappings: Record<string, string>): any {
    if (!mappings || Object.keys(mappings).length === 0) {
      return data;
    }

    return this.mapFields(data, mappings);
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split(".").reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split(".");
    const lastKey = keys.pop();

    if (!lastKey) return;

    const target = keys.reduce((current, key) => {
      if (!current[key]) {
        current[key] = {};
      }
      return current[key];
    }, obj);

    target[lastKey] = value;
  }

  private async getPendingEvents(): Promise<IntegrationEventData[]> {
    // This would typically fetch from a database or queue
    // For now, return empty array
    return [];
  }
}
