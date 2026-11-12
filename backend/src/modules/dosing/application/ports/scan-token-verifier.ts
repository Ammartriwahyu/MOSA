import type { DomainError } from "../../../../shared/domain/domain-error";
import type { Result } from "../../../../shared/domain/result";

export type ScanTokenClaims = { readonly householdId: string; readonly medicineId: string; readonly slotId: string; readonly expiresAt: number;
  /** Dipasang verifier dari snapshot yang cocok dengan fingerprint bertanda tangan. */
  readonly medicineIdentity?: { readonly name: string; readonly strength: string } };
/** Implementasi HMAC ada di P06; claims hanya dikembalikan setelah tanda tangan sah. */
export interface ScanTokenVerifier {
  verify(token: string): Promise<Result<ScanTokenClaims, DomainError>>;
}
