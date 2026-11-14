import { describe, expect, test } from "vitest";
import { buildDailySlots } from "../../../src/modules/dosing/domain/daily-slots";
import { isoWeekday } from "../../../src/shared/domain/wib-time";
import { atWib, MEDICINE_SCHEDULE, wibDate } from "../../support/dosing-fixtures";

// 2026-11-16 Senin, 2026-11-19 Kamis, 2026-11-22 Minggu.
const MONDAY = wibDate("2026-11-16");
const THURSDAY = wibDate("2026-11-19");
const SUNDAY = wibDate("2026-11-22");
const times = (result: ReturnType<typeof buildDailySlots>) => (result.ok ? result.value.map((slot) => slot.scheduledTime) : null);

describe("hari minum", () => {
  test("isoWeekday mengikuti PostgreSQL isodow (Senin 1 … Minggu 7)", () => {
    expect([MONDAY, THURSDAY, SUNDAY].map(isoWeekday)).toEqual([1, 4, 7]);
  });

  test("tanpa intakeDays tetap setiap hari (data lama)", () => {
    expect(times(buildDailySlots([MEDICINE_SCHEDULE], THURSDAY))).toEqual(["07:00", "19:00"]);
  });

  test("hari yang tidak dipilih tidak menghasilkan slot", () => {
    const schedule = { ...MEDICINE_SCHEDULE, intakeDays: [1, 7] };
    expect(times(buildDailySlots([schedule], MONDAY))).toEqual(["07:00", "19:00"]);
    expect(times(buildDailySlots([schedule], THURSDAY))).toEqual([]);
    expect(times(buildDailySlots([schedule], SUNDAY))).toEqual(["07:00", "19:00"]);
  });

  test("Q5: hari yang baru ditambahkan hari ini tidak membuat slot lampau", () => {
    const schedule = { ...MEDICINE_SCHEDULE, intakeDays: [4], intakeDayStartedAt: { "4": atWib(THURSDAY, "15:00") } };
    expect(times(buildDailySlots([schedule], THURSDAY))).toEqual(["19:00"]);
    expect(times(buildDailySlots([schedule], wibDate("2026-11-26")))).toEqual(["07:00", "19:00"]);
  });

  test("waktu aktif hari yang rusak ditolak", () => {
    const schedule = { ...MEDICINE_SCHEDULE, intakeDays: [4], intakeDayStartedAt: { "4": NaN } };
    expect(buildDailySlots([schedule], THURSDAY)).toMatchObject({ ok: false, error: { code: "VALIDATION_FAILED" } });
  });
});
