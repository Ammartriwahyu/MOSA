import { formatTimeOfDay, minutesOfDay, parseTimeOfDay } from "../../../../shared/domain/wib-time";

export const MAX_INTAKE_TIMES = 6;

export type ScheduleTimesError = "kosong" | "format" | "duplikat" | "terlalu_banyak";

export function parseScheduleTimes(raw: readonly string[]): { ok: true; value: string[] } | { ok: false; reason: ScheduleTimesError } {
  if (raw.length === 0) return { ok: false, reason: "kosong" };
  if (raw.length > MAX_INTAKE_TIMES) return { ok: false, reason: "terlalu_banyak" };

  const times = [];
  for (const text of raw) {
    const parsed = parseTimeOfDay(text.trim());
    if (!parsed.ok) return { ok: false, reason: "format" };
    times.push(parsed.value);
  }

  const sorted = [...times].sort((a, b) => minutesOfDay(a) - minutesOfDay(b)).map(formatTimeOfDay);
  if (new Set(sorted).size !== sorted.length) return { ok: false, reason: "duplikat" };
  return { ok: true, value: sorted };
}
