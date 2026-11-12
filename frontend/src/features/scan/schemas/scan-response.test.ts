import { describe, expect, test } from "vitest";
import { scanMedicineFixture, scanResponseFixture, scanSlotFixture } from "../testing/scan-response-fixtures";
import { scanResponseSchema } from "./scan-response";

describe("kontrak respons scan P06", () => {
  test.each(["tidak_terbaca", "tidak_terdaftar", "kekuatan_tidak_terbaca", "kekuatan_beda", "hanya_info", "dosis_sudah_tercatat", "tunggu_dulu", "bisa_konfirmasi"] as const)("memvalidasi %s", (outcome) => {
    expect(scanResponseSchema.parse(scanResponseFixture(outcome)).outcome).toBe(outcome);
  });
  test.each([{}, { outcome: "cocok", serverTime: "2026-11-12T00:00:00Z" }, { ...scanResponseFixture(), slots: [] }, { ...scanResponseFixture(), serverTime: "invalid" }, { ...scanResponseFixture(), slots: [{ ...scanSlotFixture }] }])("respons tidak lengkap/tidak dikenal ditolak", (value) => {
    expect(scanResponseSchema.safeParse(value).success).toBe(false);
  });
  test("token palsu pada hasil informasi dan metadata internal tidak ikut diteruskan", () => {
    const result = scanResponseSchema.parse({ ...scanResponseFixture("hanya_info"), scanToken: "palsu", householdId: "rumah-lain" });
    expect(result).not.toHaveProperty("scanToken"); expect(result).not.toHaveProperty("householdId");
  });
  test("penjelasan belum diperiksa ditolak", () => {
    expect(scanResponseSchema.safeParse({ ...scanResponseFixture("hanya_info"), medicine: { ...scanMedicineFixture, explanation: "teks-belum-diperiksa" } }).success).toBe(false);
  });
  test.each([
    { slotId: "obat-a:20261112:0800" }, { medicineId: "obat-b" }, { scheduledDate: "2026-11-13" },
    { scheduledTime: "08:00" }, { expiresAt: "2026-11-12T00:30:00Z" },
  ])("identitas/waktu slot dan expiry yang tidak konsisten ditolak", (override) => {
    expect(scanResponseSchema.safeParse({ ...scanResponseFixture(), slots: [{ ...scanSlotFixture, scanToken: "uji", expiresAt: "2026-11-12T00:35:00Z", ...override }] }).success).toBe(false);
  });
  test("dua slot berulang ditolak, dua pilihan terpisah dipertahankan", () => {
    const result = scanResponseFixture();
    if (result.outcome !== "bisa_konfirmasi") throw new Error("Fixture tidak sesuai");
    expect(scanResponseSchema.safeParse({ ...result, slots: [result.slots[0], result.slots[0]] }).success).toBe(false);
    const second = { ...result.slots[0]!, slotId: "obat-a:20261112:0800", scheduledTime: "08:00", scheduledAt: "2026-11-12T01:00:00Z" };
    expect(scanResponseSchema.parse({ ...result, slots: [...result.slots, second] })).toMatchObject({ slots: [{ slotId: scanSlotFixture.slotId }, { slotId: second.slotId }] });
  });
});
