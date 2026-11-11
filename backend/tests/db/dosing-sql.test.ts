import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

const HOUSE = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const MED = "33333333-3333-4333-8333-333333333333";
const LEGACY = "44444444-4444-4444-8444-444444444444";
let db: PGlite;
let migration: string;
const insertMedicine = async (id: string) => db.query(`insert into public.medicines
  (id, household_id, name, name_normalized, strength, strength_normalized, purpose, dose_amount, usage_rule, intake_times, label_source, explanation_origin, created_at)
  values ($1, $2, 'Obat Uji', 'obatuji', '5 mg', '5mg', 'Kegunaan uji', '1 tablet', 'Sesudah makan', array['07:00','19:00'], 'keluarga', 'teks_pengisi', '2000-01-01T00:00:00Z')`, [id, HOUSE]);

async function confirm(options: { house?: string; med?: string; date?: string; time?: string; now?: string; level?: string } = {}) {
  const result = await db.query<{ result: { code: string; confirmation?: Record<string, unknown> } }>(
    "select public.confirm_dose($1::uuid,$2::uuid,$3::date,$4::time,$5::timestamptz,$6::text,30,120) as result",
    [options.house ?? HOUSE, options.med ?? MED, options.date ?? "2026-11-11", options.time ?? "07:00", options.now ?? "2026-11-11T00:30:00Z", options.level ?? "dasar"],
  );
  const row = result.rows[0];
  if (!row) throw new Error("Hasil SQL uji kosong.");
  return row.result;
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec("create schema auth; create table auth.users (id uuid primary key); create role anon; create role authenticated; create role service_role bypassrls; set timezone='UTC';");
  const dir = join(import.meta.dirname, "../../supabase/migrations");
  const files = readdirSync(dir).filter((file) => file.endsWith(".sql")).sort();
  for (const file of files.filter((name) => !name.includes("dose_confirmation_atomic"))) await db.exec(readFileSync(join(dir, file), "utf8"));
  await db.query("insert into auth.users values ($1),($2)", [HOUSE, OTHER]);
  await db.query("insert into public.households (id,owner_user_id) values ($1,$1),($2,$2)", [HOUSE, OTHER]);
  await insertMedicine(LEGACY);
  const name = files.find((file) => file.includes("dose_confirmation_atomic"));
  if (!name) throw new Error("Migrasi dosing tidak ada.");
  migration = readFileSync(join(dir, name), "utf8");
  await db.exec(migration);
}, 30_000);
beforeEach(async () => { await db.exec("delete from public.dose_confirmations"); await db.query("delete from public.medicines where id <> $1", [LEGACY]); await insertMedicine(MED); });
afterAll(async () => { await db?.close(); });

describe("migrasi/konfirmasi pada mesin PostgreSQL PGlite", () => {
  test("backfill jadwal lama, insert baru, dan migrasi berulang mempertahankan waktu aktif", async () => {
    const before = await db.query<{ intake_times_started_at: Record<string, string> }>("select intake_times_started_at from public.medicines where id=$1", [LEGACY]);
    expect(Date.parse(before.rows[0]?.intake_times_started_at["07:00"] ?? "")).toBe(Date.parse("2000-01-01T00:00:00Z"));
    await db.exec(migration);
    const after = await db.query("select intake_times_started_at from public.medicines where id=$1", [LEGACY]);
    expect(after.rows).toEqual(before.rows);
  });
  test("tepat J+120 masih diterima, lebih 1 ms ditolak", async () => {
    expect((await confirm({ now: "2026-11-11T02:00:00.001Z" })).code).toBe("DOSE_MISSED");
    expect((await confirm({ now: "2026-11-11T02:00:00Z" })).code).toBe("OK");
  });
  test("sebelum J−30 ditolak, tepat J−30 diterima", async () => {
    expect((await confirm({ now: "2026-11-10T23:29:59.999Z" })).code).toBe("DOSE_NOT_DUE");
    expect((await confirm({ now: "2026-11-10T23:30:00Z" })).code).toBe("OK");
  });
  test("dua konfirmasi menghasilkan satu catatan; level dasar tidak bisa dinaikkan lewat replay", async () => {
    const results = await Promise.all([confirm(), confirm({ level: "scan_terverifikasi" })]);
    expect(results.map((result) => result.code).sort()).toEqual(["DOSE_ALREADY_CONFIRMED", "OK"]);
    const rows = await db.query<{ count: number }>("select count(*)::integer as count from public.dose_confirmations");
    expect(rows.rows[0]?.count).toBe(1);
    expect((await confirm({ level: "scan_terverifikasi" })).code).toBe("DOSE_ALREADY_CONFIRMED");
  });
  test("dua slot bertumpuk pada obat yang sama dapat dikonfirmasi terpisah", async () => {
    await db.query("update public.medicines set intake_times=array['07:00','08:00'],intake_times_started_at=$2::jsonb where id=$1", [MED, JSON.stringify({ "07:00": "2000-01-01T00:00:00Z", "08:00": "2000-01-01T00:00:00Z" })]);
    const results = await Promise.all([confirm(), confirm({ time: "08:00" })]);
    expect(results.map((result) => result.code)).toEqual(["OK", "OK"]);
  });
  test("rumah tangga berbeda tidak dapat mengonfirmasi obat", async () => {
    expect((await confirm({ house: OTHER })).code).toBe("NOT_FOUND");
  });
  test("jadwal berubah setelah dibaca: RPC menolak jam lama dan tidak membuat dosis masa lalu", async () => {
    await db.query("update public.medicines set intake_times=array['08:00','19:00'] where id=$1", [MED]);
    expect((await confirm()).code).toBe("NOT_FOUND");
    expect((await confirm({ date: "2000-01-01", time: "08:00", now: "2000-01-01T01:00:00Z" })).code).toBe("NOT_FOUND");
    const result = await db.query<{ intake_times_started_at: Record<string, string> }>("select intake_times_started_at from public.medicines where id=$1", [MED]);
    const starts = result.rows[0]?.intake_times_started_at;
    expect(starts?.["07:00"]).toBeUndefined();
    expect(Date.parse(starts?.["19:00"] ?? "")).toBe(Date.parse("2000-01-01T00:00:00Z"));
    expect(Date.parse(starts?.["08:00"] ?? "")).toBeGreaterThan(Date.parse("2000-01-01T00:00:00Z"));
  });
  test("perubahan tidak menghapus konfirmasi lama; obat nonaktif menolak konfirmasi baru", async () => {
    expect((await confirm()).code).toBe("OK");
    await db.query("update public.medicines set intake_times=array['08:00','19:00'],active=false where id=$1", [MED]);
    expect((await confirm({ time: "19:00", now: "2026-11-11T12:00:00Z" })).code).toBe("NOT_FOUND");
    const rows = await db.query<{ level: string }>("select level from public.dose_confirmations");
    expect(rows.rows).toEqual([{ level: "dasar" }]);
  });
  test("konfirmasi dini untuk 00.15 besok tetap disimpan pada tanggal jadwal besok", async () => {
    await db.query("update public.medicines set intake_times=array['00:15'],intake_times_started_at=$2::jsonb where id=$1", [MED, JSON.stringify({ "00:15": "2000-01-01T00:00:00Z" })]);
    const result = await confirm({ date: "2026-11-12", time: "00:15", now: "2026-11-11T16:50:00Z" });
    expect(result.code).toBe("OK");
    expect(result.confirmation?.scheduled_date).toBe("2026-11-12");
  });
  test.each(["anon", "authenticated"])("%s tidak boleh mengeksekusi RPC", async (role) => {
    await db.exec(`set role ${role}`);
    try { await expect(confirm()).rejects.toMatchObject({ code: "42501" }); } finally { await db.exec("reset role"); }
  });
});
