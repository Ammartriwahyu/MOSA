import { describe, expect, test, vi } from "vitest";
import { createApp } from "../../src/create-app";
import { testContainer } from "../support/test-container";
import { householdFixture, InMemoryHouseholdRepository } from "../support/in-memory-household-repository";
import { notificationFixture, PUSH_SUB, REMINDER } from "../support/notification-fixtures";

const secret = "cron-fixture-only-not-a-production-secret";
function system(consented = true, enabled = true) {
  const f = notificationFixture();
  const container = testContainer({ tokens: { token: "user-a" }, households: new InMemoryHouseholdRepository([
    householdFixture({ id: "sesi-rumah", ownerUserId: "user-a", dataConsentAt: consented ? 1 : null }),
  ]) });
  if (enabled) { container.notification = f.useCases; container.cronSecret = secret; }
  return { ...f, container, app: createApp(container) };
}
const request = (method: string, body: unknown, token = true) => ({ method,
  headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer token" } : {}) }, body: JSON.stringify(body) });

describe("rute push", () => {
  test("subscribe dan unsubscribe memakai household sesi, bukan identitas payload", async () => {
    const s = system();
    const body = { endpoint: PUSH_SUB.endpoint, keys: PUSH_SUB.keys, expirationTime: null };
    expect((await s.app.request("/v1/push/subscriptions", request("POST", body))).status).toBe(204);
    expect(s.repository.save).toHaveBeenCalledWith("sesi-rumah", { endpoint: PUSH_SUB.endpoint, keys: PUSH_SUB.keys });
    expect((await s.app.request("/v1/push/subscriptions", request("DELETE", { endpoint: PUSH_SUB.endpoint }))).status).toBe(204);
    expect(s.repository.remove).toHaveBeenCalledWith("sesi-rumah", PUSH_SUB.endpoint);
    expect((await s.app.request("/v1/push/subscriptions", request("POST", { ...body, householdId: "lain" }))).status).toBe(400);
    expect(s.repository.save).toHaveBeenCalledTimes(1);
  });
  test("tanpa sesi 401; belum consent 403; body terlalu besar 400", async () => {
    expect((await system().app.request("/v1/push/subscriptions", request("POST", {}, false))).status).toBe(401);
    expect((await system(false).app.request("/v1/push/subscriptions", request("POST", {}))).status).toBe(403);
    expect((await system().app.request("/v1/push/subscriptions", request("POST", { endpoint: "a".repeat(9000) }))).status).toBe(400);
  });
  test("push nonaktif tidak merusak health dan tidak mengirim", async () => {
    const s = system(true, false);
    expect((await s.app.request("/v1/health")).status).toBe(200);
    expect((await s.app.request("/v1/push/subscriptions", request("POST", PUSH_SUB))).status).toBe(503);
    expect((await s.app.request("/v1/internal/reminders/run", { method: "POST" })).status).toBe(503);
    expect(s.sender.send).not.toHaveBeenCalled();
  });
  test.each([undefined, "wrong", "x".repeat(50)])("cron menolak secret %s meski membawa token pengguna", async (supplied) => {
    const s = system(); const headers: Record<string, string> = { Authorization: "Bearer token" };
    if (supplied) headers["x-cron-secret"] = supplied;
    expect((await s.app.request("/v1/internal/reminders/run", { method: "POST", headers })).status).toBe(401);
    expect(s.due.read).not.toHaveBeenCalled();
  });
  test("secret benar tanpa sesi menjalankan cron; prefix/metode lain tetap terjaga; log aman", async () => {
    const s = system(); const verifier = vi.spyOn(s.container.tokenVerifier, "verify");
    const response = await s.app.request("/v1/internal/reminders/run", { method: "POST", headers: { "x-cron-secret": secret } });
    expect(response.status).toBe(200); expect(await response.json()).toEqual({ sent: 1, expired: 0, failed: 0, skipped: 0 });
    expect(verifier).not.toHaveBeenCalled();
    expect((await s.app.request("/v1/internal/reminders/run")).status).toBe(401);
    expect((await s.app.request("/v1/internal/reminders/other", { method: "POST", headers: { "x-cron-secret": secret } })).status).toBe(401);
    const logs = JSON.stringify(s.container.logger.events);
    for (const value of [secret, PUSH_SUB.endpoint, PUSH_SUB.keys.auth, REMINDER.slotId]) expect(logs).not.toContain(value);
  });
});
