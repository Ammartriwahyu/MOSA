import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export type AdminClient = SupabaseClient<Database>;

// Batas waktu bawaan setiap panggilan ke Supabase (database dan Auth), agar
// permintaan tidak menggantung. Sinyal pemanggil (mis. ping 5 detik) tetap berlaku.
const REQUEST_TIMEOUT_MS = 10_000;

const fetchWithTimeout: typeof fetch = (input, init) => {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  return fetch(input, { ...init, signal });
};

/**
 * Klien Supabase dengan secret key (melewati RLS). Dibuat satu kali di
 * composition root dan hanya dipakai repository/adaptor di infrastructure.
 * Tanpa sesi: backend tidak pernah login sebagai pengguna.
 */
export function createSupabaseAdminClient(url: string, secretKey: string): AdminClient {
  return createClient<Database>(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: fetchWithTimeout },
  });
}
