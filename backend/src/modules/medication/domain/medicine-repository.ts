import type { DomainError } from "../../../shared/domain/domain-error";
import type { Result } from "../../../shared/domain/result";
import type { Medicine, MedicineDraft } from "./medicine";

// Port repository. Setiap metode dibatasi pada rumah tangga sesi (kepemilikan).
export interface MedicineRepository {
  /** Obat aktif milik rumah tangga; null bila tidak ada, nonaktif, atau milik rumah tangga lain. */
  findActive(householdId: string, medicineId: string): Promise<Result<Medicine | null, DomainError>>;
  listActive(householdId: string): Promise<Result<Medicine[], DomainError>>;
  create(householdId: string, draft: MedicineDraft, createdAt: number): Promise<Result<Medicine, DomainError>>;
  /** Menyimpan perubahan isian atau status aktif. NOT_FOUND bila baris tidak ada. */
  save(medicine: Medicine): Promise<Result<void, DomainError>>;
}
