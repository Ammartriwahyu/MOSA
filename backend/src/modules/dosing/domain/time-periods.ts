import { minutesOfDay, type TimeOfDay } from "../../../shared/domain/wib-time.js";

export const PERIOD_START_MINUTES = Object.freeze({ pagi: 4 * 60, siang: 11 * 60, malam: 18 * 60 });
export type DosePeriod = "pagi" | "siang" | "malam";

export function dosePeriod(time: TimeOfDay): DosePeriod {
  const minute = minutesOfDay(time);
  if (minute < PERIOD_START_MINUTES.pagi || minute >= PERIOD_START_MINUTES.malam) return "malam";
  return minute < PERIOD_START_MINUTES.siang ? "pagi" : "siang";
}
