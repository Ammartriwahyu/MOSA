import { describe, expect, test } from "vitest";
import { createApp } from "../../src/create-app";
import { UnavailableScanTokenVerifier } from "../../src/modules/dosing/infrastructure/unavailable-scan-token-verifier";
import { domainError } from "../../src/shared/domain/domain-error";
import { err, ok } from "../../src/shared/domain/result";
import { atWib } from "../support/dosing-fixtures";
import { DOSE_MEDICINE, dosingTestSystem, slotId } from "../support/dosing-test-system";
import { householdFixture, InMemoryHouseholdRepository } from "../support/in-memory-household-repository";
import { testContainer } from "../support/test-container";

function build(consent = true, productionVerifier = false) {
  const system = dosingTestSystem();
  const households = new InMemoryHouseholdRepository([
    householdFixture({ id: "rumah-a", ownerUserId: "user-a", dataConsentAt: consent ? 1 : null }),
    householdFixture({ id: "rumah-b", ownerUserId: "user-b", dataConsentAt: 1 }),
  ]);
  const container = testContainer({ tokens: { "token-a": "user-a", "token-b": "user-b" }, households,
    medicines: system.medicines, confirmations: system.confirmations, clock: system.clock,
    scanTokens: productionVerifier ? new UnavailableScanTokenVerifier() : system.tokens });
  return { app: createApp(container), system, logger: container.logger };
}
const options = (body?: unknown, token = "token-a") => ({ method: body === undefined ? "GET" : "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
const url = (slot = slotId("07:00")) => `/v1/doses/${encodeURIComponent(slot)}/confirm`;

describe("HTTP dosis terlindungi sesi/persetujuan", () => {
  test("GET memakai rumah tangga sesi dan memberi waktu server/hitungan tanpa kolom internal", async () => {
    const { app, system } = build();
    const response = await app.request("/v1/doses/today?householdId=rumah-b", options());
    expect(response.status).toBe(200);
    const body: unknown = await response.json();
    expect(body).toMatchObject({ date: "2026-11-11", serverTime: new Date(system.clock.now()).toISOString(), summary: { confirmed: 0, total: 2 }, doses: [{ status: "jatuh_tempo", medicine: { name: DOSE_MEDICINE.name } }, { status: "belum_tiba" }], carryoverDoses: [], earlyDoses: [] });
    expect(JSON.stringify(body)).not.toMatch(/householdId|intakeTimeStartedAt|createdAt|nameNormalized/);
  });
  test("POST basic selalu level dasar, meskipun body mencoba menyisipkan rumah tangga/level lain", async () => {
    const { app, system, logger } = build();
    const response = await app.request(url(), options({ mode: "basic", householdId: "rumah-b", level: "scan_terverifikasi", scanToken: "rahasia-token-uji" }));
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ status: "sudah", confirmation: { medicineId: DOSE_MEDICINE.id, scheduledTime: "07:00", level: "dasar" } });
    expect([...system.confirmations.rows.values()][0]?.householdId).toBe("rumah-a");
    expect(system.tokenCalls).toHaveLength(0);
    expect(JSON.stringify(logger.events)).not.toMatch(/rahasia-token-uji|Obat Uji|Sesudah makan/);
    const listed = await app.request("/v1/doses/today", options());
    expect(await listed.json()).toMatchObject({ summary: { confirmed: 1, total: 2 } });
  });
  test("token tidak ada → 401; tanpa persetujuan → 403; obat rumah tangga lain → 404", async () => {
    const normal = build();
    expect((await normal.app.request("/v1/doses/today")).status).toBe(401);
    expect((await normal.app.request(url(), options({ mode: "basic" }, "token-b"))).status).toBe(404);
    const noConsent = build(false);
    expect((await noConsent.app.request(url(), options({ mode: "basic" }))).status).toBe(403);
    expect(noConsent.system.confirmations.rows.size).toBe(0);
  });
  test.each([{ mode: "lain" }, {}, { mode: "verified", scanToken: 123 }])("body tidak valid → 400: %j", async (body) => {
    const { app } = build();
    expect((await app.request(url(), options(body))).status).toBe(400);
  });
  test("slot rusak dan JSON rusak → 400 tanpa menulis catatan", async () => {
    const { app, system } = build();
    expect((await app.request(url("slot-rusak"), options({ mode: "basic" }))).status).toBe(400);
    expect((await app.request(url(), { ...options({ mode: "basic" }), body: "{" })).status).toBe(400);
    expect(system.confirmations.rows.size).toBe(0);
  });
  test("permintaan ganda bersamaan → 201 dan 409", async () => {
    const { app, system } = build();
    const responses = await Promise.all([app.request(url(), options({ mode: "basic" })), app.request(url(), options({ mode: "basic" }))]);
    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
    expect(system.confirmations.rows.size).toBe(1);
  });
  test("verifier tanpa bukti scan tetap menolak token", async () => {
    const { app, system } = build(true, true);
    for (const body of [{ mode: "verified" }, { mode: "verified", scanToken: "fiktif" }]) {
      const response = await app.request(url(), options(body));
      expect(response.status).toBe(403);
      expect(await response.json()).toMatchObject({ error: { code: "SCAN_TOKEN_INVALID" } });
    }
    expect(system.confirmations.rows.size).toBe(0);
  });
  test("verified dengan verifier uji yang sah menghasilkan level scan", async () => {
    const { app, system } = build();
    system.setToken(ok({ householdId: "rumah-a", medicineId: DOSE_MEDICINE.id, slotId: slotId("07:00"), expiresAt: system.clock.now() + 60_000,
      medicineIdentity: { name: DOSE_MEDICINE.name, strength: DOSE_MEDICINE.strength } }));
    const response = await app.request(url(), options({ mode: "verified", scanToken: "token-uji-sah" }));
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ confirmation: { level: "scan_terverifikasi" } });
  });
  test("slot 23.00 kemarin tetap dapat dikonfirmasi sesudah 00.00 dengan tanggal asal", async () => {
    const { app, system } = build();
    system.medicines.rows.set(DOSE_MEDICINE.id, { ...DOSE_MEDICINE, intakeTimes: ["23:00"] });
    system.setNow(atWib("2026-11-12", "00:30"));
    const response = await app.request(url(slotId("23:00")), options({ mode: "basic" }));
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ confirmation: { scheduledDate: "2026-11-11", scheduledTime: "23:00" } });
    expect(await (await app.request("/v1/doses/today", options())).json()).toMatchObject({ summary: { confirmed: 0, total: 1 }, carryoverDoses: [{ status: "sudah" }] });
  });
  test("database gagal → 503, bukan daftar kosong atau sukses palsu", async () => {
    const { app, system } = build();
    system.confirmations.list = async () => err(domainError("DATABASE_UNAVAILABLE", "Database tidak tersedia."));
    const response = await app.request("/v1/doses/today", options());
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: { code: "DATABASE_UNAVAILABLE" } });
  });
});
