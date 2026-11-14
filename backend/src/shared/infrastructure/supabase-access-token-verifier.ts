import { isAuthRetryableFetchError, type AuthError } from "@supabase/supabase-js";
import type {
  AccessTokenVerifier,
  VerifiedSession,
} from "../application/access-token-verifier";
import { domainError, type DomainError } from "../domain/domain-error";
import { err, ok, type Result } from "../domain/result";
import type { AdminClient } from "./supabase-client";

const UNAUTHENTICATED = domainError("UNAUTHENTICATED", "Sesi tidak valid. Silakan masuk lagi.");
const AUTH_UNAVAILABLE = domainError("AUTH_UNAVAILABLE", "Layanan masuk sedang tidak dapat dihubungi.");

function isServiceFailure(error: AuthError): boolean {
  return isAuthRetryableFetchError(error) || (error.status ?? 0) >= 500;
}

export class SupabaseAccessTokenVerifier implements AccessTokenVerifier {
  constructor(private readonly client: AdminClient) {}

  async verify(accessToken: string): Promise<Result<VerifiedSession, DomainError>> {
    try {
      const { data, error } = await this.client.auth.getUser(accessToken);
      if (!error && data.user) return ok({ userId: data.user.id });
      if (error && isServiceFailure(error)) return err(AUTH_UNAVAILABLE);
      return err(UNAUTHENTICATED);
    } catch {

      return err(AUTH_UNAVAILABLE);
    }
  }
}
