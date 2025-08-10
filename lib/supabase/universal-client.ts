/**
 * Universal Supabase client that adapts to the current environment
 *
 * @module lib/supabase/universal-client
 * @description Provides a Supabase client that automatically detects and adapts
 * to the current runtime environment (browser or server) with connection pooling
 * optimization for server environments
 */

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClientOptions } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { getSupabaseConfig, BROWSER_CLIENT_CONFIG } from "./supabase-config";
import { SupabaseConfigError, withErrorHandling } from "./supabase-errors";
import type { TypedSupabaseClient } from "./supabase-types";
import { withPooledClient } from "./server-pooled";

/**
 * Detect the current runtime environment
 */
function detectEnvironment(): "browser" | "server" | "unknown" {
  // Check if we're in a browser environment
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    return "browser";
  }

  // Check if we're in a Node.js/server environment
  if (
    typeof process !== "undefined" &&
    process.versions &&
    process.versions.node
  ) {
    return "server";
  }

  return "unknown";
}

/**
 * Create a universal Supabase client that works in any environment
 *
 * @description Creates a Supabase client that automatically adapts to the
 * current runtime environment. In browser environments, it creates a browser
 * client with session persistence. In server environments, it creates a
 * stateless client.
 *
 * @param {Object} options - Optional configuration
 * @param {boolean} options.forceEnvironment - Force a specific environment type
 * @returns {TypedSupabaseClient} Configured Supabase client
 * @throws {SupabaseConfigError} If configuration is invalid
 *
 * @example
 * ```typescript
 * // Automatic environment detection
 * const client = createClient();
 *
 * // Use the client
 * const { data, error } = await client
 *   .from('items')
 *   .select('*');
 * ```
 *
 * @example
 * ```typescript
 * // Force browser environment behavior
 * const client = createClient({ forceEnvironment: 'browser' });
 * ```
 *
 * @deprecated Consider using environment-specific clients directly:
 * - Use `@/lib/supabase/client` for browser-only code
 * - Use `@/lib/supabase/server` for server-only code
 */
export function createClient(options?: {
  forceEnvironment?: "browser" | "server";
}): TypedSupabaseClient {
  try {
    // Get and validate configuration
    const config = getSupabaseConfig();

    // Detect or use forced environment
    const environment = options?.forceEnvironment || detectEnvironment();

    if (environment === "unknown") {
      console.warn(
        "Unable to detect environment. Defaulting to browser client configuration.",
      );
    }

    // For server environments, we still use browser client but without session persistence
    // This is because proper server client requires cookie access which isn't available here
    const clientConfig: SupabaseClientOptions<"public"> =
      environment === "server"
        ? {
            ...BROWSER_CLIENT_CONFIG,
            auth: {
              ...BROWSER_CLIENT_CONFIG.auth,
              persistSession: false,
              autoRefreshToken: false,
              detectSessionInUrl: false,
            },
            db: {
              schema: "public",
            },
          }
        : {
            ...BROWSER_CLIENT_CONFIG,
            db: {
              schema: "public",
            },
          };

    // Create the client
    const client = createBrowserClient<Database>(
      config.url,
      config.anonKey,
      clientConfig,
    );

    return client as TypedSupabaseClient;
  } catch (error) {
    if (error instanceof SupabaseConfigError) {
      throw error;
    }

    throw new SupabaseConfigError(
      `Failed to create universal client: ${error instanceof Error ? error.message : String(error)}`,
      { originalError: error },
    );
  }
}

/**
 * Create a universal client with automatic error handling
 *
 * @param {Object} options - Optional configuration
 * @returns {Promise<{ success: boolean; client?: TypedSupabaseClient; error?: Error }>}
 *
 * @example
 * ```typescript
 * const result = await createUniversalClientSafe();
 * if (result.success && result.client) {
 *   // Use the client
 * } else {
 *   console.error('Failed to create client:', result.error);
 * }
 * ```
 */
export const createUniversalClientSafe = async (options?: {
  forceEnvironment?: "browser" | "server";
}): Promise<{
  success: boolean;
  client?: TypedSupabaseClient;
  error?: Error;
}> => {
  const result = await withErrorHandling(
    async () => createClient(options),
    "createUniversalClient",
  );

  return {
    success: result.success,
    client: result.data,
    error: result.error,
  };
};

/**
 * @deprecated Use `createClient` instead
 */
export const createUniversalClient = createClient;

/**
 * Execute operation with universal client - uses connection pooling in server environments
 *
 * @param {Function} operation - The operation to execute
 * @returns {Promise<T>} Result of the operation
 *
 * @example
 * ```typescript
 * const data = await withUniversalClient(async (client) => {
 *   const { data } = await client.from('items').select('*');
 *   return data;
 * });
 * ```
 */
export async function withUniversalClient<T>(
  operation: (client: TypedSupabaseClient) => Promise<T>,
): Promise<T> {
  const environment = detectEnvironment();

  // Use pooled connections for server environments when possible
  if (environment === "server") {
    try {
      return await withPooledClient(operation);
    } catch (error) {
      // Fallback to creating a universal client if pooling fails
      console.warn(
        "Pooled connection failed, falling back to universal client:",
        error,
      );
      const client = createClient();
      return await operation(client);
    }
  }

  // Use universal client for browser/unknown environments
  const client = createClient();
  return await operation(client);
}

/**
 * Get information about the current environment
 *
 * @returns {Object} Environment information
 *
 * @example
 * ```typescript
 * const info = getEnvironmentInfo();
 * console.log(`Running in ${info.environment} environment`);
 * ```
 */
export function getEnvironmentInfo(): {
  environment: "browser" | "server" | "unknown";
  hasWindow: boolean;
  hasDocument: boolean;
  hasProcess: boolean;
  nodeVersion?: string;
} {
  const environment = detectEnvironment();

  return {
    environment,
    hasWindow: typeof window !== "undefined",
    hasDocument: typeof document !== "undefined",
    hasProcess: typeof process !== "undefined",
    nodeVersion:
      typeof process !== "undefined" && process.versions
        ? process.versions.node
        : undefined,
  };
}
