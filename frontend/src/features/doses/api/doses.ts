import { api } from "@/shared/lib";
import { todaysDosesSchema, type TodaysDoses } from "../schemas/todays-doses";
import { confirmDoseSchema } from "../schemas/confirm-dose";

export function getTodaysDoses(signal?: AbortSignal): Promise<TodaysDoses> {
  return api().json("/v1/doses/today", todaysDosesSchema, { signal });
}

/** Tidak menerima level/household/waktu dari pemanggil. Respons harus cocok dengan slot basic ini. */
export function confirmBasicDose(slotId: string) {
  return api().json(`/v1/doses/${encodeURIComponent(slotId)}/confirm`, confirmDoseSchema.refine((value) =>
    value.confirmation.slotId === slotId && value.confirmation.level === "dasar",
  ), { method: "POST", body: { mode: "basic" } });
}
