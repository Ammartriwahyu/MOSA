import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { SQL_ACCOUNTS, migratedDatabase, seedSqlAccounts } from "../support/sql-database";

const account = SQL_ACCOUNTS[0];
const SUBSCRIPTION = "77777777-7777-4777-8777-777777777777";
let db: PGlite;

// 2026-11-16 Senin, 2026-11-12 Kamis (sebelum hari Kamis ditambahkan), 2030-01-03 Kamis.
async function confirm(date: string, time: string, now: string) {
  const result = await db.query<{ result: { code: string } }>(
    "select public.confirm_dose($1,$2,$3::date,$4::time,$5::timestamptz,'dasar',30,120) as result",
    [account.house, account.medicine, date, time, now]);
  return result.rows[0]?.result.code;
}

async function claim(date: string, time: string) {
  const result = await db.query<{ claimed: boolean }>(
    "select public.claim_push_reminder($1,$2,$3,$4::date,$5::time) as claimed",
    [account.house, SUBSCRIPTION, account.medicine, date, time]);
  return result.rows[0]?.claimed;
}

async function days() {
  const result = await db.query<{ intake_days: number[]; intake_days_started_at: Record<string, string> }>(
    "select intake_days, intake_days_started_at from public.medicines where id=$1", [account.medicine]);
  const row = result.rows[0];
  if (!row) throw new Error("Obat uji tidak ada.");
  return row;
}

beforeAll(async () => { db = await migratedDatabase(); }, 30_000);
beforeEach(async () => {
  await seedSqlAccounts(db);
  await db.exec("delete from public.dose_confirmations; delete from public.reminder_dispatches; delete from public.push_subscriptions");
  await db.query("insert into public.push_subscriptions (id,household_id,endpoint,p256dh,auth) values ($1,$2,'https://fcm.googleapis.com/fcm/send/uji','p','a')", [SUBSCRIPTION, account.house]);
});
afterAll(async () => { await db?.close(); });

describe("hari minum di database", () => {
  test("bawaan setiap hari dengan waktu aktif = waktu pembuatan", async () => {
    const row = await days();
    expect(row.intake_days).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(Object.values(row.intake_days_started_at).map(Date.parse)).toEqual(Array(7).fill(Date.parse("2026-11-10T00:00:00Z")));
  });

  test("hari yang tidak dipilih ditolak RPC konfirmasi dan pengingat push", async () => {
    await db.query("update public.medicines set intake_days='{1}' where id=$1", [account.medicine]);
    expect((await days()).intake_days_started_at).toEqual({ "1": expect.any(String) });
    expect(await confirm("2026-11-12", "07:00", "2026-11-12T00:30:00Z")).toBe("NOT_FOUND");
    expect(await claim("2026-11-12", "07:00")).toBe(false);
    expect(await confirm("2026-11-16", "07:00", "2026-11-16T00:30:00Z")).toBe("OK");
    expect(await claim("2026-11-16", "19:00")).toBe(true);
  });

  test("hari yang baru ditambahkan tidak berlaku mundur (Q5)", async () => {
    await db.query("update public.medicines set intake_days='{1}' where id=$1", [account.medicine]);
    await db.query("update public.medicines set intake_days='{1,4}' where id=$1", [account.medicine]);
    expect(Date.parse((await days()).intake_days_started_at["4"] ?? "")).toBeGreaterThan(Date.parse("2026-11-10T00:00:00Z"));
    expect(await confirm("2026-11-12", "07:00", "2026-11-12T00:30:00Z")).toBe("NOT_FOUND");
    expect(await claim("2030-01-03", "07:00")).toBe(true);
  });

  test("hari di luar 1–7 atau kosong ditolak constraint", async () => {
    await expect(db.query("update public.medicines set intake_days='{8}' where id=$1", [account.medicine])).rejects.toThrow();
    await expect(db.query("update public.medicines set intake_days='{}' where id=$1", [account.medicine])).rejects.toThrow();
  });
});
