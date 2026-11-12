import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { SQL_ACCOUNTS, migratedDatabase, seedSqlAccounts } from "../support/sql-database";

let db: PGlite;
const account = SQL_ACCOUNTS[0];
beforeAll(async () => { db = await migratedDatabase(); }, 30_000);
beforeEach(async () => { await seedSqlAccounts(db); });
afterAll(async () => { await db?.close(); });

async function insertConfirmation(medicine = account.medicine as string, date = "2026-11-11", time = "07:00", level = "scan_terverifikasi") {
  return db.query(`insert into public.dose_confirmations (household_id,medicine_id,scheduled_date,scheduled_time,confirmed_at,level)
    values ($1,$2,$3,$4,'2026-11-11T00:00:00Z',$5)`, [account.house, medicine, date, time, level]);
}
describe("constraint data pada migrasi PostgreSQL asli", () => {
  test("INSERT langsung konfirmasi ganda ditolak 23505; catatan dasar tidak berubah menjadi scan", async () => {
    await expect(insertConfirmation()).rejects.toMatchObject({ code: "23505", constraint: "dose_confirmations_once_per_slot" });
    const rows = await db.query<{ level: string }>("select level from public.dose_confirmations where medicine_id=$1", [account.medicine]);
    expect(rows.rows).toEqual([{ level: "dasar" }]);
  });
  test("tanggal dan jam berbeda bukan duplikat; obat lain pada slot sama juga sah", async () => {
    await insertConfirmation(account.medicine, "2026-11-11", "19:00");
    await insertConfirmation(account.medicine, "2026-11-12");
    const otherMedicine = "77777777-7777-4777-8777-777777777777";
    await db.query(`insert into public.medicines (id,household_id,name,name_normalized,strength,strength_normalized,purpose,dose_amount,usage_rule,intake_times,label_source,explanation_origin)
      values ($1,$2,'Obat Fiktif Lain','obatfiktiflain','10 mg','10mg','Kegunaan uji','1 tablet','Sesudah makan',array['07:00'],'keluarga','teks_pengisi')`, [otherMedicine, account.house]);
    await insertConfirmation(otherMedicine);
    const result = await db.query<{ count: number }>("select count(*)::integer as count from public.dose_confirmations where household_id=$1", [account.house]);
    expect(result.rows).toEqual([{ count: 4 }]);
  });
  test("RPC basic dan scan berturut-turut pada slot sama hanya menghasilkan satu catatan", async () => {
    // Satu koneksi PGlite: ini membuktikan serialisasi/replay dan constraint,
    // bukan klaim uji race pada dua koneksi server PostgreSQL.
    const results = await Promise.all([
      db.query<{ result: { code: string } }>("select public.confirm_dose($1,$2,'2026-11-11','19:00','2026-11-11T12:00:00Z','dasar',30,120) as result", [account.house, account.medicine]),
      db.query<{ result: { code: string } }>("select public.confirm_scanned_dose($1,$2,'2026-11-11','19:00','2026-11-11T12:00:00Z','scan_terverifikasi',30,120,'Obat Fiktif','5 mg') as result", [account.house, account.medicine]),
    ]);
    expect(results.map((result) => result.rows[0]?.result.code).sort()).toEqual(["DOSE_ALREADY_CONFIRMED", "OK"]);
    const rows = await db.query<{ level: string }>("select level from public.dose_confirmations where medicine_id=$1 and scheduled_time='19:00'", [account.medicine]);
    expect(rows.rows).toEqual([{ level: "dasar" }]);
  });
  test("satu pengguna Auth tidak dapat memiliki dua rumah tangga", async () => {
    await expect(db.query("insert into public.households (owner_user_id) values ($1)", [account.user])).rejects.toMatchObject({ code: "23505" });
  });
  test.each([
    ["obat tanpa rumah tangga", "update public.medicines set household_id='99999999-9999-4999-8999-999999999999' where id=$1", account.medicine],
    ["konfirmasi tanpa obat", "update public.dose_confirmations set medicine_id='99999999-9999-4999-8999-999999999999' where medicine_id=$1", account.medicine],
    ["push tanpa rumah tangga", "update public.push_subscriptions set household_id='99999999-9999-4999-8999-999999999999' where household_id=$1", account.house],
    ["pengingat tanpa obat", "update public.reminder_dispatches set medicine_id='99999999-9999-4999-8999-999999999999' where medicine_id=$1", account.medicine],
    ["jatah tanpa rumah tangga", "update public.ai_usage set household_id='99999999-9999-4999-8999-999999999999' where household_id=$1", account.house],
  ])("foreign key menolak %s", async (_name, sql, key) => {
    await expect(db.query(sql, [key])).rejects.toMatchObject({ code: "23503" });
  });
  test.each([
    ["asal AI tanpa penjelasan", "update public.medicines set explanation_origin='ai_dikonfirmasi',explanation=null", "23514"],
    ["teks pengisi dengan AI tersimpan", "update public.medicines set explanation_origin='teks_pengisi',explanation='Teks uji'", "23514"],
    ["jadwal kosong", "update public.medicines set intake_times=array[]::text[]", "23514"],
    ["jam tidak sah", "update public.medicines set intake_times=array['24:00']", "23514"],
    ["sumber tidak dikenal", "update public.medicines set label_source='lain'", "23514"],
    ["level konfirmasi tidak dikenal", "update public.dose_confirmations set level='lain'", "23514"],
    ["jatah AI negatif", "update public.ai_usage set count=-1", "23514"],
  ])("CHECK menolak %s", async (_name, sql, code) => {
    await expect(db.exec(sql)).rejects.toMatchObject({ code });
  });
  test("quota AI berhenti tepat pada batas dan terpisah per keluarga/hari", async () => {
    const consume = async (house = account.house as string, day = "2026-11-11") => (await db.query<{ allowed: boolean }>("select public.consume_ai_usage($1,$2,3) as allowed", [house, day])).rows[0]?.allowed;
    expect(await consume()).toBe(true); expect(await consume()).toBe(false);
    expect(await consume(SQL_ACCOUNTS[1].house)).toBe(true); expect(await consume(account.house, "2026-11-12")).toBe(true);
    const rows = await db.query<{ count: number }>("select count from public.ai_usage where household_id=$1 and day='2026-11-11'", [account.house]);
    expect(rows.rows).toEqual([{ count: 3 }]);
  });
});
