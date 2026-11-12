import { beforeEach, describe, expect, test, vi } from "vitest";
import { createApiClient } from "@/shared/lib/api-client";
import { doseFixture, todaysDosesFixture } from "../testing/dosing-fixture";
import { confirmBasicDose, getTodaysDoses } from "./doses";
import { confirmedDoseFixture } from "../testing/dose-cards-fixture";

const setup = vi.hoisted(() => ({ client: undefined as ReturnType<typeof createApiClient> | undefined }));
vi.mock("@/shared/lib", () => ({ api: () => setup.client }));
const fetcher = vi.fn<typeof fetch>();
beforeEach(() => {
  fetcher.mockReset();
  setup.client = createApiClient({ baseUrl: "http://backend.contoh.test", getAccessToken: async () => "token-fiktif", fetch: fetcher });
});

describe("POST konfirmasi basic", () => {
  test("slot di-encode sekali; hanya mode basic dikirim tanpa household/level/waktu klien", async () => {
    const dose = confirmedDoseFixture("dasar");
    const receipt = { status: "sudah", serverTime: dose.confirmation?.confirmedAt, confirmation: dose.confirmation };
    fetcher.mockResolvedValue(Response.json(receipt));
    expect(await confirmBasicDose(dose.slotId)).toEqual(receipt);
    expect(fetcher.mock.calls[0]?.[0]).toBe(`http://backend.contoh.test/v1/doses/${encodeURIComponent(dose.slotId)}/confirm`);
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({ method: "POST", body: JSON.stringify({ mode: "basic" }) });
  });
  test.each(["slot", "level", "timestamp"])("respons %s yang tidak sah tidak menjadi sukses palsu", async (field) => {
    const dose = confirmedDoseFixture("dasar");
    const receipt = { status: "sudah", serverTime: "2026-11-11T00:35:00Z", confirmation: { ...dose.confirmation } };
    const invalid = field === "slot" ? { ...receipt, confirmation: { ...receipt.confirmation, slotId: "slot-lain" } }
      : field === "level" ? { ...receipt, confirmation: { ...receipt.confirmation, level: "scan_terverifikasi" } } : { ...receipt, serverTime: "invalid" };
    fetcher.mockResolvedValue(Response.json(invalid));
    await expect(confirmBasicDose(dose.slotId)).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
    expect(fetcher).toHaveBeenCalledOnce();
  });
  test("409 diteruskan dan POST tidak diulang oleh klien HTTP", async () => {
    fetcher.mockResolvedValue(Response.json({ error: { code: "DOSE_ALREADY_CONFIRMED", message: "uji", details: null } }, { status: 409 }));
    await expect(confirmBasicDose(doseFixture().slotId)).rejects.toMatchObject({ code: "DOSE_ALREADY_CONFIRMED" });
    expect(fetcher).toHaveBeenCalledOnce();
  });
});

describe("GET dosis hari ini", () => {
  test("kontrak backend dibaca lewat klien bersama, dengan token dan sinyal pembatalan", async () => {
    const data = todaysDosesFixture();
    fetcher.mockResolvedValue(Response.json(data));
    const controller = new AbortController();
    expect(await getTodaysDoses(controller.signal)).toEqual(data);
    expect(fetcher.mock.calls[0]?.[0]).toBe("http://backend.contoh.test/v1/doses/today");
    const options = fetcher.mock.calls[0]?.[1];
    expect(new Headers(options?.headers).get("Authorization")).toBe("Bearer token-fiktif");
    expect(options?.signal).toBeInstanceOf(AbortSignal);
  });
  test.each([
    { serverTime: "bukan-tanggal" },
    { date: "2026-02-30" },
    { summary: { confirmed: 3, total: 2 } },
    { summary: { confirmed: 0, total: -1 } },
    { doses: [doseFixture({ status: "sudah", confirmation: null })] },
    { doses: [{ ...doseFixture(), status: "status-asing" }] },
    { doses: [{ ...doseFixture(), scheduledTime: "25:00" }] },
  ])("data rusak ditolak sebagai INVALID_RESPONSE (%j)", async (overrides) => {
    fetcher.mockResolvedValue(Response.json({ ...todaysDosesFixture(), ...overrides }));
    await expect(getTodaysDoses()).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });
  test("galat DB tidak diubah menjadi daftar kosong", async () => {
    fetcher.mockResolvedValue(Response.json({ error: { code: "DATABASE_UNAVAILABLE", message: "Tidak tersedia", details: null } }, { status: 503 }));
    await expect(getTodaysDoses()).rejects.toMatchObject({ code: "DATABASE_UNAVAILABLE", status: 503 });
  });
});
