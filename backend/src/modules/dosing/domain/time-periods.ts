import { minutesOfDay, type TimeOfDay } from "../../../shared/domain/wib-time";

// USULAN D10: lihat docs/07-open-decisions.md. Pukul 00.00–03.59 tetap Malam,
// tetapi tanggal slot selalu tanggal kalender WIB, bukan hari sebelumnya.
export const PERIOD_START_MINUTES = Object.freeze({ pagi: 4 * 60, siang: 11 * 60, malam: 18 * 60 });
export type DosePeriod = "pagi" | "siang" | "malam";

export function dosePeriod(time: TimeOfDay): DosePeriod {
  const minute = minutesOfDay(time);
  if (minute < PERIOD_START_MINUTES.pagi || minute >= PERIOD_START_MINUTES.malam) return "malam";
  return minute < PERIOD_START_MINUTES.siang ? "pagi" : "siang";
}
