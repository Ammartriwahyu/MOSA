import type { DomainError } from "../../../../shared/domain/domain-error";
import type { Result } from "../../../../shared/domain/result";

export type ScanTokenClaims = { readonly householdId: string; readonly medicineId: string; readonly slotId: string; readonly expiresAt: number;

  readonly medicineIdentity?: { readonly name: string; readonly strength: string } };

export interface ScanTokenVerifier {
  verify(token: string): Promise<Result<ScanTokenClaims, DomainError>>;
}
