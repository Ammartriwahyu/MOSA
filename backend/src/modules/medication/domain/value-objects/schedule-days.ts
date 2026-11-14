/** Hari minum ISO: 1 = Senin … 7 = Minggu. Semua hari = "setiap hari". */
export const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7] as const;

export type ScheduleDaysError = "kosong" | "format" | "duplikat";

export function parseScheduleDays(raw: readonly number[]): { ok: true; value: number[] } | { ok: false; reason: ScheduleDaysError } {
  if (raw.length === 0) return { ok: false, reason: "kosong" };
  if (raw.some((day) => !Number.isInteger(day) || day < 1 || day > 7)) return { ok: false, reason: "format" };
  const sorted = [...raw].sort((a, b) => a - b);
  if (new Set(sorted).size !== sorted.length) return { ok: false, reason: "duplikat" };
  return { ok: true, value: sorted };
}
