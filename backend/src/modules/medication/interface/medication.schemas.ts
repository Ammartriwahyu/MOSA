import { z } from "zod";

// Validasi bentuk di tepi HTTP. Batas panjang per kolom dan aturan isi ada di
// domain (LIMITS, validateMedicineInput); di sini hanya pagar ukuran kasar.
const MAX_TEXT = 2_000;
const text = z.string().max(MAX_TEXT);
const optionalText = text.nullable().default(null);

export const explainBodySchema = z.object({
  usageRule: text,
  warnings: text,
  notes: optionalText,
});

/** Tambah dan ubah memakai bentuk yang sama: ubah = alur penuh (PRD §19 #11). */
export const medicineBodySchema = z.object({
  name: text,
  strength: text,
  purpose: text,
  doseAmount: text,
  usageRule: text,
  warnings: text,
  notes: optionalText,
  intakeTimes: z.array(z.string().max(10)).max(12),
  labelSource: z.enum(["apoteker", "keluarga"]),
  explanationOrigin: z.enum(["ai_dikonfirmasi", "teks_pengisi"]),
  explanation: optionalText,
});
