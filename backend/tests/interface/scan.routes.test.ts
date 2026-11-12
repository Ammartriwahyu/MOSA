import { describe, expect, test } from "vitest";
import { MAX_SCAN_REQUEST_BYTES } from "../../src/modules/verification/interface/scan-body";
import { PACKAGE_IMAGE_LIMITS } from "../../src/modules/verification/domain/package-image";
import { domainError } from "../../src/shared/domain/domain-error";
import { err, ok } from "../../src/shared/domain/result";
import { atWib } from "../support/dosing-fixtures";
import { DOSE_MEDICINE, slotId } from "../support/dosing-test-system";
import { SCAN_IMAGE, scanOptions, scanTestSystem, readScanResponse } from "../support/scan-test-system";

const confirmUrl = (slot = slotId("07:00")) => `/v1/doses/${encodeURIComponent(slot)}/confirm`;
const scan = (system: ReturnType<typeof scanTestSystem>, body: unknown = { image: SCAN_IMAGE }, token = "token-a") => system.app.request("/v1/scan", scanOptions(body, token));
async function scanToken(system: ReturnType<typeof scanTestSystem>) {
  const response = await scan(system);
  expect(response.status).toBe(200);
  const body = await readScanResponse(response);
  const token = body.slots[0]?.scanToken;
  if (!token) throw new Error("Fixture scan tidak menerbitkan token");
  return token;
}

describe("HTTP scan → konfirmasi dengan HMAC sungguhan dan penyimpanan in-memory", () => {
  test("scan tidak menulis dosis, konfirmasi user memberi ✓✓, replay/konkurensi hanya satu catatan", async () => {
    const system = scanTestSystem();
    const token = await scanToken(system);
    expect(system.confirmations.rows.size).toBe(0);
    const responses = await Promise.all([1, 2].map(() => system.app.request(confirmUrl(), scanOptions({ mode: "verified", scanToken: token }))));
    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
    const successful = responses.find((response) => response.status === 201);
    expect(await successful?.json()).toMatchObject({ status: "sudah", confirmation: { level: "scan_terverifikasi", scheduledTime: "07:00" } });
    const today = await system.app.request("/v1/doses/today", { headers: { Authorization: "Bearer token-a" } });
    expect(await today.json()).toMatchObject({ summary: { confirmed: 1, total: 2 } });
    expect(system.confirmations.rows.size).toBe(1);
    expect(JSON.stringify(system.container.logger.events)).not.toContain(token);
    expect(JSON.stringify(system.container.logger.events)).not.toContain(SCAN_IMAGE.data);
    expect(JSON.stringify(system.container.logger.events)).not.toContain(DOSE_MEDICINE.name);
  });
  test.each(["diubah", "slot_lain", "kedaluwarsa"])("token %s tidak bisa mencatat dosis", async (kind) => {
    const system = scanTestSystem();
    const token = await scanToken(system);
    if (kind === "kedaluwarsa") system.setNow(system.clock.now() + 5 * 60_000);
    const used = kind === "diubah" ? token.replace(/^v1/, "v2") : token;
    const response = await system.app.request(confirmUrl(kind === "slot_lain" ? slotId("19:00") : slotId("07:00")), scanOptions({ mode: "verified", scanToken: used }));
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ error: { code: "SCAN_TOKEN_INVALID" } });
    expect(system.confirmations.rows.size).toBe(0);
  });
  test("token rumah tangga lain ditolak meskipun target adalah obat aktif milik sesi", async () => {
    const system = scanTestSystem();
    const token = await scanToken(system);
    system.medicines.rows.set("obat-b", { ...DOSE_MEDICINE, id: "obat-b", householdId: "rumah-b" });
    const response = await system.app.request(confirmUrl(slotId("07:00", "20261111", "obat-b")), scanOptions({ mode: "verified", scanToken: token }, "token-b"));
    expect(response.status).toBe(403);
    expect(system.confirmations.rows.size).toBe(0);
  });
  test("perubahan kekuatan sesudah scan membatalkan token", async () => {
    const system = scanTestSystem();
    const token = await scanToken(system);
    system.medicines.rows.set(DOSE_MEDICINE.id, { ...DOSE_MEDICINE, strength: "10 mg" });
    expect((await system.app.request(confirmUrl(), scanOptions({ mode: "verified", scanToken: token }))).status).toBe(403);
    expect(system.confirmations.rows.size).toBe(0);
  });
  test("perubahan jadwal sesudah scan diperiksa ulang sebelum mencatat", async () => {
    const system = scanTestSystem();
    const token = await scanToken(system);
    system.medicines.rows.set(DOSE_MEDICINE.id, { ...DOSE_MEDICINE, intakeTimes: ["19:00"] });
    expect((await system.app.request(confirmUrl(), scanOptions({ mode: "verified", scanToken: token }))).status).toBe(404);
    expect(system.confirmations.rows.size).toBe(0);
  });
  test("perubahan kekuatan setelah verifier namun sebelum INSERT tetap ditolak", async () => {
    const system = scanTestSystem();
    const token = await scanToken(system);
    const confirm = system.confirmations.confirm.bind(system.confirmations);
    system.confirmations.confirm = async (input) => {
      system.medicines.rows.set(DOSE_MEDICINE.id, { ...DOSE_MEDICINE, strength: "10 mg" });
      return confirm(input);
    };
    expect((await system.app.request(confirmUrl(), scanOptions({ mode: "verified", scanToken: token }))).status).toBe(403);
    expect(system.confirmations.rows.size).toBe(0);
  });
  test("melintasi akhir jendela setelah scan tidak dapat mencatat walau token belum kedaluwarsa", async () => {
    const system = scanTestSystem();
    system.setNow(atWib("2026-11-11", "09:00"));
    const token = await scanToken(system);
    system.setNow(system.clock.now() + 1);
    expect((await system.app.request(confirmUrl(), scanOptions({ mode: "verified", scanToken: token }))).status).toBe(409);
    expect(system.confirmations.rows.size).toBe(0);
  });
});

describe("delapan respons scan", () => {
  test("jam slot dan jadwal berikutnya memakai string HH:mm sesuai kontrak frontend", async () => {
    const system = scanTestSystem();
    const response = await scan(system);
    expect(await response.json()).toMatchObject({ outcome: "bisa_konfirmasi", slots: [{ scheduledDate: "2026-11-11", scheduledTime: "07:00" }], nextDose: { scheduledTime: "19:00", jam: "19:00" } });
  });
  test.each(["tidak_terbaca", "tidak_terdaftar", "kekuatan_tidak_terbaca", "kekuatan_beda", "dosis_sudah_tercatat", "bisa_konfirmasi", "tunggu_dulu", "hanya_info"])("%s hanya menerbitkan token bila bisa_konfirmasi", async (outcome) => {
    const system = scanTestSystem();
    if (outcome === "tidak_terbaca") system.setReading(ok({ names: [], strength: null, legible: false }));
    if (outcome === "tidak_terdaftar") system.setReading(ok({ names: ["Nama Uji Asing"], strength: "5 mg", legible: true }));
    if (outcome === "kekuatan_tidak_terbaca") system.setReading(ok({ names: [DOSE_MEDICINE.name], strength: null, legible: true }));
    if (outcome === "kekuatan_beda") {
      system.setReading(ok({ names: [DOSE_MEDICINE.name], strength: "10 mg", legible: true }));
      await system.container.dosing.confirmDose.execute({ householdId: "rumah-a", slotId: slotId("07:00"), mode: "basic" });
    }
    if (outcome === "dosis_sudah_tercatat") await system.container.dosing.confirmDose.execute({ householdId: "rumah-a", slotId: slotId("07:00"), mode: "basic" });
    if (outcome === "hanya_info") system.setNow(atWib("2026-11-11", "12:00"));
    if (outcome === "tunggu_dulu") {
      system.medicines.rows.set("obat-b", { ...DOSE_MEDICINE, id: "obat-b", name: "Obat Uji Hijau", intakeTimes: ["19:00"] });
      system.setReading(ok({ names: ["Obat Uji Hijau"], strength: "5 mg", legible: true }));
    }
    const response = await scan(system);
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const body = await readScanResponse(response);
    expect(body.outcome).toBe(outcome);
    if (outcome === "bisa_konfirmasi") expect(body.slots[0]?.scanToken).toBeTruthy();
    else expect(JSON.stringify(body)).not.toContain("scanToken");
    if (outcome === "tidak_terdaftar") expect(JSON.stringify(body)).not.toContain("Nama Uji Asing");
    expect(JSON.stringify(body)).not.toMatch(/householdId|createdAt|intakeTimeStartedAt|nameNormalized|fingerprint/);
  });
  test("overlap menawarkan semua slot dan token tiap pilihan, target eksplisit hanya satu", async () => {
    const system = scanTestSystem();
    system.medicines.rows.set(DOSE_MEDICINE.id, { ...DOSE_MEDICINE, intakeTimes: ["07:00", "08:00"] });
    const response = await scan(system);
    const body = await readScanResponse(response);
    expect(body.slots.map((slot) => slot.slotId)).toEqual([slotId("07:00"), slotId("08:00")]);
    expect(body.slots.every((slot) => Boolean(slot.scanToken))).toBe(true);
    const selected = await readScanResponse(await scan(system, { image: SCAN_IMAGE, slotId: slotId("08:00") }));
    expect(selected.slots.map((slot) => slot.slotId)).toEqual([slotId("08:00")]);
    const token = selected.slots[0]?.scanToken;
    expect((await system.app.request(confirmUrl(slotId("08:00")), scanOptions({ mode: "verified", scanToken: token }))).status).toBe(201);
    expect([...system.confirmations.rows.values()].map((row) => row.scheduledTime)).toEqual(["08:00"]);
  });
  test("dua obat pada jam sama tetap terpisah", async () => {
    const system = scanTestSystem();
    system.medicines.rows.set("obat-b", { ...DOSE_MEDICINE, id: "obat-b", name: "Obat Uji Hijau" });
    const body = await readScanResponse(await scan(system));
    expect(body.slots.map((slot) => slot.slotId)).toEqual([slotId("07:00")]);
  });
  test("jam keputusan diambil setelah AI selesai", async () => {
    const system = scanTestSystem();
    system.beforeReading(() => system.setNow(atWib("2026-11-11", "09:00") + 1));
    const body = await readScanResponse(await scan(system));
    expect(body.outcome).toBe("hanya_info");
    expect(body.serverTime).toBe(new Date(system.clock.now()).toISOString());
  });
  test("jadwal dihapus selama AI, target tidak dialihkan dan tidak diberi token", async () => {
    const system = scanTestSystem();
    system.beforeReading(() => system.medicines.rows.set(DOSE_MEDICINE.id, { ...DOSE_MEDICINE, intakeTimes: ["19:00"] }));
    expect((await scan(system, { image: SCAN_IMAGE, slotId: slotId("07:00") })).status).toBe(404);
  });
  test("target lama yang sudah tercatat tetap dikenali setelah jam dihapus", async () => {
    const system = scanTestSystem();
    await system.container.dosing.confirmDose.execute({ householdId: "rumah-a", slotId: slotId("07:00"), mode: "basic" });
    system.medicines.rows.set(DOSE_MEDICINE.id, { ...DOSE_MEDICINE, intakeTimes: ["19:00"] });
    const body = await readScanResponse(await scan(system, { image: SCAN_IMAGE, slotId: slotId("07:00") }));
    expect(body.outcome).toBe("dosis_sudah_tercatat");
  });
  test("carryover mempertahankan tanggal asal dan nextDose hari ini", async () => {
    const system = scanTestSystem();
    system.medicines.rows.set(DOSE_MEDICINE.id, { ...DOSE_MEDICINE, intakeTimes: ["07:00", "23:00"] });
    system.setNow(atWib("2026-11-12", "00:30"));
    const body = await readScanResponse(await scan(system));
    expect(body.slots[0]?.slotId).toBe(slotId("23:00"));
    expect(body.nextDose?.jam).toBe("07:00");
  });
  test("penjelasan belum diperiksa tidak dikirim meskipun kolom berisi teks", async () => {
    const system = scanTestSystem();
    system.medicines.rows.set(DOSE_MEDICINE.id, { ...DOSE_MEDICINE, explanation: "teks-uji-belum-diperiksa" });
    const body = await readScanResponse(await scan(system));
    expect(body.medicine?.explanation).toBeNull();
    expect(JSON.stringify(body)).not.toContain("teks-uji-belum-diperiksa");
  });
});

describe("scan dilindungi sesi, consent, kuota dan validasi gambar", () => {
  test("tanpa sesi 401; consent belum ada 403; tidak memanggil AI atau kuota", async () => {
    const system = scanTestSystem(false);
    expect((await system.app.request("/v1/scan", { method: "POST" })).status).toBe(401);
    expect((await scan(system)).status).toBe(403);
    expect(system.readerCalls()).toBe(0);
    expect(system.quotaCalls).toEqual([]);
  });
  test("household body/query tidak mengganti sesi dan daftar obat tetap tersaring", async () => {
    const system = scanTestSystem();
    const response = await system.app.request("/v1/scan?householdId=rumah-a", scanOptions({ image: SCAN_IMAGE, householdId: "rumah-a" }, "token-b"));
    expect(await response.json()).toMatchObject({ outcome: "tidak_terdaftar" });
    expect(system.quotaCalls).toEqual(["rumah-b"]);
  });
  test.each(["AI_QUOTA_EXCEEDED", "DATABASE_UNAVAILABLE"] as const)("jatah gagal %s tidak memanggil AI", async (code) => {
    const system = scanTestSystem();
    system.setQuotaError(domainError(code, "Galat uji"));
    const response = await scan(system);
    expect(response.status).toBe(code === "AI_QUOTA_EXCEEDED" ? 429 : 503);
    expect(system.readerCalls()).toBe(0);
    expect(system.confirmations.rows.size).toBe(0);
  });
  test.each(["AI_UNAVAILABLE", "AI_QUOTA_EXCEEDED"] as const)("AI gagal %s tanpa token atau konfirmasi", async (code) => {
    const system = scanTestSystem();
    system.setReading(err(domainError(code, "Galat uji")));
    const response = await scan(system);
    expect(response.status).toBe(code === "AI_QUOTA_EXCEEDED" ? 429 : 503);
    expect(JSON.stringify(await response.json())).not.toContain("scanToken");
    expect(system.confirmations.rows.size).toBe(0);
  });
  test("database konteks gagal menjadi 503", async () => {
    const system = scanTestSystem();
    system.medicines.listActive = async () => err(domainError("DATABASE_UNAVAILABLE", "Galat uji"));
    expect((await scan(system)).status).toBe(503);
  });
  test.each([
    {}, { image: null }, { image: { ...SCAN_IMAGE, mimeType: "image/gif" } },
    { image: { ...SCAN_IMAGE, data: "%%%=" } }, { image: { ...SCAN_IMAGE, data: "data:image/jpeg;base64," + SCAN_IMAGE.data } },
    { image: { ...SCAN_IMAGE, data: "eA==" } }, { image: { ...SCAN_IMAGE, data: "eB==" } },
    { image: SCAN_IMAGE, slotId: "slot-rusak" },
  ])("body/gambar tidak sah ditolak sebelum AI/kuota", async (body) => {
    const system = scanTestSystem();
    expect((await scan(system, body)).status).toBe(400);
    expect(system.readerCalls()).toBe(0);
    expect(system.quotaCalls).toEqual([]);
  });
  test("JSON rusak atau MIME permintaan salah menjadi 400", async () => {
    const system = scanTestSystem();
    expect((await system.app.request("/v1/scan", { ...scanOptions(), body: "{" })).status).toBe(400);
    expect((await system.app.request("/v1/scan", { ...scanOptions(), headers: { Authorization: "Bearer token-a", "Content-Type": "image/jpeg" } })).status).toBe(400);
    expect(system.readerCalls()).toBe(0);
  });
  test("gambar tepat batas diizinkan, +1 byte ditolak sebelum AI", async () => {
    const system = scanTestSystem();
    const bytes = Buffer.alloc(PACKAGE_IMAGE_LIMITS.maxBytes);
    Buffer.from(SCAN_IMAGE.data, "base64").copy(bytes);
    expect((await scan(system, { image: { ...SCAN_IMAGE, data: bytes.toString("base64") } })).status).toBe(200);
    expect((await scan(system, { image: { ...SCAN_IMAGE, data: Buffer.concat([bytes, Buffer.alloc(1)]).toString("base64") } })).status).toBe(400);
    expect(system.readerCalls()).toBe(1);
  });
  test.each([undefined, "1"])("stream melebihi batas dengan Content-Length=%s dihentikan", async (length) => {
    const system = scanTestSystem();
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new Uint8Array(MAX_SCAN_REQUEST_BYTES + 1)); }, cancel() { cancelled = true; } });
    const init: RequestInit & { duplex: "half" } = { method: "POST", duplex: "half", body,
      headers: { Authorization: "Bearer token-a", "Content-Type": "application/json", ...(length ? { "Content-Length": length } : {}) } };
    expect((await system.app.request(new Request("http://localhost/v1/scan", init))).status).toBe(400);
    expect(cancelled).toBe(true);
    expect(system.quotaCalls).toEqual([]);
  });
});
