import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { DATA_TABLES, SQL_ACCOUNTS, migratedDatabase, queryAs, seedSqlAccounts } from "../support/sql-database";

let db: PGlite;
const account = SQL_ACCOUNTS[0];
const unchanged = { households: "is_demo=is_demo", medicines: "active=active", dose_confirmations: "level=level", push_subscriptions: "endpoint=endpoint", reminder_dispatches: "kind=kind", ai_usage: "count=count" } as const;
beforeAll(async () => { db = await migratedDatabase(); await seedSqlAccounts(db); }, 30_000);
afterAll(async () => { await db?.close(); });

describe("hak tabel dan RLS pada migrasi PostgreSQL asli", () => {
  test("matriks akses mencakup seluruh tabel aplikasi yang benar-benar dibuat migrasi", async () => {
    const tables = await db.query<{ name: string }>("select tablename as name from pg_tables where schemaname='public' order by tablename");
    expect(tables.rows.map((row) => row.name)).toEqual([...DATA_TABLES].sort());
  });
  test.each(DATA_TABLES)("%s mengaktifkan RLS, tanpa policy akses klien", async (table) => {
    const flags = await db.query<{ enabled: boolean; policies: number }>(`select c.relrowsecurity as enabled,
      (select count(*)::integer from pg_policy p where p.polrelid=c.oid) as policies
      from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=$1`, [table]);
    expect(flags.rows).toEqual([{ enabled: true, policies: 0 }]);
  });
  describe.each(["anon", "authenticated"] as const)("role %s", (role) => {
    test.each(DATA_TABLES)("%s menolak baca/tulis/ubah/hapus langsung dan tidak mengubah data", async (table) => {
      const before = (await db.query(`select * from public.${table} order by 1`)).rows;
      expect(before).toHaveLength(2);

      for (const sql of [`select * from public.${table}`, `insert into public.${table} select * from public.${table}`,
        `update public.${table} set ${unchanged[table]}`, `delete from public.${table}`]) {
        await expect(queryAs(db, role, sql)).rejects.toMatchObject({ code: "42501" });
      }
      expect((await db.query(`select * from public.${table} order by 1`)).rows).toEqual(before);
    });
    test.each(DATA_TABLES)("RLS %s menyembunyikan baris dari SELECT/UPDATE/DELETE meski hak tabel dibuka dalam transaksi uji", async (table) => {
      for (const sql of [`select * from public.${table}`, `update public.${table} set ${unchanged[table]} returning *`, `delete from public.${table} returning *`]) {
        const result = await queryAs(db, role, sql, [], true);
        expect(result.rows).toEqual([]);
      }
      const rights = await db.query<{ allowed: boolean }>("select has_table_privilege($1,$2,'SELECT') as allowed", [role, `public.${table}`]);
      expect(rights.rows).toEqual([{ allowed: false }]);
    });
    test.each(DATA_TABLES)("RLS %s tetap menolak INSERT setelah hak tabel dibuka dalam transaksi uji", async (table) => {

      const row = (await db.query(`select * from public.${table} limit 1`)).rows[0];
      await expect(queryAs(db, role, `insert into public.${table} select * from json_populate_record(null::public.${table},$1::json)`, [JSON.stringify(row)], true)).rejects.toMatchObject({ code: "42501", message: expect.stringContaining("row-level security") });
    });
    test("RPC konfirmasi dan jatah AI tidak dapat dieksekusi klien", async () => {
      for (const sql of [
        `select public.consume_ai_usage('${account.house}','2026-11-11',10)`,
        `select public.confirm_dose('${account.house}','${account.medicine}','2026-11-11','19:00','2026-11-11T12:00:00Z','dasar',30,120)`,
        `select public.confirm_scanned_dose('${account.house}','${account.medicine}','2026-11-11','19:00','2026-11-11T12:00:00Z','scan_terverifikasi',30,120,'Obat Fiktif','5 mg')`,
      ]) await expect(queryAs(db, role, sql)).rejects.toMatchObject({ code: "42501" });
    });
  });
  test("service_role membaca tabel dan menjalankan RPC, tetapi rumah tangga lain tetap ditolak oleh RPC", async () => {
    for (const table of DATA_TABLES) expect((await queryAs(db, "service_role", `select * from public.${table}`)).rows).toHaveLength(2);
    const args = [account.house, account.medicine];
    const confirmed = await queryAs<{ result: { code: string; confirmation: { level: string } } }>(db, "service_role", "select public.confirm_dose($1,$2,'2026-11-11','19:00','2026-11-11T12:00:00Z','dasar',30,120) as result", args);
    expect(confirmed.rows[0]?.result).toMatchObject({ code: "OK", confirmation: { level: "dasar" } });
    const scan = await queryAs<{ result: { code: string; confirmation: { level: string } } }>(db, "service_role", "select public.confirm_scanned_dose($1,$2,'2026-11-11','19:00','2026-11-11T12:00:00Z','scan_terverifikasi',30,120,'Obat Fiktif','5 mg') as result", args);
    expect(scan.rows[0]?.result).toMatchObject({ code: "OK", confirmation: { level: "scan_terverifikasi" } });
    const wrongHouse = await queryAs<{ result: { code: string } }>(db, "service_role", "select public.confirm_dose($1,$2,'2026-11-11','19:00','2026-11-11T12:00:00Z','dasar',30,120) as result", [SQL_ACCOUNTS[1].house, account.medicine]);
    expect(wrongHouse.rows[0]?.result.code).toBe("NOT_FOUND");
    const usage = await queryAs<{ allowed: boolean }>(db, "service_role", "select public.consume_ai_usage($1,'2026-11-11',3) as allowed", [account.house]);
    expect(usage.rows).toEqual([{ allowed: true }]);
  });
});
