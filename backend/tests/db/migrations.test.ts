import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

const dir = join(import.meta.dirname, "../../supabase/migrations");
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
const sql = files
  .map((f) => readFileSync(join(dir, f), "utf8"))
  .join("\n")
  .replace(/--.*$/gm, "")
  .toLowerCase();

const tables = [...sql.matchAll(/create table if not exists public\.(\w+)/g)].map((m) => m[1]);

describe("migrasi database", () => {
  test("nama berkas mengikuti format Supabase CLI <timestamp>_<nama>.sql", () => {
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) expect(f).toMatch(/^\d{14}_[a-z0-9_]+\.sql$/);
  });

  test("membuat semua tabel docs/03 §10", () => {
    expect(tables.sort()).toEqual(
      [
        "ai_usage",
        "dose_confirmations",
        "households",
        "medicines",
        "push_subscriptions",
        "reminder_dispatches",
      ].sort(),
    );
  });

  test.each(tables)("RLS aktif dan hak publik dicabut pada %s", (table) => {
    expect(sql).toContain(`alter table public.${table} enable row level security`);
    const revoke = sql.match(/revoke all on table([\s\S]*?)from anon, authenticated/);
    expect(revoke?.[1]).toContain(`public.${table}`);
  });

  test("tidak ada kebijakan RLS: hanya backend yang mengakses data", () => {
    expect(sql).not.toMatch(/create policy/);
    expect(sql).not.toMatch(/grant [^;]* to (anon|authenticated)/);
  });

  test("tidak ada kolom foto", () => {
    expect(sql).not.toMatch(/\b(photo|foto|image|gambar)\w*\s+(text|bytea|jsonb|uuid)/);
  });

  test("obat punya kolom kegunaan wajib (PRD §9.2 isian #3)", () => {
    expect(sql).toMatch(/add column if not exists purpose text not null/);
  });

  test("konfirmasi dosis unik per obat, tanggal, dan jam", () => {
    expect(sql).toMatch(/unique \(medicine_id, scheduled_date, scheduled_time\)/);
  });
});
