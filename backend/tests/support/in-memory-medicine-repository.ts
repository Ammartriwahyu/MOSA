import type { Medicine, MedicineDraft } from "../../src/modules/medication/domain/medicine";
import type { MedicineRepository } from "../../src/modules/medication/domain/medicine-repository";
import { domainError, type DomainError } from "../../src/shared/domain/domain-error";
import { err, ok, type Result } from "../../src/shared/domain/result";

/** Repository obat palsu untuk tes application. Data fiktif. */
export class InMemoryMedicineRepository implements MedicineRepository {
  readonly rows = new Map<string, Medicine>();
  private sequence = 0;

  async findActive(householdId: string, medicineId: string): Promise<Result<Medicine | null, DomainError>> {
    const row = this.rows.get(medicineId);
    return ok(row && row.householdId === householdId && row.active ? row : null);
  }

  async listActive(householdId: string): Promise<Result<Medicine[], DomainError>> {
    return ok([...this.rows.values()].filter((m) => m.householdId === householdId && m.active));
  }

  async create(householdId: string, draft: MedicineDraft, createdAt: number): Promise<Result<Medicine, DomainError>> {
    this.sequence += 1;
    const medicine: Medicine = { ...draft, id: `obat-${this.sequence}`, householdId, active: true, createdAt };
    this.rows.set(medicine.id, medicine);
    return ok(medicine);
  }

  async save(medicine: Medicine): Promise<Result<void, DomainError>> {
    const current = this.rows.get(medicine.id);
    if (!current || current.householdId !== medicine.householdId) {
      return err(domainError("NOT_FOUND", "Obat tidak ditemukan."));
    }
    this.rows.set(medicine.id, medicine);
    return ok(undefined);
  }
}
