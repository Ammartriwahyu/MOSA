import { domainError, type DomainError } from "../../../shared/domain/domain-error";
import { err, ok, type Result } from "../../../shared/domain/result";
import { addWibDays, toWib, type WibDate } from "../../../shared/domain/wib-time";
import { buildDailySlots, type MedicineSchedule } from "./daily-slots";
import type { DoseSlot } from "./dose-slot";
import { dosePeriod, type DosePeriod } from "./time-periods";

export type NextDose = {
  readonly slot: DoseSlot;
  readonly relativeDay: "hari_ini" | "besok";
  readonly period: DosePeriod;
};

/** Rentang pencarian P05: sisa hari kalender WIB ini dan besok. */
export function nextDoseDates(now: number): Result<readonly [WibDate, WibDate], DomainError> {
  if (!Number.isFinite(now) || !Number.isFinite(new Date(now).getTime())) {
    return err(domainError("VALIDATION_FAILED", "Waktu pencarian dosis tidak valid.", { field: "now" }));
  }
  const today = toWib(now).date;
  return ok([today, addWibDays(today, 1)] as const);
}

/** "Berikutnya" = J > sekarang, bukan jendela yang sedang terbuka. Slot yang
 * sudah dikonfirmasi lebih awal tidak boleh disarankan untuk diminum lagi. */
export function findNextDose(input: {
  schedule: MedicineSchedule;
  now: number;
  confirmedSlotIds: ReadonlySet<string>;
}): Result<NextDose | null, DomainError> {
  const dates = nextDoseDates(input.now);
  if (!dates.ok) return dates;
  for (const date of dates.value) {
    const slots = buildDailySlots([input.schedule], date);
    if (!slots.ok) return slots;
    const next = slots.value.find((slot) => slot.scheduledAt > input.now && !input.confirmedSlotIds.has(slot.slotId));
    if (next) {
      return ok({ slot: next, relativeDay: date === dates.value[0] ? "hari_ini" : "besok", period: dosePeriod(toWib(next.scheduledAt).time) });
    }
  }
  return ok(null);
}
