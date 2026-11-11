import { z } from "zod";
import { api } from "@/shared/lib";

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
