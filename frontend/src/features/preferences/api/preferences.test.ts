import { beforeEach, expect, test, vi } from "vitest";
import { api, createApiClient } from "@/shared/lib";
import { updateOutputMode } from "./preferences";
vi.mock("@/shared/lib", async (original) => ({ ...await original<typeof import("@/shared/lib")>(), api: vi.fn() }));
const fetcher = vi.fn<typeof fetch>();
beforeEach(() => { fetcher.mockReset(); vi.mocked(api).mockReturnValue(createApiClient({ baseUrl: "http://backend.test", getAccessToken: async () => "token-uji", fetch: fetcher })); });
test.each([null, "suara"])("PATCH yang tidak mengembalikan pilihan teks ditolak (%s)", async (outputMode) => {
  fetcher.mockResolvedValue(Response.json({ dataConsentAt: "uji", scanConsentAt: "uji", outputMode, isDemo: false }));
  await expect(updateOutputMode("teks")).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
});
test("PATCH menerima hanya pilihan tersimpan yang sama", async () => {
  fetcher.mockResolvedValue(Response.json({ dataConsentAt: "uji", scanConsentAt: "uji", outputMode: "teks", isDemo: false }));
  expect(await updateOutputMode("teks")).toMatchObject({ outputMode: "teks" });
  expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toEqual({ outputMode: "teks" });
});
