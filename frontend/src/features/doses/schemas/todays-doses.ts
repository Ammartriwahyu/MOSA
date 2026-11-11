import { z } from "zod";

const time = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
const date = z.iso.date();
const timestamp = z.iso.datetime();
const period = z.enum(["pagi", "siang", "malam"]);
const summary = z.object({ confirmed: z.number().int().nonnegative(), total: z.number().int().nonnegative() })
  .refine((value) => value.confirmed <= value.total);

const medicine = z.object({
  id: z.string().min(1), name: z.string().min(1), strength: z.string(), purpose: z.string(),
  doseAmount: z.string(), usageRule: z.string(), warnings: z.string(), notes: z.string().nullable(),
  labelSource: z.enum(["apoteker", "keluarga"]), explanationOrigin: z.enum(["ai_dikonfirmasi", "teks_pengisi"]),
  explanation: z.string().nullable(),
});
const confirmation = z.object({
  id: z.string().min(1), slotId: z.string().min(1), medicineId: z.string().min(1),
  scheduledDate: date, scheduledTime: time, confirmedAt: timestamp,
  level: z.enum(["dasar", "scan_terverifikasi"]),
});

export const doseSchema = z.object({
  slotId: z.string().min(1), medicineId: z.string().min(1), scheduledDate: date,
  scheduledTime: time, scheduledAt: timestamp, period,
  status: z.enum(["belum_tiba", "jatuh_tempo", "terlewat", "sudah"]),
  confirmation: confirmation.nullable(), medicine,
}).refine((value) => (value.status === "sudah") === (value.confirmation !== null));

export const todaysDosesSchema = z.object({
  date, serverTime: timestamp, summary,
  doses: z.array(doseSchema), carryoverDoses: z.array(doseSchema), earlyDoses: z.array(doseSchema),
  medicines: z.array(z.object({
    medicineId: z.string().min(1), summary,
    nextDose: z.object({ tanggal: z.enum(["hari_ini", "besok"]), kelompok: period, jam: time }).nullable(),
  })),
});

export type TodaysDoses = z.infer<typeof todaysDosesSchema>;
export type Dose = z.infer<typeof doseSchema>;
