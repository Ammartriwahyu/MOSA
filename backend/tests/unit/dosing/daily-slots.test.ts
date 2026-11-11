import { describe, expect, test } from "vitest";
import { buildDailySlots } from "../../../src/modules/dosing/domain/daily-slots";
import { createDoseSlot, parseDoseSlotId } from "../../../src/modules/dosing/domain/dose-slot";
import { classifyDose } from "../../../src/modules/dosing/domain/dose-window";
import { atWib, MEDICINE_SCHEDULE, wibDate } from "../../support/dosing-fixtures";

const DAY = wibDate("2026-11-11");

describe("slot harian: dihitung, tidak disimpan", () => {
  test("Q5: jam yang baru ditambahkan tidak membuat slot lampau; jam yang tetap dipakai tidak hilang", () => {
    const result = buildDailySlots([{ ...MEDICINE_SCHEDULE, intakeTimes: ["07:00", "08:00", "20:00"], intakeTimeStartedAt: { "07:00": MEDICINE_SCHEDULE.createdAt, "08:00": atWib(DAY, "15:00"), "20:00": atWib(DAY, "15:00") } }], DAY);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.map((slot) => slot.scheduledTime)).toEqual(["07:00", "20:00"]);
  });
  test("waktu aktif jam yang rusak ditolak, bukan membolehkan konfirmasi", () => {
    expect(buildDailySlots([{ ...MEDICINE_SCHEDULE, intakeTimeStartedAt: { "07:00": NaN } }], DAY)).toMatchObject({ ok: false, error: { code: "VALIDATION_FAILED" } });
  });
  test("hanya obat aktif, terurut deterministik dan input tidak diubah", () => {
    const schedules = Object.freeze([
      Object.freeze({ ...MEDICINE_SCHEDULE, medicineId: "obat-b", intakeTimes: Object.freeze(["19:00", "07:00"]) }),
      { ...MEDICINE_SCHEDULE, medicineId: "obat-z", active: false },
      { ...MEDICINE_SCHEDULE, medicineId: "obat-a", intakeTimes: ["07:00"] },
    ]);
    const result = buildDailySlots(schedules, DAY);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.map((slot) => slot.slotId)).toEqual([
      "obat-a:20261111:0700", "obat-b:20261111:0700", "obat-b:20261111:1900",
    ]);
    expect(buildDailySlots([...schedules].reverse(), DAY)).toEqual(result);
  });

  test("AC-20: dibuat 15.00 dengan jadwal 07.00/19.00 hanya menghasilkan slot 19.00", () => {
    const result = buildDailySlots([{ ...MEDICINE_SCHEDULE, createdAt: atWib(DAY, "15:00") }], DAY);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.map((slot) => slot.scheduledTime)).toEqual(["19:00"]);
  });

  test.each([0, 1])("dibuat tepat J + %i ms: hanya jadwal yang tidak mendahului pembuatan", (delay) => {
    const result = buildDailySlots([{ ...MEDICINE_SCHEDULE, createdAt: atWib(DAY, "07:00") + delay }], DAY);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.map((slot) => slot.scheduledTime)).toEqual(delay === 0 ? ["07:00", "19:00"] : ["19:00"]);
  });

  test("hari berikutnya kembali berisi semua jadwal, tanpa bergantung jam pembuatan kemarin", () => {
    const schedule = { ...MEDICINE_SCHEDULE, createdAt: atWib("2026-11-10", "23:59") };
    const result = buildDailySlots([schedule], DAY);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toHaveLength(2);
  });

  test("hari sebelum obat dibuat dan daftar kosong tidak menghasilkan slot", () => {
    expect(buildDailySlots([MEDICINE_SCHEDULE], wibDate("2026-11-09"))).toEqual({ ok: true, value: [] });
    expect(buildDailySlots([], DAY)).toEqual({ ok: true, value: [] });
  });

  test("slot melewati tahun dan tengah malam tetap memakai tanggal jadwal asal", () => {
    const schedule = { ...MEDICINE_SCHEDULE, intakeTimes: ["00:00", "23:59"] };
    const first = buildDailySlots([schedule], wibDate("2026-12-31"));
    const second = buildDailySlots([schedule], wibDate("2027-01-01"));
    if (!first.ok || !second.ok) throw new Error("Slot uji tidak valid.");
    expect(first.value.map((slot) => slot.scheduledDate)).toEqual(["2026-12-31", "2026-12-31"]);
    expect(second.value.map((slot) => slot.scheduledDate)).toEqual(["2027-01-01", "2027-01-01"]);
    const last = first.value[1];
    if (!last) throw new Error("Slot uji tidak ada.");
    expect(classifyDose({ scheduledAt: last.scheduledAt, now: atWib("2027-01-01", "00:00"), confirmed: false })).toBe("jatuh_tempo");
  });

  test.each([
    { ...MEDICINE_SCHEDULE, intakeTimes: [] },
    { ...MEDICINE_SCHEDULE, intakeTimes: ["07:00", "07:00"] },
    { ...MEDICINE_SCHEDULE, intakeTimes: ["7:00"] },
    { ...MEDICINE_SCHEDULE, intakeTimes: ["24:00"] },
    { ...MEDICINE_SCHEDULE, createdAt: NaN },
    { ...MEDICINE_SCHEDULE, createdAt: Infinity },
    { ...MEDICINE_SCHEDULE, medicineId: "" },
  ])("jadwal rusak ditolak sebagai Result tanpa slot parsial: %j", (schedule) => {
    const result = buildDailySlots([MEDICINE_SCHEDULE, { ...schedule, medicineId: schedule.medicineId ? "obat-rusak" : "" }], DAY);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("VALIDATION_FAILED");
  });

  test("obat aktif ganda ditolak; isian obat nonaktif tidak menghasilkan galat atau slot", () => {
    expect(buildDailySlots([MEDICINE_SCHEDULE, MEDICINE_SCHEDULE], DAY).ok).toBe(false);
    expect(buildDailySlots([{ ...MEDICINE_SCHEDULE, active: false, intakeTimes: [] }], DAY)).toEqual({ ok: true, value: [] });
  });
});

describe("ID slot deterministik dan bisa dibawa lewat URL", () => {
  test("buat → encode/decode URL → parse menghasilkan identitas dan epoch yang sama", () => {
    const slot = createDoseSlot({ medicineId: "obat-uji", scheduledDate: DAY, scheduledTime: "07:00" });
    if (!slot.ok) throw new Error("Slot uji tidak valid.");
    expect(slot.value).toEqual({ medicineId: "obat-uji", scheduledDate: DAY, scheduledTime: "07:00", slotId: "obat-uji:20261111:0700", scheduledAt: atWib(DAY, "07:00") });
    expect(parseDoseSlotId(decodeURIComponent(encodeURIComponent(slot.value.slotId)))).toEqual(slot);
  });

  test.each(["", "obat:20260230:0700", "obat:20261111:2400", "obat:20261111:0760", "obat:2026111:0700", "obat:20261111:700", ":20261111:0700", "obat:20261111:0700:lain", " obat:20261111:0700"])("ID tidak sah ditolak tanpa memantulkan teks input: %j", (id) => {
    const result = parseDoseSlotId(id);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION_FAILED");
      expect(result.error.details).toEqual({ field: "slotId" });
    }
  });
});
