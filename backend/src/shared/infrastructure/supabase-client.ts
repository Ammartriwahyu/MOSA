import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Klien Supabase dengan secret key (melewati RLS). Dibuat satu kali di
 * composition root dan hanya dipakai repository/adaptor di infrastructure.
 * Tanpa sesi: backend tidak pernah login sebagai pengguna.
 */
export function createSupabaseAdminClient(url: string, secretKey: string): SupabaseClient {
  return createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
