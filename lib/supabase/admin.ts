import { createPooledClient } from "./server-pooled";

/**
 * Create an admin Supabase client with connection pooling
 * Uses service role key for elevated permissions to bypass RLS
 */
export const createAdminClient = () => {
  return createPooledClient();
};
