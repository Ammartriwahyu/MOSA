import { beforeEach, describe, expect, test, vi } from "vitest";
import { createApiClient } from "@/shared/lib/api-client";
import { doseFixture, todaysDosesFixture } from "../testing/dosing-fixture";
import { getTodaysDoses } from "./doses";

const setup = vi.hoisted(() => ({ client: undefined as ReturnType<typeof createApiClient> | undefined }));
vi.mock("@/shared/lib", () => ({ api: () => setup.client }));
const fetcher = vi.fn<typeof fetch>();
beforeEach(() => {
  fetcher.mockReset();
  setup.client = createApiClient({ baseUrl: "http://backend.contoh.test", getAccessToken: async () => "token-fiktif", fetch: fetcher });
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
