import { describe, expect, test } from "vitest";
import { GetNextDose } from "../../../src/modules/dosing/application/get-next-dose.use-case";
import type { ConfirmedDoseReader } from "../../../src/modules/dosing/application/ports/confirmed-dose-reader";
import type { MedicineScheduleReader } from "../../../src/modules/dosing/application/ports/medicine-schedule-reader";
import { fixedClock } from "../../../src/shared/domain/clock";
import { domainError } from "../../../src/shared/domain/domain-error";
import { err, ok } from "../../../src/shared/domain/result";
import { atWib, MEDICINE_SCHEDULE } from "../../support/dosing-fixtures";

const INPUT = { householdId: "rumah-uji", medicineId: MEDICINE_SCHEDULE.medicineId };
const NOW = atWib("2026-11-11", "06:45");

describe("GetNextDose melalui port dan Clock", () => {
  test("meneruskan rumah tangga/obat, mengambil konfirmasi dua tanggal WIB dan membaca Clock sekali", async () => {
    const calls: unknown[] = [];
    let clockReads = 0;
    const medicines: MedicineScheduleReader = { findActive: async (...args) => { calls.push(args); return ok(MEDICINE_SCHEDULE); } };
    const confirmations: ConfirmedDoseReader = { listConfirmedSlotIds: async (input) => {
      calls.push(input);
      return ok([`${MEDICINE_SCHEDULE.medicineId}:20261111:0700`]);
    } };
    const useCase = new GetNextDose(medicines, confirmations, { now: () => { clockReads++; return NOW; } });
    const result = await useCase.execute(INPUT);
    expect(result).toMatchObject({ ok: true, value: { slot: { scheduledTime: "19:00", scheduledDate: "2026-11-11" }, relativeDay: "hari_ini" } });
    expect(calls).toEqual([[INPUT.householdId, INPUT.medicineId], { ...INPUT, dates: ["2026-11-11", "2026-11-12"] }]);
    expect(clockReads).toBe(1);
  });

  test.each([null, { ...MEDICINE_SCHEDULE, active: false }, { ...MEDICINE_SCHEDULE, medicineId: "obat-lain" }])("tidak ada obat aktif yang sesuai: NOT_FOUND, tanpa membaca konfirmasi", async (schedule) => {
    let reads = 0;
    const medicines: MedicineScheduleReader = { findActive: async () => ok(schedule) };
    const confirmations: ConfirmedDoseReader = { listConfirmedSlotIds: async () => { reads++; return ok([]); } };
    expect(await new GetNextDose(medicines, confirmations, fixedClock(NOW)).execute(INPUT)).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    expect(reads).toBe(0);
  });

  test("galat pembacaan jadwal diteruskan sebagai Result", async () => {
    const failure = err(domainError("DATABASE_UNAVAILABLE", "Database tidak tersedia."));
    const medicines: MedicineScheduleReader = { findActive: async () => failure };
    const confirmations: ConfirmedDoseReader = { listConfirmedSlotIds: async () => { throw new Error("Tidak boleh dipanggil."); } };
    expect(await new GetNextDose(medicines, confirmations, fixedClock(NOW)).execute(INPUT)).toBe(failure);
  });

  test("galat pembacaan konfirmasi tidak dianggap daftar konfirmasi kosong", async () => {
    const failure = err(domainError("DATABASE_UNAVAILABLE", "Database tidak tersedia."));
    const medicines: MedicineScheduleReader = { findActive: async () => ok(MEDICINE_SCHEDULE) };
    const confirmations: ConfirmedDoseReader = { listConfirmedSlotIds: async () => failure };
    expect(await new GetNextDose(medicines, confirmations, fixedClock(NOW)).execute(INPUT)).toBe(failure);
  });

  test("tanggal konfirmasi memakai WIB saat UTC masih hari sebelumnya", async () => {
    let requested: unknown;
    const medicines: MedicineScheduleReader = { findActive: async () => ok(MEDICINE_SCHEDULE) };
    const confirmations: ConfirmedDoseReader = { listConfirmedSlotIds: async (input) => { requested = input.dates; return ok([]); } };
    const result = await new GetNextDose(medicines, confirmations, fixedClock(Date.parse("2026-11-11T17:10:00Z"))).execute(INPUT);
    expect(requested).toEqual(["2026-11-12", "2026-11-13"]);
    expect(result).toMatchObject({ ok: true, value: { slot: { scheduledDate: "2026-11-12", scheduledTime: "07:00" } } });
  });
});
