"use client";

/**
 * Browser-side Supabase client with singleton pattern
 *
 * @module lib/supabase/client
 * @description Provides a singleton Supabase client for browser-side operations
 * with automatic session management and proper error handling. For server-side
 * operations, automatically uses connection pooling when available.
 */

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import {
  getSupabaseConfig,
  getClientConfig,
  BROWSER_CLIENT_CONFIG,
} from "./supabase-config";
import { SupabaseConfigError, withErrorHandling } from "./supabase-errors";
import type { TypedSupabaseClient } from "./supabase-types";

/**
 * Singleton instance holder using closure pattern
 * This ensures only one client instance exists per browser session
 */
const clientSingleton = (() => {
  let instance: TypedSupabaseClient | null = null;
  let initialized = false;
  let initializationError: Error | null = null;

  /**
   * Initialize the singleton client
   */
  const initialize = (): TypedSupabaseClient => {
    if (initialized && instance) {
      return instance;
    }

    if (initializationError) {
      throw initializationError;
    }

    try {
      // Get and validate configuration
      const config = getSupabaseConfig();

      // Validate we're in a browser environment
      if (typeof window === "undefined") {
        throw new SupabaseConfigError(
          "Browser client can only be used in browser environment. " +
            "Use server or universal client for server-side operations.",
        );
      }

      // Create the client with browser-specific configuration
      instance = createSupabaseClient<Database>(
        config.url,
        config.anonKey,
        BROWSER_CLIENT_CONFIG,
      );

      initialized = true;
      return instance;
    } catch (error) {
      initializationError =
        error instanceof Error ? error : new Error(String(error));
      throw initializationError;
    }
  };

  /**
   * Get the singleton instance
   */
  const getInstance = (): TypedSupabaseClient => {
    if (!initialized || !instance) {
      return initialize();
    }
    return instance;
  };

  /**
   * Reset the singleton (mainly for testing)
   */
  const reset = (): void => {
    instance = null;
    initialized = false;
    initializationError = null;
  };

  return {
    getInstance,
    reset,
  };
})();

/**
 * Get the singleton Supabase client for browser-side operations
 *
 * @description Returns a singleton Supabase client configured for browser use
 * with session persistence, automatic token refresh, and URL detection.
 *
 * @returns {TypedSupabaseClient} Configured Supabase client
 * @throws {SupabaseConfigError} If configuration is invalid or environment is not browser
 *
 * @example
 * ```typescript
 * import { supabase } from '@/lib/supabase/client';
 *
 * // Use the client
 * const { data, error } = await supabase
 *   .from('users')
 *   .select('*');
 *
 * // Auth operations
 * const { data: { user } } = await supabase.auth.getUser();
 * ```
 */
export const supabase: TypedSupabaseClient = clientSingleton.getInstance();

/**
 * Create a Supabase client (returns singleton instance)
 *
 * @deprecated Use `supabase` export directly instead
 * @returns {TypedSupabaseClient} The singleton Supabase client
 *
 * @example
 * ```typescript
 * // Deprecated
 * const client = createClient();
 *
 * // Preferred
 * import { supabase } from '@/lib/supabase/client';
 * ```
 */
export const createClient = (): TypedSupabaseClient => {
  // Suppress deprecation warning for now to avoid console spam
  // TODO: Migrate all usages to use 'supabase' export directly
  return supabase;
};

/**
 * Create a client with automatic error handling
 *
 * @returns {Promise<{ success: boolean; client?: TypedSupabaseClient; error?: Error }>}
 *
 * @example
 * ```typescript
 * const result = await createClientSafe();
 * if (result.success && result.client) {
 *   // Use the client
 * } else {
 *   console.error('Failed to create client:', result.error);
 * }
 * ```
 */
export const createClientSafe = async (): Promise<{
  success: boolean;
  client?: TypedSupabaseClient;
  error?: Error;
}> => {
  const result = await withErrorHandling(
    async () => clientSingleton.getInstance(),
    "createBrowserClient",
  );

  return {
    success: result.success,
    client: result.data,
    error: result.error,
  };
};

/**
 * Check if the client is initialized
 *
 * @returns {boolean} True if client is initialized
 */
export const isClientInitialized = (): boolean => {
  try {
    const client = clientSingleton.getInstance();
    return client !== null;
  } catch {
    return false;
  }
};

/**
 * Reset the client singleton (for testing)
 *
 * @internal
 */
export const resetClient = (): void => {
  if (process.env.NODE_ENV === "test") {
    clientSingleton.reset();
  }
};
