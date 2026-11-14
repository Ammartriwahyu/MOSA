import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { migratedDatabase, seedSqlAccounts, SQL_ACCOUNTS, queryAs } from "../support/sql-database";

const A = SQL_ACCOUNTS[0]; const B = SQL_ACCOUNTS[1];
const endpoint = "https://fcm.googleapis.com/fcm/send/fictitious";
let db: PGlite;
beforeAll(async () => { db = await migratedDatabase(); });
afterAll(async () => { await db?.close(); });
beforeEach(async () => { await seedSqlAccounts(db); await db.exec("delete from public.push_subscriptions; delete from public.reminder_dispatches; delete from public.dose_confirmations"); });
async function register(house = A.house as string, url = endpoint, auth = "auth") {
  return (await db.query<{ value: boolean }>("select public.register_push_subscription($1,$2,'key',$3) as value", [house, url, auth])).rows[0]?.value;
}
async function subscriptionId() { return (await db.query<{ id: string }>("select id from public.push_subscriptions where endpoint=$1", [endpoint])).rows[0]?.id; }
async function claim(subscription: string, house = A.house as string, medicine = A.medicine as string) {
  return (await db.query<{ value: boolean }>("select public.claim_push_reminder($1,$2,$3,'2026-11-11','07:00') as value", [house, subscription, medicine])).rows[0]?.value;
}
describe("RPC push pada migrasi PostgreSQL asli", () => {
  test("registrasi idempoten mempertahankan ID dan memperbarui key tanpa pindah akun", async () => {
    expect(await register()).toBe(true); const id = await subscriptionId();
    expect(await register(A.house, endpoint, "baru")).toBe(true); expect(await subscriptionId()).toBe(id);
    expect(await register(B.house)).toBe(false);
    expect((await db.query<{ household_id: string; auth: string }>("select household_id,auth from public.push_subscriptions")).rows).toEqual([{ household_id: A.house, auth: "baru" }]);
  });
  test("batas 10 perangkat tidak menghalangi pembaruan yang sudah ada", async () => {
    for (let i = 0; i < 10; i++) expect(await register(A.house, `${endpoint}/${i}`)).toBe(true);
    expect(await register()).toBe(false); expect(await register(A.house, `${endpoint}/0`)).toBe(true);
  });
  test("consent wajib untuk registrasi dan klaim", async () => {
    await register(); const id = await subscriptionId(); if (!id) throw Error("fixture");
    await db.query("update households set data_consent_at=null where id=$1", [A.house]);
    expect(await register()).toBe(false); expect(await claim(id)).toBe(false);
  });
  test("klaim berulang atomik, dua perangkat berbeda masing-masing satu kiriman", async () => {
    await register(); const id = await subscriptionId(); if (!id) throw Error("fixture");
    const claims = await Promise.all([claim(id), claim(id), claim(id)]);
    expect(claims.filter(Boolean)).toHaveLength(1);
    await register(A.house, `${endpoint}/b`);
    const second = (await db.query<{ id: string }>("select id from push_subscriptions where endpoint=$1", [`${endpoint}/b`])).rows[0]?.id;
    if (!second) throw Error("fixture"); expect(await claim(second)).toBe(true);
    expect((await db.query("select * from reminder_dispatches")).rows).toHaveLength(2);
  });
  test("akun lain, obat nonaktif dan dosis terkonfirmasi ditolak", async () => {
    await register(); const id = await subscriptionId(); if (!id) throw Error("fixture");
    expect(await claim(id, B.house)).toBe(false); expect(await claim(id, A.house, B.medicine)).toBe(false);
    await db.query("update medicines set active=false where id=$1", [A.medicine]);
    expect(await claim(id)).toBe(false);
    await db.query("update medicines set active=true where id=$1", [A.medicine]);
    await db.query("insert into dose_confirmations(household_id,medicine_id,scheduled_date,scheduled_time,confirmed_at,level) values($1,$2,'2026-11-11','07:00','2026-11-11T00:00:00Z','dasar')", [A.house, A.medicine]);
    expect(await claim(id)).toBe(false);
  });
  test("perubahan jadwal sesudah pembacaan dosis membatalkan klaim slot lama", async () => {
    await register(); const id = await subscriptionId(); if (!id) throw Error("fixture");
    await db.query("update medicines set intake_times=array['08:00'] where id=$1", [A.medicine]);
    expect(await claim(id)).toBe(false);
    expect((await db.query("select * from reminder_dispatches")).rows).toHaveLength(0);
  });
  test.each(["anon", "authenticated"] as const)("%s tidak dapat memanggil RPC", async (role) => {
    await expect(queryAs(db, role, "select public.register_push_subscription($1,$2,'key','auth')", [A.house, endpoint])).rejects.toThrow(/permission denied/);
    await expect(queryAs(db, role, "select public.claim_push_reminder($1,$2,$3,'2026-11-11','07:00')", [A.house, A.user, A.medicine])).rejects.toThrow(/permission denied/);
  });
  test("role server boleh memanggil RPC dan cascade membersihkan langganan/dispatch", async () => {
    const result = await queryAs<{ value: boolean }>(db, "service_role", "select public.register_push_subscription($1,$2,'key','auth') as value", [A.house, endpoint]);
    expect(result.rows[0]?.value).toBe(true);
    await register(); const id = await subscriptionId(); if (!id) throw Error("fixture"); await claim(id);
    await db.query("delete from auth.users where id=$1", [A.user]);
    expect((await db.query("select * from push_subscriptions")).rows).toHaveLength(0);
    expect((await db.query("select * from reminder_dispatches")).rows).toHaveLength(0);
  });
});
