import type { Clock } from "../../../shared/domain/clock";
import type { DomainError } from "../../../shared/domain/domain-error";
import { ok, type Result } from "../../../shared/domain/result";
import { addWibDays, toWib, type WibDate } from "../../../shared/domain/wib-time";
import { buildDailySlots } from "../domain/daily-slots";
import type { DoseConfirmation, DoseConfirmationRepository } from "../domain/dose-confirmation";
import { createDoseSlot, type DoseSlot } from "../domain/dose-slot";
import { classifyDose, doseWindow, type DoseStatus } from "../domain/dose-window";
import { findNextDose, nextDoseDates, type NextDose } from "../domain/next-dose";
import { dosePeriod, type DosePeriod } from "../domain/time-periods";
import type { DosingMedicine, DosingMedicineReader } from "./ports/dosing-medicine-reader";

export type DoseView = { slot: DoseSlot; medicine: DosingMedicine; status: DoseStatus; confirmation: DoseConfirmation | null; period: DosePeriod };
export type DoseSummary = { confirmed: number; total: number };
export type TodaysDoses = {
  date: WibDate; serverTime: number; doses: DoseView[]; carryoverDoses: DoseView[]; earlyDoses: DoseView[]; summary: DoseSummary;
  medicines: { medicineId: string; summary: DoseSummary; nextDose: NextDose | null }[];
};

const summary = (doses: readonly DoseView[]): DoseSummary => ({ confirmed: doses.filter((dose) => dose.status === "sudah").length, total: doses.length });

export class ListTodaysDoses {
  constructor(private readonly medicines: DosingMedicineReader, private readonly confirmations: DoseConfirmationRepository, private readonly clock: Clock) {}

  async execute(input: { householdId: string }): Promise<Result<TodaysDoses, DomainError>> {
    const now = this.clock.now();
    const search = nextDoseDates(now);
    if (!search.ok) return search;
    const [today, tomorrow] = search.value;
    const yesterday = addWibDays(today, -1);
    const dates = [yesterday, today, tomorrow];
    const [medicines, confirmations] = await Promise.all([this.medicines.listActive(input.householdId), this.confirmations.list(input.householdId, dates)]);
    if (!medicines.ok) return medicines;
    if (!confirmations.ok) return confirmations;
    const info = new Map(medicines.value.map((medicine) => [medicine.medicineId, medicine]));
    const slots = new Map<string, DoseSlot>();
    for (const date of dates) {
      const generated = buildDailySlots(medicines.value, date);
      if (!generated.ok) return generated;
      for (const slot of generated.value) slots.set(slot.slotId, slot);
    }
    const recorded = new Map<string, DoseConfirmation>();
    for (const row of confirmations.value) {
      if (!info.has(row.medicineId) || !dates.includes(row.scheduledDate)) continue;
      const slot = createDoseSlot({ medicineId: row.medicineId, scheduledDate: row.scheduledDate, scheduledTime: row.scheduledTime });
      if (!slot.ok) return slot;

      slots.set(slot.value.slotId, slot.value);
      recorded.set(slot.value.slotId, row);
    }
    const views: DoseView[] = [];
    for (const slot of slots.values()) {
      const medicine = info.get(slot.medicineId);
      if (!medicine) continue;
      const confirmation = recorded.get(slot.slotId) ?? null;
      views.push({ slot, medicine, confirmation, status: classifyDose({ scheduledAt: slot.scheduledAt, now, confirmed: confirmation !== null }), period: dosePeriod(toWib(slot.scheduledAt).time) });
    }
    views.sort((a, b) => a.slot.scheduledAt - b.slot.scheduledAt || a.slot.slotId.localeCompare(b.slot.slotId));
    const doses = views.filter((view) => view.slot.scheduledDate === today);
    const nearby = (view: DoseView) => { const window = doseWindow(view.slot.scheduledAt); return now >= window.opensAt && now <= window.closesAt; };
    const perMedicine: TodaysDoses["medicines"] = [];
    const confirmedSlotIds = new Set(recorded.keys());
    for (const medicine of medicines.value) {
      const next = findNextDose({ schedule: medicine, now, confirmedSlotIds });
      if (!next.ok) return next;
      perMedicine.push({ medicineId: medicine.medicineId, summary: summary(doses.filter((view) => view.slot.medicineId === medicine.medicineId)), nextDose: next.value });
    }
    return ok({ date: today, serverTime: now, doses, carryoverDoses: views.filter((view) => view.slot.scheduledDate === yesterday && nearby(view)), earlyDoses: views.filter((view) => view.slot.scheduledDate === tomorrow && nearby(view)), summary: summary(doses), medicines: perMedicine });
  }
}
