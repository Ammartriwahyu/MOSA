import type { DomainError } from "../../../../shared/domain/domain-error.js";
import type { Result } from "../../../../shared/domain/result.js";
import type { WibDate } from "../../../../shared/domain/wib-time.js";

export interface ConfirmedDoseReader {
  listConfirmedSlotIds(input: {
    householdId: string;
    medicineId: string;
    dates: readonly WibDate[];
  }): Promise<Result<readonly string[], DomainError>>;
}
