import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { DATA_TABLES, SQL_ACCOUNTS, accountSnapshot, migratedDatabase, seedSqlAccounts } from "../support/sql-database";

let db: PGlite;
const account = SQL_ACCOUNTS[0]; const other = SQL_ACCOUNTS[1];
beforeAll(async () => { db = await migratedDatabase(); }, 30_000);
beforeEach(async () => { await seedSqlAccounts(db); });
afterAll(async () => { await db?.close(); });

describe("penghapusan menyeluruh lewat foreign key PostgreSQL", () => {
  test.each([true, false])("menghapus pemilik Auth membersihkan enam tabel termasuk obat active=%s; keluarga lain utuh", async (active) => {
    await db.query("update public.medicines set active=$1 where id=$2", [active, account.medicine]);
    const before = await accountSnapshot(db, account); const otherBefore = await accountSnapshot(db, other);
    expect(Object.keys(before).sort()).toEqual(["users", ...DATA_TABLES].sort());
    for (const rows of Object.values(before)) expect(rows).toHaveLength(1);

    await db.query("delete from auth.users where id=$1", [account.user]);
    const after = await accountSnapshot(db, account);
    for (const rows of Object.values(after)) expect(rows).toEqual([]);
    expect(await accountSnapshot(db, other)).toEqual(otherBefore);
    await db.query("delete from auth.users where id=$1", [account.user]);
    expect(await accountSnapshot(db, other)).toEqual(otherBefore);
  });
  test("hapus rumah tangga membersihkan data terkait tetapi tidak menghapus akun Auth atau keluarga lain", async () => {
    const otherBefore = await accountSnapshot(db, other);
    await db.query("delete from public.households where id=$1", [account.house]);
    const after = await accountSnapshot(db, account);
    expect(after.users).toHaveLength(1);
    for (const table of DATA_TABLES) expect(after[table]).toEqual([]);
    expect(await accountSnapshot(db, other)).toEqual(otherBefore);
  });
  test("rollback mengembalikan seluruh data bila penghapusan tidak diselesaikan", async () => {
    const before = await accountSnapshot(db, account); const otherBefore = await accountSnapshot(db, other);
    await db.exec("begin");
    try {
      await db.query("delete from auth.users where id=$1", [account.user]);
      for (const rows of Object.values(await accountSnapshot(db, account))) expect(rows).toEqual([]);
    } finally { await db.exec("rollback"); }
    expect(await accountSnapshot(db, account)).toEqual(before); expect(await accountSnapshot(db, other)).toEqual(otherBefore);
  });
  test("hapus lunak per obat mempertahankan riwayat dan akun sampai penghapusan seluruh akun", async () => {
    const before = await accountSnapshot(db, account);
    await db.query("update public.medicines set active=false where id=$1", [account.medicine]);
    const after = await accountSnapshot(db, account);
    expect(after.users).toEqual(before.users); expect(after.households).toEqual(before.households);
    expect(after.dose_confirmations).toEqual(before.dose_confirmations); expect(after.reminder_dispatches).toEqual(before.reminder_dispatches);
    expect(after.medicines).toMatchObject([{ active: false }]);
  });
});
