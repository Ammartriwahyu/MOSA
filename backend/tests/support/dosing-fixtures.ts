import type { MedicineSchedule } from "../../src/modules/dosing/domain/daily-slots";
import { fromWib, parseTimeOfDay, parseWibDate, type WibDate } from "../../src/shared/domain/wib-time";

export function wibDate(text: string): WibDate {
  const parsed = parseWibDate(text);
  if (!parsed.ok) throw new Error("Tanggal uji tidak valid.");
  return parsed.value;
}

export function atWib(date: string, time: string): number {
  const parsed = parseTimeOfDay(time);
  if (!parsed.ok) throw new Error("Jam uji tidak valid.");
  return fromWib(wibDate(date), parsed.value);
}

// Data fiktif: dua jadwal tanpa identitas atau teks obat.
export const MEDICINE_SCHEDULE: MedicineSchedule = {
  medicineId: "obat-uji-1",
  active: true,
  createdAt: atWib("2026-11-10", "00:00"),
  intakeTimes: ["07:00", "19:00"],
};
