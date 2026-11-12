import { formatTimeOfDay, toWib } from "../../../shared/domain/wib-time";
import type { VerifyPackageResult } from "../application/verify-package.use-case";
import type { VerificationSlot } from "../domain/verification-outcome";

function slotResponse(slot: VerificationSlot) {
  const wib = toWib(slot.scheduledAt);
  return { slotId: slot.slotId, medicineId: slot.medicineId, scheduledAt: new Date(slot.scheduledAt).toISOString(), scheduledDate: wib.date, scheduledTime: formatTimeOfDay(wib.time) };
}

export function scanResponse(result: VerifyPackageResult) {
  const { decision, snapshot } = result;
  const base = { outcome: decision.outcome, serverTime: new Date(result.serverTime).toISOString() };
  const medicineResponse = (medicineId: string) => {
    const medicine = snapshot.medicines.find((row) => row.medicineId === medicineId);
    if (!medicine) throw new Error("Snapshot scan kehilangan identitas obat.");
    return { id: medicine.medicineId, name: medicine.name, strength: medicine.strength, purpose: medicine.purpose,
      doseAmount: medicine.doseAmount, usageRule: medicine.usageRule, warnings: medicine.warnings, notes: medicine.notes,
      labelSource: medicine.labelSource, explanationOrigin: medicine.explanationOrigin,
      explanation: medicine.explanationOrigin === "ai_dikonfirmasi" ? medicine.explanation : null };
  };
  if (decision.outcome === "tidak_terbaca" || decision.outcome === "tidak_terdaftar") return base;
  if (decision.outcome === "kekuatan_tidak_terbaca" || decision.outcome === "kekuatan_beda") {
    return { ...base, medicines: decision.medicines.map((medicine) => medicineResponse(medicine.medicineId)),
      ...(decision.outcome === "kekuatan_beda" ? { readStrength: decision.readStrength.normalized } : {}) };
  }
  const next = snapshot.nextDoses.find((row) => row.medicineId === decision.medicine.medicineId)?.nextDose;
  const info = { ...base, medicine: medicineResponse(decision.medicine.medicineId), readStrength: decision.readStrength.normalized,
    nextDose: next ? { ...slotResponse(next.slot), tanggal: next.tanggal, kelompok: next.kelompok, jam: next.jam } : null };
  if (decision.outcome === "bisa_konfirmasi") return { ...info, slots: decision.slots.map((slot) => {
    const token = result.tokens.find((entry) => entry.slotId === slot.slotId);
    if (!token) throw new Error("Keputusan konfirmasi tidak memiliki token.");
    return { ...slotResponse(slot), scanToken: token.scanToken, expiresAt: new Date(token.expiresAt).toISOString() };
  }) };
  if (decision.outcome === "dosis_sudah_tercatat") return { ...info, slots: decision.slots.map(slotResponse) };
  if (decision.outcome === "tunggu_dulu") return { ...info, otherDueSlots: decision.otherDueSlots.map((slot) => ({ ...slotResponse(slot), medicine: medicineResponse(slot.medicineId) })) };
  return info;
}
