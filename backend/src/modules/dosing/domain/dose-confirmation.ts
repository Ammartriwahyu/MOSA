import type { DomainError } from "../../../shared/domain/domain-error.js";
import type { Result } from "../../../shared/domain/result.js";
import type { WibDate } from "../../../shared/domain/wib-time.js";
import type { DoseSlot } from "./dose-slot.js";

export type ConfirmationLevel = "dasar" | "scan_terverifikasi";
export type DoseConfirmation = {
  readonly id: string;
  readonly householdId: string;
  readonly medicineId: string;
  readonly scheduledDate: WibDate;
  readonly scheduledTime: string;
  readonly confirmedAt: number;
  readonly level: ConfirmationLevel;
};

export interface DoseConfirmationRepository {
  list(householdId: string, dates: readonly WibDate[], medicineId?: string): Promise<Result<readonly DoseConfirmation[], DomainError>>;

  confirm(input: { householdId: string; slot: DoseSlot; confirmedAt: number; level: ConfirmationLevel;
    scanMedicine?: { readonly name: string; readonly strength: string } }): Promise<Result<DoseConfirmation, DomainError>>;
}
