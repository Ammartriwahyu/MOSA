import { beforeEach, expect, test, vi } from "vitest";
import { api, createApiClient } from "@/shared/lib";
import { recordScanConsent } from "./household";

vi.mock("@/shared/lib", async (original) => ({ ...await original<typeof import("@/shared/lib")>(), api: vi.fn() }));
const fetcher = vi.fn<typeof fetch>();
const household = { dataConsentAt: "2026-11-12T00:00:00Z", scanConsentAt: "2026-11-12T00:01:00Z", outputMode: null, isDemo: false };
beforeEach(() => {
  fetcher.mockReset();
  vi.mocked(api).mockReturnValue(createApiClient({ baseUrl: "http://backend.test", getAccessToken: async () => "token-uji", fetch: fetcher }));
});
test("POST memakai kind scan sesuai backend, tanpa identitas dari body", async () => {
  fetcher.mockResolvedValue(Response.json(household));
  expect(await recordScanConsent()).toEqual(household);
  expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toEqual({ kind: "scan" });
});
test.each([null, "bukan-timestamp"])("scanConsentAt %j tidak mengesahkan consent lokal", async (scanConsentAt) => {
  fetcher.mockResolvedValue(Response.json({ ...household, scanConsentAt }));
  await expect(recordScanConsent()).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
});
