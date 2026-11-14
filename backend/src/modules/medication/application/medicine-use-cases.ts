import type { Clock } from "../../../shared/domain/clock";
import { domainError, type DomainError } from "../../../shared/domain/domain-error";
import { err, ok, type Result } from "../../../shared/domain/result";
import {
  deactivateMedicine,
  reviseMedicine,
  validateMedicineInput,
  type Medicine,
  type MedicineInput,
} from "../domain/medicine";
import type { MedicineRepository } from "../domain/medicine-repository";

const notFound = (): DomainError => domainError("NOT_FOUND", "Obat tidak ditemukan.");

async function loadActive(
  medicines: MedicineRepository,
  householdId: string,
  medicineId: string,
): Promise<Result<Medicine, DomainError>> {
  const found = await medicines.findActive(householdId, medicineId);
  if (!found.ok) return found;
  return found.value ? ok(found.value) : err(notFound());
}

export class CreateMedicine {
  constructor(
    private readonly medicines: MedicineRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: { householdId: string; medicine: MedicineInput }): Promise<Result<Medicine, DomainError>> {
    const draft = validateMedicineInput(input.medicine);
    if (!draft.ok) return draft;
    return this.medicines.create(input.householdId, draft.value, this.clock.now());
  }
}

export class UpdateMedicine {
  constructor(private readonly medicines: MedicineRepository) {}

  async execute(input: {
    householdId: string;
    medicineId: string;
    medicine: MedicineInput;
  }): Promise<Result<Medicine, DomainError>> {
    const current = await loadActive(this.medicines, input.householdId, input.medicineId);
    if (!current.ok) return current;
    const revised = reviseMedicine(current.value, input.medicine);
    if (!revised.ok) return revised;
    const saved = await this.medicines.save(revised.value);
    return saved.ok ? ok(revised.value) : saved;
  }
}

export class ListMedicines {
  constructor(private readonly medicines: MedicineRepository) {}

  execute(input: { householdId: string }): Promise<Result<Medicine[], DomainError>> {
    return this.medicines.listActive(input.householdId);
  }
}

export class GetMedicine {
  constructor(private readonly medicines: MedicineRepository) {}

  execute(input: { householdId: string; medicineId: string }): Promise<Result<Medicine, DomainError>> {
    return loadActive(this.medicines, input.householdId, input.medicineId);
  }
}

export class DeactivateMedicine {
  constructor(private readonly medicines: MedicineRepository) {}

  async execute(input: { householdId: string; medicineId: string }): Promise<Result<void, DomainError>> {
    const current = await loadActive(this.medicines, input.householdId, input.medicineId);
    if (!current.ok) return current;
    const inactive = deactivateMedicine(current.value);
    if (!inactive.ok) return inactive;
    return this.medicines.save(inactive.value);
  }
}
