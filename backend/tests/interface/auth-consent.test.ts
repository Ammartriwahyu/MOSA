import type { Context } from "hono";
import { describe, expect, test } from "vitest";
import { createApp } from "../../src/create-app";
import { sessionOf } from "../../src/shared/interface/session";
import {
  InMemoryHouseholdRepository,
  householdFixture,
} from "../support/in-memory-household-repository";
import { FRONTEND, testContainer } from "../support/test-container";

// Data fiktif: dua akun. "lansia" sudah setuju penyimpanan data; "baru" belum punya rumah tangga.
const TOKENS = { "token-lansia": "user-lansia", "token-baru": "user-baru" };

function buildApp() {
  const households = new InMemoryHouseholdRepository([
    householdFixture({ id: "rumah-lansia", ownerUserId: "user-lansia", dataConsentAt: 1 }),
  ]);
  const app = createApp(testContainer({ tokens: TOKENS, households }));

  // Rute uji yang meniru rute terlindungi nyata.
  const echo = (c: Context) => c.json(sessionOf(c));
  app.get("/v1/uji/sesi", echo);
  app.post("/v1/uji/sesi", echo);
  app.get("/v1/household", echo);
  app.get("/v1/household/uji", echo);

  return { app, households };
}

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

describe("autentikasi", () => {
  test("/v1/health tetap publik tanpa token", async () => {
    const res = await buildApp().app.request("/v1/health");
    expect(res.status).toBe(200);
  });

  test.each([
    ["tanpa header", {}],
    ["skema bukan Bearer", { Authorization: "Basic dXNlcjpwYXNz" }],
    ["Bearer kosong", { Authorization: "Bearer " }],
    ["token tidak dikenal", bearer("token-palsu")],
  ])("%s → 401 UNAUTHENTICATED", async (_label, headers: Record<string, string>) => {
    const res = await buildApp().app.request("/v1/uji/sesi", { headers });
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { code: string; details: unknown } };
    expect(body.error.code).toBe("UNAUTHENTICATED");
    expect(body.error.details).toBeNull();
  });

  test("layanan Auth tidak terjangkau → 503 AUTH_UNAVAILABLE (bukan 401, agar tidak dipaksa keluar)", async () => {
    const res = await buildApp().app.request("/v1/uji/sesi", { headers: bearer("token-gangguan") });
    expect(res.status).toBe(503);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe("AUTH_UNAVAILABLE");
  });

  test("rute tidak dikenal tetap meminta token (tidak membocorkan daftar rute)", async () => {
    const res = await buildApp().app.request("/v1/tidak-ada");
    expect(res.status).toBe(401);
  });

  test("rute tidak dikenal dengan token sah dan persetujuan → 404 berformat seragam", async () => {
    const res = await buildApp().app.request("/v1/tidak-ada", { headers: bearer("token-lansia") });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      error: { code: "NOT_FOUND", message: "Alamat tidak ditemukan.", details: null },
    });
  });

  test("preflight CORS dijawab tanpa token", async () => {
    const res = await buildApp().app.request("/v1/uji/sesi", {
      method: "OPTIONS",
      headers: { Origin: FRONTEND, "Access-Control-Request-Method": "GET" },
    });
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(FRONTEND);
  });
});

describe("rumah tangga dari sesi", () => {
  test("token sah dengan persetujuan → sesi berisi householdId milik pengguna", async () => {
    const res = await buildApp().app.request("/v1/uji/sesi", { headers: bearer("token-lansia") });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ userId: "user-lansia", householdId: "rumah-lansia" });
  });

  test("householdId palsu di body dan query diabaikan", async () => {
    const res = await buildApp().app.request("/v1/uji/sesi?householdId=rumah-orang-lain", {
      method: "POST",
      headers: { ...bearer("token-lansia"), "Content-Type": "application/json" },
      body: JSON.stringify({ householdId: "rumah-orang-lain" }),
    });
    expect(await res.json()).toEqual({ userId: "user-lansia", householdId: "rumah-lansia" });
  });

  test("pengguna baru otomatis dibuatkan satu rumah tangga, tidak bertambah di permintaan berikutnya", async () => {
    const { app, households } = buildApp();
    await app.request("/v1/household", { headers: bearer("token-baru") });
    await app.request("/v1/household", { headers: bearer("token-baru") });
    expect([...households.rows.values()].filter((h) => h.ownerUserId === "user-baru")).toHaveLength(1);
  });
});

describe("persetujuan data", () => {
  test("tanpa persetujuan → 403 CONSENT_REQUIRED pada rute biasa", async () => {
    const res = await buildApp().app.request("/v1/uji/sesi", { headers: bearer("token-baru") });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({
      error: {
        code: "CONSENT_REQUIRED",
        message: "Persetujuan penyimpanan data belum dicatat.",
        details: null,
      },
    });
  });

  test.each(["/v1/household", "/v1/household/uji"])(
    "tanpa persetujuan, %s tetap bisa diakses (untuk mencatat persetujuan)",
    async (path) => {
      const res = await buildApp().app.request(path, { headers: bearer("token-baru") });
      expect(res.status).toBe(200);
    },
  );

  test("rute bernama mirip /v1/households tidak ikut dikecualikan", async () => {
    const res = await buildApp().app.request("/v1/households", { headers: bearer("token-baru") });
    expect(res.status).toBe(403);
  });
});
