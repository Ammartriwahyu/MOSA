import { createClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { SupabasePushSubscriptions, SupabaseReminderDispatches } from "../../src/modules/notification/infrastructure/supabase-push-repositories";
import type { Database } from "../../src/shared/infrastructure/database.types";
import { PUSH_SUB, REMINDER } from "../support/notification-fixtures";

const fetcher = vi.fn<typeof fetch>();
function repositories() {
  const client = createClient<Database>("https://supabase.fixture.test", "fixture-key", {
    auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: fetcher },
  });
  return { subscriptions: new SupabasePushSubscriptions(client), dispatches: new SupabaseReminderDispatches(client) };
}
const url = () => new URL(String(fetcher.mock.calls[0]?.[0]));
const body = () => JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body));
beforeEach(() => { fetcher.mockReset(); });
describe("repository push melalui Supabase SDK asli", () => {
  test("register menggunakan RPC scoped, penolakan owner/batas tidak ditimpa", async () => {
    fetcher.mockResolvedValueOnce(Response.json(true)).mockResolvedValueOnce(Response.json(false));
    const r = repositories();
    expect(await r.subscriptions.save("sesi", PUSH_SUB)).toEqual({ ok: true, value: undefined });
    expect(url().pathname).toBe("/rest/v1/rpc/register_push_subscription");
    expect(body()).toEqual({ p_household_id: "sesi", p_endpoint: PUSH_SUB.endpoint, p_p256dh: PUSH_SUB.keys.p256dh, p_auth: PUSH_SUB.keys.auth });
    expect(await r.subscriptions.save("lain", PUSH_SUB)).toMatchObject({ ok: false, error: { code: "VALIDATION_FAILED" } });
  });
  test("DELETE selalu menyaring household DAN endpoint, termasuk yang sudah hilang", async () => {
    fetcher.mockResolvedValue(new Response(null, { status: 204 }));
    expect(await repositories().subscriptions.remove("sesi", PUSH_SUB.endpoint)).toEqual({ ok: true, value: undefined });
    expect(url().searchParams.get("household_id")).toBe("eq.sesi");
    expect(url().searchParams.get("endpoint")).toBe(`eq.${PUSH_SUB.endpoint}`);
  });
  test("list menyaring endpoint lama yang tidak aman dan memvalidasi ID", async () => {
    const row = { id: PUSH_SUB.id, household_id: "11111111-1111-4111-8111-111111111111", endpoint: PUSH_SUB.endpoint, ...PUSH_SUB.keys };
    fetcher.mockResolvedValueOnce(Response.json([row, { ...row, endpoint: "https://localhost" }])).mockResolvedValueOnce(Response.json([{ ...row, id: "bad" }]));
    const r = repositories(); expect(await r.subscriptions.list()).toEqual({ ok: true, value: [{ ...PUSH_SUB, householdId: row.household_id }] });
    expect(await r.subscriptions.list()).toMatchObject({ ok: false, error: { code: "DATABASE_UNAVAILABLE" } });
  });
  test("klaim memakai RPC atomik dan respons boolean", async () => {
    fetcher.mockResolvedValueOnce(Response.json(true)).mockResolvedValueOnce(Response.json(false)).mockResolvedValueOnce(Response.json(null));
    const r = repositories();
    expect(await r.dispatches.claim(PUSH_SUB, REMINDER)).toEqual({ ok: true, value: true });
    expect(url().pathname).toBe("/rest/v1/rpc/claim_push_reminder");
    expect(body()).toEqual({ p_household_id: PUSH_SUB.householdId, p_subscription_id: PUSH_SUB.id, p_medicine_id: REMINDER.medicineId,
      p_scheduled_date: REMINDER.scheduledDate, p_scheduled_time: REMINDER.scheduledTime });
    expect(await r.dispatches.claim(PUSH_SUB, REMINDER)).toEqual({ ok: true, value: false });
    expect(await r.dispatches.claim(PUSH_SUB, REMINDER)).toMatchObject({ ok: false, error: { code: "DATABASE_UNAVAILABLE" } });
  });
  test("balasan register tak sah bukan sukses", async () => {
    fetcher.mockResolvedValue(Response.json("true"));
    expect(await repositories().subscriptions.save("sesi", PUSH_SUB)).toMatchObject({ ok: false, error: { code: "DATABASE_UNAVAILABLE" } });
  });
  test("galat jaringan tidak membocorkan endpoint/key/server dan tidak retry", async () => {
    fetcher.mockRejectedValue(new Error(`secret-error ${PUSH_SUB.endpoint}`));
    const r = repositories();
    for (const result of [await r.subscriptions.list(), await r.subscriptions.save("sesi", PUSH_SUB),
      await r.subscriptions.remove("sesi", PUSH_SUB.endpoint), await r.dispatches.claim(PUSH_SUB, REMINDER)]) {
      expect(result).toMatchObject({ ok: false, error: { code: "DATABASE_UNAVAILABLE" } });
      expect(JSON.stringify(result)).not.toContain("secret-error"); expect(JSON.stringify(result)).not.toContain(PUSH_SUB.endpoint);
    }
    expect(fetcher).toHaveBeenCalledTimes(4);
  });
});
