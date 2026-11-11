import type { DomainError } from "../../../../shared/domain/domain-error";
import type { Result } from "../../../../shared/domain/result";
import type { MedicineSchedule } from "../../domain/daily-slots";

/** Adapter P05 API membaca medication melalui port, tanpa impor domain lintas modul.
 * Selalu batasi pembacaan ke householdId dari sesi; null bila tidak ada/nonaktif. */
export interface MedicineScheduleReader {
  findActive(householdId: string, medicineId: string): Promise<Result<MedicineSchedule | null, DomainError>>;
}
