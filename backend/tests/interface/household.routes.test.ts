import { describe, expect, test } from "vitest";
import { createApp } from "../../src/create-app";
import {
  InMemoryAccountEraser,
  InMemoryHouseholdRepository,
  householdFixture,
} from "../support/in-memory-household-repository";
import { TEST_NOW, testContainer } from "../support/test-container";

// Data fiktif: akun baru (belum setuju), akun lansia (sudah setuju), akun Demo Juri.
const TOKENS = {
  "token-baru": "user-baru",
  "token-lansia": "user-lansia",
  "token-demo": "user-demo",
};

function buildApp() {
  const households = new InMemoryHouseholdRepository([
    householdFixture({ id: "rumah-lansia", ownerUserId: "user-lansia", dataConsentAt: 1 }),
    householdFixture({ id: "rumah-demo", ownerUserId: "user-demo", dataConsentAt: 1, isDemo: true }),
  ]);
  const eraser = new InMemoryAccountEraser(households);
  const app = createApp(testContainer({ tokens: TOKENS, households, eraser }));
  return { app, households, eraser };
}

const json = (token: string, method: string, body: unknown) => ({
  method,
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
const auth = (token: string) => ({ headers: { Authorization: `Bearer ${token}` } });

describe("GET /v1/household", () => {
  test("akun baru: dibuat otomatis, belum ada persetujuan maupun pilihan output", async () => {
    const res = await buildApp().app.request("/v1/household", auth("token-baru"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      dataConsentAt: null,
      scanConsentAt: null,
      outputMode: null,
      isDemo: false,
    });
  });

  test("akun demo ditandai isDemo; ID internal tidak dikirim", async () => {
    const res = await buildApp().app.request("/v1/household", auth("token-demo"));
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.isDemo).toBe(true);
    expect(Object.keys(body).sort()).toEqual(["dataConsentAt", "isDemo", "outputMode", "scanConsentAt"]);
  });
});

describe("POST /v1/household/consents", () => {
  test("persetujuan data dicatat, lalu rute biasa tidak lagi 403", async () => {
    const { app } = buildApp();
    const before = await app.request("/v1/doses/today", auth("token-baru"));
    expect(before.status).toBe(403);

    const res = await app.request("/v1/household/consents", json("token-baru", "POST", { kind: "data" }));
    expect(res.status).toBe(200);
    expect(((await res.json()) as { dataConsentAt: string }).dataConsentAt).toBe(
      new Date(TEST_NOW).toISOString(),
    );

    const after = await app.request("/v1/doses/today", auth("token-baru"));
    expect(after.status).toBe(200);
    expect(await after.json()).toMatchObject({ doses: [], summary: { confirmed: 0, total: 0 } });
  });

  test("persetujuan scan sebelum persetujuan data → 403 CONSENT_REQUIRED", async () => {
    const res = await buildApp().app.request(
      "/v1/household/consents",
      json("token-baru", "POST", { kind: "scan" }),
    );
    expect(res.status).toBe(403);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe("CONSENT_REQUIRED");
  });

  test.each([
    ["jenis tidak dikenal", { kind: "iklan" }],
    ["tanpa jenis", {}],
  ])("%s → 400 VALIDATION_FAILED yang hanya menyebut nama kolom", async (_label, body) => {
    const res = await buildApp().app.request("/v1/household/consents", json("token-lansia", "POST", body));
    expect(res.status).toBe(400);
    const parsed = (await res.json()) as { error: { code: string; details: unknown } };
    expect(parsed.error).toMatchObject({ code: "VALIDATION_FAILED", details: { fields: ["kind"] } });
    expect(JSON.stringify(parsed)).not.toContain("iklan");
  });

  test("body bukan JSON → 400", async () => {
    const res = await buildApp().app.request("/v1/household/consents", {
      method: "POST",
      headers: { Authorization: "Bearer token-lansia", "Content-Type": "application/json" },
      body: "bukan json",
    });
    expect(res.status).toBe(400);
  });

  test("householdId di body diabaikan: persetujuan tercatat di rumah tangga sesi", async () => {
    const { app, households } = buildApp();
    await app.request(
      "/v1/household/consents",
      json("token-baru", "POST", { kind: "data", householdId: "rumah-lansia" }),
    );
    expect(households.rows.get("user-baru")?.dataConsentAt).toBe(TEST_NOW);
    expect(households.rows.get("user-lansia")?.dataConsentAt).toBe(1);
  });
});

describe("PATCH /v1/household/preferences", () => {
  test("menyimpan mode Suara", async () => {
    const { app, households } = buildApp();
    const res = await app.request(
      "/v1/household/preferences",
      json("token-lansia", "PATCH", { outputMode: "suara" }),
    );
    expect(res.status).toBe(200);
    expect(((await res.json()) as { outputMode: string }).outputMode).toBe("suara");
    expect(households.rows.get("user-lansia")?.outputMode).toBe("suara");
  });

  test("nilai di luar Teks/Suara → 400", async () => {
    const res = await buildApp().app.request(
      "/v1/household/preferences",
      json("token-lansia", "PATCH", { outputMode: "video" }),
    );
    expect(res.status).toBe(400);
  });
});

describe("DELETE /v1/household", () => {
  test("menghapus akun sesi dan seluruh datanya → 204", async () => {
    const { app, eraser, households } = buildApp();
    const res = await app.request("/v1/household", { method: "DELETE", ...auth("token-lansia") });
    expect(res.status).toBe(204);
    expect(eraser.erased).toEqual(["user-lansia"]);
    expect(households.rows.has("user-lansia")).toBe(false);
    expect(households.rows.has("user-demo")).toBe(true);
  });

  test("akun Demo Juri → 403 DEMO_PROTECTED, tidak ada yang dihapus", async () => {
    const { app, eraser } = buildApp();
    const res = await app.request("/v1/household", { method: "DELETE", ...auth("token-demo") });
    expect(res.status).toBe(403);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe("DEMO_PROTECTED");
    expect(eraser.erased).toEqual([]);
  });

  test("tanpa token → 401, tidak ada yang dihapus", async () => {
    const { app, eraser } = buildApp();
    const res = await app.request("/v1/household", { method: "DELETE" });
    expect(res.status).toBe(401);
    expect(eraser.erased).toEqual([]);
  });
});
