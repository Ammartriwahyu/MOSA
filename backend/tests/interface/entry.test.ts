import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";

// Menguji entri sungguhan (src/index.ts) seperti yang dijalankan Vercel dan server lokal.
// Nilai env fiktif; tes ini tidak menghubungi Supabase.
// Impor pertama src/index.ts memuat seluruh aplikasi; saat BE+FE diuji paralel
// bisa melewati batas bawaan 5 detik (gagal acak 13–14 Nov), jadi diberi 20 detik.
describe("entri src/index.ts", { timeout: 20_000 }, () => {
  beforeAll(() => {
    vi.stubEnv("SUPABASE_URL", "http://127.0.0.1:1");
    vi.stubEnv("SUPABASE_SECRET_KEY", "kunci-uji");
    vi.stubEnv("GEMINI_API_KEY", "kunci-uji-gemini");
    vi.stubEnv("GEMINI_MODEL", "model-uji");
    vi.stubEnv("SCAN_TOKEN_SECRET", "secret-only-for-tests-not-production");
  });
  afterAll(() => {
    vi.unstubAllEnvs();
  });

  test("rute tidak dikenal dibalas 404 berformat seragam, bukan teks bawaan Hono", async () => {
    const { default: app } = await import("../../src/index");
    const res = await app.request("/tidak-ada");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      error: { code: "NOT_FOUND", message: "Alamat tidak ditemukan.", details: null },
    });
  });

  test("rute terlindungi tanpa token dibalas 401 berformat seragam", async () => {
    const { default: app } = await import("../../src/index");
    const res = await app.request("/v1/apa-saja");
    expect(res.status).toBe(401);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe("UNAUTHENTICATED");
  });
});
