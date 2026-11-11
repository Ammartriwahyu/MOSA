import type { DosingMedicine, DosingMedicineReader } from "../../src/modules/dosing/application/ports/dosing-medicine-reader";
import type { ConfirmedDoseReader } from "../../src/modules/dosing/application/ports/confirmed-dose-reader";
import type { DoseConfirmation, DoseConfirmationRepository } from "../../src/modules/dosing/domain/dose-confirmation";
import { buildDailySlots } from "../../src/modules/dosing/domain/daily-slots";
import { createDoseSlot } from "../../src/modules/dosing/domain/dose-slot";
import { classifyDose } from "../../src/modules/dosing/domain/dose-window";
import type { Medicine } from "../../src/modules/medication/domain/medicine";
import { domainError, type DomainError } from "../../src/shared/domain/domain-error";
import { err, ok, type Result } from "../../src/shared/domain/result";
import type { WibDate } from "../../src/shared/domain/wib-time";
import type { InMemoryMedicineRepository } from "./in-memory-medicine-repository";

export function dosingMedicine(row: Medicine): DosingMedicine {
  return { ...row, medicineId: row.id, intakeTimeStartedAt: Object.fromEntries(row.intakeTimes.map((time) => [time, row.createdAt])) };
}

export class InMemoryDosingMedicineReader implements DosingMedicineReader {
  constructor(private readonly medicines: InMemoryMedicineRepository) {}
  async findActive(householdId: string, medicineId: string): Promise<Result<DosingMedicine | null, DomainError>> {
    const row = await this.medicines.findActive(householdId, medicineId);
    return row.ok ? ok(row.value ? dosingMedicine(row.value) : null) : row;
  }
  async listActive(householdId: string): Promise<Result<readonly DosingMedicine[], DomainError>> {
    const rows = await this.medicines.listActive(householdId);
    return rows.ok ? ok(rows.value.map(dosingMedicine)) : rows;
  }
}

export class InMemoryDoseConfirmationRepository implements DoseConfirmationRepository, ConfirmedDoseReader {
  readonly rows = new Map<string, DoseConfirmation>();
  constructor(private readonly medicines: DosingMedicineReader) {}

  async list(householdId: string, dates: readonly WibDate[], medicineId?: string): Promise<Result<readonly DoseConfirmation[], DomainError>> {
    return ok([...this.rows.values()].filter((row) => row.householdId === householdId && dates.includes(row.scheduledDate) && (!medicineId || row.medicineId === medicineId)));
  }
  async confirm(input: Parameters<DoseConfirmationRepository["confirm"]>[0]): Promise<Result<DoseConfirmation, DomainError>> {
    const current = await this.medicines.findActive(input.householdId, input.slot.medicineId);
    if (!current.ok) return current;
    if (!current.value) return err(domainError("NOT_FOUND", "Obat tidak ditemukan."));
    if (this.rows.has(input.slot.slotId)) return err(domainError("DOSE_ALREADY_CONFIRMED", "Dosis sudah tercatat."));
    const slots = buildDailySlots([current.value], input.slot.scheduledDate);
    if (!slots.ok) return slots;
    if (!slots.value.some((slot) => slot.slotId === input.slot.slotId)) return err(domainError("NOT_FOUND", "Slot tidak ditemukan."));
    const status = classifyDose({ scheduledAt: input.slot.scheduledAt, now: input.confirmedAt, confirmed: false });
    if (status !== "jatuh_tempo") return err(domainError(status === "belum_tiba" ? "DOSE_NOT_DUE" : "DOSE_MISSED", "Di luar jendela."));
    const row: DoseConfirmation = { id: `konfirmasi-${this.rows.size + 1}`, householdId: input.householdId, medicineId: input.slot.medicineId, scheduledDate: input.slot.scheduledDate, scheduledTime: input.slot.scheduledTime, confirmedAt: input.confirmedAt, level: input.level };
    this.rows.set(input.slot.slotId, row);
    return ok(row);
  }
  async listConfirmedSlotIds(input: { householdId: string; medicineId: string; dates: readonly WibDate[] }): Promise<Result<readonly string[], DomainError>> {
    const rows = await this.list(input.householdId, input.dates, input.medicineId);
    if (!rows.ok) return rows;
    const ids: string[] = [];
    for (const row of rows.value) {
      const slot = createDoseSlot({ medicineId: row.medicineId, scheduledDate: row.scheduledDate, scheduledTime: row.scheduledTime });
      if (!slot.ok) return slot;
      ids.push(slot.value.slotId);
    }
    return ok(ids);
  }
}
