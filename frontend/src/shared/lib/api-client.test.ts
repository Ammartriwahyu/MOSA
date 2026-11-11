import { describe, expect, test, vi } from "vitest";
import { z } from "zod";
import { createApiClient } from "./api-client";
import { ApiError, isApiError } from "./api-error";

const BASE = "http://api.uji";
const household = z.object({ isDemo: z.boolean() });

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function client(fetchImpl: typeof fetch, token: string | null = "token-uji", timeoutMs?: number) {
  return createApiClient({ baseUrl: BASE, getAccessToken: async () => token, fetch: fetchImpl, timeoutMs });
}

async function caught(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("seharusnya gagal");
}

describe("permintaan", () => {
  test("menambah token Bearer, memvalidasi respons, dan mengembalikan data bertipe", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse(200, { isDemo: true, ekstra: 1 }));
    const data = await client(fetchMock).json("/v1/household", household);

    expect(data).toEqual({ isDemo: true });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe(`${BASE}/v1/household`);
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer token-uji");
    expect(init?.method).toBe("GET");
  });

  test("tanpa sesi tidak mengirim header Authorization", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse(200, { isDemo: false }));
    await client(fetchMock, null).json("/v1/household", household);
    expect(new Headers(fetchMock.mock.calls[0]?.[1]?.headers).has("Authorization")).toBe(false);
  });

  test("objek dikirim sebagai JSON", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse(200, { isDemo: false }));
    await client(fetchMock).json("/v1/household/consents", household, { method: "POST", body: { kind: "data" } });
    const init = fetchMock.mock.calls[0]?.[1];
    expect(new Headers(init?.headers).get("Content-Type")).toBe("application/json");
    expect(init?.body).toBe('{"kind":"data"}');
  });

  test("FormData (foto) dikirim apa adanya tanpa Content-Type buatan", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse(200, { isDemo: false }));
    const form = new FormData();
    form.append("foto", new Blob(["x"]), "foto.jpg");
    await client(fetchMock).json("/v1/scan", household, { method: "POST", body: form });
    const init = fetchMock.mock.calls[0]?.[1];
    expect(init?.body).toBe(form);
    expect(new Headers(init?.headers).has("Content-Type")).toBe(false);
  });

  test("204 tanpa isi", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => new Response(null, { status: 204 }));
    await expect(client(fetchMock).noContent("/v1/household", { method: "DELETE" })).resolves.toBeUndefined();
  });
});

describe("galat", () => {
  test("format galat backend menjadi ApiError dengan code, status, dan details", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      jsonResponse(403, { error: { code: "DEMO_PROTECTED", message: "Akun demo tidak dapat dihapus.", details: null } }),
    );
    const error = await caught(client(fetchMock).noContent("/v1/household", { method: "DELETE" }));
    expect(isApiError(error, "DEMO_PROTECTED")).toBe(true);
    expect(error).toMatchObject({ status: 403, details: null });
  });

  test("isi galat bukan format backend → UNKNOWN_ERROR dengan status", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => new Response("Bad Gateway", { status: 502 }));
    const error = await caught(client(fetchMock).json("/v1/household", household));
    expect(error).toMatchObject({ code: "UNKNOWN_ERROR", status: 502 });
  });

  test("respons sukses dengan bentuk salah → INVALID_RESPONSE", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse(200, { isDemo: "ya" }));
    const error = await caught(client(fetchMock).json("/v1/household", household));
    expect(error).toMatchObject({ code: "INVALID_RESPONSE" });
  });

  test("jaringan putus → NETWORK_ERROR", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => {
      throw new TypeError("Failed to fetch");
    });
    const error = await caught(client(fetchMock).json("/v1/household", household));
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: "NETWORK_ERROR", status: null });
  });

  test("melewati batas waktu → TIMEOUT", async () => {
    const hang: typeof fetch = (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      });
    const error = await caught(client(hang, "t", 20).json("/v1/household", household));
    expect(error).toMatchObject({ code: "TIMEOUT" });
  });

  test("pembatalan oleh pemanggil diteruskan apa adanya (bukan ApiError)", async () => {
    const controller = new AbortController();
    const hang: typeof fetch = (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      });
    const pending = client(hang).json("/v1/household", household, { signal: controller.signal });
    controller.abort();
    const error = await caught(pending);
    expect(error).not.toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ name: "AbortError" });
  });
});
