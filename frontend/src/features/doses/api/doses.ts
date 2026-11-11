import { api } from "@/shared/lib";
import { todaysDosesSchema, type TodaysDoses } from "../schemas/todays-doses";

export function getTodaysDoses(signal?: AbortSignal): Promise<TodaysDoses> {
  return api().json("/v1/doses/today", todaysDosesSchema, { signal });
}
