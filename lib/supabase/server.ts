/**
 * Server-side Supabase client with cookie-based authentication
 *
 * @module lib/supabase/server
 * @description Provides a Supabase client for Next.js server-side operations
 * with automatic cookie handling for user session management and optional
 * connection pooling for improved performance
 */

import { createServerClient as createSupabaseServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/supabase";
import { getSupabaseConfig, SERVER_CLIENT_CONFIG } from "./supabase-config";
import {
  SupabaseConfigError,
  SupabaseConnectionError,
  withErrorHandling,
  withRetry,
} from "./supabase-errors";
import type {
  TypedSupabaseClient,
  ServerClientOptions,
} from "./supabase-types";
import { withPooledClient } from "./server-pooled";

/**
 * Create a server-side Supabase client with user session
 *
 * @description Creates a Supabase client for server-side operations in Next.js
 * Route Handlers and Server Components. Automatically handles cookie-based
 * authentication to maintain user sessions.
 *
 * @param {ServerClientOptions} options - Optional configuration
 * @returns {Promise<TypedSupabaseClient>} Configured server-side Supabase client
 * @throws {SupabaseConfigError} If configuration is invalid
 * @throws {SupabaseConnectionError} If unable to establish connection
 *
 * @example
 * ```typescript
 * // In a Server Component
 * import { createServerClient } from '@/lib/supabase/server';
 *
 * export default async function Page() {
 *   const supabase = await createServerClient();
 *   const { data: { user } } = await supabase.auth.getUser();
 *
 *   if (!user) {
 *     return <div>Please sign in</div>;
 *   }
 *
 *   const { data } = await supabase
 *     .from('posts')
 *     .select('*')
 *     .eq('user_id', user.id);
 *
 *   return // Render posts
 * }
 * ```
 *
 * @example
 * ```typescript
 * // In a Route Handler
 * import { createServerClient } from '@/lib/supabase/server';
 * import { NextResponse } from 'next/server';
 *
 * export async function GET() {
 *   const supabase = await createServerClient();
 *   const { data, error } = await supabase
 *     .from('items')
 *     .select('*');
 *
 *   if (error) {
 *     return NextResponse.json({ error: error.message }, { status: 500 });
 *   }
 *
 *   return NextResponse.json({ data });
 * }
 * ```
 */
export const createServerClient = async (
  options?: ServerClientOptions,
): Promise<TypedSupabaseClient> => {
  try {
    // Get and validate configuration
    const config = getSupabaseConfig();

    // Validate server environment
    if (typeof window !== "undefined") {
      throw new SupabaseConfigError(
        "Server client can only be used in server environment. " +
          "Use browser client for client-side operations.",
      );
    }

    // Get cookie store with error handling
    let cookieStore: Awaited<ReturnType<typeof cookies>>;
    try {
      cookieStore = await cookies();
    } catch (error) {
      throw new SupabaseConnectionError(
        "Failed to access cookies. Ensure this is called in a Server Component or Route Handler.",
        false,
        { originalError: error },
      );
    }

    // Create the server client with cookie handling
    const client = createSupabaseServerClient<Database>(
      config.url,
      config.anonKey,
      {
        ...SERVER_CLIENT_CONFIG,
        cookies: {
          get(name: string) {
            try {
              const cookie = cookieStore.get(name);
              return cookie?.value;
            } catch (error) {
              console.warn(`Failed to get cookie ${name}:`, error);
              return undefined;
            }
          },
          set(name: string, value: string, options: any) {
            try {
              // Note: Setting cookies in Server Components is not supported
              // This is primarily for Route Handlers
              cookieStore.set({
                name,
                value,
                ...options,
              });
            } catch (error) {
              console.warn(`Failed to set cookie ${name}:`, error);
            }
          },
          remove(name: string, options: any) {
            try {
              // Note: Removing cookies in Server Components is not supported
              // This is primarily for Route Handlers
              cookieStore.delete(name);
            } catch (error) {
              console.warn(`Failed to remove cookie ${name}:`, error);
            }
          },
        },
      },
    );

    return client as TypedSupabaseClient;
  } catch (error) {
    if (
      error instanceof SupabaseConfigError ||
      error instanceof SupabaseConnectionError
    ) {
      throw error;
    }

    throw new SupabaseConnectionError(
      `Failed to create server client: ${error instanceof Error ? error.message : String(error)}`,
      true,
      { originalError: error },
    );
  }
};

/**
 * Create a server client with automatic error handling
 *
 * @param {ServerClientOptions} options - Optional configuration
 * @returns {Promise<{ success: boolean; client?: TypedSupabaseClient; error?: Error }>}
 *
 * @example
 * ```typescript
 * const result = await createServerClientSafe();
 * if (result.success && result.client) {
 *   const { data } = await result.client.from('items').select('*');
 * } else {
 *   console.error('Failed to create server client:', result.error);
 * }
 * ```
 */
export const createServerClientSafe = async (
  options?: ServerClientOptions,
): Promise<{
  success: boolean;
  client?: TypedSupabaseClient;
  error?: Error;
}> => {
  const result = await withErrorHandling(
    () => createServerClient(options),
    "createServerClient",
  );

  return {
    success: result.success,
    client: result.data,
    error: result.error,
  };
};

/**
 * Create a server client with retry logic
 *
 * @param {ServerClientOptions} options - Optional configuration
 * @returns {Promise<TypedSupabaseClient>} Server client
 *
 * @example
 * ```typescript
 * const client = await createServerClientWithRetry();
 * ```
 */
export const createServerClientWithRetry = async (
  options?: ServerClientOptions,
): Promise<TypedSupabaseClient> => {
  return withRetry(() => createServerClient(options), {
    maxAttempts: 3,
    shouldRetry: (error, attempt) => {
      // Don't retry config errors
      if (error instanceof SupabaseConfigError) {
        return false;
      }
      // Retry connection errors up to max attempts
      if (error instanceof SupabaseConnectionError) {
        return error.retryable && attempt < 3;
      }
      return attempt < 3;
    },
    getDelay: (attempt) => Math.min(500 * Math.pow(2, attempt - 1), 2000),
  });
};

/**
 * Execute a server operation with automatic client creation
 *
 * @param {Function} operation - The operation to execute
 * @param {ServerClientOptions} options - Optional configuration
 * @returns {Promise<T>} Result of the operation
 *
 * @example
 * ```typescript
 * const posts = await withServerClient(async (client) => {
 *   const { data } = await client.from('posts').select('*');
 *   return data;
 * });
 * ```
 */
export const withServerClient = async <T>(
  operation: (client: TypedSupabaseClient) => Promise<T>,
  options?: ServerClientOptions,
): Promise<T> => {
  const client = await createServerClient(options);
  return operation(client);
};

/**
 * Execute a server operation with pooled connection (for non-auth operations)
 *
 * @param {Function} operation - The operation to execute
 * @returns {Promise<T>} Result of the operation
 *
 * @example
 * ```typescript
 * // For operations that don't require user session context
 * const stats = await withPooledServerClient(async (client) => {
 *   const { data } = await client.from('analytics_events').select('count');
 *   return data;
 * });
 * ```
 */
export const withPooledServerClient = async <T>(
  operation: (client: TypedSupabaseClient) => Promise<T>,
): Promise<T> => {
  return withPooledClient(operation);
};

/**
 * @deprecated Use `createServerClient` instead
 */
export const createClient = async (
  options?: ServerClientOptions,
): Promise<TypedSupabaseClient> => {
  console.warn(
    "createClient() is deprecated. Use createServerClient() instead for clarity.",
  );
  return createServerClient(options);
};
