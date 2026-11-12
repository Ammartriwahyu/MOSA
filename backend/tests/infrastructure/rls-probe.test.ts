import { describe, expect, test, vi } from "vitest";
import { probePublicTable } from "../../scripts/lib/rls-probe";

const URL = "https://rls-test.invalid"; const KEY = "public-key-uji";
function response(status: number, body: unknown) { return vi.fn<typeof fetch>().mockResolvedValue(Response.json(body, { status })); }
describe("pemeriksaan RLS publik tidak memberi hasil positif palsu", () => {
  test.each([400, 404, 409, 429, 500, 503])("HTTP %s bukan bukti bahwa akses publik diblokir", async (status) => {
    const check = await probePublicTable(URL, KEY, "medicines", "tulis", response(status, { code: "23502", message: "Galat uji" }));
    expect(check.blocked).toBe(false);
  });
  test.each([401, 403])("HTTP %s dengan code 42501 membuktikan penolakan hak akses", async (status) => {
    expect((await probePublicTable(URL, KEY, "medicines", "baca", response(status, { code: "42501" }))).blocked).toBe(true);
  });
  test.each([401, 403])("kunci tidak sah pada HTTP %s bukan bukti kebijakan tabel", async (status) => {
    expect((await probePublicTable(URL, KEY, "medicines", "baca", response(status, { message: "Invalid API key" }))).blocked).toBe(false);
  });
  test.each([200, 201])("permintaan berhasil HTTP %s berarti belum terlindungi", async (status) => {
    expect((await probePublicTable(URL, KEY, "medicines", "baca", response(status, []))).blocked).toBe(false);
  });
  test.each([null, [], {}, { code: "PGRST301" }, { code: 42501 }])("body galat tanpa kode hak akses yang sah %j gagal tertutup", async (body) => {
    expect((await probePublicTable(URL, KEY, "medicines", "baca", response(403, body))).blocked).toBe(false);
  });
  test("body tidak dapat dibaca dan gangguan jaringan tidak dianggap aman atau dicetak", async () => {
    const malformed = vi.fn<typeof fetch>().mockResolvedValue(new Response("bukan json", { status: 403 }));
    expect(await probePublicTable(URL, KEY, "medicines", "baca", malformed)).toMatchObject({ status: 403, blocked: false });
    const disconnected = vi.fn<typeof fetch>().mockRejectedValue(new Error("teks-pribadi-uji"));
    expect(await probePublicTable(URL, KEY, "medicines", "baca", disconnected)).toEqual({ table: "medicines", action: "baca", status: null, blocked: false });
  });
  test.each(["baca", "tulis"] as const)("probe %s memakai tabel/aksi benar dan tidak menaruh kunci dalam URL", async (action) => {
    const fetcher = response(401, { code: "42501" });
    await probePublicTable(URL, KEY, "medicines", action, fetcher);
    const [url, init] = fetcher.mock.calls[0]!;
    expect(url).toBe(`${URL}/rest/v1/medicines${action === "baca" ? "?select=*&limit=1" : ""}`);
    expect(init).toMatchObject({ method: action === "baca" ? "GET" : "POST", headers: { apikey: KEY }, signal: expect.any(AbortSignal) });
    expect(init?.body).toBe(action === "tulis" ? "{}" : undefined);
  });
});
