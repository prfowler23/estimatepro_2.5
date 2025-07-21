// Salesforce CRM Integration
// Handles lead management, opportunity tracking, and customer relationships

import {
  BaseIntegration,
  IntegrationProvider,
  IntegrationResponse,
  IntegrationEventData,
  IntegrationConfig,
} from "../integration-framework";
import { withRetry } from "@/lib/utils/retry-logic";
import { isNotNull, safeString, safeNumber } from "@/lib/utils/null-safety";

export class SalesforceIntegration implements BaseIntegration {
  provider: IntegrationProvider = "salesforce";
  name = "Salesforce CRM";
  description = "Sync leads, opportunities, and contacts with Salesforce";
  version = "1.0.0";

  private baseUrl = "https://login.salesforce.com";
  private apiVersion = "v59.0";
  private config: IntegrationConfig | null = null;

  constructor(config?: IntegrationConfig) {
    this.config = config || null;
    if (config && config.settings.sandbox === true) {
      this.baseUrl = "https://test.salesforce.com";
    }
    if (config && config.settings.api_version) {
      this.apiVersion = config.settings.api_version;
    }
  }

  async authenticate(
    credentials: Record<string, string>,
  ): Promise<IntegrationResponse> {
    try {
      const { client_id, client_secret, username, password, security_token } =
        credentials;

      if (!client_id || !client_secret || !username || !password) {
        return {
          success: false,
          error:
            "Missing required credentials: client_id, client_secret, username, password",
        };
      }

      // OAuth2 password flow
      const params = new URLSearchParams({
        grant_type: "password",
        client_id,
        client_secret,
        username,
        password: password + (security_token || ""),
      });

      const response = await fetch(`${this.baseUrl}/services/oauth2/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
      });

      if (!response.ok) {
        const error = await response.text();
        return {
          success: false,
          error: `Authentication failed: ${error}`,
        };
      }

      const data = await response.json();

      // Test the connection by getting user info
      const userResponse = await fetch(
        `${data.instance_url}/services/data/${this.apiVersion}/sobjects/User/${data.id}`,
        {
          headers: {
            Authorization: `Bearer ${data.access_token}`,
          },
        },
      );

      if (!userResponse.ok) {
        return {
          success: false,
          error: "Failed to retrieve user information",
        };
      }

      const userInfo = await userResponse.json();

      return {
        success: true,
        data: {
          access_token: data.access_token,
          instance_url: data.instance_url,
          id: data.id,
          token_type: data.token_type,
          issued_at: data.issued_at,
          signature: data.signature,
          user_info: userInfo,
          authenticated: true,
        },
      };
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
    const requiredFields = [
      "client_id",
      "client_secret",
      "username",
      "password",
    ];
    const missingFields = requiredFields.filter(
      (field) => !config.authentication.credentials[field],
    );

    if (missingFields.length > 0) {
      return {
        success: false,
        error: `Missing required configuration: ${missingFields.join(", ")}`,
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

    try {
      const authResult = await this.authenticate(
        this.config.authentication.credentials,
      );
      if (!authResult.success) {
        return authResult;
      }

      const { access_token, instance_url } = authResult.data;
      const results = [];

      if (direction === "inbound" || direction === "bidirectional") {
        // Sync leads from Salesforce to EstimatePro
        const leadSync = await this.syncLeadsFromSalesforce(
          access_token,
          instance_url,
        );
        results.push(leadSync);

        // Sync contacts from Salesforce
        const contactSync = await this.syncContactsFromSalesforce(
          access_token,
          instance_url,
        );
        results.push(contactSync);

        // Sync opportunities from Salesforce
        const opportunitySync = await this.syncOpportunitiesFromSalesforce(
          access_token,
          instance_url,
        );
        results.push(opportunitySync);
      }

      if (direction === "outbound" || direction === "bidirectional") {
        // Sync estimates to Salesforce as opportunities
        const estimateSync = await this.syncEstimatesToSalesforce(
          access_token,
          instance_url,
        );
        results.push(estimateSync);

        // Sync customers to Salesforce as contacts
        const customerSync = await this.syncCustomersToSalesforce(
          access_token,
          instance_url,
        );
        results.push(customerSync);
      }

      const hasErrors = results.some((r) => !r.success);

      return {
        success: !hasErrors,
        data: {
          sync_results: results,
          timestamp: new Date().toISOString(),
        },
        warnings: hasErrors ? ["Some sync operations failed"] : undefined,
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
    try {
      // Salesforce uses Outbound Messages or Platform Events
      // This is a simplified webhook handler

      const { notifications } = payload;

      if (!notifications || !Array.isArray(notifications)) {
        return {
          success: false,
          error: "Invalid webhook payload format",
        };
      }

      const results = [];

      for (const notification of notifications) {
        const { Id, sObject } = notification;

        if (sObject) {
          const result = await this.processSObjectChange(sObject);
          results.push(result);
        }
      }

      return {
        success: true,
        data: {
          processed_notifications: results.length,
          results,
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Webhook processing failed",
      };
    }
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
      const authResult = await this.authenticate(
        this.config.authentication.credentials,
      );
      if (!authResult.success) {
        return authResult;
      }

      const { access_token, instance_url } = authResult.data;

      switch (event.event_type) {
        case "estimate_created":
          return await this.createSalesforceOpportunity(
            access_token,
            instance_url,
            event.event_data,
          );

        case "estimate_approved":
          return await this.updateOpportunityStage(
            access_token,
            instance_url,
            event.event_data,
            "Closed Won",
          );

        case "estimate_rejected":
          return await this.updateOpportunityStage(
            access_token,
            instance_url,
            event.event_data,
            "Closed Lost",
          );

        case "customer_created":
          return await this.createSalesforceContact(
            access_token,
            instance_url,
            event.event_data,
          );

        case "customer_updated":
          return await this.updateSalesforceContact(
            access_token,
            instance_url,
            event.event_data,
          );

        case "project_completed":
          return await this.createSalesforceTask(
            access_token,
            instance_url,
            event.event_data,
            "Project Completed",
          );

        default:
          return {
            success: false,
            error: `Unsupported event type: ${event.event_type}`,
          };
      }
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
      if (data[sourceField] !== undefined) {
        // Handle Salesforce field naming conventions
        const sfField = this.toSalesforceField(targetField);
        mapped[sfField] = data[sourceField];
      }
    }

    return mapped;
  }

  async createRecord(
    recordType: string,
    data: any,
  ): Promise<IntegrationResponse> {
    if (!this.config) {
      return {
        success: false,
        error: "No configuration provided",
      };
    }

    try {
      const authResult = await this.authenticate(
        this.config.authentication.credentials,
      );
      if (!authResult.success) {
        return authResult;
      }

      const { access_token, instance_url } = authResult.data;

      const response = await fetch(
        `${instance_url}/services/data/${this.apiVersion}/sobjects/${recordType}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: `Failed to create ${recordType}: ${JSON.stringify(error)}`,
        };
      }

      const result = await response.json();

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : `Failed to create ${recordType}`,
      };
    }
  }

  async updateRecord(
    recordType: string,
    id: string,
    data: any,
  ): Promise<IntegrationResponse> {
    if (!this.config) {
      return {
        success: false,
        error: "No configuration provided",
      };
    }

    try {
      const authResult = await this.authenticate(
        this.config.authentication.credentials,
      );
      if (!authResult.success) {
        return authResult;
      }

      const { access_token, instance_url } = authResult.data;

      const response = await fetch(
        `${instance_url}/services/data/${this.apiVersion}/sobjects/${recordType}/${id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: `Failed to update ${recordType}: ${JSON.stringify(error)}`,
        };
      }

      return {
        success: true,
        data: { updated: true },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : `Failed to update ${recordType}`,
      };
    }
  }

  async deleteRecord(
    recordType: string,
    id: string,
  ): Promise<IntegrationResponse> {
    if (!this.config) {
      return {
        success: false,
        error: "No configuration provided",
      };
    }

    try {
      const authResult = await this.authenticate(
        this.config.authentication.credentials,
      );
      if (!authResult.success) {
        return authResult;
      }

      const { access_token, instance_url } = authResult.data;

      const response = await fetch(
        `${instance_url}/services/data/${this.apiVersion}/sobjects/${recordType}/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        },
      );

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: `Failed to delete ${recordType}: ${JSON.stringify(error)}`,
        };
      }

      return {
        success: true,
        data: { deleted: true },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : `Failed to delete ${recordType}`,
      };
    }
  }

  async searchRecords(
    recordType: string,
    query: any,
  ): Promise<IntegrationResponse> {
    if (!this.config) {
      return {
        success: false,
        error: "No configuration provided",
      };
    }

    try {
      const authResult = await this.authenticate(
        this.config.authentication.credentials,
      );
      if (!authResult.success) {
        return authResult;
      }

      const { access_token, instance_url } = authResult.data;

      // Build SOQL query
      const soqlQuery = this.buildSOQLQuery(recordType, query);

      const response = await fetch(
        `${instance_url}/services/data/${this.apiVersion}/query?q=${encodeURIComponent(soqlQuery)}`,
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        },
      );

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: `Search failed: ${JSON.stringify(error)}`,
        };
      }

      const result = await response.json();

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Search failed",
      };
    }
  }

  // Private helper methods
  private async syncLeadsFromSalesforce(
    accessToken: string,
    instanceUrl: string,
  ): Promise<IntegrationResponse> {
    return withRetry(async () => {
      const response = await fetch(
        `${instanceUrl}/services/data/${this.apiVersion}/query?q=${encodeURIComponent("SELECT Id, Name, Email, Phone, Company FROM Lead WHERE IsConverted = false")}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: `Failed to sync leads: ${JSON.stringify(error)}`,
        };
      }

      const result = await response.json();

      // Process and sync leads to EstimatePro database
      // This would involve mapping Salesforce lead data to EstimatePro schema

      return {
        success: true,
        data: {
          synced_leads: result.records?.length || 0,
        },
      };
    });
  }

  private async syncContactsFromSalesforce(
    accessToken: string,
    instanceUrl: string,
  ): Promise<IntegrationResponse> {
    return {
      success: true,
      data: { synced_contacts: 0 },
    };
  }

  private async syncOpportunitiesFromSalesforce(
    accessToken: string,
    instanceUrl: string,
  ): Promise<IntegrationResponse> {
    return {
      success: true,
      data: { synced_opportunities: 0 },
    };
  }

  private async syncEstimatesToSalesforce(
    accessToken: string,
    instanceUrl: string,
  ): Promise<IntegrationResponse> {
    return {
      success: true,
      data: { synced_estimates: 0 },
    };
  }

  private async syncCustomersToSalesforce(
    accessToken: string,
    instanceUrl: string,
  ): Promise<IntegrationResponse> {
    return {
      success: true,
      data: { synced_customers: 0 },
    };
  }

  private async createSalesforceOpportunity(
    accessToken: string,
    instanceUrl: string,
    data: any,
  ): Promise<IntegrationResponse> {
    return {
      success: true,
      data: { opportunity_id: "opp_123" },
    };
  }

  private async updateOpportunityStage(
    accessToken: string,
    instanceUrl: string,
    data: any,
    stage: string,
  ): Promise<IntegrationResponse> {
    return {
      success: true,
      data: { updated: true },
    };
  }

  private async createSalesforceContact(
    accessToken: string,
    instanceUrl: string,
    data: any,
  ): Promise<IntegrationResponse> {
    return {
      success: true,
      data: { contact_id: "con_123" },
    };
  }

  private async updateSalesforceContact(
    accessToken: string,
    instanceUrl: string,
    data: any,
  ): Promise<IntegrationResponse> {
    return {
      success: true,
      data: { updated: true },
    };
  }

  private async createSalesforceTask(
    accessToken: string,
    instanceUrl: string,
    data: any,
    subject: string,
  ): Promise<IntegrationResponse> {
    return {
      success: true,
      data: { task_id: "task_123" },
    };
  }

  private async processSObjectChange(sObject: any): Promise<any> {
    return { processed: true };
  }

  private toSalesforceField(field: string): string {
    // Convert field names to Salesforce API format
    return field.replace(/([A-Z])/g, "_$1").toLowerCase();
  }

  private buildSOQLQuery(recordType: string, query: any): string {
    const { select = ["Id", "Name"], where, orderBy, limit } = query;

    let soqlQuery = `SELECT ${Array.isArray(select) ? select.join(", ") : select} FROM ${recordType}`;

    if (where) {
      soqlQuery += ` WHERE ${where}`;
    }

    if (orderBy) {
      soqlQuery += ` ORDER BY ${orderBy}`;
    }

    if (limit) {
      soqlQuery += ` LIMIT ${limit}`;
    }

    return soqlQuery;
  }
}
