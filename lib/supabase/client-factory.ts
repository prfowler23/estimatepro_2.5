/**
 * Universal Supabase client factory with intelligent routing
 *
 * @module lib/supabase/client-factory
 * @description Provides optimized client selection based on environment and use case
 */

import { createClient as createBrowserClient } from "./client";
import { createServerClient } from "./server";
import { createAdminClient } from "./admin";
import { createPooledClient, releasePooledClient } from "./server-pooled";
import type { TypedSupabaseClient } from "./supabase-types";
import {
  getSupabaseCacheLayer,
  withCache,
} from "@/lib/cache/supabase-cache-layer";

export type ClientContext =
  | "browser"
  | "server"
  | "admin"
  | "pooled"
  | "edge"
  | "auto";

export interface ClientOptions {
  usePooling?: boolean;
  enableRetry?: boolean;
  enableMonitoring?: boolean;
  enableCaching?: boolean;
  timeout?: number;
}

/**
 * Universal Supabase client factory with intelligent routing
 */
export class SupabaseClientFactory {
  private static pooledClients = new Map<string, TypedSupabaseClient>();
  private static clientUsage = new Map<string, number>();

  /**
   * Create optimized Supabase client based on context
   */
  static async createClient(
    context: ClientContext = "auto",
    options: ClientOptions = {},
  ): Promise<TypedSupabaseClient> {
    const resolvedContext = context === "auto" ? this.detectContext() : context;

    switch (resolvedContext) {
      case "browser":
        return this.createBrowserClient(options);

      case "server":
        return this.createServerClient(options);

      case "admin":
        return this.createAdminClient(options);

      case "pooled":
        return this.createPooledClientOptimized(options);

      case "edge":
        return this.createEdgeClient(options);

      default:
        throw new Error(`Unsupported client context: ${resolvedContext}`);
    }
  }

  /**
   * Auto-detect the best client context for current environment
   */
  private static detectContext(): ClientContext {
    // Check if we're in browser environment
    if (typeof window !== "undefined") {
      return "browser";
    }

    // Check if we're in Edge Runtime
    if (process.env.EDGE_RUNTIME === "edge-light") {
      return "edge";
    }

    // Check if we need admin privileges
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      // Use pooled for high-traffic server operations
      return "pooled";
    }

    // Default to server client
    return "server";
  }

  /**
   * Create browser-optimized client
   */
  private static createBrowserClient(
    options: ClientOptions,
  ): TypedSupabaseClient {
    const client = createBrowserClient();

    if (options.enableMonitoring) {
      this.addClientMonitoring(client, "browser");
    }

    return client;
  }

  /**
   * Create server-optimized client
   */
  private static async createServerClient(
    options: ClientOptions,
  ): Promise<TypedSupabaseClient> {
    if (options.usePooling) {
      return this.createPooledClientOptimized(options);
    }

    const client = await createServerClient();

    if (options.enableMonitoring) {
      this.addClientMonitoring(client, "server");
    }

    return client;
  }

  /**
   * Create admin client with connection pooling
   */
  private static async createAdminClient(
    options: ClientOptions,
  ): Promise<TypedSupabaseClient> {
    const client = await createAdminClient({
      enableAuditLog: options.enableMonitoring,
      bypassRLS: true,
    });

    if (options.enableMonitoring) {
      this.addClientMonitoring(client, "admin");
    }

    return client;
  }

  /**
   * Create pooled client with intelligent management
   */
  private static async createPooledClientOptimized(
    options: ClientOptions,
  ): Promise<TypedSupabaseClient> {
    const clientKey = `pooled_${JSON.stringify(options)}`;

    // Check if we already have a pooled client for this configuration
    if (this.pooledClients.has(clientKey)) {
      const usage = this.clientUsage.get(clientKey) || 0;
      this.clientUsage.set(clientKey, usage + 1);
      return this.pooledClients.get(clientKey)!;
    }

    // Create new pooled client
    const client = await createPooledClient();

    this.pooledClients.set(clientKey, client);
    this.clientUsage.set(clientKey, 1);

    if (options.enableMonitoring) {
      this.addClientMonitoring(client, "pooled");
    }

    return client;
  }

  /**
   * Create Edge Runtime optimized client
   */
  private static createEdgeClient(options: ClientOptions): TypedSupabaseClient {
    // For Edge Runtime, use a simplified client configuration
    const client = createBrowserClient(); // Edge runtime is similar to browser

    if (options.enableMonitoring) {
      this.addClientMonitoring(client, "edge");
    }

    return client;
  }

  /**
   * Add monitoring to client operations
   */
  private static addClientMonitoring(
    client: TypedSupabaseClient,
    context: string,
  ) {
    const originalFrom = client.from.bind(client);

    client.from = (table: string) => {
      const queryBuilder = originalFrom(table);
      const startTime = Date.now();

      // Wrap query methods with monitoring
      const originalSelect = queryBuilder.select.bind(queryBuilder);
      const originalInsert = queryBuilder.insert.bind(queryBuilder);
      const originalUpdate = queryBuilder.update.bind(queryBuilder);
      const originalDelete = queryBuilder.delete.bind(queryBuilder);

      queryBuilder.select = (...args: any[]) => {
        const result = originalSelect(...args);
        this.trackQueryPerformance("SELECT", table, context, startTime);
        return result;
      };

      queryBuilder.insert = (...args: any[]) => {
        const result = originalInsert(...args);
        this.trackQueryPerformance("INSERT", table, context, startTime);
        return result;
      };

      queryBuilder.update = (...args: any[]) => {
        const result = originalUpdate(...args);
        this.trackQueryPerformance("UPDATE", table, context, startTime);
        return result;
      };

      queryBuilder.delete = (...args: any[]) => {
        const result = originalDelete(...args);
        this.trackQueryPerformance("DELETE", table, context, startTime);
        return result;
      };

      return queryBuilder;
    };
  }

  /**
   * Track query performance metrics
   */
  private static trackQueryPerformance(
    operation: string,
    table: string,
    context: string,
    startTime: number,
  ) {
    const duration = Date.now() - startTime;

    // Only log slow queries to avoid spam
    if (duration > 1000 || process.env.NODE_ENV === "development") {
      console.log(
        `[Supabase] ${operation} ${table} (${context}): ${duration}ms`,
      );
    }

    // TODO: Send to monitoring service in production
    if (process.env.NODE_ENV === "production" && duration > 2000) {
      // Send alert for very slow queries
      console.warn(
        `[Supabase Alert] Slow query detected: ${operation} ${table} took ${duration}ms`,
      );
    }
  }

  /**
   * Release pooled client resources
   */
  static releaseClient(
    client: TypedSupabaseClient,
    context: ClientContext = "auto",
  ) {
    if (
      context === "pooled" ||
      this.pooledClients.has(`pooled_${JSON.stringify({})}`)
    ) {
      releasePooledClient(client);
    }
  }

  /**
   * Get client usage statistics
   */
  static getUsageStats() {
    return {
      pooledClients: this.pooledClients.size,
      totalUsage: Array.from(this.clientUsage.values()).reduce(
        (a, b) => a + b,
        0,
      ),
      usageByType: Object.fromEntries(this.clientUsage.entries()),
    };
  }

  /**
   * Clean up unused clients
   */
  static cleanup() {
    // Clean up unused pooled clients
    for (const [key, usage] of this.clientUsage.entries()) {
      if (usage === 0) {
        const client = this.pooledClients.get(key);
        if (client) {
          releasePooledClient(client);
          this.pooledClients.delete(key);
          this.clientUsage.delete(key);
        }
      }
    }
  }
}

/**
 * Convenience function for creating optimized clients
 */
export const createOptimizedClient = (
  context: ClientContext = "auto",
  options: ClientOptions = {},
) => SupabaseClientFactory.createClient(context, options);

/**
 * Convenience function with auto-pooling for server operations
 */
export const createServerClientOptimized = (options: ClientOptions = {}) =>
  SupabaseClientFactory.createClient("pooled", {
    usePooling: true,
    ...options,
  });

/**
 * Convenience function for high-performance admin operations
 */
export const createAdminClientOptimized = (options: ClientOptions = {}) =>
  SupabaseClientFactory.createClient("admin", {
    usePooling: true,
    enableMonitoring: true,
    ...options,
  });

/**
 * Execute operation with optimal client and automatic cleanup
 */
export async function withOptimalClient<T>(
  operation: (client: TypedSupabaseClient) => Promise<T>,
  context: ClientContext = "auto",
  options: ClientOptions = {},
): Promise<T> {
  const client = await SupabaseClientFactory.createClient(context, options);

  try {
    return await operation(client);
  } finally {
    SupabaseClientFactory.releaseClient(client, context);
  }
}

/**
 * Execute cached query with optimal client
 */
export async function withOptimalCachedQuery<T>(
  table: string,
  operation: "select",
  queryOptions: {
    filters?: Record<string, any>;
    columns?: string[];
    orderBy?: string[];
    limit?: number;
    offset?: number;
    ttl?: number;
    tags?: string[];
    bypassCache?: boolean;
  } = {},
  clientOptions: ClientOptions = {},
): Promise<T> {
  const client = await SupabaseClientFactory.createClient(
    "auto",
    clientOptions,
  );

  try {
    const cache = getSupabaseCacheLayer();

    const signature = {
      table,
      operation,
      filters: queryOptions.filters,
      columns: queryOptions.columns,
      orderBy: queryOptions.orderBy,
      limit: queryOptions.limit,
      offset: queryOptions.offset,
    };

    return await cache.cachedQuery<T>(client, signature, {
      ttl: queryOptions.ttl,
      tags: queryOptions.tags,
      bypassCache: queryOptions.bypassCache,
    });
  } finally {
    SupabaseClientFactory.releaseClient(client, "auto");
  }
}

/**
 * Invalidate cache entries for a table
 */
export async function invalidateTableCache(table: string): Promise<void> {
  const cache = getSupabaseCacheLayer();
  await cache.invalidate({ table });
}

/**
 * Get cache performance metrics
 */
export function getCacheMetrics() {
  const cache = getSupabaseCacheLayer();
  return cache.getMetrics();
}

/**
 * Clear all cache data
 */
export async function clearAllCache(): Promise<void> {
  const cache = getSupabaseCacheLayer();
  await cache.clear();
}
