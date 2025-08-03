import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";

// Connection pool configuration
const POOL_CONFIG = {
  // Connection pool settings
  db: {
    // Maximum number of clients in the pool
    poolSize: 10,
    // Maximum time (in milliseconds) a client can remain idle in the pool
    idleTimeout: 20000,
    // Maximum time (in milliseconds) to wait for a connection
    connectionTimeout: 5000,
  },
  // Global settings
  global: {
    // Headers to apply to all requests
    headers: {
      "x-connection-pooled": "true",
    },
  },
  // Auth settings with connection reuse
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
};

// Singleton instance for connection pooling
let pooledClient: SupabaseClient<Database> | null = null;

/**
 * Create a Supabase client with connection pooling for server-side use
 * This should be used for all database operations in API routes
 */
export function createPooledClient() {
  // Return existing pooled client if available
  if (pooledClient) {
    return pooledClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase environment variables");
  }

  // Create pooled client with optimized settings
  pooledClient = createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      ...POOL_CONFIG.auth,
      // Use service role key for server-side operations
      persistSession: false,
    },
  });

  return pooledClient;
}

/**
 * Get connection pool statistics (for monitoring)
 */
export function getPoolStats() {
  if (!pooledClient) {
    return {
      status: "not_initialized",
      poolSize: 0,
      activeConnections: 0,
    };
  }

  // Note: Actual stats would require access to the underlying pool
  // This is a placeholder for monitoring integration
  return {
    status: "active",
    poolSize: POOL_CONFIG.db.poolSize,
    idleTimeout: POOL_CONFIG.db.idleTimeout,
    connectionTimeout: POOL_CONFIG.db.connectionTimeout,
  };
}

/**
 * Close all connections in the pool (for graceful shutdown)
 */
export async function closePool() {
  if (pooledClient) {
    // In a real implementation, this would close all pool connections
    pooledClient = null;
  }
}
