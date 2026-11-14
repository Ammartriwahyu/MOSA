export type RlsCheck = { table: string; action: "baca" | "tulis"; status: number | null; blocked: boolean };

export async function probePublicTable(url: string, key: string, table: string, action: RlsCheck["action"], fetcher: typeof fetch = fetch): Promise<RlsCheck> {
  const endpoint = `${url}/rest/v1/${table}${action === "baca" ? "?select=*&limit=1" : ""}`;
  let status: number | null = null;
  try {
    const response = await fetcher(endpoint, {
      method: action === "baca" ? "GET" : "POST",
      headers: { apikey: key, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: action === "tulis" ? "{}" : undefined,
      signal: AbortSignal.timeout(10_000),
    });
    status = response.status;

    if (status !== 401 && status !== 403) {
      await response.body?.cancel();
      return { table, action, status, blocked: false };
    }
    const body: unknown = await response.json();
    const blocked = typeof body === "object" && body !== null && "code" in body && body.code === "42501";
    return { table, action, status, blocked };
  } catch {

    return { table, action, status, blocked: false };
  }
}
