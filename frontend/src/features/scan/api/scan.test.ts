import { beforeEach, describe, expect, test, vi } from "vitest";
import { api, createApiClient } from "@/shared/lib";
import { photoBase64 } from "../lib/photo-base64";
import { PHOTO_POLICY } from "../lib/photo-policy";
import { scanResponseFixture, scanSlotFixture } from "../testing/scan-response-fixtures";
import { scanPackage } from "./scan";

vi.mock("@/shared/lib", async (original) => ({ ...await original<typeof import("@/shared/lib")>(), api: vi.fn() }));
const fetcher = vi.fn<typeof fetch>();
const image = () => new File([new Uint8Array([255,216,255,224])], "nama-pasien-rahasia.jpg", { type: "image/jpeg" });
const options = () => ({ blob: image(), signal: new AbortController().signal });
beforeEach(() => {
  fetcher.mockReset().mockResolvedValue(Response.json(scanResponseFixture()));
  vi.mocked(api).mockReturnValue(createApiClient({ baseUrl: "http://backend.test", getAccessToken: async () => "token-uji", fetch: fetcher }));
});

describe("scanPackage", () => {
  test("JSON hanya berisi byte JPEG base64 dan slot mentah; Bearer dari api-client", async () => {
    await scanPackage({ ...options(), slotId: scanSlotFixture.slotId });
    expect(fetcher).toHaveBeenCalledTimes(1); expect(fetcher.mock.calls[0]?.[0]).toBe("http://backend.test/v1/scan");
    const init = fetcher.mock.calls[0]?.[1];
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer token-uji");
    expect(new Headers(init?.headers).get("Content-Type")).toBe("application/json");
    const body = String(init?.body);
    expect(JSON.parse(body)).toEqual({ image: { mimeType: "image/jpeg", data: "/9j/4A==" }, slotId: scanSlotFixture.slotId });
    expect(body).not.toMatch(/nama-pasien|data:image|householdId|scheduledTime/);
  });
  test("scan umum tidak menyisipkan slot pilihan otomatis", async () => {
    await scanPackage(options()); expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).not.toHaveProperty("slotId");
  });
  test("respons cocok yang mengalihkan target slot ditolak", async () => {
    await expect(scanPackage({ ...options(), slotId: "obat-a:20261112:0800" })).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });
  test("target rusak ditolak sebelum fetch", async () => {
    await expect(scanPackage({ ...options(), slotId: "obat-a%3A20261112%3A0700" })).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
    expect(fetcher).not.toHaveBeenCalled();
  });
  test.each([429, 503])("HTTP %s tidak diulang otomatis", async (status) => {
    fetcher.mockResolvedValue(Response.json({ error: { code: status === 429 ? "AI_QUOTA_EXCEEDED" : "AI_UNAVAILABLE", message: "detail-rahasia-uji", details: null } }, { status }));
    await expect(scanPackage(options())).rejects.toMatchObject({ code: status === 429 ? "AI_QUOTA_EXCEEDED" : "AI_UNAVAILABLE" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  test("jaringan dan JSON rusak tidak menjadi hasil scan", async () => {
    fetcher.mockRejectedValueOnce(new Error("server-rahasia-uji"));
    await expect(scanPackage(options())).rejects.toMatchObject({ code: "NETWORK_ERROR" });
    fetcher.mockResolvedValue(Response.json({ outcome: "bisa_konfirmasi" }));
    await expect(scanPackage(options())).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });
  test("batal sebelum baca foto tidak mengirim apa pun", async () => {
    const controller = new AbortController(); controller.abort();
    await expect(scanPackage({ blob: image(), signal: controller.signal })).rejects.toMatchObject({ name: "AbortError" });
    expect(fetcher).not.toHaveBeenCalled();
  });
  test("batal saat FileReader berjalan menghentikan pembacaan tanpa POST", async () => {
    const controller = new AbortController();
    const abort = vi.spyOn(FileReader.prototype, "abort");
    const pending = scanPackage({ blob: image(), signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(abort).toHaveBeenCalledTimes(1); expect(fetcher).not.toHaveBeenCalled();
    abort.mockRestore();
  });
  test("token sesi yang baru tiba setelah batal tidak mengirim foto", async () => {
    let release!: (value: string) => void;
    let tokenRequested!: () => void;
    const requested = new Promise<void>((resolve) => { tokenRequested = resolve; });
    const getAccessToken = () => { tokenRequested(); return new Promise<string>((resolve) => { release = resolve; }); };
    vi.mocked(api).mockReturnValue(createApiClient({ baseUrl: "http://backend.test", getAccessToken, fetch: fetcher }));
    const controller = new AbortController();
    const pending = scanPackage({ blob: image(), signal: controller.signal });
    await requested; controller.abort(); release("token-uji");
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(fetcher).not.toHaveBeenCalled();
  });
  test.each([new Blob([], { type: "image/jpeg" }), new Blob(["x"], { type: "image/png" }), new Blob([new Uint8Array(PHOTO_POLICY.maxBytes + 1)], { type: "image/jpeg" })])("blob kosong/salah format/melebihi batas ditolak", async (blob) => {
    await expect(photoBase64(blob, new AbortController().signal)).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
