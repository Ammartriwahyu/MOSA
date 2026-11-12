import { describe, expect, test } from "vitest";
import { ConfirmDose } from "../../../src/modules/dosing/application/confirm-dose.use-case";
import { ListTodaysDoses } from "../../../src/modules/dosing/application/list-todays-doses.use-case";
import type { DosingMedicineReader } from "../../../src/modules/dosing/application/ports/dosing-medicine-reader";
import type { DoseConfirmationRepository } from "../../../src/modules/dosing/domain/dose-confirmation";
import { domainError } from "../../../src/shared/domain/domain-error";
import { err, ok } from "../../../src/shared/domain/result";
import { atWib } from "../../support/dosing-fixtures";
import { DOSE_MEDICINE, dosingTestSystem, slotId } from "../../support/dosing-test-system";
import { dosingMedicine } from "../../support/in-memory-dosing";

const INPUT = { householdId: "rumah-a", slotId: slotId("07:00"), mode: "basic" as const };

describe("ConfirmDose", () => {
  test("dasar tersimpan, penghitungan ulang sudah, dan tidak bisa dinaikkan menjadi scan lewat replay", async () => {
    const system = dosingTestSystem();
    expect(await system.confirm.execute(INPUT)).toMatchObject({ ok: true, value: { confirmation: { level: "dasar" } } });
    expect(await system.confirm.execute({ ...INPUT, mode: "verified", scanToken: "token-lain" })).toMatchObject({ ok: false, error: { code: "DOSE_ALREADY_CONFIRMED" } });
    const result = await system.list.execute({ householdId: INPUT.householdId });
    expect(result).toMatchObject({ ok: true, value: { summary: { confirmed: 1, total: 2 }, doses: [{ status: "sudah" }, { status: "belum_tiba" }] } });
    expect(system.tokenCalls).toHaveLength(0);
  });
  test.each([["06:29", "DOSE_NOT_DUE"], ["09:01", "DOSE_MISSED"]] as const)("pukul %s ditolak sebagai %s", async (time, code) => {
    const system = dosingTestSystem(atWib("2026-11-11", time));
    expect(await system.confirm.execute(INPUT)).toMatchObject({ ok: false, error: { code } });
    expect(system.confirmations.rows.size).toBe(0);
  });
  test("dua permintaan bersamaan hanya menghasilkan satu catatan", async () => {
    const system = dosingTestSystem();
    const result = await Promise.all([system.confirm.execute(INPUT), system.confirm.execute(INPUT)]);
    expect(result.filter((item) => item.ok)).toHaveLength(1);
    expect(result.find((item) => !item.ok)).toMatchObject({ ok: false, error: { code: "DOSE_ALREADY_CONFIRMED" } });
    expect(system.confirmations.rows.size).toBe(1);
  });
  test.each(["rumah-b", "tidak-ada"])("rumah tangga %s tidak bisa mengambil alih slot", async (householdId) => {
    const system = dosingTestSystem();
    expect(await system.confirm.execute({ ...INPUT, householdId })).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });
  test("slot palsu, obat nonaktif, dan jam yang dihapus ditolak", async () => {
    const system = dosingTestSystem();
    expect(await system.confirm.execute({ ...INPUT, slotId: "rusak" })).toMatchObject({ ok: false, error: { code: "VALIDATION_FAILED" } });
    expect(await system.confirm.execute({ ...INPUT, slotId: slotId("08:00") })).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    system.medicines.rows.set(DOSE_MEDICINE.id, { ...DOSE_MEDICINE, active: false });
    expect(await system.confirm.execute(INPUT)).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });
  test("slot obat sama yang bertumpuk dipilih eksplisit, slot lain tidak ikut terkonfirmasi", async () => {
    const system = dosingTestSystem();
    system.medicines.rows.set(DOSE_MEDICINE.id, { ...DOSE_MEDICINE, intakeTimes: ["07:00", "08:00"] });
    await system.confirm.execute({ ...INPUT, slotId: slotId("08:00") });
    expect(await system.list.execute({ householdId: INPUT.householdId })).toMatchObject({ ok: true, value: { doses: [{ status: "jatuh_tempo" }, { status: "sudah" }], summary: { confirmed: 1, total: 2 } } });
  });
  test("dua obat berjam sama: konfirmasi satu tidak mengubah obat lain", async () => {
    const system = dosingTestSystem();
    system.medicines.rows.set("obat-b", { ...DOSE_MEDICINE, id: "obat-b", intakeTimes: ["07:00"] });
    await system.confirm.execute(INPUT);
    const listed = await system.list.execute({ householdId: INPUT.householdId });
    expect(listed.ok).toBe(true);
    if (listed.ok) expect(listed.value.doses.filter((dose) => dose.slot.scheduledTime === "07:00").map((dose) => dose.status)).toEqual(["sudah", "jatuh_tempo"]);
  });
  test("verified memerlukan token yang benar-benar diverifikasi, dasar tidak memakai token", async () => {
    const system = dosingTestSystem();
    expect(await system.confirm.execute({ ...INPUT, mode: "verified" })).toMatchObject({ ok: false, error: { code: "SCAN_TOKEN_INVALID" } });
    expect(await system.confirm.execute({ ...INPUT, mode: "verified", scanToken: "invalid" })).toMatchObject({ ok: false, error: { code: "SCAN_TOKEN_INVALID" } });
    expect(system.confirmations.rows.size).toBe(0);
    system.setToken(ok({ householdId: INPUT.householdId, medicineId: DOSE_MEDICINE.id, slotId: INPUT.slotId, expiresAt: system.clock.now() + 60_000,
      medicineIdentity: { name: DOSE_MEDICINE.name, strength: DOSE_MEDICINE.strength } }));
    expect(await system.confirm.execute({ ...INPUT, mode: "verified", scanToken: "uji-sah" })).toMatchObject({ ok: true, value: { confirmation: { level: "scan_terverifikasi" } } });
  });
  test.each(["householdId", "medicineId", "slotId", "expiresAt"] as const)("claims %s salah ditolak tanpa mencatat dosis", async (field) => {
    const system = dosingTestSystem();
    const claims = { householdId: INPUT.householdId, medicineId: DOSE_MEDICINE.id, slotId: INPUT.slotId, expiresAt: system.clock.now() + 60_000,
      medicineIdentity: { name: DOSE_MEDICINE.name, strength: DOSE_MEDICINE.strength } };
    system.setToken(ok({ ...claims, ...(field === "expiresAt" ? { expiresAt: system.clock.now() } : { [field]: "lain" }) }));
    expect(await system.confirm.execute({ ...INPUT, mode: "verified", scanToken: "uji" })).toMatchObject({ ok: false, error: { code: "SCAN_TOKEN_INVALID" } });
    expect(system.confirmations.rows.size).toBe(0);
  });
  test("galat simpan diteruskan, bukan status sudah palsu", async () => {
    const system = dosingTestSystem();
    const unavailable = err(domainError("DATABASE_UNAVAILABLE", "Database tidak tersedia."));
    const repository: DoseConfirmationRepository = { list: system.confirmations.list.bind(system.confirmations), confirm: async () => unavailable };
    expect(await new ConfirmDose(system.reader, repository, system.tokens, system.clock).execute(INPUT)).toBe(unavailable);
    expect(system.confirmations.rows.size).toBe(0);
  });
  test("claims tanpa identitas kemasan tidak bisa dipakai untuk verified", async () => {
    const system = dosingTestSystem();
    system.setToken(ok({ householdId: INPUT.householdId, medicineId: DOSE_MEDICINE.id, slotId: INPUT.slotId, expiresAt: system.clock.now() + 60_000 }));
    expect(await system.confirm.execute({ ...INPUT, mode: "verified", scanToken: "uji" })).toMatchObject({ ok: false, error: { code: "SCAN_TOKEN_INVALID" } });
    expect(system.confirmations.rows.size).toBe(0);
  });
});

describe("ListTodaysDoses dan Q5", () => {
  test("dosis kemarin yang masih terbuka dan konfirmasi dini besok tidak masuk hitungan hari ini", async () => {
    const system = dosingTestSystem(atWib("2026-11-11", "23:50"));
    system.medicines.rows.set(DOSE_MEDICINE.id, { ...DOSE_MEDICINE, intakeTimes: ["00:15", "23:00"] });
    expect(await system.confirm.execute({ ...INPUT, slotId: slotId("00:15", "20261112") })).toMatchObject({ ok: true });
    const before = await system.list.execute({ householdId: INPUT.householdId });
    expect(before).toMatchObject({ ok: true, value: { date: "2026-11-11", summary: { confirmed: 0, total: 2 }, earlyDoses: [{ status: "sudah" }] } });
    system.setNow(atWib("2026-11-12", "00:00"));
    const after = await system.list.execute({ householdId: INPUT.householdId });
    expect(after).toMatchObject({ ok: true, value: { date: "2026-11-12", summary: { confirmed: 1, total: 2 }, carryoverDoses: [{ slot: { scheduledDate: "2026-11-11" }, status: "jatuh_tempo" }] } });
    system.setNow(atWib("2026-11-12", "01:00") + 1);
    expect(await system.list.execute({ householdId: INPUT.householdId })).toMatchObject({ ok: true, value: { carryoverDoses: [] } });
  });
  test("jam baru yang sudah lewat tidak dibuat; konfirmasi lama untuk jam dihapus tetap dihitung", async () => {
    const system = dosingTestSystem();
    await system.confirm.execute(INPUT);
    system.setNow(atWib("2026-11-11", "15:00"));
    const changed = { ...dosingMedicine(DOSE_MEDICINE), intakeTimes: ["08:00", "20:00"], intakeTimeStartedAt: { "08:00": system.clock.now(), "20:00": system.clock.now() } };
    const reader: DosingMedicineReader = { findActive: async () => ok(changed), listActive: async () => ok([changed]) };
    const result = await new ListTodaysDoses(reader, system.confirmations, system.clock).execute({ householdId: INPUT.householdId });
    expect(result).toMatchObject({ ok: true, value: { summary: { confirmed: 1, total: 2 }, doses: [{ slot: { scheduledTime: "07:00" }, status: "sudah" }, { slot: { scheduledTime: "20:00" }, status: "belum_tiba" }] } });
  });
  test("obat baru pukul 15.00 tidak menghasilkan dosis 07.00", async () => {
    const system = dosingTestSystem(atWib("2026-11-11", "15:00"));
    system.medicines.rows.set(DOSE_MEDICINE.id, { ...DOSE_MEDICINE, createdAt: system.clock.now() });
    expect(await system.list.execute({ householdId: INPUT.householdId })).toMatchObject({ ok: true, value: { summary: { confirmed: 0, total: 1 }, doses: [{ slot: { scheduledTime: "19:00" } }] } });
  });
  test("data kosong tetap memiliki serverTime; kegagalan konfirmasi tidak dianggap kosong", async () => {
    const system = dosingTestSystem();
    system.medicines.rows.clear();
    expect(await system.list.execute({ householdId: INPUT.householdId })).toMatchObject({ ok: true, value: { serverTime: system.clock.now(), summary: { confirmed: 0, total: 0 }, doses: [], medicines: [] } });
    const failure = err(domainError("DATABASE_UNAVAILABLE", "Database tidak tersedia."));
    const repository: DoseConfirmationRepository = { list: async () => failure, confirm: system.confirmations.confirm.bind(system.confirmations) };
    expect(await new ListTodaysDoses(system.reader, repository, system.clock).execute({ householdId: INPUT.householdId })).toBe(failure);
  });
});
