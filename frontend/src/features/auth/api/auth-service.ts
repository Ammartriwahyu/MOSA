import { isAuthApiError, isAuthRetryableFetchError } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/shared/lib";

// Pembungkus Supabase Auth: komponen tidak memegang token atau galat Supabase
// mentah; sesi tetap dikelola Supabase (P08 batasan).

export type AuthFailure =
  | "invalid_credentials"
  | "email_not_confirmed"
  | "user_already_exists"
  | "weak_password"
  | "network"
  | "unknown";

export type AuthResult<T extends object = Record<never, never>> = ({ ok: true } & T) | { ok: false; reason: AuthFailure };

function toFailure(error: unknown): AuthFailure {
  if (isAuthRetryableFetchError(error)) return "network";
  if (isAuthApiError(error)) {
    switch (error.code) {
      case "invalid_credentials":
        return "invalid_credentials";
      case "email_not_confirmed":
        return "email_not_confirmed";
      case "user_already_exists":
      case "email_exists":
        return "user_already_exists";
      case "weak_password":
        return "weak_password";
    }
  }
  if (error instanceof TypeError) return "network";
  return "unknown";
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  try {
    const { error } = await getSupabaseBrowserClient().auth.signInWithPassword({ email, password });
    return error ? { ok: false, reason: toFailure(error) } : { ok: true };
  } catch (error) {
    return { ok: false, reason: toFailure(error) };
  }
}

/**
 * Mendaftar akun. `hasSession = false` bila proyek Supabase mewajibkan
 * konfirmasi email (sesi baru ada setelah konfirmasi lalu masuk).
 * Nama pasien hanya disimpan di metadata akun Supabase Auth: tidak di database
 * aplikasi dan tidak pernah dikirim ke AI.
 */
export async function signUp(input: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthResult<{ hasSession: boolean }>> {
  try {
    const { data, error } = await getSupabaseBrowserClient().auth.signUp({
      email: input.email,
      password: input.password,
      options: { data: { display_name: input.name } },
    });
    if (error) return { ok: false, reason: toFailure(error) };
    return { ok: true, hasSession: data.session !== null };
  } catch (error) {
    return { ok: false, reason: toFailure(error) };
  }
}

/**
 * Keluar dari HP ini saja (`local`). Akun dipakai bersama di HP lansia dan wali
 * (PRD §8), jadi keluar di satu HP tidak boleh mengeluarkan HP lain.
 */
export async function signOut(scope: "global" | "local" = "local"): Promise<void> {
  try {
    await getSupabaseBrowserClient().auth.signOut({ scope });
  } catch {
    // Jaringan putus: sesi lokal tetap dihapus oleh Supabase; penjaga rute mengarahkan keluar.
  }
}

export type Account = { email: string | null; name: string | null };

/** Email dan nama pasien (metadata Auth) dari sesi di HP ini; tanpa panggilan database. */
export async function getAccount(): Promise<Account> {
  const { data } = await getSupabaseBrowserClient().auth.getSession();
  const user = data.session?.user;
  const name = user?.user_metadata?.display_name;
  return { email: user?.email ?? null, name: typeof name === "string" && name.trim() ? name : null };
}
