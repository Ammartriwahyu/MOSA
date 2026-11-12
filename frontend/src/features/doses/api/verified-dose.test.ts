import { beforeEach, expect, test, vi } from "vitest";
import { api, createApiClient } from "@/shared/lib";
import { confirmVerifiedDose } from "./doses";
vi.mock("@/shared/lib", async (original) => ({ ...await original<typeof import("@/shared/lib")>(), api: vi.fn() }));
const input = { slotId: "obat-a:20261112:0700", medicineId: "obat-a", scheduledDate: "2026-11-12", scheduledTime: "07:00", scanToken: "bukti-rahasia-uji" };
const receipt = { status: "sudah", serverTime: "2026-11-12T00:30:00Z", confirmation: { ...input, id: "catatan-a", confirmedAt: "2026-11-12T00:30:00Z", level: "scan_terverifikasi" } };
const fetcher = vi.fn<typeof fetch>();
beforeEach(() => {
  fetcher.mockReset().mockResolvedValue(Response.json(receipt));
  vi.mocked(api).mockReturnValue(createApiClient({ baseUrl: "http://backend.test", getAccessToken: async () => "bearer-uji", fetch: fetcher }));
});
test("verified mengirim hanya mode dan token pada body; receipt cocok dan metadata tambahan dibuang", async () => {
  const result = await confirmVerifiedDose(input, new AbortController().signal);
  expect(fetcher.mock.calls[0]?.[0]).toBe("http://backend.test/v1/doses/obat-a%3A20261112%3A0700/confirm");
  expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toEqual({ mode: "verified", scanToken: input.scanToken });
  expect(result.confirmation.level).toBe("scan_terverifikasi"); expect(result.confirmation).not.toHaveProperty("scanToken");
});
test.each([{ level: "dasar" }, { slotId: "obat-b:20261112:0700" }, { medicineId: "obat-b" }, { scheduledTime: "08:00" }, { scheduledDate: "2026-11-13" }])("receipt yang berbeda dari bukti pilihan ditolak", async (override) => {
  fetcher.mockResolvedValue(Response.json({ ...receipt, confirmation: { ...receipt.confirmation, ...override } }));
  await expect(confirmVerifiedDose(input, new AbortController().signal)).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
});
test("token ditolak atau jaringan gagal tidak diulang otomatis", async () => {
  fetcher.mockResolvedValue(Response.json({ error: { code: "SCAN_TOKEN_INVALID", message: "uji", details: null } }, { status: 403 }));
  await expect(confirmVerifiedDose(input, new AbortController().signal)).rejects.toMatchObject({ code: "SCAN_TOKEN_INVALID" }); expect(fetcher).toHaveBeenCalledTimes(1);
});
