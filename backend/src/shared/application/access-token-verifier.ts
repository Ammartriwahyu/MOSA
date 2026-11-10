import type { DomainError } from "../domain/domain-error";
import type { Result } from "../domain/result";

export type VerifiedSession = { readonly userId: string };

// Port: memeriksa token akses Supabase dari header Authorization.
// Gagal → UNAUTHENTICATED (token salah/kedaluwarsa/akun terhapus) atau
// AUTH_UNAVAILABLE (layanan Auth tidak terjangkau; jangan paksa keluar).
export interface AccessTokenVerifier {
  verify(accessToken: string): Promise<Result<VerifiedSession, DomainError>>;
}
