import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { z } from "zod";
import { DATA_TABLES } from "../support/sql-database";
import { e2eSystem, type E2eSystem } from "../support/e2e-system";
import { E2E_IMAGE, MEDICINE_INPUT, addMedicine, call, confirmPath, consent, dashboard, scanSchema } from "../support/e2e-client";

let system: E2eSystem;
beforeAll(async () => { system = await e2eSystem(); }, 30_000);
beforeEach(async () => { await system.reset(); });
afterAll(async () => { await system?.close(); });

describe("alur emas HTTP dengan adaptor asli dan PostgreSQL sementara", () => {
  test("daftar/persetujuan → periksa/simpan obat → jadwal → scan → ✓✓; malam tanpa scan → 2/2", async () => {
    const { token } = await system.register();
    expect(await call(system, token, "GET", "/v1/household")).toMatchObject({ dataConsentAt: null, scanConsentAt: null, outputMode: null });
    expect(await call(system, token, "GET", "/v1/medicines", undefined, 403)).toMatchObject({ error: { code: "CONSENT_REQUIRED" } });
    await consent(system, token);
    expect((await dashboard(system, token)).summary).toEqual({ confirmed: 0, total: 0 });
    const explained = z.object({ explanation: z.string() }).parse(await call(system, token, "POST", "/v1/medicines/explain", { usageRule: MEDICINE_INPUT.usageRule, warnings: MEDICINE_INPUT.warnings, notes: null }));
    // Meminta AI/pratinjau bukan menyimpan; POST baru dilakukan setelah pemeriksaan pengisi.
    expect(await call(system, token, "GET", "/v1/medicines")).toEqual({ medicines: [] });
    const medicine = await addMedicine(system, token, { explanation: explained.explanation, explanationOrigin: "ai_dikonfirmasi" });
    expect(medicine.explanation).toBe(explained.explanation); expect(system.explainFields).toEqual([["aturanPakai", "catatan", "larangan"]]);
    system.setNow("2026-11-12T00:30:00Z");
    const before = await dashboard(system, token); expect(before.summary).toEqual({ confirmed: 0, total: 2 });
    expect(before.doses.find((dose) => dose.scheduledTime === "07:00")?.status).toBe("jatuh_tempo");
    expect(await call(system, token, "POST", "/v1/scan", { image: E2E_IMAGE }, 403)).toMatchObject({ error: { code: "CONSENT_REQUIRED" } });
    expect(system.scanCalls()).toBe(0); await consent(system, token, "scan");
    const scanned = scanSchema.parse(await call(system, token, "POST", "/v1/scan", { image: E2E_IMAGE }));
    expect(scanned.outcome).toBe("bisa_konfirmasi"); expect(scanned.slots).toHaveLength(1);
    const slot = scanned.slots[0]!; expect(slot.scanToken).toBeTruthy();
    expect((await dashboard(system, token)).summary).toEqual(before.summary); // Belum ada POST konfirmasi.
    expect(await call(system, token, "PATCH", "/v1/household/preferences", { outputMode: "suara" })).toMatchObject({ outputMode: "suara" });
    expect(await call(system, token, "GET", "/v1/household")).toMatchObject({ outputMode: "suara" });
    const receipt = await call(system, token, "POST", confirmPath(slot.slotId), { mode: "verified", scanToken: slot.scanToken }, 201);
    expect(receipt).toMatchObject({ status: "sudah", confirmation: { level: "scan_terverifikasi", medicineId: medicine.id, scheduledTime: "07:00" } });
    expect((await dashboard(system, token)).summary).toEqual({ confirmed: 1, total: 2 });
    expect(await call(system, token, "POST", confirmPath(slot.slotId), { mode: "verified", scanToken: slot.scanToken }, 409)).toMatchObject({ error: { code: "DOSE_ALREADY_CONFIRMED" } });
    system.setNow("2026-11-12T12:00:00Z");
    const evening = (await dashboard(system, token)).doses.find((dose) => dose.scheduledTime === "19:00")!;
    await call(system, token, "POST", confirmPath(evening.slotId), { mode: "basic" }, 201);
    const complete = await dashboard(system, token); expect(complete.summary).toEqual({ confirmed: 2, total: 2 });
    expect(complete.doses.map((dose) => dose.confirmation?.level)).toEqual(["scan_terverifikasi", "dasar"]);
    const logs = JSON.stringify(system.logger.events);
    for (const hidden of [token, slot.scanToken!, E2E_IMAGE.data, MEDICINE_INPUT.name, MEDICINE_INPUT.purpose, explained.explanation]) expect(logs).not.toContain(hidden);
  });
  test("hapus akun lewat HTTP menghapus enam tabel dan menolak sesi lama, keluarga lain tetap utuh", async () => {
    const first = await system.register(); await consent(system, first.token); await addMedicine(system, first.token);
    const second = await system.register("keluarga-lain@example.invalid"); await consent(system, second.token); const otherMedicine = await addMedicine(system, second.token);
    system.setNow("2026-11-12T00:30:00Z");
    const dose = (await dashboard(system, first.token)).doses[0]!;
    await call(system, first.token, "POST", confirmPath(dose.slotId), { mode: "basic" }, 201);
    // Data tahap push belum dibuat lewat API (P14): hanya precondition uji cascade.
    const house = (await system.db.query<{ id: string }>("select id from public.households where owner_user_id=$1", [first.userId])).rows[0]!.id;
    await system.db.query("insert into public.push_subscriptions(household_id,endpoint,p256dh,auth) values($1,'https://push.invalid/e2e','uji','uji')", [house]);
    await system.db.query("insert into public.reminder_dispatches(medicine_id,scheduled_date,scheduled_time,kind) values($1,'2026-11-12','07:00','uji')", [dose.medicineId]);
    await call(system, first.token, "POST", "/v1/medicines/explain", { usageRule: "Sesudah makan", warnings: "Tidak ada larangan khusus", notes: null });
    await call(system, first.token, "DELETE", "/v1/household", undefined, 204);
    expect((await system.db.query("select id from auth.users where id=$1", [first.userId])).rows).toEqual([]);
    expect(await call(system, first.token, "GET", "/v1/household", undefined, 401)).toMatchObject({ error: { code: "UNAUTHENTICATED" } });
    expect(await call(system, second.token, "GET", "/v1/medicines")).toMatchObject({ medicines: [{ id: otherMedicine.id }] });
    for (const table of DATA_TABLES) {
      const key = table === "households" ? "id" : table === "reminder_dispatches" ? "medicine_id" : "household_id";
      const id = table === "reminder_dispatches" ? dose.medicineId : house;
      expect((await system.db.query(`select * from public.${table} where ${key}=$1`, [id])).rows).toEqual([]);
    }
  });
});
