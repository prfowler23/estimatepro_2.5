/**
 * Admin Supabase client with elevated permissions
 *
 * @module lib/supabase/admin
 * @description Provides admin-level Supabase client with service role key
 * for operations that need to bypass Row Level Security (RLS)
 */

import { createPooledClient } from "./server-pooled";
import { getSupabaseConfig, hasServiceRoleKey } from "./supabase-config";
import {
  SupabaseConfigError,
  withErrorHandling,
  withRetry,
} from "./supabase-errors";
import type {
  TypedSupabaseClient,
  AdminClientOptions,
  AuditLogEntry,
} from "./supabase-types";

/**
 * Audit logger for admin operations (placeholder for actual implementation)
 */
const auditLog = async (entry: Partial<AuditLogEntry>): Promise<void> => {
  if (process.env.SUPABASE_ENABLE_AUDIT_LOG === "true") {
    // In production, this would write to a secure audit log
    console.log("[AUDIT]", {
      ...entry,
      timestamp: new Date(),
      clientType: "admin" as const,
    });
  }
};

/**
 * Create an admin Supabase client with elevated permissions
 *
 * @description Creates a Supabase client using the service role key,
 * which bypasses Row Level Security (RLS) policies. Use with caution
 * and only for administrative operations that require full database access.
 *
 * @param {AdminClientOptions} options - Optional configuration for admin client
 * @returns {TypedSupabaseClient} Admin Supabase client with full permissions
 *
 * @throws {SupabaseConfigError} If service role key is not configured
 *
 * @example
 * ```typescript
 * // Basic usage
 * const adminClient = createAdminClient();
 *
 * // With audit logging enabled
 * const adminClient = createAdminClient({
 *   enableAuditLog: true
 * });
 *
 * // Use for administrative operations
 * const { data, error } = await adminClient
 *   .from('users')
 *   .select('*')
 *   .eq('role', 'admin');
 * ```
 *
 * @security
 * - Only use for trusted server-side operations
 * - Never expose admin client to client-side code
 * - Always audit admin operations in production
 * - Implement rate limiting for admin endpoints
 */
export const createAdminClient = async (
  options?: AdminClientOptions,
): Promise<TypedSupabaseClient> => {
  const startTime = Date.now();

  try {
    // Validate service role key is available
    if (!hasServiceRoleKey()) {
      throw new SupabaseConfigError(
        "Service role key is required for admin client. " +
          "Please set SUPABASE_SERVICE_ROLE_KEY environment variable.",
      );
    }

    // Get configuration
    const config = getSupabaseConfig();

    // Log admin client creation if audit logging is enabled
    if (options?.enableAuditLog) {
      await auditLog({
        operation: "CREATE_ADMIN_CLIENT",
        details: {
          bypassRLS: options.bypassRLS !== false,
          rateLimiting: options.enableRateLimiting,
        },
        success: false, // Will be updated on success
        duration: 0,
      });
    }

    // Create pooled client with retry logic
    const client = await withRetry(() => createPooledClient(), {
      maxAttempts: 3,
      shouldRetry: (error, attempt) => attempt < 3,
      getDelay: (attempt) => Math.min(1000 * Math.pow(2, attempt - 1), 5000),
    });

    // Log successful creation
    if (options?.enableAuditLog) {
      await auditLog({
        operation: "CREATE_ADMIN_CLIENT",
        success: true,
        duration: Date.now() - startTime,
      });
    }

    return client;
  } catch (error) {
    // Log failure
    if (options?.enableAuditLog) {
      await auditLog({
        operation: "CREATE_ADMIN_CLIENT",
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      });
    }

    throw error;
  }
};

/**
 * Create an admin client with automatic error handling
 *
 * @param {AdminClientOptions} options - Optional configuration
 * @returns {Promise<{ success: boolean; client?: TypedSupabaseClient; error?: Error }>}
 *
 * @example
 * ```typescript
 * const result = await createAdminClientSafe();
 * if (result.success && result.client) {
 *   // Use the client
 * } else {
 *   console.error('Failed to create admin client:', result.error);
 * }
 * ```
 */
export const createAdminClientSafe = async (
  options?: AdminClientOptions,
): Promise<{
  success: boolean;
  client?: TypedSupabaseClient;
  error?: Error;
}> => {
  const result = await withErrorHandling(
    () => createAdminClient(options),
    "createAdminClient",
  );

  return {
    success: result.success,
    client: result.data,
    error: result.error,
  };
};

/**
 * Execute an admin operation with audit logging
 *
 * @param {Function} operation - The operation to execute
 * @param {string} operationName - Name of the operation for logging
 * @param {AdminClientOptions} options - Optional configuration
 * @returns {Promise<T>} Result of the operation
 *
 * @example
 * ```typescript
 * const users = await withAdminOperation(
 *   async (client) => {
 *     const { data } = await client.from('users').select('*');
 *     return data;
 *   },
 *   'LIST_ALL_USERS',
 *   { enableAuditLog: true }
 * );
 * ```
 */
export const withAdminOperation = async <T>(
  operation: (client: TypedSupabaseClient) => Promise<T>,
  operationName: string,
  options?: AdminClientOptions,
): Promise<T> => {
  const startTime = Date.now();
  const client = await createAdminClient(options);

  try {
    // Log operation start
    if (options?.enableAuditLog) {
      await auditLog({
        operation: operationName,
        details: { started: true },
        success: false,
        duration: 0,
      });
    }

    // Execute operation
    const result = await operation(client);

    // Log operation success
    if (options?.enableAuditLog) {
      await auditLog({
        operation: operationName,
        success: true,
        duration: Date.now() - startTime,
      });
    }

    return result;
  } catch (error) {
    // Log operation failure
    if (options?.enableAuditLog) {
      await auditLog({
        operation: operationName,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      });
    }

    throw error;
  }
};
