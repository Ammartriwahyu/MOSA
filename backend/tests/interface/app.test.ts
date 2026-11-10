import { Hono } from "hono";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createApp } from "../../src/create-app";
import { handleError } from "../../src/shared/interface/error-handler";

const FRONTEND = "http://localhost:3000";
const app = createApp({ frontendOrigin: FRONTEND });

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /v1/health", () => {
  test("membalas status ok", async () => {
    const res = await app.request("/v1/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });
});

describe("rute tidak dikenal", () => {
  test("membalas 404 dengan format galat seragam", async () => {
    const res = await app.request("/v1/tidak-ada");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      error: { code: "NOT_FOUND", message: "Alamat tidak ditemukan.", details: null },
    });
  });
});

describe("CORS", () => {
  test("mengizinkan origin frontend", async () => {
    const res = await app.request("/v1/health", {
      method: "OPTIONS",
      headers: { Origin: FRONTEND, "Access-Control-Request-Method": "GET" },
    });
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(FRONTEND);
  });

  test("tidak mengizinkan origin lain", async () => {
    const res = await app.request("/v1/health", {
      method: "OPTIONS",
      headers: { Origin: "https://situs-lain.example", "Access-Control-Request-Method": "GET" },
    });
    expect(res.headers.get("Access-Control-Allow-Origin")).not.toBe("https://situs-lain.example");
  });
});

describe("galat tak terduga", () => {
  test("membalas 500 seragam tanpa membocorkan pesan galat ke respons maupun log", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const broken = new Hono()
      .get("/rusak", () => {
        throw new Error("data-obat-pengguna");
      })
      .onError(handleError);

    const res = await broken.request("/rusak");
    const body = await res.text();

    expect(res.status).toBe(500);
    expect(JSON.parse(body)).toEqual({
      error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan di server.", details: null },
    });
    expect(body).not.toContain("data-obat-pengguna");
    expect(JSON.stringify(logged.mock.calls)).not.toContain("data-obat-pengguna");
  });
});
