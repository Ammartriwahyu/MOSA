import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { E2E_IMAGE, MEDICINE_INPUT, addMedicine, call, confirmPath, consent, dashboard, scanSchema } from "../support/e2e-client";
import { e2eSystem, type E2eSystem } from "../support/e2e-system";

let system: E2eSystem;
beforeAll(async () => { system = await e2eSystem(); }, 30_000);
beforeEach(async () => { await system.reset(); });
afterAll(async () => { await system?.close(); });
async function prepared() {
  const user = await system.register(); await consent(system, user.token); const medicine = await addMedicine(system, user.token);
  await consent(system, user.token, "scan"); system.setNow("2026-11-12T00:30:00Z");
  return { ...user, medicine };
}
async function scan(token: string) { return scanSchema.parse(await call(system, token, "POST", "/v1/scan", { image: E2E_IMAGE })); }
async function confirmationCount() {
  return (await system.db.query<{ count: number }>("select count(*)::integer as count from public.dose_confirmations")).rows[0]!.count;
}

describe("alur gagal/alternatif HTTP tidak menyebabkan minum ganda", () => {
  test("scan ulang obat yang sama pada slot kedua menaikkan 1/2 menjadi 2/2 dengan dua level scan", async () => {
    const { token } = await prepared();
    const morning = (await scan(token)).slots[0]!;
    await call(system, token, "POST", confirmPath(morning.slotId), { mode: "verified", scanToken: morning.scanToken }, 201);
    expect((await dashboard(system, token)).summary).toEqual({ confirmed: 1, total: 2 });
    system.setNow("2026-11-12T12:00:00Z");
    const evening = (await scan(token)).slots[0]!;
    expect(evening.slotId).not.toBe(morning.slotId);
    await call(system, token, "POST", confirmPath(evening.slotId), { mode: "verified", scanToken: morning.scanToken }, 403);
    expect((await dashboard(system, token)).summary.confirmed).toBe(1);
    await call(system, token, "POST", confirmPath(evening.slotId), { mode: "verified", scanToken: evening.scanToken }, 201);
    const after = await dashboard(system, token);
    expect(after.summary).toEqual({ confirmed: 2, total: 2 });
    expect(after.doses.map((dose) => dose.confirmation?.level)).toEqual(["scan_terverifikasi", "scan_terverifikasi"]);
    expect(await confirmationCount()).toBe(2);
  });

  test("Q5 HTTP/SQL dengan waktu aktif terkendali: jam lampau tidak ditambah, riwayat tetap ada", async () => {
    const { token, medicine } = await prepared();
    const old = (await dashboard(system, token)).doses[0]!;
    await call(system, token, "POST", confirmPath(old.slotId), { mode: "basic" }, 201);
    await call(system, token, "PATCH", `/v1/medicines/${medicine.id}`, { ...MEDICINE_INPUT, intakeTimes: ["07:15", "08:00", "19:00"] });
    // Clock aplikasi tetap 12 Nov; clock_timestamp() PGlite mengikuti mesin.
    // Selaraskan hanya waktu aktif baru pada fixture, bukan mengganti trigger/RPC.
    // Pelestarian waktu jam lama dan penciptaan metadata trigger diuji terpisah pada SQL.
    await system.db.query(`update public.medicines set intake_times_started_at = intake_times_started_at || $2::jsonb where id=$1`,
      [medicine.id, JSON.stringify({ "07:15": "2026-11-12T00:30:00Z", "08:00": "2026-11-12T00:30:00Z" })]);
    const changed = await dashboard(system, token);
    expect(changed.doses.map((dose) => dose.scheduledTime)).toEqual(["07:00", "08:00", "19:00"]);
    expect(changed.summary).toEqual({ confirmed: 1, total: 3 });
    const next = changed.doses.find((dose) => dose.scheduledTime === "08:00")!;
    expect(next.status).toBe("jatuh_tempo");
    await call(system, token, "POST", confirmPath(next.slotId), { mode: "basic" }, 201);
    expect((await dashboard(system, token)).summary).toEqual({ confirmed: 2, total: 3 });
    expect(await confirmationCount()).toBe(2);
  });

  test("slot bertumpuk tetap dua pilihan, mengonfirmasi satu tidak mengonsumsi yang lain", async () => {
    const { token } = await system.register(); await consent(system, token); await consent(system, token, "scan");
    await addMedicine(system, token, { intakeTimes: ["07:00", "07:15"] });
    system.setNow("2026-11-12T00:00:00Z");
    const first = await scan(token); expect(first.slots).toHaveLength(2);
    await call(system, token, "POST", confirmPath(first.slots[0]!.slotId), { mode: "verified", scanToken: first.slots[0]!.scanToken }, 201);
    const second = await scan(token); expect(second.slots).toHaveLength(1);
    expect(second.slots[0]!.slotId).toBe(first.slots[1]!.slotId);
    await call(system, token, "POST", confirmPath(second.slots[0]!.slotId), { mode: "verified", scanToken: second.slots[0]!.scanToken }, 201);
    expect((await dashboard(system, token)).summary).toEqual({ confirmed: 2, total: 2 });
  });

  test("AI penjelasan gagal: belum ada obat sebelum POST; fallback asli tersimpan dan scan gagal tidak mencatat", async () => {
    const { token } = await system.register(); await consent(system, token); system.failExplain();
    expect(await call(system, token, "POST", "/v1/medicines/explain", { usageRule: MEDICINE_INPUT.usageRule, warnings: MEDICINE_INPUT.warnings, notes: null }, 503)).toMatchObject({ error: { code: "AI_UNAVAILABLE" } });
    expect(await call(system, token, "GET", "/v1/medicines")).toEqual({ medicines: [] });
    const medicine = await addMedicine(system, token); expect(medicine.explanationOrigin).toBe("teks_pengisi"); expect(medicine.explanation).toBeNull();
    await consent(system, token, "scan"); system.setNow("2026-11-12T00:30:00Z"); system.failScan();
    expect(await call(system, token, "POST", "/v1/scan", { image: E2E_IMAGE }, 503)).toMatchObject({ error: { code: "AI_UNAVAILABLE" } });
    expect(await confirmationCount()).toBe(0); const today = await dashboard(system, token); expect(today.summary).toEqual({ confirmed: 0, total: 2 });
    const slot = today.doses[0]!;
    expect(await call(system, token, "POST", confirmPath(slot.slotId), { mode: "basic" }, 201)).toMatchObject({ confirmation: { level: "dasar" } });
    expect((await dashboard(system, token)).summary).toEqual({ confirmed: 1, total: 2 });
  });
  test("scan tanpa POST lalu token kedaluwarsa tidak mengubah hitungan atau catatan SQL", async () => {
    const { token } = await prepared(); const result = await scan(token); const selected = result.slots[0]!;
    expect((await dashboard(system, token)).summary.confirmed).toBe(0); expect(await confirmationCount()).toBe(0);
    system.setNow("2026-11-12T00:35:00Z");
    expect(await call(system, token, "POST", confirmPath(selected.slotId), { mode: "verified", scanToken: selected.scanToken }, 403)).toMatchObject({ error: { code: "SCAN_TOKEN_INVALID" } });
    expect(await confirmationCount()).toBe(0); expect((await dashboard(system, token)).summary.confirmed).toBe(0);
  });
  test("dua obat pada jam sama: token obat pertama tidak bisa mengonfirmasi obat kedua", async () => {
    const { token } = await system.register(); await consent(system, token);
    const medicine = await addMedicine(system, token);
    const other = await addMedicine(system, token, { name: "Metformin", strength: "500 mg" });
    await consent(system, token, "scan"); system.setNow("2026-11-12T00:30:00Z");
    const before = await dashboard(system, token); expect(before.summary).toEqual({ confirmed: 0, total: 4 });
    const otherSlot = before.doses.find((dose) => dose.medicineId === other.id && dose.scheduledTime === "07:00")!;
    expect(otherSlot.status).toBe("jatuh_tempo");
    const selected = (await scan(token)).slots[0]!;
    await call(system, token, "POST", confirmPath(otherSlot.slotId), { mode: "verified", scanToken: selected.scanToken }, 403);
    await call(system, token, "POST", confirmPath(selected.slotId), { mode: "verified", scanToken: selected.scanToken }, 201);
    const after = await dashboard(system, token); expect(after.summary).toEqual({ confirmed: 1, total: 4 });
    expect(after.doses.filter((dose) => dose.confirmation).map((dose) => dose.medicineId)).toEqual([medicine.id]);
    expect(after.doses.filter((dose) => dose.medicineId === other.id).every((dose) => dose.status !== "sudah")).toBe(true);
  });
  test("dua POST HTTP bersamaan untuk token sama memberi satu 201 dan satu 409; replay mempertahankan level", async () => {
    const { token } = await prepared(); const selected = (await scan(token)).slots[0]!;
    // HTTP benar-benar paralel; transport PGlite mengantrekan satu koneksi SQL.
    const responses = await Promise.all([1, 2].map(() => fetch(`${system.origin}${confirmPath(selected.slotId)}`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ mode: "verified", scanToken: selected.scanToken }), signal: AbortSignal.timeout(4_000) })));
    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
    await Promise.all(responses.map((response) => response.json()));
    expect(await confirmationCount()).toBe(1); expect((await dashboard(system, token)).summary).toEqual({ confirmed: 1, total: 2 });
    await call(system, token, "POST", confirmPath(selected.slotId), { mode: "basic" }, 409);
    expect((await dashboard(system, token)).doses[0]?.confirmation?.level).toBe("scan_terverifikasi");
  });
  test.each(["kekuatan_beda", "hanya_info"] as const)("hasil %s tidak mengeluarkan token atau menulis dosis", async (outcome) => {
    const { token } = await prepared();
    if (outcome === "kekuatan_beda") system.setReading({ names: ["Amlodipin"], strength: "10 mg", legible: true });
    else system.setNow("2026-11-12T05:00:00Z");
    const raw = await call(system, token, "POST", "/v1/scan", { image: E2E_IMAGE });
    expect(JSON.stringify(raw)).not.toContain("scanToken");
    const result = scanSchema.parse(raw); expect(result.outcome).toBe(outcome); expect(result.slots).toEqual([]);
    expect(await confirmationCount()).toBe(0); expect((await dashboard(system, token)).summary.confirmed).toBe(0);
  });
  test("keluarga lain tidak dapat membaca, mengubah, menghapus atau mengonfirmasi obat lewat ID yang diketahui", async () => {
    const first = await prepared(); const second = await system.register("keluarga-lain@example.invalid"); await consent(system, second.token);
    const slot = (await dashboard(system, first.token)).doses[0]!;
    for (const method of ["GET", "PATCH", "DELETE"]) {
      await call(system, second.token, method, `/v1/medicines/${first.medicine.id}`, method === "PATCH" ? MEDICINE_INPUT : undefined, 404);
    }
    await call(system, second.token, "POST", confirmPath(slot.slotId), { mode: "basic" }, 404);
    const house = (await system.db.query<{ id: string }>("select id from public.households where owner_user_id=$1", [first.userId])).rows[0]!.id;
    const other = await addMedicine(system, second.token, { householdId: house });
    expect(await call(system, first.token, "GET", "/v1/medicines")).toMatchObject({ medicines: [{ id: first.medicine.id }] });
    expect(await call(system, second.token, "GET", "/v1/medicines")).toMatchObject({ medicines: [{ id: other.id }] });
    expect(await confirmationCount()).toBe(0);
  });
  test("ubah data dan hapus lunak lewat adaptor asli tidak menghapus riwayat konfirmasi", async () => {
    const { token, medicine } = await prepared(); const slot = (await dashboard(system, token)).doses[0]!;
    await call(system, token, "POST", confirmPath(slot.slotId), { mode: "basic" }, 201);
    await call(system, token, "PATCH", `/v1/medicines/${medicine.id}`, { ...MEDICINE_INPUT, labelSource: "apoteker", purpose: "Kegunaan fiktif diperbaiki" });
    expect(await call(system, token, "GET", `/v1/medicines/${medicine.id}`)).toMatchObject({ labelSource: "apoteker", purpose: "Kegunaan fiktif diperbaiki" });
    expect((await dashboard(system, token)).summary).toEqual({ confirmed: 1, total: 2 });
    await call(system, token, "DELETE", `/v1/medicines/${medicine.id}`, undefined, 204);
    await call(system, token, "GET", `/v1/medicines/${medicine.id}`, undefined, 404);
    expect((await dashboard(system, token)).summary).toEqual({ confirmed: 0, total: 0 }); expect(await confirmationCount()).toBe(1);
  });
  test("akun demo tidak terhapus dan sesi/data tetap tersedia setelah DELETE ditolak", async () => {
    const { token, userId, medicine } = await prepared();
    await system.db.query("update public.households set is_demo=true where owner_user_id=$1", [userId]);
    expect(await call(system, token, "DELETE", "/v1/household", undefined, 403)).toMatchObject({ error: { code: "DEMO_PROTECTED" } });
    expect(await call(system, token, "GET", "/v1/medicines")).toMatchObject({ medicines: [{ id: medicine.id }] });
  });
});
