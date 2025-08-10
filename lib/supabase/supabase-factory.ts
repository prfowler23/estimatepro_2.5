/**
 * Unified Supabase client factory
 *
 * @module lib/supabase/supabase-factory
 * @description Provides a unified factory for creating different types of Supabase clients
 * with automatic environment detection and optimal client selection
 */

import type { Database } from "@/types/supabase";
import { supabase as browserClient } from "./client";
import { createServerClient } from "./server";
import { createAdminClient } from "./admin";
import { createPooledClient, withPooledClient } from "./server-pooled";
import { createClient as createUniversalClient } from "./universal-client";
import {
  SupabaseConfigError,
  SupabaseConnectionError,
  withErrorHandling,
} from "./supabase-errors";
import {
  ClientType,
  type TypedSupabaseClient,
  type ServerClientOptions,
  type AdminClientOptions,
} from "./supabase-types";

/**
 * Factory options for creating Supabase clients
 */
export interface SupabaseFactoryOptions {
  /**
   * Type of client to create
   * - 'auto': Automatically detect based on environment
   * - 'browser': Browser client with session persistence
   * - 'server': Server client with cookie handling
   * - 'admin': Admin client with service role key
   * - 'pooled': Pooled connection for high-throughput operations
   * - 'universal': Environment-adaptive client
   */
  type?: "auto" | "browser" | "server" | "admin" | "pooled" | "universal";

  /**
   * Additional options for specific client types
   */
  options?: ServerClientOptions | AdminClientOptions;

  /**
   * Force a specific environment (for universal client)
   */
  forceEnvironment?: "browser" | "server";

  /**
   * Enable detailed logging
   */
  enableLogging?: boolean;
}

/**
 * Detect the current runtime environment
 */
function detectEnvironment(): "browser" | "server" | "edge" {
  // Check for browser environment
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    return "browser";
  }

  // Check for Edge Runtime (Vercel Edge Functions, Cloudflare Workers, etc.)
  if (typeof globalThis !== "undefined" && !("process" in globalThis)) {
    return "edge";
  }

  // Node.js server environment
  if (typeof process !== "undefined" && process.versions?.node) {
    return "server";
  }

  // Default to server for safety
  return "server";
}

/**
 * Detect if we have access to Next.js cookies
 */
function hasNextjsCookies(): boolean {
  try {
    // Try to import Next.js headers to check if we're in a Next.js server context
    require("next/headers");
    return true;
  } catch {
    return false;
  }
}

/**
 * Unified factory for creating Supabase clients
 *
 * @description Creates the appropriate Supabase client based on the environment
 * and specified options. Automatically detects the runtime environment and
 * selects the optimal client type.
 *
 * @param {SupabaseFactoryOptions} options - Factory options
 * @returns {Promise<TypedSupabaseClient> | TypedSupabaseClient} The created client
 * @throws {SupabaseConfigError} If configuration is invalid
 * @throws {SupabaseConnectionError} If unable to create client
 *
 * @example
 * ```typescript
 * // Automatic detection (recommended)
 * const client = await createSupabaseClient();
 *
 * // Specific client type
 * const adminClient = await createSupabaseClient({ type: 'admin' });
 *
 * // With options
 * const serverClient = await createSupabaseClient({
 *   type: 'server',
 *   options: { enableAuditLog: true }
 * });
 * ```
 */
export async function createSupabaseClient(
  options: SupabaseFactoryOptions = {},
): Promise<TypedSupabaseClient> {
  const { type = "auto", enableLogging = false } = options;

  try {
    // Log factory operation if enabled
    if (enableLogging) {
      console.log("[SupabaseFactory] Creating client with options:", {
        type,
        environment: detectEnvironment(),
        hasNextjsCookies: hasNextjsCookies(),
      });
    }

    // Handle automatic detection
    if (type === "auto") {
      const environment = detectEnvironment();

      if (environment === "browser") {
        if (enableLogging) {
          console.log("[SupabaseFactory] Auto-detected browser environment");
        }
        return browserClient;
      }

      if (environment === "server" && hasNextjsCookies()) {
        if (enableLogging) {
          console.log(
            "[SupabaseFactory] Auto-detected Next.js server environment",
          );
        }
        return await createServerClient(options.options as ServerClientOptions);
      }

      // Fallback to universal client for edge or unknown environments
      if (enableLogging) {
        console.log(
          "[SupabaseFactory] Using universal client for edge/unknown environment",
        );
      }
      return createUniversalClient({
        forceEnvironment: options.forceEnvironment,
      });
    }

    // Handle specific client types
    switch (type) {
      case "browser":
        if (typeof window === "undefined") {
          throw new SupabaseConfigError(
            "Browser client requested but not in browser environment",
          );
        }
        return browserClient;

      case "server":
        return await createServerClient(options.options as ServerClientOptions);

      case "admin":
        return await createAdminClient(options.options as AdminClientOptions);

      case "pooled":
        return await createPooledClient();

      case "universal":
        return createUniversalClient({
          forceEnvironment: options.forceEnvironment,
        });

      default:
        throw new SupabaseConfigError(`Unknown client type: ${type}`);
    }
  } catch (error) {
    if (
      error instanceof SupabaseConfigError ||
      error instanceof SupabaseConnectionError
    ) {
      throw error;
    }

    throw new SupabaseConnectionError(
      `Failed to create Supabase client: ${error instanceof Error ? error.message : String(error)}`,
      false,
      { originalError: error },
    );
  }
}

/**
 * Create a Supabase client with automatic error handling
 *
 * @param {SupabaseFactoryOptions} options - Factory options
 * @returns {Promise<{ success: boolean; client?: TypedSupabaseClient; error?: Error }>}
 *
 * @example
 * ```typescript
 * const result = await createSupabaseClientSafe({ type: 'admin' });
 * if (result.success && result.client) {
 *   // Use the client
 * } else {
 *   console.error('Failed to create client:', result.error);
 * }
 * ```
 */
export async function createSupabaseClientSafe(
  options: SupabaseFactoryOptions = {},
): Promise<{
  success: boolean;
  client?: TypedSupabaseClient;
  error?: Error;
}> {
  const result = await withErrorHandling(
    () => createSupabaseClient(options),
    "createSupabaseClient",
  );

  return {
    success: result.success,
    client: result.data,
    error: result.error,
  };
}

/**
 * Execute an operation with automatic client selection
 *
 * @param {Function} operation - The operation to execute
 * @param {SupabaseFactoryOptions} options - Factory options
 * @returns {Promise<T>} Result of the operation
 *
 * @example
 * ```typescript
 * // Automatic client selection
 * const users = await withSupabaseClient(async (client) => {
 *   const { data } = await client.from('users').select('*');
 *   return data;
 * });
 *
 * // With specific client type
 * const adminUsers = await withSupabaseClient(
 *   async (client) => {
 *     const { data } = await client.from('users').select('*');
 *     return data;
 *   },
 *   { type: 'admin' }
 * );
 * ```
 */
export async function withSupabaseClient<T>(
  operation: (client: TypedSupabaseClient) => Promise<T>,
  options: SupabaseFactoryOptions = {},
): Promise<T> {
  // Special handling for pooled connections
  if (options.type === "pooled") {
    return withPooledClient(operation);
  }

  const client = await createSupabaseClient(options);
  return operation(client);
}

/**
 * Get client type information
 *
 * @param {TypedSupabaseClient} client - The client to inspect
 * @returns {ClientType} The type of the client
 *
 * @example
 * ```typescript
 * const client = await createSupabaseClient();
 * const type = getClientType(client);
 * console.log(`Using ${ClientType[type]} client`);
 * ```
 */
export function getClientType(client: TypedSupabaseClient): ClientType {
  // This is a simplified implementation
  // In a real implementation, you might want to add metadata to clients
  // to properly identify their type

  const environment = detectEnvironment();

  if (environment === "browser") {
    return ClientType.BROWSER;
  }

  if (hasNextjsCookies()) {
    return ClientType.SERVER;
  }

  // Default to admin for server environments without cookies
  // (in practice, you'd want better detection logic)
  return ClientType.ADMIN;
}

/**
 * Preload and cache clients for better performance
 *
 * @description Preloads clients to reduce initial connection latency.
 * Useful for serverless environments where cold starts are a concern.
 *
 * @param {Array<'browser' | 'server' | 'admin' | 'pooled'>} types - Client types to preload
 * @returns {Promise<void>}
 *
 * @example
 * ```typescript
 * // In app initialization
 * await preloadClients(['server', 'pooled']);
 * ```
 */
export async function preloadClients(
  types: Array<"browser" | "server" | "admin" | "pooled">,
): Promise<void> {
  const promises = types.map((type) => {
    return createSupabaseClientSafe({ type }).catch((error) => {
      console.warn(`Failed to preload ${type} client:`, error);
    });
  });

  await Promise.all(promises);
}

// Re-export commonly used types and utilities
export type { TypedSupabaseClient, ClientType } from "./supabase-types";
export { ClientType as SupabaseClientType } from "./supabase-types";

// Re-export error classes for convenience
export {
  SupabaseConfigError,
  SupabaseConnectionError,
  SupabasePoolError,
  SupabaseTimeoutError,
} from "./supabase-errors";
