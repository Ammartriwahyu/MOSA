import type { Clock } from "../../../shared/domain/clock";
import { domainError, type DomainError } from "../../../shared/domain/domain-error";
import { err, type Result } from "../../../shared/domain/result";
import { findNextDose, nextDoseDates, type NextDose } from "../domain/next-dose";
import type { ConfirmedDoseReader } from "./ports/confirmed-dose-reader";
import type { MedicineScheduleReader } from "./ports/medicine-schedule-reader";

/** Dipakai doses/today dan verification nanti, tanpa rute HTTP tersendiri. */
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
    // Satu snapshot waktu agar rentang konfirmasi dan hasil pencarian konsisten.
    const now = this.clock.now();
    const dates = nextDoseDates(now);
    if (!dates.ok) return dates;
    const confirmed = await this.confirmations.listConfirmedSlotIds({ ...input, dates: dates.value });
    if (!confirmed.ok) return confirmed;
    return findNextDose({ schedule: schedule.value, now, confirmedSlotIds: new Set(confirmed.value) });
  }
}
