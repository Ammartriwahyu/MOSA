import { describe, expect, test } from "vitest";
import { findNextDose } from "../../../src/modules/dosing/domain/next-dose";
import { atWib, MEDICINE_SCHEDULE } from "../../support/dosing-fixtures";

const DATE = "2026-11-11";

describe("pencarian dosis berikutnya", () => {
  test.each([
    ["06:45", "07:00", "hari_ini", "pagi"],
    ["07:00", "19:00", "hari_ini", "malam"],
    ["19:00", "07:00", "besok", "pagi"],
    ["23:59", "07:00", "besok", "pagi"],
  ] as const)("sekarang %s → %s %s", (now, time, relativeDay, period) => {
    const result = findNextDose({ schedule: MEDICINE_SCHEDULE, now: atWib(DATE, now), confirmedSlotIds: new Set() });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toMatchObject({ slot: { medicineId: MEDICINE_SCHEDULE.medicineId, scheduledTime: time }, relativeDay, period });
    expect(result.value?.slot.scheduledDate).toBe(relativeDay === "hari_ini" ? DATE : "2026-11-12");
  });

  test("konfirmasi awal pada slot mendatang dilewati, bukan disarankan lagi", () => {
    const result = findNextDose({
      schedule: MEDICINE_SCHEDULE, now: atWib(DATE, "06:45"),
      confirmedSlotIds: new Set([`${MEDICINE_SCHEDULE.medicineId}:20261111:0700`]),
    });
    expect(result).toMatchObject({ ok: true, value: { slot: { scheduledTime: "19:00" }, relativeDay: "hari_ini" } });
  });

  test("jadwal dini hari besok tetap Malam, dengan tanggal kalender hari berikutnya", () => {
    const result = findNextDose({ schedule: { ...MEDICINE_SCHEDULE, intakeTimes: ["00:15", "23:00"] }, now: atWib(DATE, "23:50"), confirmedSlotIds: new Set() });
    expect(result).toMatchObject({ ok: true, value: { slot: { scheduledDate: "2026-11-12", scheduledTime: "00:15" }, relativeDay: "besok", period: "malam" } });
  });

  test("slot besok yang sudah dikonfirmasi dini juga dilewati", () => {
    const result = findNextDose({
      schedule: { ...MEDICINE_SCHEDULE, intakeTimes: ["00:15", "07:00"] }, now: atWib(DATE, "23:50"),
      confirmedSlotIds: new Set([`${MEDICINE_SCHEDULE.medicineId}:20261112:0015`]),
    });
    expect(result).toMatchObject({ ok: true, value: { slot: { scheduledTime: "07:00" }, relativeDay: "besok" } });
  });

  test("tidak menyarankan slot hari pertama yang mendahului pembuatan obat", () => {
    const result = findNextDose({ schedule: { ...MEDICINE_SCHEDULE, createdAt: atWib(DATE, "15:00") }, now: atWib(DATE, "06:00"), confirmedSlotIds: new Set() });
    expect(result).toMatchObject({ ok: true, value: { slot: { scheduledTime: "19:00" } } });
  });

  test("obat nonaktif tidak punya dosis berikut; jadwal rusak menghasilkan Result galat", () => {
    const input = { now: atWib(DATE, "06:00"), confirmedSlotIds: new Set<string>() };
    expect(findNextDose({ ...input, schedule: { ...MEDICINE_SCHEDULE, active: false } })).toEqual({ ok: true, value: null });
    expect(findNextDose({ ...input, schedule: { ...MEDICINE_SCHEDULE, intakeTimes: [] } })).toMatchObject({ ok: false, error: { code: "VALIDATION_FAILED" } });
  });

  test("tidak ada slot yang tersisa di rentang hari ini/besok → null", () => {
    const result = findNextDose({ schedule: { ...MEDICINE_SCHEDULE, intakeTimes: ["07:00"] }, now: atWib(DATE, "20:00"), confirmedSlotIds: new Set([`${MEDICINE_SCHEDULE.medicineId}:20261112:0700`]) });
    expect(result).toEqual({ ok: true, value: null });
  });

  test("jam pencarian tidak sah ditolak tanpa hasil jadwal palsu", () => {
    expect(findNextDose({ schedule: MEDICINE_SCHEDULE, now: NaN, confirmedSlotIds: new Set() })).toMatchObject({ ok: false, error: { code: "VALIDATION_FAILED", details: { field: "now" } } });
  });
});
