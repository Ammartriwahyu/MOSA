import { describe, expect, test } from "vitest";
import { createApp } from "../../src/create-app";
import { householdFixture, InMemoryHouseholdRepository } from "../support/in-memory-household-repository";
import { testContainer } from "../support/test-container";
import { MAX_JSON_BODY_BYTES } from "../../src/shared/interface/parse-json-body";

function system() {
  const container = testContainer({ tokens: { "token-uji": "user-uji" }, households: new InMemoryHouseholdRepository([householdFixture({ id: "rumah-uji", ownerUserId: "user-uji", dataConsentAt: 1 })]) });
  return { app: createApp(container), logger: container.logger };
}
describe("batas keamanan HTTP dan metadata log", () => {
  test("metode HTTP kustom tidak menyalurkan data klien ke log", async () => {
    const { app, logger } = system(); await app.request("/v1/health", { method: "NamaPasienRahasia" });
    expect(logger.events[0]?.method).toBe("OTHER"); expect(JSON.stringify(logger.events)).not.toContain("NamaPasienRahasia");
  });
  test("X-Request-Id dari klien tidak boleh menyisipkan data ke log atau respons", async () => {
    const { app, logger } = system();
    const response = await app.request("/v1/health", { headers: { "X-Request-Id": "NamaPasienRahasiaAmlodipin5mg" } });
    expect(response.status).toBe(200);
    expect(JSON.stringify(logger.events)).not.toContain("NamaPasienRahasia");
    expect(response.headers.get("X-Request-Id")).not.toContain("NamaPasienRahasia");
    expect(logger.events[0]?.requestId).toMatch(/^[0-9a-f-]{36}$/i);
  });
  test.each(["/v1/health", "/v1/household", "/v1/medicines", "/v1/doses/today", "/v1/tidak-ada"])("%s memberi no-store dan nosniff, termasuk galat", async (path) => {
    const response = await system().app.request(path);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("Referrer-Policy")).toBe("no-referrer");
  });
  test("JSON sangat besar ditolak sebelum skema membuang kolom tambahan", async () => {
    const { app } = system();
    const response = await app.request("/v1/household/preferences", { method: "PATCH", headers: { Authorization: "Bearer token-uji", "Content-Type": "application/json" }, body: JSON.stringify({ outputMode: "suara", extra: "x".repeat(40_000) }) });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: "VALIDATION_FAILED" } });
  });
  test.each([undefined, "1"])("batas byte nyata tetap berlaku saat Content-Length=%s", async (length) => {
    const response = await system().app.request("/v1/household/preferences", { method: "PATCH", headers: { Authorization: "Bearer token-uji", "Content-Type": "application/json", ...(length ? { "Content-Length": length } : {}) }, body: JSON.stringify({ outputMode: "suara", extra: "字".repeat(12_000) }) });
    expect(response.status).toBe(400);
  });
  test("tepat batas byte JSON diterima; lebih satu byte ditolak", async () => {
    const empty = JSON.stringify({ outputMode: "suara", extra: "" });
    for (const extra of [0, 1]) {
      const response = await system().app.request("/v1/household/preferences", { method: "PATCH", headers: { Authorization: "Bearer token-uji", "Content-Type": "application/json" }, body: JSON.stringify({ outputMode: "suara", extra: "x".repeat(MAX_JSON_BODY_BYTES - Buffer.byteLength(empty) + extra) }) });
      expect(response.status).toBe(extra ? 400 : 200);
    }
  });
  test("alur terotentikasi menolak JSON UTF-8 rusak tanpa memantulkan byte", async () => {
    const response = await system().app.request("/v1/household/preferences", { method: "PATCH", headers: { Authorization: "Bearer token-uji", "Content-Type": "application/json" }, body: new Uint8Array([0xc3, 0x28]) });
    expect(response.status).toBe(400); expect(await response.json()).toMatchObject({ error: { code: "VALIDATION_FAILED" } });
  });
});
