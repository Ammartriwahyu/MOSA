import type { DomainError } from "../../../../shared/domain/domain-error";
import type { Result } from "../../../../shared/domain/result";
import type { MedicineSchedule } from "../../domain/daily-slots";

export interface MedicineScheduleReader {
  findActive(householdId: string, medicineId: string): Promise<Result<MedicineSchedule | null, DomainError>>;
}
