import { afterEach, beforeEach, describe, expect, test, vi, type Mock } from "vitest";

const api = vi.hoisted(() => ({ userId: "user-a", register: vi.fn(), remove: vi.fn() }));
vi.mock("../api/push-session", () => ({ capturePushSession: async () => api }));
let active: PushSubscription | null;
let registration: ServiceWorkerRegistration;
let requestPermission: Mock<() => Promise<NotificationPermission>>;
let subscribe: Mock<() => Promise<PushSubscription>>;
let unsubscribe: Mock<() => Promise<boolean>>;
let close: Mock<() => void>;
let blockWrites = false;
const entries = new Map<string, Response>();
const KEY = `BA${"A".repeat(85)}`;
const OWNER = "mosa.push.owner.v1";
function nativeSubscription(): PushSubscription {
  return { endpoint: "https://fcm.googleapis.com/fcm/send/test", expirationTime: null,
    options: { userVisibleOnly: true, applicationServerKey: null }, getKey: () => null,
    toJSON: () => ({ endpoint: "fixture", keys: { auth: "auth", p256dh: KEY } }), unsubscribe: () => unsubscribe() };
}
beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks(); localStorage.clear(); entries.clear(); active = null; blockWrites = false;
  api.userId = "user-a"; api.register.mockResolvedValue(undefined); api.remove.mockResolvedValue(undefined);
  requestPermission = vi.fn(async () => "granted" as const);
  unsubscribe = vi.fn(async () => { active = null; return true; });
  subscribe = vi.fn(async () => { active = nativeSubscription(); return active; });
  close = vi.fn();
  registration = { active: {}, pushManager: { getSubscription: async () => active, subscribe },
    getNotifications: async () => [{ close }] } as unknown as ServiceWorkerRegistration;
  Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: { register: vi.fn(async () => registration),
    getRegistration: async () => registration, ready: Promise.resolve(registration) } });
  vi.stubGlobal("isSecureContext", true); vi.stubGlobal("PushManager", function () {});
  vi.stubGlobal("Notification", { permission: "default", requestPermission });
  vi.stubGlobal("caches", { open: async () => ({ delete: async (key: string) => entries.delete(key), put: async (key: string, value: Response) => { if (blockWrites) throw Error("quota"); entries.set(key, value.clone()); },
    match: async (key: string) => entries.get(key)?.clone() }) });
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("browser push lifecycle", () => {
  test("tanpa permission prompt saat pemeriksaan; klik meminta izin sebelum await", async () => {
    const push = await import("./push-browser");
    expect(await push.inspectPush()).toBe("disabled"); expect(requestPermission).not.toHaveBeenCalled();
    const enabling = push.enablePush(KEY); expect(requestPermission).toHaveBeenCalledTimes(1);
    await enabling;
    expect(subscribe).toHaveBeenCalledWith({ userVisibleOnly: true, applicationServerKey: expect.any(Uint8Array) });
    expect(api.register).toHaveBeenCalledTimes(1); expect(localStorage.getItem(OWNER)).toBe("user-a");
    expect(await push.inspectPush()).toBe("enabled");
  });
  test("izin ditolak: tidak membuat langganan atau mengirim API", async () => {
    requestPermission.mockResolvedValue("denied"); const push = await import("./push-browser");
    await expect(push.enablePush(KEY)).rejects.toThrow("push-denied");
    expect(api.register).not.toHaveBeenCalled(); expect(subscribe).not.toHaveBeenCalled();
  });
  test("galat native sinkron tetap menjadi promise gagal, tanpa merusak handler tombol", async () => {
    requestPermission.mockImplementation(() => { throw Error("native-policy"); });
    const push = await import("./push-browser"); let task: Promise<void> | undefined;
    expect(() => { task = push.enablePush(KEY); }).not.toThrow();
    await expect(task).rejects.toThrow("native-policy");
  });
  test("POST gagal membersihkan endpoint, flag dan marker, tanpa mengaku aktif", async () => {
    api.register.mockRejectedValue(new Error("network")); const push = await import("./push-browser");
    await expect(push.enablePush(KEY)).rejects.toThrow("network");
    expect(unsubscribe).toHaveBeenCalled(); expect(api.remove).toHaveBeenCalled();
    expect(localStorage.getItem(OWNER)).toBeNull(); expect(await push.inspectPush()).toBe("disabled");
  });
  test("marker akun lama tidak pernah didaftarkan sebagai akun baru", async () => {
    active = nativeSubscription(); localStorage.setItem(OWNER, "other-user");
    const push = await import("./push-browser");
    expect(await push.inspectPush()).toBe("disabled"); expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(api.register).not.toHaveBeenCalled(); expect(close).toHaveBeenCalled();
  });
  test("keluar saat dialog izin masih terbuka tidak menunggu dialog dan membatalkan aktivasi lama", async () => {
    let permit: (value: NotificationPermission) => void = () => undefined;
    requestPermission.mockImplementation(() => new Promise<NotificationPermission>((resolve) => { permit = resolve; }));
    const push = await import("./push-browser"); const enabling = push.enablePush(KEY);
    let detached = false; const off = push.detachPush().then(() => { detached = true; });
    await off;
    expect(detached).toBe(true);
    permit("granted"); await expect(enabling).rejects.toThrow("push-cancelled"); await off;
    expect(api.register).not.toHaveBeenCalled();
  });
  test("logout membersihkan notifikasi dan native endpoint meski DELETE gagal", async () => {
    const push = await import("./push-browser"); await push.enablePush(KEY);
    api.remove.mockRejectedValue(new Error("offline")); await expect(push.detachPush()).resolves.toBeUndefined();
    expect(await push.inspectPush()).toBe("disabled"); expect(close).toHaveBeenCalled();
    expect(entries.has("/__mosa_push_enabled")).toBe(false);
  });
  test("logout menghapus flag meski penulisan cache dan pencabutan jaringan gagal", async () => {
    const push = await import("./push-browser"); await push.enablePush(KEY);
    blockWrites = true; unsubscribe.mockRejectedValue(new Error("offline")); await push.detachPush();
    expect(entries.has("/__mosa_push_enabled")).toBe(false);
  });
  test("pergantian sesi ketika POST tertunda tidak boleh menyimpan status aktif", async () => {
    let finish: () => void = () => undefined;
    api.register.mockImplementation(() => new Promise<void>((resolve) => { finish = resolve; }));
    const push = await import("./push-browser"); const enabling = push.enablePush(KEY);
    for (let i = 0; i < 30; i++) await Promise.resolve();
    push.observePushIdentity("user-b"); finish(); await expect(enabling).rejects.toThrow("push-cancelled");
    expect(localStorage.getItem(OWNER)).toBeNull(); expect(active).toBeNull();
  });
  test("timeout memiliki batas dan timer dilepas", async () => {
    vi.useFakeTimers(); const push = await import("./push-browser");
    const pending = push.bounded(new Promise<never>(() => undefined), 100);
    const checked = expect(pending).rejects.toThrow("push-timeout"); await vi.advanceTimersByTimeAsync(100); await checked;
    expect(vi.getTimerCount()).toBe(0);
  });
});
