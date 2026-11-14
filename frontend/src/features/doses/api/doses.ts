import { api } from "@/shared/lib";
import { todaysDosesSchema, type TodaysDoses } from "../schemas/todays-doses";
import { confirmDoseSchema, type DoseConfirmation } from "../schemas/confirm-dose";

export function getTodaysDoses(signal?: AbortSignal): Promise<TodaysDoses> {
  return api().json("/v1/doses/today", todaysDosesSchema, { signal });
}

export function confirmBasicDose(slotId: string) {
  return api().json(`/v1/doses/${encodeURIComponent(slotId)}/confirm`, confirmDoseSchema.refine((value) =>
    value.confirmation.slotId === slotId && value.confirmation.level === "dasar",
  ), { method: "POST", body: { mode: "basic" } });
}

export type VerifiedDoseInput = { slotId: string; medicineId: string; scheduledDate: string; scheduledTime: string; scanToken: string };

export function confirmVerifiedDose(input: VerifiedDoseInput, signal: AbortSignal): Promise<DoseConfirmation> {
  return api().json(`/v1/doses/${encodeURIComponent(input.slotId)}/confirm`, confirmDoseSchema.refine(({ confirmation: row }) =>
    row.slotId === input.slotId && row.medicineId === input.medicineId && row.scheduledDate === input.scheduledDate
      && row.scheduledTime === input.scheduledTime && row.level === "scan_terverifikasi",
  ), { method: "POST", signal, body: { mode: "verified", scanToken: input.scanToken } });
}
