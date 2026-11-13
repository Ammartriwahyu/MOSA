// @vitest-environment node
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, test, vi } from "vitest";
import { PUSH } from "@/shared/copy";
import manifest from "@/app/manifest";

const script = readFileSync(new URL("../../../../public/sw.js", import.meta.url), "utf8");
function worker(enabled = true) {
  const handlers = new Map<string, (event: object) => void>();
  const showNotification = vi.fn(async () => undefined);
  const openWindow = vi.fn(async () => undefined); const navigate = vi.fn(async () => undefined); const focus = vi.fn(async () => undefined);
  const clients = { claim: vi.fn(async () => undefined), openWindow, matchAll: vi.fn(async () => [] as { url: string; navigate: typeof navigate; focus: typeof focus }[]) };
  const self = { location: { origin: "https://mosa.test" }, clients, skipWaiting: vi.fn(),
    registration: { showNotification }, addEventListener: (name: string, fn: (event: object) => void) => handlers.set(name, fn) };
  runInNewContext(script, { self, URL, caches: { open: async () => ({ match: async () => new Response(enabled ? "1" : "0") }) } });
  async function emit(name: string, fields: object) { let waiting: Promise<unknown> | undefined;
    handlers.get(name)?.({ ...fields, waitUntil: (promise: Promise<unknown>) => { waiting = promise; } }); await waiting;
  }
  return { handlers, showNotification, clients, navigate, focus, emit };
}
const slot = "obat-a:20261111:0700";
describe("service worker terbangun", () => {
  test("notifikasi netral dari copy.ts; tidak menyimpan data atau memanggil API", async () => {
    const w = worker(); await w.emit("push", { data: { json: () => ({ type: "dose_due", slotId: slot, title: "Nama obat", body: "Instruksi rahasia" }) } });
    expect(w.showNotification).toHaveBeenCalledWith(PUSH.notificationTitle, expect.objectContaining({ body: PUSH.notificationBody, data: { type: "dose_due", slotId: slot } }));
    expect(JSON.stringify(w.showNotification.mock.calls)).not.toContain("rahasia");
    expect(w.handlers.has("fetch")).toBe(false); expect(w.handlers.has("sync")).toBe(false);
  });
  test("setelah dimatikan/logout, push tidak menampilkan notifikasi", async () => {
    const w = worker(false); await w.emit("push", { data: { json: () => ({ type: "dose_due", slotId: slot }) } });
    expect(w.showNotification).not.toHaveBeenCalled();
  });
  test("payload rusak tidak menjadi teks mentah", async () => {
    const w = worker(); await w.emit("push", { data: { json: () => { throw Error("raw"); } } });
    expect(w.showNotification).toHaveBeenCalledWith(PUSH.notificationTitle, expect.objectContaining({ data: { type: "dose_due", slotId: null } }));
  });
  test("klik membuka target scan yang di-encode tanpa mencatat minum", async () => {
    const w = worker(); const close = vi.fn(); await w.emit("notificationclick", { notification: { close, data: { type: "dose_due", slotId: slot } } });
    expect(close).toHaveBeenCalled(); expect(w.clients.openWindow).toHaveBeenCalledWith(`https://mosa.test/scan?dosis=${encodeURIComponent(slot)}`);
  });
  test.each(["bad", "obat:20260231:0700", "obat:20261111:2500", "https://evil.test"])('slot tidak sah %s tidak membuka URL luar', async (slotId) => {
    const w = worker(); await w.emit("notificationclick", { notification: { close: vi.fn(), data: { type: "dose_due", slotId, url: "https://evil.test" } } });
    expect(w.clients.openWindow).toHaveBeenCalledWith("https://mosa.test/");
  });
  test("jendela aplikasi dipakai kembali dan difokuskan", async () => {
    const w = worker(); w.clients.matchAll.mockResolvedValue([{ url: "https://mosa.test/settings", navigate: w.navigate, focus: w.focus }]);
    await w.emit("notificationclick", { notification: { close: vi.fn(), data: { type: "dose_due", slotId: slot } } });
    expect(w.navigate).toHaveBeenCalled(); expect(w.focus).toHaveBeenCalled(); expect(w.clients.openWindow).not.toHaveBeenCalled();
  });
  test("manifest standalone dan ikon PNG memiliki ukuran yang dinyatakan", () => {
    expect(manifest()).toMatchObject({ start_url: "/", scope: "/", display: "standalone", lang: "id" });
    for (const icon of manifest().icons ?? []) { const png = readFileSync(new URL(`../../../../public${icon.src}`, import.meta.url));
      expect(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`).toBe(icon.sizes);
    }
  });
});
