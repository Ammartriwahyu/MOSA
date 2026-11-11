import type { DomainError } from "../../../../shared/domain/domain-error";
import type { Result } from "../../../../shared/domain/result";
import type { WibDate } from "../../../../shared/domain/wib-time";

/** Hanya ID slot yang sudah tercatat, bukan status yang disimpan. P05 API
 * mengimplementasikannya dari dose_confirmations, tersaring rumah tangga/obat/tanggal. */
export interface ConfirmedDoseReader {
  listConfirmedSlotIds(input: {
    householdId: string;
    medicineId: string;
    dates: readonly WibDate[];
  }): Promise<Result<readonly string[], DomainError>>;
}
