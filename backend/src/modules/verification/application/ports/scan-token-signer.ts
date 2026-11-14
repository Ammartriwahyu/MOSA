import type { DomainError } from "../../../../shared/domain/domain-error.js";
import type { Result } from "../../../../shared/domain/result.js";
import type { RegisteredMedicine } from "../../domain/package-reading.js";

export interface ScanTokenSigner {
  sign(input: { householdId: string; medicine: RegisteredMedicine; slotId: string; expiresAt: number }): Promise<Result<string, DomainError>>;
}
