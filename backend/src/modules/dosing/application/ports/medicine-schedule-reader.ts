import type { DomainError } from "../../../../shared/domain/domain-error.js";
import type { Result } from "../../../../shared/domain/result.js";
import type { MedicineSchedule } from "../../domain/daily-slots.js";

export interface MedicineScheduleReader {
  findActive(householdId: string, medicineId: string): Promise<Result<MedicineSchedule | null, DomainError>>;
}
