import { createClient } from "@supabase/supabase-js";
import type { PGlite } from "@electric-sql/pglite";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Database } from "../../src/shared/infrastructure/database.types";
import { postgresTransport } from "./e2e-postgrest";

export const E2E_SERVICE_KEY = "service-key-only-for-e2e-not-production";
const ORIGIN = "https://supabase-e2e.invalid";
const SIGNUP = z.object({ email: z.email(), password: z.string().min(8), data: z.record(z.string(), z.unknown()).optional() });
type TestUser = { id: string; email: string; user_metadata: Record<string, unknown>; app_metadata: { provider: string }; aud: string; role: string; created_at: string };

export async function e2eSupabase(db: PGlite) {
  const dispatch = await postgresTransport(db);
  const sessions = new Map<string, TestUser>();
  const failures: string[] = [];
  let queue = Promise.resolve();
  function serialized<T>(work: () => Promise<T>) {
    const result = queue.then(work);
    queue = result.then(() => undefined, () => undefined);
    return result;
  }
  const fetcher: typeof fetch = async (input, init) => {
    const request = new Request(input, init); const url = new URL(request.url);
    if (url.origin !== ORIGIN) throw new Error("Transport E2E menolak koneksi eksternal.");
    return serialized(async () => {
      if (url.pathname === "/auth/v1/signup" && request.method === "POST") {
        const input = SIGNUP.parse(await request.json()); const id = randomUUID();
        await db.query("insert into auth.users (id) values ($1)", [id]);
        const user: TestUser = { id, email: input.email, user_metadata: input.data ?? {}, app_metadata: { provider: "email" }, aud: "authenticated", role: "authenticated", created_at: "2026-11-12T00:00:00Z" };
        const token = `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url")}.${Buffer.from(JSON.stringify({ sub: id, exp: 4_000_000_000 })).toString("base64url")}.test-signature`;
        sessions.set(token, user);
        return Response.json({ access_token: token, token_type: "bearer", expires_in: 3600, refresh_token: `refresh-${id}`, user });
      }
      if (url.pathname === "/auth/v1/user" && request.method === "GET") {
        const token = request.headers.get("Authorization")?.replace(/^Bearer /i, "");
        const user = token ? sessions.get(token) : undefined;
        return user ? Response.json(user) : Response.json({ code: "bad_jwt", msg: "Session not found in test." }, { status: 401 });
      }
      if (url.pathname.startsWith("/auth/v1/admin/users/") && request.headers.get("apikey") === E2E_SERVICE_KEY) {
        const id = url.pathname.split("/").at(-1)!;
        const user = [...sessions.values()].find((value) => value.id === id);
        if (request.method === "GET") return user ? Response.json(user) : Response.json({ code: "user_not_found", msg: "User not found in test." }, { status: 404 });
        if (request.method !== "DELETE") throw new Error("Metode Auth uji tidak didukung.");
        z.object({ should_soft_delete: z.literal(false) }).parse(await request.json());
        await db.query("delete from auth.users where id=$1", [id]);
        for (const [token, user] of sessions) if (user.id === id) sessions.delete(token);
        return Response.json(user ?? { id });
      }
      if (!url.pathname.startsWith("/rest/v1/") || request.headers.get("apikey") !== E2E_SERVICE_KEY) {
        failures.push(`unsupported transport request: ${request.method} ${url.pathname}`);
        return Response.json({ code: "42501", message: "Forbidden in test." }, { status: 403 });
      }

      await db.exec("begin; set local role service_role");
      try {
        const response = await dispatch(request);
        await db.exec("commit");
        return response;
      } catch (error) {
        await db.exec("rollback");
        const code = z.object({ code: z.string() }).safeParse(error);
        failures.push(code.success ? code.data.code : "unsupported query");
        return Response.json({ code: code.success ? code.data.code : "FIXTURE_ERROR", message: "Database fixture request failed." }, { status: 500 });
      }
    });
  };
  const client = (key: string) => createClient<Database>(ORIGIN, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch: fetcher } });
  return { admin: client(E2E_SERVICE_KEY), publicClient: () => client("publishable-key-only-for-e2e"), failures,
    reset: () => serialized(async () => { await db.exec("delete from auth.users"); sessions.clear(); failures.length = 0; }) };
}
