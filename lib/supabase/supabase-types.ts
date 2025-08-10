/**
 * Shared type definitions for Supabase client management
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

/**
 * Type-safe Supabase client
 */
export type TypedSupabaseClient = SupabaseClient<Database>;

/**
 * Client type enumeration
 */
export enum ClientType {
  BROWSER = "browser",
  SERVER = "server",
  ADMIN = "admin",
  POOLED = "pooled",
}

/**
 * Connection state for pooled clients
 */
export enum ConnectionState {
  IDLE = "idle",
  CONNECTING = "connecting",
  CONNECTED = "connected",
  DISCONNECTING = "disconnecting",
  DISCONNECTED = "disconnected",
  ERROR = "error",
}

/**
 * Pooled connection metadata
 */
export interface PooledConnection {
  id: string;
  client: TypedSupabaseClient;
  state: ConnectionState;
  created: Date;
  lastUsed: Date;
  useCount: number;
  errors: number;
  inUse: boolean;
}

/**
 * Pool statistics for monitoring
 */
export interface PoolStatistics {
  total: number;
  inUse: number;
  idle: number;
  connecting: number;
  errors: number;
  maxConnections: number;
  minConnections: number;
  avgWaitTime: number;
  avgUseTime: number;
  totalRequests: number;
  totalErrors: number;
  uptime: number;
  healthStatus: "healthy" | "degraded" | "unhealthy";
}

/**
 * Connection metrics for monitoring
 */
export interface ConnectionMetrics {
  connectionId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  operationType?: string;
  success: boolean;
  error?: string;
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: Date;
  latency: number;
  details: {
    database: boolean;
    auth: boolean;
    storage?: boolean;
    realtime?: boolean;
  };
  errors?: string[];
}

/**
 * Audit log entry for admin operations
 */
export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  operation: string;
  userId?: string;
  clientType: ClientType;
  details: Record<string, unknown>;
  success: boolean;
  error?: string;
  duration: number;
}

/**
 * Client factory options
 */
export interface ClientFactoryOptions {
  type: ClientType;
  enableLogging?: boolean;
  enableMetrics?: boolean;
  enableHealthChecks?: boolean;
  customHeaders?: Record<string, string>;
  timeout?: number;
}

/**
 * Server client options
 */
export interface ServerClientOptions {
  cookies?: () => { get: (name: string) => string | undefined };
  enableCaching?: boolean;
  cacheTimeout?: number;
}

/**
 * Admin client options
 */
export interface AdminClientOptions {
  enableAuditLog?: boolean;
  enableRateLimiting?: boolean;
  rateLimitPerMinute?: number;
  bypassRLS?: boolean;
}

/**
 * Client lifecycle hooks
 */
export interface ClientLifecycleHooks {
  onCreate?: (client: TypedSupabaseClient) => void | Promise<void>;
  onConnect?: (client: TypedSupabaseClient) => void | Promise<void>;
  onDisconnect?: (client: TypedSupabaseClient) => void | Promise<void>;
  onError?: (error: Error, client: TypedSupabaseClient) => void | Promise<void>;
  onDestroy?: (client: TypedSupabaseClient) => void | Promise<void>;
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  enabled: boolean;
  maxRequests: number;
  windowMs: number;
  keyGenerator?: (context: unknown) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  enabled: boolean;
  ttl: number;
  maxSize: number;
  keyPrefix: string;
  excludePatterns?: RegExp[];
  includePatterns?: RegExp[];
}

/**
 * Monitoring configuration
 */
export interface MonitoringConfig {
  enabled: boolean;
  metricsInterval: number;
  healthCheckInterval: number;
  logLevel: "debug" | "info" | "warn" | "error";
  customMetrics?: (client: TypedSupabaseClient) => Record<string, number>;
}

/**
 * Client manager interface
 */
export interface IClientManager {
  getClient(options?: ClientFactoryOptions): TypedSupabaseClient;
  releaseClient(client: TypedSupabaseClient): void;
  getStatistics(): PoolStatistics;
  healthCheck(): Promise<HealthCheckResult>;
  shutdown(): Promise<void>;
}

/**
 * Connection pool interface
 */
export interface IConnectionPool {
  acquire(): Promise<TypedSupabaseClient>;
  release(client: TypedSupabaseClient): void;
  drain(): Promise<void>;
  getStats(): PoolStatistics;
  isHealthy(): boolean;
}

/**
 * Type guards
 */
export function isTypedSupabaseClient(
  client: unknown,
): client is TypedSupabaseClient {
  return (
    client !== null &&
    typeof client === "object" &&
    "from" in client &&
    "auth" in client &&
    "storage" in client
  );
}

export function isPooledConnection(
  connection: unknown,
): connection is PooledConnection {
  return (
    connection !== null &&
    typeof connection === "object" &&
    "id" in connection &&
    "client" in connection &&
    "state" in connection &&
    isTypedSupabaseClient((connection as any).client)
  );
}

/**
 * Utility type for extracting table names
 */
export type TableName = keyof Database["public"]["Tables"];

/**
 * Utility type for extracting table row types
 */
export type TableRow<T extends TableName> =
  Database["public"]["Tables"][T]["Row"];

/**
 * Utility type for extracting table insert types
 */
export type TableInsert<T extends TableName> =
  Database["public"]["Tables"][T]["Insert"];

/**
 * Utility type for extracting table update types
 */
export type TableUpdate<T extends TableName> =
  Database["public"]["Tables"][T]["Update"];

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG = {
  POOL_MAX_SIZE: 10,
  POOL_MIN_SIZE: 2,
  CONNECTION_TIMEOUT: 10000,
  IDLE_TIMEOUT: 300000,
  HEALTH_CHECK_INTERVAL: 60000,
  METRICS_INTERVAL: 30000,
  CACHE_TTL: 300000,
  RATE_LIMIT_REQUESTS: 100,
  RATE_LIMIT_WINDOW: 60000,
} as const;
