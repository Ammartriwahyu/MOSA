import { domainError, type DomainError } from "../../../shared/domain/domain-error.js";
import { err, type Result } from "../../../shared/domain/result.js";
import type { ScanTokenClaims, ScanTokenVerifier } from "../application/ports/scan-token-verifier.js";

export class UnavailableScanTokenVerifier implements ScanTokenVerifier {
  async verify(): Promise<Result<ScanTokenClaims, DomainError>> {
    return err(domainError("SCAN_TOKEN_INVALID", "Token scan belum tersedia atau tidak valid."));
  }
}
