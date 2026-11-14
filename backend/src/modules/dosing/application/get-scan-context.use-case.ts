import { ok, type Result } from "../../../shared/domain/result";
import type { DomainError } from "../../../shared/domain/domain-error";
import { addWibDays, type WibDate } from "../../../shared/domain/wib-time";
import { buildDailySlots } from "../domain/daily-slots";
import type { DoseConfirmationRepository } from "../domain/dose-confirmation";
import { createDoseSlot, parseDoseSlotId, type DoseSlot } from "../domain/dose-slot";
import { classifyDose, doseWindow, type DoseStatus } from "../domain/dose-window";
import { findNextDose, nextDoseDates, type NextDose } from "../domain/next-dose";
import type { DosingMedicine, DosingMedicineReader } from "./ports/dosing-medicine-reader";

export type ScanContextSnapshot = {
  readonly medicines: readonly DosingMedicine[];
  readonly doses: readonly (DoseSlot & { status: DoseStatus; windowOpen: boolean })[];
  readonly nextDoses: readonly { medicineId: string; nextDose: NextDose | null }[];
};

export class GetScanContext {
  constructor(private readonly medicines: DosingMedicineReader, private readonly confirmations: DoseConfirmationRepository) {}

  async execute(input: { householdId: string; now: number; slotId?: string }): Promise<Result<ScanContextSnapshot, DomainError>> {
    const dates = nextDoseDates(input.now);
    if (!dates.ok) return dates;
    const searchDates = new Set<WibDate>([addWibDays(dates.value[0], -1), ...dates.value]);
    if (input.slotId !== undefined) {
      const selected = parseDoseSlotId(input.slotId);
      if (!selected.ok) return selected;
      searchDates.add(selected.value.scheduledDate);
    }
    const [medicines, recorded] = await Promise.all([
      this.medicines.listActive(input.householdId), this.confirmations.list(input.householdId, [...searchDates]),
    ]);
    if (!medicines.ok) return medicines;
    if (!recorded.ok) return recorded;
    const activeIds = new Set(medicines.value.map((medicine) => medicine.medicineId));
    const slots = new Map<string, DoseSlot>();
    for (const date of searchDates) {
      const generated = buildDailySlots(medicines.value, date);
      if (!generated.ok) return generated;
      for (const slot of generated.value) slots.set(slot.slotId, slot);
    }
    const confirmedIds = new Set<string>();
    for (const row of recorded.value) {
      if (!activeIds.has(row.medicineId) || !searchDates.has(row.scheduledDate)) continue;
      const slot = createDoseSlot({ medicineId: row.medicineId, scheduledDate: row.scheduledDate, scheduledTime: row.scheduledTime });
      if (!slot.ok) return slot;

      slots.set(slot.value.slotId, slot.value);
      confirmedIds.add(slot.value.slotId);
    }
    const doses = [...slots.values()].map((slot) => {
      const window = doseWindow(slot.scheduledAt);
      return { ...slot, status: classifyDose({ scheduledAt: slot.scheduledAt, now: input.now, confirmed: confirmedIds.has(slot.slotId) }),
        windowOpen: input.now >= window.opensAt && input.now <= window.closesAt };
    });
    const nextDoses: { medicineId: string; nextDose: NextDose | null }[] = [];
    for (const medicine of medicines.value) {
      const next = findNextDose({ schedule: medicine, now: input.now, confirmedSlotIds: confirmedIds });
      if (!next.ok) return next;
      nextDoses.push({ medicineId: medicine.medicineId, nextDose: next.value });
    }
    return ok({ medicines: medicines.value, doses, nextDoses });
  }
}
