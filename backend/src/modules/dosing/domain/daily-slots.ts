import { domainError, type DomainError } from "../../../shared/domain/domain-error";
import { err, ok, type Result } from "../../../shared/domain/result";
import type { WibDate } from "../../../shared/domain/wib-time";
import { createDoseSlot, type DoseSlot } from "./dose-slot";

export type MedicineSchedule = {
  readonly medicineId: string;
  readonly active: boolean;
  readonly createdAt: number;
  readonly intakeTimes: readonly string[];

  readonly intakeTimeStartedAt?: Readonly<Record<string, number>>;
};

export function buildDailySlots(schedules: readonly MedicineSchedule[], date: WibDate): Result<DoseSlot[], DomainError> {
  const slots: DoseSlot[] = [];
  const medicines = new Set<string>();
  for (const schedule of schedules) {
    if (!schedule.active) continue;
    if (medicines.has(schedule.medicineId)) {
      return err(domainError("VALIDATION_FAILED", "Identitas obat berulang.", { field: "medicineId" }));
    }
    medicines.add(schedule.medicineId);
    if (!Number.isFinite(schedule.createdAt) || !Number.isFinite(new Date(schedule.createdAt).getTime())) {
      return err(domainError("VALIDATION_FAILED", "Waktu pembuatan obat tidak valid.", { field: "createdAt" }));
    }
    if (schedule.intakeTimes.length === 0 || new Set(schedule.intakeTimes).size !== schedule.intakeTimes.length) {
      return err(domainError("VALIDATION_FAILED", "Jadwal obat harus terisi tanpa jam berulang.", { field: "intakeTimes" }));
    }
    for (const time of schedule.intakeTimes) {
      const slot = createDoseSlot({ medicineId: schedule.medicineId, scheduledDate: date, scheduledTime: time });
      if (!slot.ok) return slot;

      const startedAt = schedule.intakeTimeStartedAt?.[time] ?? schedule.createdAt;
      if (!Number.isFinite(startedAt) || !Number.isFinite(new Date(startedAt).getTime())) {
        return err(domainError("VALIDATION_FAILED", "Waktu pengaktifan jam tidak valid.", { field: "intakeTimeStartedAt" }));
      }
      if (slot.value.scheduledAt >= Math.max(schedule.createdAt, startedAt)) slots.push(slot.value);
    }
  }
  slots.sort((a, b) => a.scheduledAt - b.scheduledAt || (a.medicineId < b.medicineId ? -1 : a.medicineId > b.medicineId ? 1 : 0));
  return ok(slots);
}
