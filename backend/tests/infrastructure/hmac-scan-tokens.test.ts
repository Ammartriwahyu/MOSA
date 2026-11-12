import { createHmac } from "node:crypto";
import { describe, expect, test } from "vitest";
import { HmacScanTokens, CurrentMedicineScanTokenVerifier } from "../../src/modules/verification/infrastructure/hmac-scan-tokens";
import { SCAN_TOKEN_POLICY } from "../../src/modules/verification/domain/scan-token-policy";
import { domainError } from "../../src/shared/domain/domain-error";
import { err, ok } from "../../src/shared/domain/result";
import { dosingTestSystem, DOSE_MEDICINE, slotId } from "../support/dosing-test-system";

const SECRET = "only-for-unit-tests-secret-32-bytes";
const NOW = 1_000_000;
const claims = { householdId: "rumah-a", medicine: { medicineId: "obat-a", name: "Obat Uji", strength: "5 mg" }, slotId: slotId("07:00"), expiresAt: NOW + SCAN_TOKEN_POLICY.ttlMs };
const unwrap = (result: Awaited<ReturnType<HmacScanTokens["sign"]>>) => { if (!result.ok) throw new Error("Fixture token gagal"); return result.value; };

describe("HmacScanTokens", () => {
  test("round trip menyertakan rumah tangga/obat/slot/expiry dan fingerprint tanpa nama mentah", async () => {
    const tokens = new HmacScanTokens(SECRET, { now: () => NOW });
    const token = unwrap(await tokens.sign(claims));
    expect(await tokens.verify(token)).toMatchObject({ ok: true, value: { householdId: "rumah-a", medicineId: "obat-a", slotId: claims.slotId, expiresAt: claims.expiresAt } });
    expect(Buffer.from(token.split(".")[1] ?? "", "base64url").toString()).not.toContain("Obat Uji");
  });
  test("expiry tepat batas ditolak, 1ms sebelumnya masih sah", async () => {
    let now = claims.expiresAt - 1;
    const tokens = new HmacScanTokens(SECRET, { now: () => now });
    const token = unwrap(await tokens.sign(claims));
    expect((await tokens.verify(token)).ok).toBe(true);
    now += 1;
    expect(await tokens.verify(token)).toMatchObject({ ok: false, error: { code: "SCAN_TOKEN_INVALID" } });
  });
  test("kunci lain menolak tanda tangan", async () => {
    const token = unwrap(await new HmacScanTokens(SECRET, { now: () => NOW }).sign(claims));
    expect((await new HmacScanTokens("different-secret-for-tests-only-32", { now: () => NOW }).verify(token)).ok).toBe(false);
  });
  test("payload diubah dengan signature lama ditolak", async () => {
    const tokens = new HmacScanTokens(SECRET, { now: () => NOW });
    const token = unwrap(await tokens.sign(claims));
    const parts = token.split(".");
    const changed = Buffer.from(JSON.stringify({ householdId: "rumah-b" })).toString("base64url");
    expect((await tokens.verify(`v1.${changed}.${parts[2]}`)).ok).toBe(false);
  });
  test.each(["", "v1", "v1.x.x", "v2.e30." + "a".repeat(43), "v1.e30." + "a".repeat(42), "v1.e30." + "a".repeat(44), "v1.e30." + "a".repeat(43) + ".extra", "a".repeat(4097)])("token rusak %j ditolak tanpa throw", async (token) => {
    expect(await new HmacScanTokens(SECRET, { now: () => NOW }).verify(token)).toMatchObject({ ok: false, error: { code: "SCAN_TOKEN_INVALID", details: null } });
  });
  test.each(["{", JSON.stringify({ householdId: "rumah-a", exp: Infinity }), JSON.stringify({ householdId: "rumah-a", medicineId: "obat-a", slotId: "x", exp: NOW + 1, fingerprint: "a".repeat(64), extra: "x" })])("payload bertanda tangan tapi format salah ditolak", async (raw) => {
    const payload = `v1.${Buffer.from(raw).toString("base64url")}`;
    const signature = createHmac("sha256", SECRET).update(payload).digest("base64url");
    expect((await new HmacScanTokens(SECRET, { now: () => NOW }).verify(`${payload}.${signature}`)).ok).toBe(false);
  });
  test("kunci terlalu pendek gagal dengan pesan tanpa nilainya", () => {
    expect(() => new HmacScanTokens("rahasia-pendek", { now: () => NOW })).toThrow("SCAN_TOKEN_SECRET minimal 32 byte.");
  });
});

describe("bukti scan setelah obat berubah", () => {
  test.each(["name", "strength"] as const)("perubahan %s membatalkan token", async (field) => {
    const system = dosingTestSystem();
    const tokens = new HmacScanTokens(SECRET, system.clock);
    const token = unwrap(await tokens.sign({ ...claims, medicine: { medicineId: DOSE_MEDICINE.id, name: DOSE_MEDICINE.name, strength: DOSE_MEDICINE.strength }, expiresAt: system.clock.now() + 60_000 }));
    const verifier = new CurrentMedicineScanTokenVerifier(tokens, system.reader);
    expect((await verifier.verify(token)).ok).toBe(true);
    system.medicines.rows.set(DOSE_MEDICINE.id, { ...DOSE_MEDICINE, [field]: field === "name" ? "Obat Uji Lain" : "10 mg" });
    expect(await verifier.verify(token)).toMatchObject({ ok: false, error: { code: "SCAN_TOKEN_INVALID" } });
  });
  test("obat nonaktif menolak; DB gagal tidak dianggap bukti sah", async () => {
    const system = dosingTestSystem();
    const tokens = new HmacScanTokens(SECRET, system.clock);
    const token = unwrap(await tokens.sign({ ...claims, expiresAt: system.clock.now() + 60_000 }));
    const verifier = new CurrentMedicineScanTokenVerifier(tokens, system.reader);
    system.medicines.rows.set(DOSE_MEDICINE.id, { ...DOSE_MEDICINE, active: false });
    expect((await verifier.verify(token)).ok).toBe(false);
    system.reader.findActive = async () => err(domainError("DATABASE_UNAVAILABLE", "Database tidak tersedia."));
    expect(await verifier.verify(token)).toEqual(err(domainError("DATABASE_UNAVAILABLE", "Database tidak tersedia.")));
  });
  test("signature tidak sah tidak melakukan query obat", async () => {
    const tokens = new HmacScanTokens(SECRET, { now: () => NOW });
    let called = false;
    const verifier = new CurrentMedicineScanTokenVerifier(tokens, { findActive: async () => { called = true; return ok(null); }, listActive: async () => ok([]) });
    expect((await verifier.verify("invalid")).ok).toBe(false);
    expect(called).toBe(false);
  });
});
