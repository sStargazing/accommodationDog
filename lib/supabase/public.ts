import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getSupabaseEnv } from "./env";

/**
 * Anonymous, cookie-free client for public data. Because it carries no
 * session, results are identical for every visitor (RLS returns published
 * content only), so it is safe to use inside "use cache" functions.
 */
export function createPublicClient() {
  const { url, key } = getSupabaseEnv();
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
