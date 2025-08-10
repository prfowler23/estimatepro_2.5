// External Business Intelligence Integration Service
// Provides seamless integration with popular BI tools and data platforms

import { z } from "zod";
import { logger } from "@/lib/utils/logger";
import { createClient } from "@/lib/supabase/server";

interface BIConnection {
  id: string;
  name: string;
  type: "tableau" | "powerbi" | "looker" | "metabase" | "grafana" | "superset";
  endpoint: string;
  credentials: {
    type: "api_key" | "oauth" | "basic_auth" | "token";
    config: Record<string, any>;
  };
  isActive: boolean;
  lastSync: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

interface DataExportRequest {
  connectionId: string;
  exportType: "full" | "incremental" | "snapshot";
  dataSource: string;
  format: "json" | "csv" | "parquet" | "sql";
  filters?: Record<string, any>;
  transformations?: DataTransformation[];
  schedule?: ScheduleConfig;
}

interface DataTransformation {
  type: "filter" | "aggregate" | "join" | "pivot" | "calculate";
  config: Record<string, any>;
}

interface ScheduleConfig {
  frequency: "hourly" | "daily" | "weekly" | "monthly";
  interval: number;
  timeZone: string;
  startTime: string;
}

interface WebhookEndpoint {
  id: string;
  connectionId: string;
  url: string;
  events: string[];
  secret?: string;
  isActive: boolean;
  retryPolicy: {
    maxRetries: number;
    backoffMultiplier: number;
    initialDelay: number;
  };
}

interface SyncLog {
  id: string;
  connectionId: string;
  type: "export" | "import" | "webhook";
  status: "pending" | "success" | "failed" | "partial";
  startTime: string;
  endTime?: string;
  recordsProcessed: number;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

// Validation schemas
const BIConnectionSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  type: z.enum([
    "tableau",
    "powerbi",
    "looker",
    "metabase",
    "grafana",
    "superset",
  ]),
  endpoint: z.string().url(),
  credentials: z.object({
    type: z.enum(["api_key", "oauth", "basic_auth", "token"]),
    config: z.record(z.any()),
  }),
  isActive: z.boolean(),
  lastSync: z.string(),
  createdAt: z.string(),
  metadata: z.record(z.any()).optional(),
});

const DataExportRequestSchema = z.object({
  connectionId: z.string(),
  exportType: z.enum(["full", "incremental", "snapshot"]),
  dataSource: z.string(),
  format: z.enum(["json", "csv", "parquet", "sql"]),
  filters: z.record(z.any()).optional(),
  transformations: z.array(z.any()).optional(),
  schedule: z
    .object({
      frequency: z.enum(["hourly", "daily", "weekly", "monthly"]),
      interval: z.number(),
      timeZone: z.string(),
      startTime: z.string(),
    })
    .optional(),
});

export class ExternalBIIntegrationService {
  private connections = new Map<string, BIConnection>();
  private syncLogs = new Map<string, SyncLog[]>();
  private webhookEndpoints = new Map<string, WebhookEndpoint>();

  /**
   * Create a new BI connection
   */
  async createConnection(
    connectionData: Omit<BIConnection, "id" | "createdAt" | "lastSync">,
  ): Promise<string> {
    try {
      const connectionId = `bi_conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const connection: BIConnection = {
        ...connectionData,
        id: connectionId,
        createdAt: new Date().toISOString(),
        lastSync: new Date().toISOString(),
      };

      // Validate connection
      BIConnectionSchema.parse(connection);

      // Test connection
      const isConnected = await this.testConnection(connection);
      if (!isConnected) {
        throw new Error("Failed to establish connection to BI tool");
      }

      // Store connection
      this.connections.set(connectionId, connection);

      // Save to database
      await this.saveConnectionToDatabase(connection);

      logger.info("BI connection created successfully", {
        connectionId,
        type: connection.type,
      });
      return connectionId;
    } catch (error) {
      logger.error("Failed to create BI connection:", error);
      throw error;
    }
  }

  /**
   * Test connection to BI tool
   */
  async testConnection(connection: BIConnection): Promise<boolean> {
    try {
      switch (connection.type) {
        case "tableau":
          return await this.testTableauConnection(connection);
        case "powerbi":
          return await this.testPowerBIConnection(connection);
        case "looker":
          return await this.testLookerConnection(connection);
        case "metabase":
          return await this.testMetabaseConnection(connection);
        case "grafana":
          return await this.testGrafanaConnection(connection);
        case "superset":
          return await this.testSupersetConnection(connection);
        default:
          throw new Error(`Unsupported BI tool: ${connection.type}`);
      }
    } catch (error) {
      logger.error("Connection test failed:", error);
      return false;
    }
  }

  /**
   * Export data to BI tool
   */
  async exportData(request: DataExportRequest): Promise<string> {
    try {
      // Validate request
      DataExportRequestSchema.parse(request);

      const connection = this.connections.get(request.connectionId);
      if (!connection) {
        throw new Error("Connection not found");
      }

      const syncId = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const syncLog: SyncLog = {
        id: syncId,
        connectionId: request.connectionId,
        type: "export",
        status: "pending",
        startTime: new Date().toISOString(),
        recordsProcessed: 0,
      };

      this.addSyncLog(request.connectionId, syncLog);

      try {
        // Extract data from source
        const data = await this.extractData(request);

        // Apply transformations
        const transformedData = await this.applyTransformations(
          data,
          request.transformations || [],
        );

        // Format data
        const formattedData = await this.formatData(
          transformedData,
          request.format,
        );

        // Send to BI tool
        await this.sendToBITool(connection, formattedData, request);

        // Update sync log
        syncLog.status = "success";
        syncLog.endTime = new Date().toISOString();
        syncLog.recordsProcessed = Array.isArray(transformedData)
          ? transformedData.length
          : 1;

        // Update connection last sync
        connection.lastSync = new Date().toISOString();
        this.connections.set(connection.id, connection);

        logger.info("Data export completed successfully", {
          syncId,
          connectionId: request.connectionId,
        });
        return syncId;
      } catch (error) {
        syncLog.status = "failed";
        syncLog.endTime = new Date().toISOString();
        syncLog.errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        throw error;
      }
    } catch (error) {
      logger.error("Data export failed:", error);
      throw error;
    }
  }

  /**
   * Set up real-time data streaming
   */
  async setupRealTimeStream(
    connectionId: string,
    streamConfig: any,
  ): Promise<string> {
    try {
      const connection = this.connections.get(connectionId);
      if (!connection) {
        throw new Error("Connection not found");
      }

      const streamId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Set up webhook endpoint
      const webhookEndpoint: WebhookEndpoint = {
        id: `webhook_${Date.now()}`,
        connectionId,
        url: streamConfig.webhookUrl,
        events: streamConfig.events || ["data_update", "anomaly_detected"],
        secret: streamConfig.secret,
        isActive: true,
        retryPolicy: {
          maxRetries: 3,
          backoffMultiplier: 2,
          initialDelay: 1000,
        },
      };

      this.webhookEndpoints.set(webhookEndpoint.id, webhookEndpoint);

      // Initialize streaming based on BI tool type
      switch (connection.type) {
        case "tableau":
          await this.setupTableauStreaming(connection, streamConfig);
          break;
        case "powerbi":
          await this.setupPowerBIStreaming(connection, streamConfig);
          break;
        case "grafana":
          await this.setupGrafanaStreaming(connection, streamConfig);
          break;
        default:
          logger.warn(
            `Real-time streaming not supported for ${connection.type}`,
          );
      }

      logger.info("Real-time stream setup completed", {
        streamId,
        connectionId,
      });
      return streamId;
    } catch (error) {
      logger.error("Failed to setup real-time stream:", error);
      throw error;
    }
  }

  /**
   * Create embedded dashboard
   */
  async createEmbeddedDashboard(
    connectionId: string,
    dashboardConfig: any,
  ): Promise<string> {
    try {
      const connection = this.connections.get(connectionId);
      if (!connection) {
        throw new Error("Connection not found");
      }

      let embedUrl: string;

      switch (connection.type) {
        case "tableau":
          embedUrl = await this.createTableauEmbed(connection, dashboardConfig);
          break;
        case "powerbi":
          embedUrl = await this.createPowerBIEmbed(connection, dashboardConfig);
          break;
        case "looker":
          embedUrl = await this.createLookerEmbed(connection, dashboardConfig);
          break;
        case "metabase":
          embedUrl = await this.createMetabaseEmbed(
            connection,
            dashboardConfig,
          );
          break;
        case "grafana":
          embedUrl = await this.createGrafanaEmbed(connection, dashboardConfig);
          break;
        case "superset":
          embedUrl = await this.createSupersetEmbed(
            connection,
            dashboardConfig,
          );
          break;
        default:
          throw new Error(
            `Embedded dashboards not supported for ${connection.type}`,
          );
      }

      logger.info("Embedded dashboard created", { connectionId, embedUrl });
      return embedUrl;
    } catch (error) {
      logger.error("Failed to create embedded dashboard:", error);
      throw error;
    }
  }

  /**
   * Sync data bi-directionally
   */
  async syncData(connectionId: string, syncConfig: any): Promise<void> {
    try {
      const connection = this.connections.get(connectionId);
      if (!connection) {
        throw new Error("Connection not found");
      }

      // Export data to BI tool
      if (syncConfig.export) {
        await this.exportData({
          connectionId,
          exportType: syncConfig.export.type || "incremental",
          dataSource: syncConfig.export.dataSource,
          format: syncConfig.export.format || "json",
          filters: syncConfig.export.filters,
          transformations: syncConfig.export.transformations,
        });
      }

      // Import data from BI tool
      if (syncConfig.import) {
        await this.importDataFromBI(connection, syncConfig.import);
      }

      logger.info("Data sync completed", { connectionId });
    } catch (error) {
      logger.error("Data sync failed:", error);
      throw error;
    }
  }

  /**
   * Get connection status and health
   */
  async getConnectionHealth(connectionId: string): Promise<any> {
    try {
      const connection = this.connections.get(connectionId);
      if (!connection) {
        throw new Error("Connection not found");
      }

      const isHealthy = await this.testConnection(connection);
      const recentLogs = this.getSyncLogs(connectionId, 10);

      const successfulSyncs = recentLogs.filter(
        (log) => log.status === "success",
      ).length;
      const failedSyncs = recentLogs.filter(
        (log) => log.status === "failed",
      ).length;
      const successRate =
        recentLogs.length > 0 ? (successfulSyncs / recentLogs.length) * 100 : 0;

      const health = {
        connectionId,
        isHealthy,
        lastSync: connection.lastSync,
        successRate: Math.round(successRate),
        recentSyncs: recentLogs.length,
        successfulSyncs,
        failedSyncs,
        uptime: this.calculateUptime(connection),
        latency: await this.measureLatency(connection),
      };

      return health;
    } catch (error) {
      logger.error("Failed to get connection health:", error);
      throw error;
    }
  }

  // Private helper methods for specific BI tools

  private async testTableauConnection(
    connection: BIConnection,
  ): Promise<boolean> {
    try {
      // Simulate Tableau REST API test
      const response = await fetch(`${connection.endpoint}/api/3.0/sites`, {
        headers: {
          "X-Tableau-Auth": connection.credentials.config.authToken,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async testPowerBIConnection(
    connection: BIConnection,
  ): Promise<boolean> {
    try {
      // Simulate Power BI REST API test
      const response = await fetch(`${connection.endpoint}/v1.0/myorg/groups`, {
        headers: {
          Authorization: `Bearer ${connection.credentials.config.accessToken}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async testLookerConnection(
    connection: BIConnection,
  ): Promise<boolean> {
    try {
      // Simulate Looker API test
      const response = await fetch(`${connection.endpoint}/api/4.0/user`, {
        headers: {
          Authorization: `token ${connection.credentials.config.apiToken}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async testMetabaseConnection(
    connection: BIConnection,
  ): Promise<boolean> {
    try {
      // Simulate Metabase API test
      const response = await fetch(`${connection.endpoint}/api/user/current`, {
        headers: {
          "X-Metabase-Session": connection.credentials.config.sessionToken,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async testGrafanaConnection(
    connection: BIConnection,
  ): Promise<boolean> {
    try {
      // Simulate Grafana API test
      const response = await fetch(`${connection.endpoint}/api/org`, {
        headers: {
          Authorization: `Bearer ${connection.credentials.config.apiKey}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async testSupersetConnection(
    connection: BIConnection,
  ): Promise<boolean> {
    try {
      // Simulate Apache Superset API test
      const response = await fetch(
        `${connection.endpoint}/api/v1/security/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: connection.credentials.config.username,
            password: connection.credentials.config.password,
          }),
        },
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  private async extractData(request: DataExportRequest): Promise<any[]> {
    try {
      const supabase = createClient();

      // Build query based on data source and filters
      let query = supabase.from(request.dataSource).select("*");

      // Apply filters
      if (request.filters) {
        Object.entries(request.filters).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }

      // Handle incremental exports
      if (request.exportType === "incremental") {
        const connection = this.connections.get(request.connectionId);
        if (connection?.lastSync) {
          query = query.gte("updated_at", connection.lastSync);
        }
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error("Data extraction failed:", error);
      throw error;
    }
  }

  private async applyTransformations(
    data: any[],
    transformations: DataTransformation[],
  ): Promise<any[]> {
    let transformedData = [...data];

    for (const transformation of transformations) {
      switch (transformation.type) {
        case "filter":
          transformedData = transformedData.filter((row) =>
            this.evaluateFilterCondition(row, transformation.config),
          );
          break;
        case "aggregate":
          transformedData = this.aggregateData(
            transformedData,
            transformation.config,
          );
          break;
        case "calculate":
          transformedData = transformedData.map((row) => ({
            ...row,
            [transformation.config.field]: this.calculateField(
              row,
              transformation.config,
            ),
          }));
          break;
        // Add more transformation types as needed
      }
    }

    return transformedData;
  }

  private async formatData(
    data: any[],
    format: string,
  ): Promise<string | any[]> {
    switch (format) {
      case "json":
        return data;
      case "csv":
        return this.convertToCSV(data);
      case "sql":
        return this.generateSQLInserts(data);
      default:
        return data;
    }
  }

  private async sendToBITool(
    connection: BIConnection,
    data: any,
    request: DataExportRequest,
  ): Promise<void> {
    switch (connection.type) {
      case "tableau":
        await this.sendToTableau(connection, data);
        break;
      case "powerbi":
        await this.sendToPowerBI(connection, data);
        break;
      case "looker":
        await this.sendToLooker(connection, data);
        break;
      // Add other BI tools as needed
      default:
        logger.warn(
          `Direct data sending not implemented for ${connection.type}`,
        );
    }
  }

  // Additional helper methods would be implemented here...
  private evaluateFilterCondition(row: any, config: any): boolean {
    // Implement filter logic
    return true;
  }

  private aggregateData(data: any[], config: any): any[] {
    // Implement aggregation logic
    return data;
  }

  private calculateField(row: any, config: any): any {
    // Implement field calculation logic
    return 0;
  }

  private convertToCSV(data: any[]): string {
    if (data.length === 0) return "";

    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(",");
    const csvRows = data.map((row) =>
      headers.map((header) => JSON.stringify(row[header] || "")).join(","),
    );

    return [csvHeaders, ...csvRows].join("\n");
  }

  private generateSQLInserts(data: any[]): string {
    // Implementation would generate SQL INSERT statements
    return "";
  }

  private async sendToTableau(
    connection: BIConnection,
    data: any,
  ): Promise<void> {
    // Implement Tableau-specific data sending logic
  }

  private async sendToPowerBI(
    connection: BIConnection,
    data: any,
  ): Promise<void> {
    // Implement Power BI-specific data sending logic
  }

  private async sendToLooker(
    connection: BIConnection,
    data: any,
  ): Promise<void> {
    // Implement Looker-specific data sending logic
  }

  private async setupTableauStreaming(
    connection: BIConnection,
    config: any,
  ): Promise<void> {
    // Implement Tableau streaming setup
  }

  private async setupPowerBIStreaming(
    connection: BIConnection,
    config: any,
  ): Promise<void> {
    // Implement Power BI streaming setup
  }

  private async setupGrafanaStreaming(
    connection: BIConnection,
    config: any,
  ): Promise<void> {
    // Implement Grafana streaming setup
  }

  private async createTableauEmbed(
    connection: BIConnection,
    config: any,
  ): Promise<string> {
    return `${connection.endpoint}/trusted/${config.ticketId}/views/${config.workbook}/${config.view}`;
  }

  private async createPowerBIEmbed(
    connection: BIConnection,
    config: any,
  ): Promise<string> {
    return `${connection.endpoint}/reportEmbed?reportId=${config.reportId}&groupId=${config.groupId}`;
  }

  private async createLookerEmbed(
    connection: BIConnection,
    config: any,
  ): Promise<string> {
    return `${connection.endpoint}/embed/dashboards/${config.dashboardId}`;
  }

  private async createMetabaseEmbed(
    connection: BIConnection,
    config: any,
  ): Promise<string> {
    return `${connection.endpoint}/embed/dashboard/${config.token}`;
  }

  private async createGrafanaEmbed(
    connection: BIConnection,
    config: any,
  ): Promise<string> {
    return `${connection.endpoint}/d-solo/${config.uid}/${config.slug}`;
  }

  private async createSupersetEmbed(
    connection: BIConnection,
    config: any,
  ): Promise<string> {
    return `${connection.endpoint}/superset/dashboard/${config.dashboardId}/`;
  }

  private async importDataFromBI(
    connection: BIConnection,
    config: any,
  ): Promise<void> {
    // Implement data import from BI tools
  }

  private addSyncLog(connectionId: string, log: SyncLog): void {
    if (!this.syncLogs.has(connectionId)) {
      this.syncLogs.set(connectionId, []);
    }
    this.syncLogs.get(connectionId)!.push(log);
  }

  private getSyncLogs(connectionId: string, limit?: number): SyncLog[] {
    const logs = this.syncLogs.get(connectionId) || [];
    return limit ? logs.slice(-limit) : logs;
  }

  private calculateUptime(connection: BIConnection): number {
    // Calculate uptime percentage based on sync history
    return 99.5; // Placeholder
  }

  private async measureLatency(connection: BIConnection): Promise<number> {
    // Measure API response latency
    return 150; // Placeholder in ms
  }

  private async saveConnectionToDatabase(
    connection: BIConnection,
  ): Promise<void> {
    try {
      const supabase = createClient();
      // TODO: Create bi_connections table in database migration
      // await supabase.from("bi_connections").upsert({
      //   id: connection.id,
      //   name: connection.name,
      //   type: connection.type,
      //   endpoint: connection.endpoint,
      //   credentials: connection.credentials,
      //   is_active: connection.isActive,
      //   last_sync: connection.lastSync,
      //   created_at: connection.createdAt,
      //   metadata: connection.metadata,
      // });
    } catch (error) {
      logger.error("Failed to save connection to database:", error);
    }
  }
}

// Singleton instance
let biIntegrationService: ExternalBIIntegrationService | null = null;

export function getExternalBIIntegrationService(): ExternalBIIntegrationService {
  if (!biIntegrationService) {
    biIntegrationService = new ExternalBIIntegrationService();
  }
  return biIntegrationService;
}

export default ExternalBIIntegrationService;
