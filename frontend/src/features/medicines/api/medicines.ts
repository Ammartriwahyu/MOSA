import { z } from "zod";
import { api } from "@/shared/lib";
import type { MedicineFormOutput } from "../schemas/medicine-form";

// Bentuk obat dari backend (GET /v1/medicines, /v1/medicines/:id). Data
// divalidasi di sini agar layar tidak pernah merender bentuk yang tak dikenal.
export const medicineSchema = z.object({
  id: z.string(),
  name: z.string(),
  strength: z.string(),
  purpose: z.string(),
  doseAmount: z.string(),
  usageRule: z.string(),
  warnings: z.string(),
  notes: z.string().nullable(),
  /** "HH:mm" WIB, terurut. */
  intakeTimes: z.array(z.string()),
  labelSource: z.enum(["apoteker", "keluarga"]),
  /** Ada hanya bila explanationOrigin = ai_dikonfirmasi. */
  explanation: z.string().nullable(),
  explanationOrigin: z.enum(["ai_dikonfirmasi", "teks_pengisi"]),
  createdAt: z.string(),
});

export type Medicine = z.infer<typeof medicineSchema>;

const listSchema = z.object({ medicines: z.array(medicineSchema) });

export async function listMedicines(): Promise<Medicine[]> {
  const { medicines } = await api().json("/v1/medicines", listSchema);
  return medicines;
}

export function getMedicine(id: string): Promise<Medicine> {
  return api().json(`/v1/medicines/${encodeURIComponent(id)}`, medicineSchema);
}

export type ExplanationInput = Pick<MedicineFormOutput, "usageRule" | "warnings" | "notes">;
export type ReviewedExplanation =
  | { explanation: string; explanationOrigin: "ai_dikonfirmasi" }
  | { explanation: null; explanationOrigin: "teks_pengisi" };
export type CreateMedicineInput = MedicineFormOutput & ReviewedExplanation;

const explanationSchema = z.object({ explanation: z.string().trim().min(1) });

/** Daftar kolom eksplisit: identitas, kegunaan, takaran, dan jadwal tidak dikirim ke AI. */
export async function explainMedicine(input: ExplanationInput, signal?: AbortSignal): Promise<string> {
  const { explanation } = await api().json("/v1/medicines/explain", explanationSchema, {
    method: "POST",
    body: { usageRule: input.usageRule, warnings: input.warnings, notes: input.notes },
    signal,
  });
  return explanation;
}

export function createMedicine(input: CreateMedicineInput): Promise<Medicine> {
  return api().json("/v1/medicines", medicineSchema, { method: "POST", body: input });
}

/** PATCH mengganti semua isian, termasuk penjelasan yang diperiksa ulang. */
export function updateMedicine(id: string, input: CreateMedicineInput): Promise<Medicine> {
  return api().json(`/v1/medicines/${encodeURIComponent(id)}`, medicineSchema, { method: "PATCH", body: input });
}

/** Backend menonaktifkan obat; riwayat konsumsi dipertahankan. */
export function deactivateMedicine(id: string): Promise<void> {
  return api().noContent(`/v1/medicines/${encodeURIComponent(id)}`, { method: "DELETE" });
}
