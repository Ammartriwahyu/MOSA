import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readPublicEnv } from "../config";

// Frontend hanya memakai Supabase Auth (masuk/daftar/sesi). Data selalu lewat
// backend /v1 (CLAUDE.md: database diakses hanya oleh backend).
let browserClient: SupabaseClient | undefined;

/**
 * Satu klien per tab dengan publishable key. Sesi disimpan di localStorage
 * dan diperbarui otomatis, sehingga lansia tidak perlu masuk berulang (MVP-01).
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (!browserClient) {
    const env = readPublicEnv();
    browserClient = createClient(env.supabaseUrl, env.supabasePublishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    });
  }
  return browserClient;
}

/** Token akses sesi saat ini (diperbarui bila hampir kedaluwarsa). */
export async function getAccessToken(): Promise<string | null> {
  const { data } = await getSupabaseBrowserClient().auth.getSession();
  return data.session?.access_token ?? null;
}
