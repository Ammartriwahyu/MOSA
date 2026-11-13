import { describe, expect, test, vi } from "vitest";
import { ok } from "../../src/shared/domain/result";
import { GetHousehold } from "../../src/modules/household/application/get-household.use-case";
import { DosingDueDoseReader } from "../../src/modules/notification/infrastructure/dosing-due-dose-reader";
import { atWib } from "../support/dosing-fixtures";
import { DOSE_MEDICINE, dosingTestSystem, slotId } from "../support/dosing-test-system";
import { householdFixture, InMemoryHouseholdRepository } from "../support/in-memory-household-repository";

function system(consent: number | null = 1) {
  const doses = dosingTestSystem();
  const households = new InMemoryHouseholdRepository([householdFixture({ id: "rumah-a", ownerUserId: "user-a", dataConsentAt: consent })]);
  return { ...doses, due: new DosingDueDoseReader(doses.list, new GetHousehold(households)) };
}
describe("pengingat memakai status dari dosing asli", () => {
  test.each([["06:29", 0], ["06:30", 1], ["09:00", 1], ["09:01", 0]] as const)("jendela J−30/J+120 inklusif pada %s", async (time, count) => {
    const s = system(); s.setNow(atWib("2026-11-11", time));
    const result = await s.due.read("rumah-a"); expect(result.ok && result.value.length).toBe(count);
  });
  test("slot terkonfirmasi, nonaktif dan rumah tangga lain tidak dikirim", async () => {
    const s = system();
    expect((await s.confirm.execute({ householdId: "rumah-a", slotId: slotId("07:00"), mode: "basic" })).ok).toBe(true);
    expect(await s.due.read("rumah-a")).toEqual({ ok: true, value: [] });
    s.medicines.rows.set("obat-a", { ...DOSE_MEDICINE, active: false });
    expect(await s.due.read("rumah-a")).toEqual({ ok: true, value: [] });
    expect(await s.due.read("lain")).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });
  test("jendela lintas hari serta dua jadwal bertumpuk tetap terpisah", async () => {
    const s = system(); s.setNow(atWib("2026-11-12", "00:10"));
    s.medicines.rows.set("obat-a", { ...DOSE_MEDICINE, intakeTimes: ["23:50", "00:20"] });
    const result = await s.due.read("rumah-a");
    expect(result).toMatchObject({ ok: true, value: [{ scheduledDate: "2026-11-11", scheduledTime: "23:50" },
      { scheduledDate: "2026-11-12", scheduledTime: "00:20" }] });
  });
  test("jam baru berlaku langsung tanpa menciptakan slot masa lalu", async () => {
    const s = system();
    const rows = await s.reader.listActive("rumah-a");
    const medicine = rows.ok && rows.value[0]; if (!medicine) throw Error("fixture");
    vi.spyOn(s.reader, "listActive").mockResolvedValue(ok([{ ...medicine,
      intakeTimeStartedAt: { "07:00": atWib("2026-11-11", "07:10"), "19:00": DOSE_MEDICINE.createdAt } }]));
    expect(await s.due.read("rumah-a")).toEqual({ ok: true, value: [] });
  });
  test("tanpa consent tidak mengingatkan; epoch 0 adalah consent sah", async () => {
    expect(await system(null).due.read("rumah-a")).toEqual({ ok: true, value: [] });
    const result = await system(0).due.read("rumah-a"); expect(result.ok && result.value.length).toBe(1);
  });
});
