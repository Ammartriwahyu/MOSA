import { createClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { SupabaseDoseConfirmationRepository } from "../../src/modules/dosing/infrastructure/supabase-dose-confirmation.repository";
import { SupabaseDosingMedicineReader } from "../../src/modules/dosing/infrastructure/supabase-dosing-medicine-reader";
import { createDoseSlot } from "../../src/modules/dosing/domain/dose-slot";
import type { Database } from "../../src/shared/infrastructure/database.types";
import { atWib, wibDate } from "../support/dosing-fixtures";

const HOUSE = "11111111-1111-4111-8111-111111111111";
const MED = "33333333-3333-4333-8333-333333333333";
const DATE = wibDate("2026-11-11");
const CONFIRMATION = { id: "konfirmasi-uji", household_id: HOUSE, medicine_id: MED, scheduled_date: DATE, scheduled_time: "07:00:00", confirmed_at: "2026-11-11T00:30:00Z", level: "dasar" };
const MEDICINE = { id: MED, active: true, created_at: "2026-11-01T00:00:00Z", intake_times: ["07:00"], intake_times_started_at: { "07:00": "2026-11-01T00:00:00Z" }, intake_days: [1, 4], intake_days_started_at: { "1": "2026-11-01T00:00:00Z", "4": "2026-11-01T00:00:00Z" }, name: "Obat Uji", strength: "5 mg", purpose: "Kegunaan uji", dose_amount: "1 tablet", usage_rule: "Sesudah makan", warnings: "Tidak ada larangan khusus", notes: null, label_source: "keluarga", explanation: null, explanation_origin: "teks_pengisi" };
const fetcher = vi.fn<typeof fetch>();
function adapters() {
  const client = createClient<Database>("http://supabase.contoh.test", "secret-fiktif", { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: fetcher } });
  return { medicines: new SupabaseDosingMedicineReader(client), confirmations: new SupabaseDoseConfirmationRepository(client) };
}
const requestUrl = () => new URL(String(fetcher.mock.calls[0]?.[0]));
beforeEach(() => { fetcher.mockReset(); });

describe("adaptor dosing memakai Supabase SDK nyata dengan fetch uji", () => {
  test("pembacaan obat tersaring rumah tangga dan aktif; metadata waktu didekode", async () => {
    fetcher.mockResolvedValue(Response.json([MEDICINE]));
    const result = await adapters().medicines.listActive(HOUSE);
    expect(result).toMatchObject({ ok: true, value: [{ medicineId: MED, intakeTimeStartedAt: { "07:00": Date.parse(MEDICINE.created_at) },
      intakeDays: [1, 4], intakeDayStartedAt: { "1": Date.parse(MEDICINE.created_at), "4": Date.parse(MEDICINE.created_at) } }] });
    expect(requestUrl().searchParams.get("household_id")).toBe(`eq.${HOUSE}`);
    expect(requestUrl().searchParams.get("active")).toBe("eq.true");
  });
  test("ID tidak valid tidak diteruskan ke database", async () => {
    expect(await adapters().medicines.findActive(HOUSE, "bukan-uuid")).toEqual({ ok: true, value: null });
    expect(fetcher).not.toHaveBeenCalled();
  });
  test("metadata jam tidak lengkap ditolak, bukan dianggap jadwal lama", async () => {
    fetcher.mockResolvedValue(Response.json([{ ...MEDICINE, intake_times_started_at: {} }]));
    expect(await adapters().medicines.listActive(HOUSE)).toMatchObject({ ok: false, error: { code: "DATABASE_UNAVAILABLE" } });
    fetcher.mockResolvedValue(Response.json([{ ...MEDICINE, intake_days_started_at: { "1": MEDICINE.created_at } }]));
    expect(await adapters().medicines.listActive(HOUSE)).toMatchObject({ ok: false, error: { code: "DATABASE_UNAVAILABLE" } });
  });
  test("konfirmasi dibaca per rumah tangga/obat/tanggal dan time SQL dinormalisasi", async () => {
    fetcher.mockResolvedValue(Response.json([CONFIRMATION]));
    const result = await adapters().confirmations.list(HOUSE, [DATE], MED);
    expect(result).toMatchObject({ ok: true, value: [{ scheduledTime: "07:00", level: "dasar" }] });
    expect(requestUrl().searchParams.get("household_id")).toBe(`eq.${HOUSE}`);
    expect(requestUrl().searchParams.get("medicine_id")).toBe(`eq.${MED}`);
    expect(requestUrl().searchParams.get("scheduled_date")).toContain(DATE);
  });
  test("RPC mengirim batas dari domain serta waktu/level server, lalu memvalidasi hasil", async () => {
    fetcher.mockResolvedValue(Response.json({ code: "OK", confirmation: CONFIRMATION }));
    const slot = createDoseSlot({ medicineId: MED, scheduledDate: DATE, scheduledTime: "07:00" });
    if (!slot.ok) throw new Error("Slot uji tidak valid.");
    expect(await adapters().confirmations.confirm({ householdId: HOUSE, slot: slot.value, confirmedAt: atWib(DATE, "07:30"), level: "dasar" })).toMatchObject({ ok: true, value: { scheduledTime: "07:00", level: "dasar" } });
    expect(requestUrl().pathname).toBe("/rest/v1/rpc/confirm_dose");
    expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toEqual({ p_household_id: HOUSE, p_medicine_id: MED, p_scheduled_date: DATE, p_scheduled_time: "07:00", p_confirmed_at: CONFIRMATION.confirmed_at.replace("Z", ".000Z"), p_level: "dasar", p_opens_before_minutes: 30, p_closes_after_minutes: 120 });
  });
  test.each(["DOSE_ALREADY_CONFIRMED", "DOSE_NOT_DUE", "DOSE_MISSED", "NOT_FOUND"])("RPC %s diteruskan sebagai galat domain", async (code) => {
    fetcher.mockResolvedValue(Response.json({ code }));
    const slot = createDoseSlot({ medicineId: MED, scheduledDate: DATE, scheduledTime: "07:00" });
    if (!slot.ok) throw new Error("Slot uji tidak valid.");
    expect(await adapters().confirmations.confirm({ householdId: HOUSE, slot: slot.value, confirmedAt: atWib(DATE, "07:30"), level: "dasar" })).toMatchObject({ ok: false, error: { code } });
  });
  test("verified memakai RPC atomik yang membawa identitas hasil verifier", async () => {
    fetcher.mockResolvedValue(Response.json({ code: "OK", confirmation: { ...CONFIRMATION, level: "scan_terverifikasi" } }));
    const slot = createDoseSlot({ medicineId: MED, scheduledDate: DATE, scheduledTime: "07:00" });
    if (!slot.ok) throw new Error("Slot uji tidak valid.");
    expect(await adapters().confirmations.confirm({ householdId: HOUSE, slot: slot.value, confirmedAt: atWib(DATE, "07:30"), level: "scan_terverifikasi", scanMedicine: { name: "Obat Uji", strength: "5 mg" } }))
      .toMatchObject({ ok: true, value: { level: "scan_terverifikasi" } });
    expect(requestUrl().pathname).toBe("/rest/v1/rpc/confirm_scanned_dose");
    expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toMatchObject({ p_expected_name: "Obat Uji", p_expected_strength: "5 mg", p_household_id: HOUSE });
  });
  test("verified tanpa identitas ditolak sebelum RPC; identitas berubah dari RPC menjadi SCAN_TOKEN_INVALID", async () => {
    const slot = createDoseSlot({ medicineId: MED, scheduledDate: DATE, scheduledTime: "07:00" });
    if (!slot.ok) throw new Error("Slot uji tidak valid.");
    const input = { householdId: HOUSE, slot: slot.value, confirmedAt: atWib(DATE, "07:30"), level: "scan_terverifikasi" } as const;
    expect(await adapters().confirmations.confirm(input)).toMatchObject({ ok: false, error: { code: "SCAN_TOKEN_INVALID" } });
    expect(fetcher).not.toHaveBeenCalled();
    fetcher.mockResolvedValue(Response.json({ code: "SCAN_TOKEN_INVALID" }));
    expect(await adapters().confirmations.confirm({ ...input, scanMedicine: { name: "Obat Uji", strength: "5 mg" } })).toMatchObject({ ok: false, error: { code: "SCAN_TOKEN_INVALID" } });
  });
  test("balasan OK tanpa data sah ditolak; galat jaringan tidak membocorkan teks server", async () => {
    fetcher.mockResolvedValue(Response.json({ code: "OK" }));
    const { confirmations, medicines } = adapters();
    const slot = createDoseSlot({ medicineId: MED, scheduledDate: DATE, scheduledTime: "07:00" });
    if (!slot.ok) throw new Error("Slot uji tidak valid.");
    expect(await confirmations.confirm({ householdId: HOUSE, slot: slot.value, confirmedAt: atWib(DATE, "07:30"), level: "dasar" })).toMatchObject({ ok: false, error: { code: "DATABASE_UNAVAILABLE" } });
    fetcher.mockRejectedValue(new TypeError("isi-server-pribadi"));
    expect(JSON.stringify(await medicines.listActive(HOUSE))).not.toContain("isi-server-pribadi");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
