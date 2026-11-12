import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const DATA_TABLES = ["households", "medicines", "dose_confirmations", "push_subscriptions", "reminder_dispatches", "ai_usage"] as const;
export const SQL_ACCOUNTS = [
  { user: "11111111-1111-4111-8111-111111111111", house: "22222222-2222-4222-8222-222222222222", medicine: "33333333-3333-4333-8333-333333333333" },
  { user: "44444444-4444-4444-8444-444444444444", house: "55555555-5555-4555-8555-555555555555", medicine: "66666666-6666-4666-8666-666666666666" },
] as const;
export type SqlAccount = typeof SQL_ACCOUNTS[number];
export type SqlRole = "anon" | "authenticated" | "service_role";

/** PostgreSQL sementara di memori, tanpa env, koneksi produksi, atau salinan skema aplikasi. */
export async function migratedDatabase() {
  const db = new PGlite();
  try {
    // Hanya batas Auth dan role bawaan Supabase yang ditiru; seluruh tabel/RLS/RPC
    // aplikasi dibuat oleh berkas migrasi asli, berurutan seperti pemasangan bersih.
    await db.exec(`create schema auth; create table auth.users (id uuid primary key);
      create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
      grant usage on schema public to anon, authenticated, service_role;
      alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
      set timezone='UTC';`);
    const directory = join(import.meta.dirname, "../../supabase/migrations");
    for (const file of readdirSync(directory).filter((name) => name.endsWith(".sql")).sort()) {
      await db.exec(readFileSync(join(directory, file), "utf8"));
    }
    return db;
  } catch (error) { await db.close(); throw error; }
}

export async function seedSqlAccounts(db: PGlite) {
  // Menghapus hanya database yang dibuat helper ini; tidak membaca kredensial layanan.
  await db.exec("delete from auth.users");
  for (const account of SQL_ACCOUNTS) {
    await db.query("insert into auth.users (id) values ($1)", [account.user]);
    await db.query("insert into public.households (id,owner_user_id,data_consent_at,scan_consent_at,output_mode) values ($1,$2,'2026-11-10T00:00:00Z','2026-11-10T00:00:00Z','teks')", [account.house, account.user]);
    await db.query(`insert into public.medicines
      (id,household_id,name,name_normalized,strength,strength_normalized,purpose,dose_amount,usage_rule,warnings,notes,intake_times,label_source,explanation_origin,created_at)
      values ($1,$2,'Obat Fiktif','obatfiktif','5 mg','5mg','Kegunaan uji','1 tablet','Sesudah makan','Peringatan uji','Catatan uji',array['07:00','19:00'],'keluarga','teks_pengisi','2026-11-10T00:00:00Z')`, [account.medicine, account.house]);
    await db.query(`insert into public.dose_confirmations (household_id,medicine_id,scheduled_date,scheduled_time,confirmed_at,level)
      values ($1,$2,'2026-11-11','07:00','2026-11-11T00:00:00Z','dasar')`, [account.house, account.medicine]);
    await db.query("insert into public.push_subscriptions (household_id,endpoint,p256dh,auth) values ($1,$2,'uji','uji')", [account.house, `https://push.invalid/${account.user}`]);
    await db.query("insert into public.reminder_dispatches (medicine_id,scheduled_date,scheduled_time,kind) values ($1,'2026-11-11','07:00','uji')", [account.medicine]);
    await db.query("insert into public.ai_usage (household_id,day,count) values ($1,'2026-11-11',2)", [account.house]);
  }
}

/** SET LOCAL dan semua perubahan uji selalu dibatalkan, juga setelah galat SQL. */
export async function queryAs<T>(db: PGlite, role: SqlRole, sql: string, params: unknown[] = [], grantForRls = false) {
  await db.exec("begin");
  try {
    // Membuktikan RLS secara mandiri setelah pagar privilege sengaja dibuka
    // HANYA di transaksi tes, tanpa mengubah migrasi atau role produksi.
    if (grantForRls) await db.exec(`grant select, insert, update, delete on all tables in schema public to ${role}`);
    await db.exec(`set local role ${role}`);
    return await db.query<T>(sql, params);
  } finally { await db.exec("rollback"); }
}

export async function accountSnapshot(db: PGlite, account: SqlAccount) {
  const snapshot: Record<string, unknown[]> = {};
  snapshot.users = (await db.query("select * from auth.users where id=$1", [account.user])).rows;
  for (const table of DATA_TABLES) {
    const column = table === "households" ? "id" : table === "reminder_dispatches" ? "medicine_id" : "household_id";
    const key = table === "reminder_dispatches" ? account.medicine : account.house;
    snapshot[table] = (await db.query(`select * from public.${table} where ${column}=$1 order by 1`, [key])).rows;
  }
  return snapshot;
}
