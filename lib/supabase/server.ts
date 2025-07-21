import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const createClient = () => {
  return createSupabaseClient<Database>(supabaseUrl, supabaseServiceRoleKey);
};

export const createServerClient = () => {
  return createClient();
};
