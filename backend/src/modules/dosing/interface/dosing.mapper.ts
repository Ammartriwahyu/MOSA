import type { DoseView, TodaysDoses } from "../application/list-todays-doses.use-case";
import type { DoseConfirmation } from "../domain/dose-confirmation";
import { createDoseSlot } from "../domain/dose-slot";

export function confirmationResponse(row: DoseConfirmation) {
  const slot = createDoseSlot({ medicineId: row.medicineId, scheduledDate: row.scheduledDate, scheduledTime: row.scheduledTime });
  if (!slot.ok) throw new Error("Konfirmasi tersimpan memiliki slot tidak valid.");
  return { id: row.id, slotId: slot.value.slotId, medicineId: row.medicineId, scheduledDate: row.scheduledDate, scheduledTime: row.scheduledTime, confirmedAt: new Date(row.confirmedAt).toISOString(), level: row.level };
}

function doseResponse(view: DoseView) {
  const { medicine } = view;
  return {
    ...view.slot, scheduledAt: new Date(view.slot.scheduledAt).toISOString(), status: view.status, period: view.period,
    confirmation: view.confirmation ? confirmationResponse(view.confirmation) : null,
    medicine: { id: medicine.medicineId, name: medicine.name, strength: medicine.strength, purpose: medicine.purpose, doseAmount: medicine.doseAmount, usageRule: medicine.usageRule, warnings: medicine.warnings, notes: medicine.notes, labelSource: medicine.labelSource, explanationOrigin: medicine.explanationOrigin, explanation: medicine.explanationOrigin === "ai_dikonfirmasi" ? medicine.explanation : null },
  };
}

export function todaysDosesResponse(result: TodaysDoses) {
  return {
    date: result.date, serverTime: new Date(result.serverTime).toISOString(), summary: result.summary,
    doses: result.doses.map(doseResponse), carryoverDoses: result.carryoverDoses.map(doseResponse), earlyDoses: result.earlyDoses.map(doseResponse),
    medicines: result.medicines.map((row) => ({ medicineId: row.medicineId, summary: row.summary, nextDose: row.nextDose ? { tanggal: row.nextDose.relativeDay, kelompok: row.nextDose.period, jam: row.nextDose.slot.scheduledTime } : null })),
  };
}
