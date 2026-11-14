import type { DomainError } from "../domain/domain-error";
import type { Result } from "../domain/result";

export type VerifiedSession = { readonly userId: string };

export interface AccessTokenVerifier {
  verify(accessToken: string): Promise<Result<VerifiedSession, DomainError>>;
}
