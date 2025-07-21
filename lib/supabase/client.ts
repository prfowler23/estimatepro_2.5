"use client";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create a singleton client to prevent multiple instances
let _supabaseClient: ReturnType<typeof createSupabaseClient<Database>> | null =
  null;

export const supabase = (() => {
  if (!_supabaseClient) {
    _supabaseClient = createSupabaseClient<Database>(
      supabaseUrl,
      supabaseAnonKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      },
    );
  }
  return _supabaseClient;
})();

export const createClient = () => supabase;
