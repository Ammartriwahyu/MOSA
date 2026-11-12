import { z } from "zod";
import { parseScanTarget } from "../lib/scan-target";

const timestamp = z.iso.datetime();
const time = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
const medicine = z.object({
  id: z.string().min(1), name: z.string().min(1), strength: z.string().min(1), purpose: z.string(),
  doseAmount: z.string(), usageRule: z.string(), warnings: z.string(), notes: z.string().nullable(),
  labelSource: z.enum(["apoteker", "keluarga"]), explanationOrigin: z.enum(["ai_dikonfirmasi", "teks_pengisi"]),
  explanation: z.string().nullable(),
}).refine((row) => row.explanationOrigin !== "teks_pengisi" || row.explanation === null);
const slotFields = {
  slotId: z.string().min(1).max(256), medicineId: z.string().min(1), scheduledAt: timestamp,
  scheduledDate: z.iso.date(), scheduledTime: time,
};
const slot = z.object(slotFields);
const nextDose = z.object({ ...slotFields, tanggal: z.enum(["hari_ini", "besok"]),
  kelompok: z.enum(["pagi", "siang", "malam"]), jam: time }).nullable();
const matched = { medicine, readStrength: z.string().min(1), nextDose };
const base = { serverTime: timestamp };

/** Delapan DTO P06. Field tambahan dibuang; token hanya dipertahankan pada bisa_konfirmasi. */
export const scanResponseSchema = z.discriminatedUnion("outcome", [
  z.object({ ...base, outcome: z.literal("tidak_terbaca") }),
  z.object({ ...base, outcome: z.literal("tidak_terdaftar") }),
  z.object({ ...base, outcome: z.literal("kekuatan_tidak_terbaca"), medicines: z.array(medicine).min(1) }),
  z.object({ ...base, outcome: z.literal("kekuatan_beda"), medicines: z.array(medicine).min(1), readStrength: z.string().min(1) }),
  z.object({ ...base, ...matched, outcome: z.literal("hanya_info") }),
  z.object({ ...base, ...matched, outcome: z.literal("dosis_sudah_tercatat"), slots: z.array(slot).min(1) }),
  z.object({ ...base, ...matched, outcome: z.literal("tunggu_dulu"), otherDueSlots: z.array(z.object({ ...slotFields, medicine })).min(1) }),
  z.object({ ...base, ...matched, outcome: z.literal("bisa_konfirmasi"), slots: z.array(z.object({
    ...slotFields, scanToken: z.string().min(1).max(4096), expiresAt: timestamp,
  })).min(1) }),
]).superRefine((value, ctx) => {
  const checkSlot = (row: z.infer<typeof slot>) => {
    const target = parseScanTarget(row.slotId);
    if (target.mode !== "selected" || target.date !== row.scheduledDate || target.time !== row.scheduledTime
      || row.slotId.split(":")[0] !== row.medicineId) ctx.addIssue({ code: "custom", message: "Slot tidak konsisten." });
  };
  if (!("medicine" in value)) return;
  if (value.nextDose) {
    checkSlot(value.nextDose);
    if (value.nextDose.medicineId !== value.medicine.id || value.nextDose.jam !== value.nextDose.scheduledTime)
      ctx.addIssue({ code: "custom", message: "Jadwal berikutnya tidak konsisten." });
  }
  if (value.outcome === "bisa_konfirmasi" || value.outcome === "dosis_sudah_tercatat") {
    if (new Set(value.slots.map((row) => row.slotId)).size !== value.slots.length)
      ctx.addIssue({ code: "custom", message: "Slot berulang." });
    for (const row of value.slots) {
      checkSlot(row);
      if (row.medicineId !== value.medicine.id) ctx.addIssue({ code: "custom", message: "Identitas slot berbeda." });
      if ("expiresAt" in row && Date.parse(row.expiresAt) <= Date.parse(value.serverTime))
        ctx.addIssue({ code: "custom", message: "Token sudah kedaluwarsa pada waktu server." });
    }
  }
  if (value.outcome === "tunggu_dulu") for (const row of value.otherDueSlots) {
    checkSlot(row);
    if (row.medicine.id !== row.medicineId || row.medicineId === value.medicine.id)
      ctx.addIssue({ code: "custom", message: "Obat lain tidak konsisten." });
  }
});

export type ScanResponse = z.infer<typeof scanResponseSchema>;
