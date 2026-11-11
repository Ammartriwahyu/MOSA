import type { ExplanationOrigin, LabelSource, Medicine } from "../domain/medicine";

// Bentuk respons untuk frontend. household_id, kolom normalisasi, dan status
// aktif tidak dikirim (obat nonaktif tidak pernah dikembalikan).
export type MedicineResponse = {
  id: string;
  name: string;
  strength: string;
  purpose: string;
  doseAmount: string;
  usageRule: string;
  warnings: string;
  notes: string | null;
  intakeTimes: string[];
  labelSource: LabelSource;
  explanation: string | null;
  explanationOrigin: ExplanationOrigin;
  createdAt: string;
};

export function toMedicineResponse(medicine: Medicine): MedicineResponse {
  return {
    id: medicine.id,
    name: medicine.name,
    strength: medicine.strength,
    purpose: medicine.purpose,
    doseAmount: medicine.doseAmount,
    usageRule: medicine.usageRule,
    warnings: medicine.warnings,
    notes: medicine.notes,
    intakeTimes: [...medicine.intakeTimes],
    labelSource: medicine.labelSource,
    explanation: medicine.explanation,
    explanationOrigin: medicine.explanationOrigin,
    createdAt: new Date(medicine.createdAt).toISOString(),
  };
}
