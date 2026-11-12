import type { DomainError } from "../../../../shared/domain/domain-error";
import type { Result } from "../../../../shared/domain/result";
import type { RegisteredMedicine } from "../../domain/package-reading";

export interface ScanTokenSigner {
  sign(input: { householdId: string; medicine: RegisteredMedicine; slotId: string; expiresAt: number }): Promise<Result<string, DomainError>>;
}
