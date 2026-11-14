import { beforeEach, expect, test, vi } from "vitest";
import { createApiClient } from "@/shared/lib/api-client";
import { ApiError } from "@/shared/lib/api-error";
import { deactivateMedicine, explainMedicine, updateMedicine } from "./medicines";

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

test("hapus lunak mengirim DELETE dan menerima 204 tanpa mencoba membaca JSON", async () => {
  backend.fetch.mockResolvedValue(new Response(null, { status: 204 }));
  await expect(deactivateMedicine("uji/id")).resolves.toBeUndefined();
  expect(backend.fetch.mock.calls[0][0]).toBe("https://api.contoh.test/v1/medicines/uji%2Fid");
  expect(backend.fetch.mock.calls[0][1]).toMatchObject({ method: "DELETE" });
});

test("PATCH mengganti isian penuh, tanpa menambahkan householdId dari klien", async () => {
  const input = {
    name: "Obat Uji", strength: "5 mg", purpose: "Kegunaan uji", doseAmount: "1 tablet",
    usageRule: "Sesudah makan", warnings: "Tidak ada larangan khusus", notes: null, intakeTimes: ["07:00"], intakeDays: [1, 2, 3, 4, 5, 6, 7],
    labelSource: "keluarga" as const, explanation: null, explanationOrigin: "teks_pengisi" as const,
  };
  backend.fetch.mockResolvedValue(Response.json({ ...input, id: "uji", createdAt: "2026-11-11T00:00:00Z" }));
  await updateMedicine("uji/id", input);
  expect(backend.fetch.mock.calls[0][0]).toBe("https://api.contoh.test/v1/medicines/uji%2Fid");
  expect(backend.fetch.mock.calls[0][1]).toMatchObject({ method: "PATCH", body: JSON.stringify(input) });
});
