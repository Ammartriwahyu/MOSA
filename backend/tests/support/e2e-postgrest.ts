import type { PGlite } from "@electric-sql/pglite";

/** Transport uji untuk subset PostgREST yang benar-benar dipakai adaptor asli.
 * Query/filter tak dikenal ditolak, bukan diabaikan atau dijawab fixture sukses.
 * Nilai selalu parameter SQL; identifier hanya boleh berasal dari skema migrasi.
 */
export async function postgresTransport(db: PGlite) {
  const metadata = await db.query<{ table_name: string; column_name: string; data_type: string }>("select table_name,column_name,data_type from information_schema.columns where table_schema='public'");
  const columns = new Map<string, Set<string>>();
  const dates = new Map<string, Set<string>>();
  for (const row of metadata.rows) {
    if (!columns.has(row.table_name)) columns.set(row.table_name, new Set());
    columns.get(row.table_name)!.add(row.column_name);
    if (row.data_type === "date") {
      if (!dates.has(row.table_name)) dates.set(row.table_name, new Set());
      dates.get(row.table_name)!.add(row.column_name);
    }
  }
  const rpc = new Set(["consume_ai_usage", "confirm_dose", "confirm_scanned_dose"]);
  const identifier = (value: string) => {
    if (!/^[a-z_][a-z0-9_]*$/.test(value)) throw new Error("Identifier transport uji tidak sah.");
    return `"${value}"`;
  };
  return async function dispatch(request: Request) {
    const url = new URL(request.url); const name = url.pathname.split("/").at(-1)!;
    if (url.pathname.startsWith("/rest/v1/rpc/")) {
      if (request.method !== "POST" || !rpc.has(name)) throw new Error("RPC transport uji tidak didukung.");
      const args: unknown = await request.json();
      if (typeof args !== "object" || args === null || Array.isArray(args)) throw new Error("Argumen RPC uji tidak sah.");
      const entries = Object.entries(args);
      const sql = `select public.${identifier(name)}(${entries.map(([key], index) => `${identifier(key)} => $${index + 1}`).join(",")}) as result`;
      const rows = await db.query<{ result: unknown }>(sql, entries.map(([, value]) => value));
      return Response.json(rows.rows[0]?.result ?? null);
    }
    const allowed = columns.get(name);
    if (!allowed) throw new Error("Tabel transport uji tidak didukung.");
    const column = (value: string) => {
      if (!allowed.has(value.trim())) throw new Error("Kolom transport uji tidak didukung.");
      return identifier(value.trim());
    };
    const selected = url.searchParams.get("select") ?? "*";
    const fields = selected === "*" ? "*" : selected.split(",").map(column).join(",");
    const values: unknown[] = [];
    const parameter = (value: unknown) => { values.push(value); return `$${values.length}`; };
    const filters: string[] = [];
    for (const [key, value] of url.searchParams) {
      if (["select", "order", "limit", "on_conflict"].includes(key)) continue;
      if (value.startsWith("eq.")) filters.push(`${column(key)} = ${parameter(value.slice(3))}`);
      else if (value.startsWith("in.(") && value.endsWith(")")) {
        const items = value.slice(4, -1).split(",").map((item) => item.replace(/^"|"$/g, ""));
        filters.push(`${column(key)} in (${items.map(parameter).join(",")})`);
      } else throw new Error("Filter transport uji tidak didukung.");
    }
    const where = filters.length ? ` where ${filters.join(" and ")}` : "";
    const table = `public.${identifier(name)}`;
    let sql: string;
    if (request.method === "GET") {
      sql = `select ${fields} from ${table}${where}`;
      const order = url.searchParams.get("order");
      if (order) {
        const [key, direction] = order.split(".");
        if (order.split(".").length !== 2 || !key || !["asc", "desc"].includes(direction ?? "")) throw new Error("Urutan transport uji tidak didukung.");
        sql += ` order by ${column(key)} ${direction}`;
      }
      const limit = url.searchParams.get("limit");
      if (limit !== null) {
        if (!/^\d+$/.test(limit)) throw new Error("Limit uji tidak sah.");
        sql += ` limit ${parameter(Number(limit))}`;
      }
    } else if (request.method === "POST" || request.method === "PATCH") {
      const body: unknown = await request.json();
      if (typeof body !== "object" || body === null || Array.isArray(body)) throw new Error("Payload transport uji tidak didukung.");
      const entries = Object.entries(body);
      if (entries.length === 0) throw new Error("Payload uji kosong.");
      if (request.method === "POST") {
        if (filters.length) throw new Error("Filter INSERT transport uji tidak didukung.");
        sql = `insert into ${table} (${entries.map(([key]) => column(key)).join(",")}) values (${entries.map(([, value]) => parameter(value)).join(",")})`;
        const conflict = url.searchParams.get("on_conflict");
        if (conflict) {
          if (!request.headers.get("Prefer")?.includes("resolution=ignore-duplicates")) throw new Error("Resolusi konflik uji tidak didukung.");
          sql += ` on conflict (${column(conflict)}) do nothing`;
        }
      } else {
        if (!where) throw new Error("UPDATE uji harus dibatasi filter.");
        sql = `update ${table} set ${entries.map(([key, value]) => `${column(key)}=${parameter(value)}`).join(",")}${where}`;
      }
      sql += ` returning ${fields}`;
    } else throw new Error("Metode transport uji tidak didukung.");
    const result = await db.query<Record<string, unknown>>(sql, values);
    // PGlite rendert date sebagai Date JS, PostgREST sebagai YYYY-MM-DD.
    // Jangan mengubah timestamp atau JSONB dari fungsi SQL.
    const rows = result.rows.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key,
      dates.get(name)?.has(key) && value instanceof Date ? value.toISOString().slice(0, 10) : value])));
    if (request.headers.get("Accept")?.includes("application/vnd.pgrst.object+json")) {
      if (rows.length !== 1) return Response.json({ code: "PGRST116", message: "Single row required in test." }, { status: 406 });
      return Response.json(rows[0]);
    }
    return Response.json(rows, { status: request.method === "POST" ? 201 : 200 });
  };
}
