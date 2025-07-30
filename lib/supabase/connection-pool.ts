/**
 * Supabase connection pooling and management
 */

import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

interface ConnectionConfig {
  supabaseUrl: string;
  supabaseKey: string;
  maxConnections: number;
  idleTimeout: number;
  connectionTimeout: number;
}

interface PooledConnection {
  client: SupabaseClient;
  created: number;
  lastUsed: number;
  inUse: boolean;
}

export class SupabaseConnectionPool {
  private static instance: SupabaseConnectionPool;
  private pool: PooledConnection[] = [];
  private config: ConnectionConfig;
  private cleanupInterval?: NodeJS.Timeout;

  private constructor(config: ConnectionConfig) {
    this.config = config;
    this.startCleanupInterval();
  }

  static getInstance(config?: ConnectionConfig): SupabaseConnectionPool {
    if (!SupabaseConnectionPool.instance) {
      if (!config) {
        throw new Error("Configuration required for first pool initialization");
      }
      SupabaseConnectionPool.instance = new SupabaseConnectionPool(config);
    }
    return SupabaseConnectionPool.instance;
  }

  static getDefaultConfig(): ConnectionConfig {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing required Supabase environment variables");
    }

    return {
      supabaseUrl,
      supabaseKey,
      maxConnections: parseInt(process.env.SUPABASE_MAX_CONNECTIONS || "10"),
      idleTimeout: parseInt(process.env.SUPABASE_IDLE_TIMEOUT || "300000"), // 5 minutes
      connectionTimeout: parseInt(
        process.env.SUPABASE_CONNECTION_TIMEOUT || "10000",
      ), // 10 seconds
    };
  }

  async getConnection(): Promise<SupabaseClient> {
    // Try to find an idle connection
    const idleConnection = this.pool.find((conn) => !conn.inUse);

    if (idleConnection) {
      idleConnection.inUse = true;
      idleConnection.lastUsed = Date.now();
      return idleConnection.client;
    }

    // Create new connection if under limit
    if (this.pool.length < this.config.maxConnections) {
      const client = createClient(
        this.config.supabaseUrl,
        this.config.supabaseKey,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
          db: {
            schema: "public",
          },
          global: {
            headers: {
              "x-connection-pool": "true",
            },
          },
        },
      );

      const connection: PooledConnection = {
        client,
        created: Date.now(),
        lastUsed: Date.now(),
        inUse: true,
      };

      this.pool.push(connection);
      return client;
    }

    // Wait for a connection to become available
    return this.waitForConnection();
  }

  releaseConnection(client: SupabaseClient): void {
    const connection = this.pool.find((conn) => conn.client === client);
    if (connection) {
      connection.inUse = false;
      connection.lastUsed = Date.now();
    }
  }

  private async waitForConnection(): Promise<SupabaseClient> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Connection timeout: No connections available"));
      }, this.config.connectionTimeout);

      const checkForConnection = () => {
        const idleConnection = this.pool.find((conn) => !conn.inUse);
        if (idleConnection) {
          clearTimeout(timeout);
          idleConnection.inUse = true;
          idleConnection.lastUsed = Date.now();
          resolve(idleConnection.client);
        } else {
          // Check again in 100ms
          setTimeout(checkForConnection, 100);
        }
      };

      checkForConnection();
    });
  }

  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleConnections();
    }, 60000); // Check every minute

    // Cleanup on process exit
    process.on("exit", () => this.cleanup());
    process.on("SIGINT", () => this.cleanup());
    process.on("SIGTERM", () => this.cleanup());
  }

  private cleanupIdleConnections(): void {
    const now = Date.now();
    const minConnections = Math.ceil(this.config.maxConnections * 0.2); // Keep at least 20%

    this.pool = this.pool.filter((connection) => {
      const isIdle = !connection.inUse;
      const isExpired = now - connection.lastUsed > this.config.idleTimeout;
      const shouldRemove =
        isIdle && isExpired && this.pool.length > minConnections;

      if (shouldRemove) {
        // Supabase client doesn't have explicit close method, but we can clear references
        console.log("Removing idle Supabase connection");
      }

      return !shouldRemove;
    });
  }

  getPoolStats(): {
    total: number;
    inUse: number;
    idle: number;
    maxConnections: number;
  } {
    const inUse = this.pool.filter((conn) => conn.inUse).length;
    const idle = this.pool.filter((conn) => !conn.inUse).length;

    return {
      total: this.pool.length,
      inUse,
      idle,
      maxConnections: this.config.maxConnections,
    };
  }

  private cleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.pool = [];
  }
}

/**
 * Helper function for using connections with automatic release
 */
export async function withConnection<T>(
  operation: (client: SupabaseClient) => Promise<T>,
  config?: ConnectionConfig,
): Promise<T> {
  const pool = SupabaseConnectionPool.getInstance(config);
  const client = await pool.getConnection();

  try {
    return await operation(client);
  } finally {
    pool.releaseConnection(client);
  }
}

/**
 * Get connection pool statistics for monitoring
 */
export function getConnectionPoolStats() {
  try {
    const pool = SupabaseConnectionPool.getInstance();
    return pool.getPoolStats();
  } catch {
    return {
      total: 0,
      inUse: 0,
      idle: 0,
      maxConnections: 0,
    };
  }
}
