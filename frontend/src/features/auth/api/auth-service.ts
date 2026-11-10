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

export async function signOut(): Promise<void> {
  await getSupabaseBrowserClient().auth.signOut();
}
