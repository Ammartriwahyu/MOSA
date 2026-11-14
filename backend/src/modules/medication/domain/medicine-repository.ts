import type { DomainError } from "../../../shared/domain/domain-error.js";
import type { Result } from "../../../shared/domain/result.js";
import type { Medicine, MedicineDraft } from "./medicine.js";

export interface MedicineRepository {

  findActive(householdId: string, medicineId: string): Promise<Result<Medicine | null, DomainError>>;
  listActive(householdId: string): Promise<Result<Medicine[], DomainError>>;
  create(householdId: string, draft: MedicineDraft, createdAt: number): Promise<Result<Medicine, DomainError>>;

  save(medicine: Medicine): Promise<Result<void, DomainError>>;
}
