import { z } from "zod";
import { api } from "@/shared/lib";
import type { MedicineFormOutput } from "../schemas/medicine-form";

export const medicineSchema = z.object({
  id: z.string(),
  name: z.string(),
  strength: z.string(),
  purpose: z.string(),
  doseAmount: z.string(),
  usageRule: z.string(),
  warnings: z.string(),
  notes: z.string().nullable(),

  intakeTimes: z.array(z.string()),
  labelSource: z.enum(["apoteker", "keluarga"]),

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

export function updateMedicine(id: string, input: CreateMedicineInput): Promise<Medicine> {
  return api().json(`/v1/medicines/${encodeURIComponent(id)}`, medicineSchema, { method: "PATCH", body: input });
}

export function deactivateMedicine(id: string): Promise<void> {
  return api().noContent(`/v1/medicines/${encodeURIComponent(id)}`, { method: "DELETE" });
}
