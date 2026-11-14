import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export type AdminClient = SupabaseClient<Database>;

const REQUEST_TIMEOUT_MS = 10_000;

// @types/node mengosongkan RequestInit bila lingkungan build juga memuat tipe
// browser (build Vercel), sehingga `init.signal` tidak dikenal di sana. Sinyal
// dibaca lewat bentuk minimal ini agar typecheck lokal dan Vercel sama.
type InitWithSignal = { readonly signal?: AbortSignal | null };

const fetchWithTimeout: typeof fetch = (input, init) => {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const incoming = (init as InitWithSignal | undefined)?.signal;
  const signal = incoming ? AbortSignal.any([incoming, timeout]) : timeout;
  return fetch(input, { ...init, signal });
};

export function createSupabaseAdminClient(url: string, secretKey: string): AdminClient {
  return createClient<Database>(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: fetchWithTimeout },
  });
}
