import { beforeEach, expect, test, vi } from "vitest";
import { createApiClient } from "@/shared/lib/api-client";
import { ApiError } from "@/shared/lib/api-error";
import { explainMedicine } from "./medicines";

const backend = vi.hoisted(() => ({ fetch: vi.fn<typeof fetch>() }));
vi.mock("@/shared/lib", () => ({
  api: () => createApiClient({ baseUrl: "https://api.contoh.test", getAccessToken: async () => "token-uji", fetch: backend.fetch }),
}));
beforeEach(() => backend.fetch.mockReset());

test.each([{}, { explanation: null }, { explanation: "   " }])("respons explain tidak valid ditolak agar tidak dikonfirmasi sebagai AI: %j", async (data) => {
  backend.fetch.mockResolvedValue(Response.json(data));
  await expect(explainMedicine({ usageRule: "Sesudah makan", warnings: "Tidak ada larangan khusus", notes: null }))
    .rejects.toMatchObject({ code: "INVALID_RESPONSE" });
});

test("galat kuota dipertahankan untuk jalur teks pengisi", async () => {
  backend.fetch.mockResolvedValue(Response.json({ error: { code: "AI_QUOTA_EXCEEDED", message: "uji" } }, { status: 429 }));
  await expect(explainMedicine({ usageRule: "Sesudah makan", warnings: "Tidak ada larangan khusus", notes: null }))
    .rejects.toBeInstanceOf(ApiError);
  expect(backend.fetch).toHaveBeenCalledTimes(1);
});
