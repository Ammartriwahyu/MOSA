import type { DomainError } from "../../../shared/domain/domain-error";
import type { Result } from "../../../shared/domain/result";
import type { WibDate } from "../../../shared/domain/wib-time";
import type { DoseSlot } from "./dose-slot";

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
  /** Atomik: cek ulang obat aktif/jadwal terkini, jendela, dan keunikan slot. */
  confirm(input: { householdId: string; slot: DoseSlot; confirmedAt: number; level: ConfirmationLevel }): Promise<Result<DoseConfirmation, DomainError>>;
}
