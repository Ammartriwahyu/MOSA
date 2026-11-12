import { describe, expect, test } from "vitest";
import { GetScanContext } from "../../../src/modules/dosing/application/get-scan-context.use-case";
import { ok } from "../../../src/shared/domain/result";
import { dosingMedicine } from "../../support/in-memory-dosing";
import { atWib } from "../../support/dosing-fixtures";
import { DOSE_MEDICINE, dosingTestSystem, slotId } from "../../support/dosing-test-system";

describe("GetScanContext memakai aturan dosing tanpa menduplikasi di verification", () => {
  test("jam baru tidak menghasilkan slot yang mendahului waktu pengaktifannya", async () => {
    const system = dosingTestSystem();
    const medicine = { ...dosingMedicine(DOSE_MEDICINE), intakeTimeStartedAt: { "07:00": atWib("2026-11-11", "08:00"), "19:00": DOSE_MEDICINE.createdAt } };
    const reader = { listActive: async () => ok([medicine]), findActive: async () => ok(medicine) };
    const result = await new GetScanContext(reader, system.confirmations).execute({ householdId: "rumah-a", now: system.clock.now() });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.doses.some((dose) => dose.slotId === slotId("07:00"))).toBe(false);
  });
  test("sudah dan windowOpen berbeda: konfirmasi lama tidak menjadi jendela yang masih terbuka", async () => {
    const system = dosingTestSystem();
    await system.confirm.execute({ householdId: "rumah-a", slotId: slotId("07:00"), mode: "basic" });
    const result = await new GetScanContext(system.reader, system.confirmations).execute({ householdId: "rumah-a", now: atWib("2026-11-11", "12:00") });
    expect(result).toMatchObject({ ok: true, value: { doses: expect.arrayContaining([{ slotId: slotId("07:00"), medicineId: DOSE_MEDICINE.id, scheduledDate: "2026-11-11", scheduledTime: "07:00", scheduledAt: atWib("2026-11-11", "07:00"), status: "sudah", windowOpen: false }]) } });
  });
  test("konfirmasi dini dilewati oleh nextDose", async () => {
    const system = dosingTestSystem(atWib("2026-11-11", "18:45"));
    await system.confirm.execute({ householdId: "rumah-a", slotId: slotId("19:00"), mode: "basic" });
    const result = await new GetScanContext(system.reader, system.confirmations).execute({ householdId: "rumah-a", now: system.clock.now() });
    expect(result).toMatchObject({ ok: true, value: { nextDoses: [{ medicineId: DOSE_MEDICINE.id, nextDose: { relativeDay: "besok", slot: { scheduledTime: "07:00" } } }] } });
  });
  test("target tanggal lama dibaca dari konfirmasi tanggal asal", async () => {
    const system = dosingTestSystem();
    await system.confirm.execute({ householdId: "rumah-a", slotId: slotId("07:00"), mode: "basic" });
    const result = await new GetScanContext(system.reader, system.confirmations).execute({ householdId: "rumah-a", now: atWib("2026-11-15", "07:30"), slotId: slotId("07:00") });
    expect(result).toMatchObject({ ok: true, value: { doses: expect.arrayContaining([expect.objectContaining({ slotId: slotId("07:00"), status: "sudah", windowOpen: false })]) } });
  });
  test.each(["obat-a:20260230:0700", "obat-a:20261111:2500", "rusak"])("target tidak valid %s ditolak", async (target) => {
    const system = dosingTestSystem();
    expect(await new GetScanContext(system.reader, system.confirmations).execute({ householdId: "rumah-a", now: system.clock.now(), slotId: target }))
      .toMatchObject({ ok: false, error: { code: "VALIDATION_FAILED" } });
  });
});
