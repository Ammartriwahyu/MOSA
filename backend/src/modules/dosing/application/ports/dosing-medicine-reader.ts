import type { DomainError } from "../../../../shared/domain/domain-error.js";
import type { Result } from "../../../../shared/domain/result.js";
import type { MedicineSchedule } from "../../domain/daily-slots.js";
import type { MedicineScheduleReader } from "./medicine-schedule-reader.js";

export type DosingMedicine = MedicineSchedule & {
  readonly name: string;
  readonly strength: string;
  readonly purpose: string;
  readonly doseAmount: string;
  readonly usageRule: string;
  readonly warnings: string;
  readonly notes: string | null;
  readonly labelSource: "apoteker" | "keluarga";
  readonly explanation: string | null;
  readonly explanationOrigin: "ai_dikonfirmasi" | "teks_pengisi";
};

export interface DosingMedicineReader extends MedicineScheduleReader {
  findActive(householdId: string, medicineId: string): Promise<Result<DosingMedicine | null, DomainError>>;
  listActive(householdId: string): Promise<Result<readonly DosingMedicine[], DomainError>>;
}
