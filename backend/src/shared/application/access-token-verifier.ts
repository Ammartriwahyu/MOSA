import type { DomainError } from "../domain/domain-error.js";
import type { Result } from "../domain/result.js";

export type VerifiedSession = { readonly userId: string };

export interface AccessTokenVerifier {
  verify(accessToken: string): Promise<Result<VerifiedSession, DomainError>>;
}
