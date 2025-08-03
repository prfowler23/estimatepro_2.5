import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/supabase";

/**
 * Universal Supabase client that works in both server and client environments
 * This is a temporary solution for the production emergency
 */
export function createClient() {
  // For client-side usage, create a browser client
  // This works in both client components and pages
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

// Alias for backward compatibility
export const createUniversalClient = createClient;
