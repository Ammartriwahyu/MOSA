import { domainError, type DomainError } from "../../../shared/domain/domain-error";
import { err, type Result } from "../../../shared/domain/result";
import type { ScanTokenClaims, ScanTokenVerifier } from "../application/ports/scan-token-verifier";

/** P06 belum menerbitkan token: jalur verified ditolak, tidak pernah diberi ✓✓ palsu. */
export class UnavailableScanTokenVerifier implements ScanTokenVerifier {
  async verify(): Promise<Result<ScanTokenClaims, DomainError>> {
    return err(domainError("SCAN_TOKEN_INVALID", "Token scan belum tersedia atau tidak valid."));
  }
}
