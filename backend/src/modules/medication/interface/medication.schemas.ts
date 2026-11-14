import { z } from "zod";

const MAX_TEXT = 2_000;
const text = z.string().max(MAX_TEXT);
const optionalText = text.nullable().default(null);

export const explainBodySchema = z.object({
  usageRule: text,
  warnings: text,
  notes: optionalText,
});

export const medicineBodySchema = z.object({
  name: text,
  strength: text,
  purpose: text,
  doseAmount: text,
  usageRule: text,
  warnings: text,
  notes: optionalText,
  intakeTimes: z.array(z.string().max(10)).max(12),
  // Klien lama tanpa kolom ini tetap berarti "setiap hari".
  intakeDays: z.array(z.number().int()).max(7).default([1, 2, 3, 4, 5, 6, 7]),
  labelSource: z.enum(["apoteker", "keluarga"]),
  explanationOrigin: z.enum(["ai_dikonfirmasi", "teks_pengisi"]),
  explanation: optionalText,
});
