// QuickBooks Online Integration
// Handles customer sync, invoice creation, and payment tracking

import {
  BaseIntegration,
  IntegrationProvider,
  IntegrationResponse,
  IntegrationEventData,
  IntegrationConfig,
} from "../integration-framework";
import { withRetry } from "@/lib/utils/retry-logic";
import { isNotNull, safeString, safeNumber } from "@/lib/utils/null-safety";
import { createClient } from "@/lib/supabase/client";
import * as CryptoJS from "crypto-js";

// QuickBooks API Types
interface QuickBooksCustomer {
  Id?: string;
  Name: string;
  CompanyName?: string;
  GivenName?: string;
  FamilyName?: string;
  FullyQualifiedName?: string;
  PrintOnCheckName?: string;
  Active?: boolean;
  PrimaryPhone?: {
    FreeFormNumber: string;
  };
  PrimaryEmailAddr?: {
    Address: string;
  };
  BillAddr?: QuickBooksAddress;
  ShipAddr?: QuickBooksAddress;
}

interface QuickBooksAddress {
  Id?: string;
  Line1?: string;
  Line2?: string;
  City?: string;
  Country?: string;
  CountrySubDivisionCode?: string;
  PostalCode?: string;
}

interface QuickBooksItem {
  Id?: string;
  Name: string;
  Description?: string;
  Active?: boolean;
  FullyQualifiedName?: string;
  Taxable?: boolean;
  UnitPrice?: number;
  Type: "Service" | "Inventory" | "NonInventory";
  IncomeAccountRef?: {
    value: string;
    name?: string;
  };
}

interface QuickBooksEstimate {
  Id?: string;
  DocNumber?: string;
  TxnDate?: string;
  CustomerRef: {
    value: string;
    name?: string;
  };
  Line: QuickBooksLineItem[];
  TotalAmt?: number;
  EmailStatus?: string;
  PrintStatus?: string;
}

interface QuickBooksInvoice {
  Id?: string;
  DocNumber?: string;
  TxnDate?: string;
  DueDate?: string;
  CustomerRef: {
    value: string;
    name?: string;
  };
  Line: QuickBooksLineItem[];
  TotalAmt?: number;
  Balance?: number;
  EmailStatus?: string;
  PrintStatus?: string;
}

interface QuickBooksLineItem {
  Id?: string;
  LineNum?: number;
  Amount: number;
  DetailType: "SalesItemLineDetail";
  SalesItemLineDetail: {
    ItemRef?: {
      value: string;
      name?: string;
    };
    UnitPrice?: number;
    Qty?: number;
    TaxCodeRef?: {
      value: string;
    };
  };
}

interface QuickBooksPayment {
  Id?: string;
  TotalAmt: number;
  CustomerRef: {
    value: string;
    name?: string;
  };
  TxnDate?: string;
  PaymentMethodRef?: {
    value: string;
    name?: string;
  };
  Line: Array<{
    Amount: number;
    LinkedTxn: Array<{
      TxnId: string;
      TxnType: "Invoice";
    }>;
  }>;
}

export class QuickBooksIntegration implements BaseIntegration {
  provider: IntegrationProvider = "quickbooks";
  name = "QuickBooks Online";
  description =
    "Sync customers, estimates, and invoices with QuickBooks Online";
  version = "1.0.0";

  private baseUrl = "https://sandbox-quickbooks.api.intuit.com";
  private config: IntegrationConfig | null = null;

  constructor(config?: IntegrationConfig) {
    this.config = config || null;
    if (config && config.settings.sandbox === false) {
      this.baseUrl = "https://quickbooks.api.intuit.com";
    }
  }

  async authenticate(
    credentials: Record<string, string>,
  ): Promise<IntegrationResponse> {
    try {
      const { access_token, refresh_token, company_id } = credentials;

      if (!access_token || !company_id) {
        return {
          success: false,
          error: "Missing required credentials: access_token, company_id",
        };
      }

      // Test authentication by fetching company info
      const response = await fetch(
        `${this.baseUrl}/v3/company/${company_id}/companyinfo/${company_id}`,
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
            Accept: "application/json",
          },
        },
      );

      if (!response.ok) {
        const error = await response.text();
        return {
          success: false,
          error: `Authentication failed: ${error}`,
        };
      }

      const data = await response.json();

      return {
        success: true,
        data: {
          company_name: data.QueryResponse.CompanyInfo[0].CompanyName,
          company_id,
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
    const requiredFields = ["access_token", "company_id"];
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
      const results = [];

      if (direction === "inbound" || direction === "bidirectional") {
        // Sync customers from QuickBooks to EstimatePro
        const customerSync = await this.syncCustomersFromQuickBooks();
        results.push(customerSync);

        // Sync items/services from QuickBooks
        const itemSync = await this.syncItemsFromQuickBooks();
        results.push(itemSync);
      }

      if (direction === "outbound" || direction === "bidirectional") {
        // Sync estimates to QuickBooks as estimates
        const estimateSync = await this.syncEstimatesToQuickBooks();
        results.push(estimateSync);

        // Sync approved estimates as invoices
        const invoiceSync = await this.syncApprovedEstimatesAsInvoices();
        results.push(invoiceSync);
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
      // Verify webhook signature if provided
      if (signature && this.config?.webhooks[0]?.secret) {
        const isValid = await this.verifyWebhookSignature(payload, signature);
        if (!isValid) {
          return {
            success: false,
            error: "Invalid webhook signature",
          };
        }
      }

      // Process webhook events
      const { eventNotifications } = payload;

      if (!eventNotifications || !Array.isArray(eventNotifications)) {
        return {
          success: false,
          error: "Invalid webhook payload format",
        };
      }

      const results = [];

      for (const notification of eventNotifications) {
        const { realmId, dataChangeEvent } = notification;

        if (dataChangeEvent && dataChangeEvent.entities) {
          for (const entity of dataChangeEvent.entities) {
            const result = await this.processEntityChange(entity, realmId);
            results.push(result);
          }
        }
      }

      return {
        success: true,
        data: {
          processed_events: results.length,
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
    try {
      switch (event.event_type) {
        case "estimate_created":
          return await this.createQuickBooksEstimate(event.event_data);

        case "estimate_approved":
          return await this.convertEstimateToInvoice(event.event_data);

        case "customer_created":
          return await this.createQuickBooksCustomer(event.event_data);

        case "customer_updated":
          return await this.updateQuickBooksCustomer(event.event_data);

        case "payment_received":
          return await this.recordPaymentInQuickBooks(event.event_data);

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
        mapped[targetField] = data[sourceField];
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
      const { access_token, company_id } =
        this.config.authentication.credentials;

      const response = await fetch(
        `${this.baseUrl}/v3/company/${company_id}/${recordType}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${access_token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(data),
        },
      );

      if (!response.ok) {
        const error = await response.text();
        return {
          success: false,
          error: `Failed to create ${recordType}: ${error}`,
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
      const { access_token, company_id } =
        this.config.authentication.credentials;

      const response = await fetch(
        `${this.baseUrl}/v3/company/${company_id}/${recordType}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${access_token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(data),
        },
      );

      if (!response.ok) {
        const error = await response.text();
        return {
          success: false,
          error: `Failed to update ${recordType}: ${error}`,
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
            : `Failed to update ${recordType}`,
      };
    }
  }

  async deleteRecord(
    recordType: string,
    id: string,
  ): Promise<IntegrationResponse> {
    return {
      success: false,
      error: "QuickBooks does not support record deletion via API",
    };
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
      const { access_token, company_id } =
        this.config.authentication.credentials;

      const queryString = this.buildQueryString(query);
      const response = await fetch(
        `${this.baseUrl}/v3/company/${company_id}/query?query=${encodeURIComponent(queryString)}`,
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
            Accept: "application/json",
          },
        },
      );

      if (!response.ok) {
        const error = await response.text();
        return {
          success: false,
          error: `Search failed: ${error}`,
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
  private async syncCustomersFromQuickBooks(): Promise<IntegrationResponse> {
    // Implementation for syncing customers from QuickBooks
    const result = await withRetry(
      async () => {
        const searchResult = await this.searchRecords("customer", {
          select: "*",
          where: "Active = true",
        });

        if (!searchResult.success) {
          return searchResult;
        }

        const customers = searchResult.data?.QueryResponse?.Customer || [];
        const supabase = createClient();
        let syncedCount = 0;
        const errors: string[] = [];

        for (const qbCustomer of customers) {
          try {
            const customerData =
              this.mapQuickBooksCustomerToEstimatePro(qbCustomer);

            // Upsert customer in EstimatePro database
            const { error } = await supabase.from("customers").upsert(
              {
                ...customerData,
                quickbooks_id: qbCustomer.Id,
                integration_source: "quickbooks",
                last_sync: new Date().toISOString(),
              },
              {
                onConflict: "quickbooks_id",
              },
            );

            if (error) {
              errors.push(
                `Failed to sync customer ${qbCustomer.Name}: ${error.message}`,
              );
            } else {
              syncedCount++;
            }
          } catch (error) {
            errors.push(
              `Error processing customer ${qbCustomer.Name}: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
          }
        }

        return {
          success: errors.length === 0,
          data: {
            synced_customers: syncedCount,
            total_customers: customers.length,
          },
          warnings: errors.length > 0 ? errors : undefined,
        };
      },
      {
        maxAttempts: 3,
        delayMs: 1000,
        backoffFactor: 1.5,
        maxDelayMs: 5000,
      },
    );

    if (result.success && result.data) {
      return result.data;
    } else {
      return {
        success: false,
        error: result.error?.message || "Sync failed",
      };
    }
  }

  private async syncItemsFromQuickBooks(): Promise<IntegrationResponse> {
    // Implementation for syncing items/services from QuickBooks
    const result = await withRetry(async () => {
      const searchResult = await this.searchRecords("item", {
        select: "*",
        where: "Active = true AND Type = 'Service'",
      });

      if (!searchResult.success) {
        return searchResult;
      }

      const items = searchResult.data?.QueryResponse?.Item || [];
      const supabase = createClient();
      let syncedCount = 0;
      const errors: string[] = [];

      for (const qbItem of items) {
        try {
          const serviceData = this.mapQuickBooksItemToService(qbItem);

          // Upsert service in EstimatePro database
          const { error } = await supabase.from("services").upsert(
            {
              ...serviceData,
              quickbooks_id: qbItem.Id,
              integration_source: "quickbooks",
              last_sync: new Date().toISOString(),
            },
            {
              onConflict: "quickbooks_id",
            },
          );

          if (error) {
            errors.push(`Failed to sync item ${qbItem.Name}: ${error.message}`);
          } else {
            syncedCount++;
          }
        } catch (error) {
          errors.push(
            `Error processing item ${qbItem.Name}: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }
      }

      return {
        success: errors.length === 0,
        data: {
          synced_items: syncedCount,
          total_items: items.length,
        },
        warnings: errors.length > 0 ? errors : undefined,
      };
    });

    if (result.success && result.data) {
      return result.data;
    } else {
      return {
        success: false,
        error: result.error?.message || "Sync failed",
      };
    }
  }

  private async syncEstimatesToQuickBooks(): Promise<IntegrationResponse> {
    // Implementation for syncing estimates to QuickBooks
    const result = await withRetry(async () => {
      const supabase = createClient();

      // Get unsynced estimates from EstimatePro
      const { data: estimates, error: fetchError } = await supabase
        .from("estimates")
        .select(
          `
          *,
          customers!inner(*),
          estimate_services(*)
        `,
        )
        .is("quickbooks_id", null)
        .eq("status", "draft");

      if (fetchError) {
        return {
          success: false,
          error: `Failed to fetch estimates: ${fetchError.message}`,
        };
      }

      let syncedCount = 0;
      const errors: string[] = [];

      for (const estimate of estimates || []) {
        try {
          // First ensure customer exists in QuickBooks
          const customerRef = await this.ensureCustomerInQuickBooks(
            estimate.customers,
          );

          if (!customerRef) {
            errors.push(
              `Failed to create/find customer for estimate ${estimate.id}`,
            );
            continue;
          }

          // Create QuickBooks estimate
          const qbEstimate = this.mapEstimateProEstimateToQuickBooks(
            estimate,
            customerRef,
          );
          const createResult = await this.createRecord("estimate", qbEstimate);

          if (
            createResult.success &&
            createResult.data?.QueryResponse?.Estimate?.[0]?.Id
          ) {
            // Update EstimatePro estimate with QuickBooks ID
            await supabase
              .from("estimates")
              .update({
                quickbooks_id: createResult.data.QueryResponse.Estimate[0].Id,
                last_sync: new Date().toISOString(),
              })
              .eq("id", estimate.id);

            syncedCount++;
          } else {
            errors.push(
              `Failed to create estimate in QuickBooks: ${createResult.error}`,
            );
          }
        } catch (error) {
          errors.push(
            `Error syncing estimate ${estimate.id}: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }
      }

      return {
        success: errors.length === 0,
        data: {
          synced_estimates: syncedCount,
          total_estimates: estimates?.length || 0,
        },
        warnings: errors.length > 0 ? errors : undefined,
      };
    });

    if (result.success && result.data) {
      return result.data;
    } else {
      return {
        success: false,
        error: result.error?.message || "Sync failed",
      };
    }
  }

  private async syncApprovedEstimatesAsInvoices(): Promise<IntegrationResponse> {
    // Implementation for converting approved estimates to invoices
    const result = await withRetry(async () => {
      const supabase = createClient();

      // Get approved estimates that haven't been converted to invoices
      const { data: estimates, error: fetchError } = await supabase
        .from("estimates")
        .select(
          `
          *,
          customers!inner(*),
          estimate_services(*)
        `,
        )
        .eq("status", "approved")
        .is("invoice_id", null)
        .not("quickbooks_id", "is", null);

      if (fetchError) {
        return {
          success: false,
          error: `Failed to fetch approved estimates: ${fetchError.message}`,
        };
      }

      let createdCount = 0;
      const errors: string[] = [];

      for (const estimate of estimates || []) {
        try {
          // Get customer reference
          const customerQbId = estimate.customers.quickbooks_id;
          if (!customerQbId) {
            errors.push(
              `Customer for estimate ${estimate.id} not synced to QuickBooks`,
            );
            continue;
          }

          // Create invoice from estimate
          const qbInvoice = this.mapEstimateProEstimateToQuickBooksInvoice(
            estimate,
            customerQbId,
          );
          const createResult = await this.createRecord("invoice", qbInvoice);

          if (
            createResult.success &&
            createResult.data?.QueryResponse?.Invoice?.[0]?.Id
          ) {
            const invoiceId = createResult.data.QueryResponse.Invoice[0].Id;

            // Update EstimatePro estimate with invoice ID
            await supabase
              .from("estimates")
              .update({
                invoice_id: invoiceId,
                status: "invoiced",
                last_sync: new Date().toISOString(),
              })
              .eq("id", estimate.id);

            createdCount++;
          } else {
            errors.push(
              `Failed to create invoice for estimate ${estimate.id}: ${createResult.error}`,
            );
          }
        } catch (error) {
          errors.push(
            `Error creating invoice for estimate ${estimate.id}: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }
      }

      return {
        success: errors.length === 0,
        data: {
          created_invoices: createdCount,
          total_estimates: estimates?.length || 0,
        },
        warnings: errors.length > 0 ? errors : undefined,
      };
    });

    if (result.success && result.data) {
      return result.data;
    } else {
      return {
        success: false,
        error: result.error?.message || "Sync failed",
      };
    }
  }

  private async createQuickBooksEstimate(
    data: any,
  ): Promise<IntegrationResponse> {
    // Implementation for creating QuickBooks estimate
    try {
      const { estimate, customer } = data;

      // Ensure customer exists in QuickBooks
      const customerRef = await this.ensureCustomerInQuickBooks(customer);
      if (!customerRef) {
        return {
          success: false,
          error: "Failed to create or find customer in QuickBooks",
        };
      }

      // Create QuickBooks estimate
      const qbEstimate = this.mapEstimateProEstimateToQuickBooks(
        estimate,
        customerRef,
      );
      const result = await this.createRecord("estimate", qbEstimate);

      if (result.success && result.data?.QueryResponse?.Estimate?.[0]) {
        return {
          success: true,
          data: {
            estimate_id: result.data.QueryResponse.Estimate[0].Id,
            doc_number: result.data.QueryResponse.Estimate[0].DocNumber,
          },
        };
      }

      return {
        success: false,
        error: result.error || "Failed to create estimate",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async convertEstimateToInvoice(
    data: any,
  ): Promise<IntegrationResponse> {
    // Implementation for converting estimate to invoice
    try {
      const { estimate, customer } = data;

      // Get customer QuickBooks ID
      const customerQbId = customer.quickbooks_id;
      if (!customerQbId) {
        return {
          success: false,
          error: "Customer not synced to QuickBooks",
        };
      }

      // Create invoice from estimate data
      const qbInvoice = this.mapEstimateProEstimateToQuickBooksInvoice(
        estimate,
        customerQbId,
      );
      const result = await this.createRecord("invoice", qbInvoice);

      if (result.success && result.data?.QueryResponse?.Invoice?.[0]) {
        return {
          success: true,
          data: {
            invoice_id: result.data.QueryResponse.Invoice[0].Id,
            doc_number: result.data.QueryResponse.Invoice[0].DocNumber,
            total_amount: result.data.QueryResponse.Invoice[0].TotalAmt,
          },
        };
      }

      return {
        success: false,
        error: result.error || "Failed to create invoice",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async createQuickBooksCustomer(
    data: any,
  ): Promise<IntegrationResponse> {
    // Implementation for creating QuickBooks customer
    try {
      const qbCustomer = this.mapEstimateProCustomerToQuickBooks(data);
      const result = await this.createRecord("customer", qbCustomer);

      if (result.success && result.data?.QueryResponse?.Customer?.[0]) {
        return {
          success: true,
          data: {
            customer_id: result.data.QueryResponse.Customer[0].Id,
            name: result.data.QueryResponse.Customer[0].Name,
          },
        };
      }

      return {
        success: false,
        error: result.error || "Failed to create customer",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async updateQuickBooksCustomer(
    data: any,
  ): Promise<IntegrationResponse> {
    // Implementation for updating QuickBooks customer
    try {
      const { customer, quickbooks_id } = data;

      if (!quickbooks_id) {
        return {
          success: false,
          error: "QuickBooks customer ID is required for updates",
        };
      }

      // First get the existing customer to get the SyncToken
      const getResult = await this.searchRecords("customer", {
        select: "*",
        where: `Id = '${quickbooks_id}'`,
      });

      if (!getResult.success || !getResult.data?.QueryResponse?.Customer?.[0]) {
        return {
          success: false,
          error: "Customer not found in QuickBooks",
        };
      }

      const existingCustomer = getResult.data.QueryResponse.Customer[0];
      const qbCustomer = {
        ...this.mapEstimateProCustomerToQuickBooks(customer),
        Id: quickbooks_id,
        SyncToken: existingCustomer.SyncToken,
      };

      const result = await this.updateRecord(
        "customer",
        quickbooks_id,
        qbCustomer,
      );

      if (result.success && result.data?.QueryResponse?.Customer?.[0]) {
        return {
          success: true,
          data: {
            customer_id: result.data.QueryResponse.Customer[0].Id,
            updated: true,
          },
        };
      }

      return {
        success: false,
        error: result.error || "Failed to update customer",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async recordPaymentInQuickBooks(
    data: any,
  ): Promise<IntegrationResponse> {
    // Implementation for recording payment in QuickBooks
    try {
      const { payment, customer, invoice } = data;

      if (!customer.quickbooks_id || !invoice.quickbooks_id) {
        return {
          success: false,
          error: "Customer and invoice must be synced to QuickBooks",
        };
      }

      const qbPayment: QuickBooksPayment = {
        TotalAmt: safeNumber(payment.amount, 0),
        CustomerRef: {
          value: customer.quickbooks_id,
          name: customer.name,
        },
        TxnDate: payment.payment_date || new Date().toISOString().split("T")[0],
        PaymentMethodRef: payment.payment_method
          ? {
              value: payment.payment_method,
              name: payment.payment_method,
            }
          : undefined,
        Line: [
          {
            Amount: safeNumber(payment.amount, 0),
            LinkedTxn: [
              {
                TxnId: invoice.quickbooks_id,
                TxnType: "Invoice",
              },
            ],
          },
        ],
      };

      const result = await this.createRecord("payment", qbPayment);

      if (result.success && result.data?.QueryResponse?.Payment?.[0]) {
        return {
          success: true,
          data: {
            payment_id: result.data.QueryResponse.Payment[0].Id,
            amount: result.data.QueryResponse.Payment[0].TotalAmt,
          },
        };
      }

      return {
        success: false,
        error: result.error || "Failed to record payment",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async verifyWebhookSignature(
    payload: any,
    signature: string,
  ): Promise<boolean> {
    // Implementation for verifying webhook signature
    try {
      if (!this.config?.webhooks[0]?.secret) {
        return false;
      }

      const webhookSecret = this.config.webhooks[0].secret;
      const payloadString = JSON.stringify(payload);

      // QuickBooks uses HMAC-SHA256 for webhook verification
      const expectedSignature = CryptoJS.HmacSHA256(
        payloadString,
        webhookSecret,
      ).toString(CryptoJS.enc.Base64);

      // QuickBooks sends signature in format "intuit-signature"
      const receivedSignature = signature.replace("intuit-signature=", "");

      return expectedSignature === receivedSignature;
    } catch (error) {
      console.error("Webhook signature verification error:", error);
      return false;
    }
  }

  private async processEntityChange(
    entity: any,
    realmId: string,
  ): Promise<any> {
    // Implementation for processing entity change events
    try {
      const { name: entityType, id: entityId, operation } = entity;

      switch (entityType) {
        case "Customer":
          return await this.processCustomerChange(entityId, operation, realmId);

        case "Invoice":
          return await this.processInvoiceChange(entityId, operation, realmId);

        case "Payment":
          return await this.processPaymentChange(entityId, operation, realmId);

        case "Estimate":
          return await this.processEstimateChange(entityId, operation, realmId);

        default:
          return {
            processed: false,
            message: `Unsupported entity type: ${entityType}`,
          };
      }
    } catch (error) {
      return {
        processed: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private buildQueryString(query: any): string {
    const { select = "*", where, orderBy, limit } = query;

    let queryString = `SELECT ${select} FROM ${query.from || "Customer"}`;

    if (where) {
      queryString += ` WHERE ${where}`;
    }

    if (orderBy) {
      queryString += ` ORDER BY ${orderBy}`;
    }

    if (limit) {
      queryString += ` LIMIT ${limit}`;
    }

    return queryString;
  }

  // Data mapping helper methods
  private mapQuickBooksCustomerToEstimatePro(
    qbCustomer: QuickBooksCustomer,
  ): any {
    return {
      name: qbCustomer.Name,
      company_name: qbCustomer.CompanyName,
      first_name: qbCustomer.GivenName,
      last_name: qbCustomer.FamilyName,
      email: qbCustomer.PrimaryEmailAddr?.Address,
      phone: qbCustomer.PrimaryPhone?.FreeFormNumber,
      address_line1: qbCustomer.BillAddr?.Line1,
      address_line2: qbCustomer.BillAddr?.Line2,
      city: qbCustomer.BillAddr?.City,
      state: qbCustomer.BillAddr?.CountrySubDivisionCode,
      zip_code: qbCustomer.BillAddr?.PostalCode,
      country: qbCustomer.BillAddr?.Country || "US",
      active: qbCustomer.Active !== false,
    };
  }

  private mapEstimateProCustomerToQuickBooks(
    customer: any,
  ): QuickBooksCustomer {
    return {
      Name:
        customer.name ||
        `${customer.first_name || ""} ${customer.last_name || ""}`.trim(),
      CompanyName: customer.company_name,
      GivenName: customer.first_name,
      FamilyName: customer.last_name,
      PrimaryEmailAddr: customer.email
        ? {
            Address: customer.email,
          }
        : undefined,
      PrimaryPhone: customer.phone
        ? {
            FreeFormNumber: customer.phone,
          }
        : undefined,
      BillAddr: customer.address_line1
        ? {
            Line1: customer.address_line1,
            Line2: customer.address_line2,
            City: customer.city,
            CountrySubDivisionCode: customer.state,
            PostalCode: customer.zip_code,
            Country: customer.country || "US",
          }
        : undefined,
    };
  }

  private mapQuickBooksItemToService(qbItem: QuickBooksItem): any {
    return {
      name: qbItem.Name,
      description: qbItem.Description,
      price: qbItem.UnitPrice,
      category: "service",
      active: qbItem.Active !== false,
      taxable: qbItem.Taxable,
    };
  }

  private mapEstimateProEstimateToQuickBooks(
    estimate: any,
    customerRef: string,
  ): QuickBooksEstimate {
    return {
      CustomerRef: {
        value: customerRef,
      },
      TxnDate: estimate.created_at
        ? new Date(estimate.created_at).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      Line: this.mapEstimateServicesToLineItems(
        estimate.estimate_services || [],
      ),
      EmailStatus: "NotSet",
      PrintStatus: "NotSet",
    };
  }

  private mapEstimateProEstimateToQuickBooksInvoice(
    estimate: any,
    customerRef: string,
  ): QuickBooksInvoice {
    const currentDate = new Date().toISOString().split("T")[0];
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0]; // 30 days from now

    return {
      CustomerRef: {
        value: customerRef,
      },
      TxnDate: currentDate,
      DueDate: dueDate,
      Line: this.mapEstimateServicesToLineItems(
        estimate.estimate_services || [],
      ),
      EmailStatus: "NotSet",
      PrintStatus: "NotSet",
    };
  }

  private mapEstimateServicesToLineItems(
    services: any[],
  ): QuickBooksLineItem[] {
    return services.map((service, index) => ({
      LineNum: index + 1,
      Amount: safeNumber(service.total_price, 0),
      DetailType: "SalesItemLineDetail",
      SalesItemLineDetail: {
        UnitPrice: safeNumber(service.unit_price, 0),
        Qty: safeNumber(service.quantity, 1),
        TaxCodeRef: {
          value: "NON", // Non-taxable by default
        },
      },
    }));
  }

  private async ensureCustomerInQuickBooks(
    customer: any,
  ): Promise<string | null> {
    try {
      // First check if customer already exists in QuickBooks
      if (customer.quickbooks_id) {
        return customer.quickbooks_id;
      }

      // Search for existing customer by name or email
      const searchQuery = customer.email
        ? `PrimaryEmailAddr = '${customer.email}'`
        : `Name = '${customer.name}'`;

      const searchResult = await this.searchRecords("customer", {
        select: "Id, Name",
        where: searchQuery,
      });

      if (
        searchResult.success &&
        searchResult.data?.QueryResponse?.Customer?.[0]
      ) {
        const existingCustomer = searchResult.data.QueryResponse.Customer[0];

        // Update EstimatePro customer with QuickBooks ID
        const supabase = createClient();
        await supabase
          .from("customers")
          .update({ quickbooks_id: existingCustomer.Id })
          .eq("id", customer.id);

        return existingCustomer.Id;
      }

      // Customer doesn't exist, create new one
      const createResult = await this.createQuickBooksCustomer(customer);

      if (createResult.success && createResult.data?.customer_id) {
        // Update EstimatePro customer with QuickBooks ID
        const supabase = createClient();
        await supabase
          .from("customers")
          .update({ quickbooks_id: createResult.data.customer_id })
          .eq("id", customer.id);

        return createResult.data.customer_id;
      }

      return null;
    } catch (error) {
      console.error("Error ensuring customer in QuickBooks:", error);
      return null;
    }
  }

  // Webhook event processors
  private async processCustomerChange(
    entityId: string,
    operation: string,
    realmId: string,
  ): Promise<any> {
    try {
      if (operation === "Delete") {
        // Handle customer deletion
        const supabase = createClient();
        await supabase
          .from("customers")
          .update({
            active: false,
            quickbooks_deleted: true,
            last_sync: new Date().toISOString(),
          })
          .eq("quickbooks_id", entityId);

        return { processed: true, action: "customer_deactivated" };
      }

      // For Create/Update operations, fetch the latest data and sync
      const searchResult = await this.searchRecords("customer", {
        select: "*",
        where: `Id = '${entityId}'`,
      });

      if (
        searchResult.success &&
        searchResult.data?.QueryResponse?.Customer?.[0]
      ) {
        const qbCustomer = searchResult.data.QueryResponse.Customer[0];
        const customerData =
          this.mapQuickBooksCustomerToEstimatePro(qbCustomer);

        const supabase = createClient();
        await supabase.from("customers").upsert(
          {
            ...customerData,
            quickbooks_id: entityId,
            integration_source: "quickbooks",
            last_sync: new Date().toISOString(),
          },
          {
            onConflict: "quickbooks_id",
          },
        );

        return { processed: true, action: "customer_synced" };
      }

      return { processed: false, message: "Customer not found in QuickBooks" };
    } catch (error) {
      return {
        processed: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async processInvoiceChange(
    entityId: string,
    operation: string,
    realmId: string,
  ): Promise<any> {
    try {
      // For invoice changes, we primarily want to update payment status
      const searchResult = await this.searchRecords("invoice", {
        select: "*",
        where: `Id = '${entityId}'`,
      });

      if (
        searchResult.success &&
        searchResult.data?.QueryResponse?.Invoice?.[0]
      ) {
        const qbInvoice = searchResult.data.QueryResponse.Invoice[0];

        // Update EstimatePro estimate with invoice status
        const supabase = createClient();
        await supabase
          .from("estimates")
          .update({
            invoice_balance: qbInvoice.Balance || 0,
            payment_status: (qbInvoice.Balance || 0) === 0 ? "paid" : "pending",
            last_sync: new Date().toISOString(),
          })
          .eq("invoice_id", entityId);

        return { processed: true, action: "invoice_status_updated" };
      }

      return { processed: false, message: "Invoice not found in QuickBooks" };
    } catch (error) {
      return {
        processed: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async processPaymentChange(
    entityId: string,
    operation: string,
    realmId: string,
  ): Promise<any> {
    try {
      // Handle payment received notifications
      const searchResult = await this.searchRecords("payment", {
        select: "*",
        where: `Id = '${entityId}'`,
      });

      if (
        searchResult.success &&
        searchResult.data?.QueryResponse?.Payment?.[0]
      ) {
        const qbPayment = searchResult.data.QueryResponse.Payment[0];

        // Process linked invoices to update payment status
        for (const line of qbPayment.Line || []) {
          for (const linkedTxn of line.LinkedTxn || []) {
            if (linkedTxn.TxnType === "Invoice") {
              const supabase = createClient();
              await supabase
                .from("estimates")
                .update({
                  payment_status: "paid",
                  payment_date: qbPayment.TxnDate,
                  last_sync: new Date().toISOString(),
                })
                .eq("invoice_id", linkedTxn.TxnId);
            }
          }
        }

        return { processed: true, action: "payment_recorded" };
      }

      return { processed: false, message: "Payment not found in QuickBooks" };
    } catch (error) {
      return {
        processed: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async processEstimateChange(
    entityId: string,
    operation: string,
    realmId: string,
  ): Promise<any> {
    try {
      // Handle estimate status changes
      if (operation === "Delete") {
        const supabase = createClient();
        await supabase
          .from("estimates")
          .update({
            quickbooks_deleted: true,
            last_sync: new Date().toISOString(),
          })
          .eq("quickbooks_id", entityId);

        return { processed: true, action: "estimate_deleted" };
      }

      return { processed: true, action: "estimate_updated" };
    } catch (error) {
      return {
        processed: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
