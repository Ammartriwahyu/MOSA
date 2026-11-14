import { expect, test } from "vitest";
import { DRAFT } from "@/shared/copy";
import type { Medicine } from "../api/medicines";
import { medicineToFormValues } from "./medicine-edit";

const MEDICINE: Medicine = {
  id: "uji", name: "Obat Uji", strength: "5 mg", purpose: "Kegunaan uji", doseAmount: "1 tablet",
  usageRule: "Sesudah makan", warnings: "Peringatan uji", notes: "Kotak biru", intakeTimes: ["06:30", "18:30"], intakeDays: [1, 2, 3, 4, 5, 6, 7],
  labelSource: "apoteker", explanation: "Penjelasan lama", explanationOrigin: "ai_dikonfirmasi", createdAt: "2026-11-11T00:00:00Z",
};

test("sumber dikosongkan, semua isian asli dipertahankan, tanpa membawa penjelasan lama", () => {
  const result = medicineToFormValues(MEDICINE);
  expect(result).toMatchObject({
    name: MEDICINE.name, strength: MEDICINE.strength, purpose: MEDICINE.purpose, doseAmount: MEDICINE.doseAmount,
    usageRule: MEDICINE.usageRule, warnings: MEDICINE.warnings, notes: MEDICINE.notes, labelSource: null, noWarnings: false,
  });
  expect(result).not.toHaveProperty("explanation");
  expect(result).not.toHaveProperty("explanationOrigin");
  expect(result.times.filter((row) => row.checked).map((row) => row.time)).toEqual(MEDICINE.intakeTimes);
});

test("enam jadwal khusus tidak terpotong oleh pilihan jam bawaan", () => {
  const intakeTimes = ["05:30", "08:30", "11:30", "14:30", "17:30", "20:30"];
  const result = medicineToFormValues({ ...MEDICINE, intakeTimes });
  expect(result.times).toHaveLength(6);
  expect(result.times.every((row) => row.checked)).toBe(true);
  expect(result.times.map((row) => row.time)).toEqual(intakeTimes);
  expect(new Set(result.times.map((row) => row.key)).size).toBe(6);
});

test("catatan null menjadi isian kosong; larangan baku dicentang", () => {
  const result = medicineToFormValues({ ...MEDICINE, notes: null, warnings: DRAFT.tidakAdaLarangan });
  expect(result.notes).toBe("");
  expect(result.noWarnings).toBe(true);
});
