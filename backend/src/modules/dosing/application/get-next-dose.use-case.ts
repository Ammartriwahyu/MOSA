import type { Clock } from "../../../shared/domain/clock.js";
import { domainError, type DomainError } from "../../../shared/domain/domain-error.js";
import { err, type Result } from "../../../shared/domain/result.js";
import { findNextDose, nextDoseDates, type NextDose } from "../domain/next-dose.js";
import type { ConfirmedDoseReader } from "./ports/confirmed-dose-reader.js";
import type { MedicineScheduleReader } from "./ports/medicine-schedule-reader.js";

export class GetNextDose {
  constructor(
    private readonly medicines: MedicineScheduleReader,
    private readonly confirmations: ConfirmedDoseReader,
    private readonly clock: Clock,
  ) {}

  async execute(input: { householdId: string; medicineId: string }): Promise<Result<NextDose | null, DomainError>> {
    const schedule = await this.medicines.findActive(input.householdId, input.medicineId);
    if (!schedule.ok) return schedule;
    if (!schedule.value?.active || schedule.value.medicineId !== input.medicineId) {
      return err(domainError("NOT_FOUND", "Obat tidak ditemukan."));
    }

    const now = this.clock.now();
    const dates = nextDoseDates(now);
    if (!dates.ok) return dates;
    const confirmed = await this.confirmations.listConfirmedSlotIds({ ...input, dates: dates.value });
    if (!confirmed.ok) return confirmed;
    return findNextDose({ schedule: schedule.value, now, confirmedSlotIds: new Set(confirmed.value) });
  }
}
