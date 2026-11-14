import { capturePushSession } from "../api/push-session";

const OWNER = "mosa.push.owner.v1";
const CONTROL_CACHE = "mosa-push-control-v1";
const CONTROL_PATH = "/__mosa_push_enabled";
export const PUSH_CHANGE = "mosa-push-change";
let epoch = 0;
let identity: string | null | undefined;
let queue: Promise<unknown> = Promise.resolve();
let prepared: Promise<ServiceWorkerRegistration> | undefined;
export type PushStatus = "unsupported" | "ios" | "denied" | "enabled" | "disabled";

export function supportsPush(): boolean {
  return typeof window !== "undefined" && window.isSecureContext && "serviceWorker" in navigator &&
    "PushManager" in window && "Notification" in window && "caches" in window;
}
export function isInstalled(): boolean {
  return (typeof window.matchMedia === "function" && window.matchMedia("(display-mode: standalone)").matches) ||
    ("standalone" in navigator && navigator.standalone === true);
}
export function isIos(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}
export function pushPublicKey(): string | null {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  return key && /^B[A-P][A-Za-z0-9_-]{85}$/.test(key) ? key : null;
}
export async function bounded<T>(promise: Promise<T>, ms = 8000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { return await Promise.race([promise, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("push-timeout")), ms); })]); }
  finally { clearTimeout(timer); }
}
function owner(): string | null { return localStorage.getItem(OWNER); }
function changed() { window.dispatchEvent(new Event(PUSH_CHANGE)); }
async function control(enabled: boolean) {
  const cache = await bounded(caches.open(CONTROL_CACHE));
  if (enabled) await bounded(cache.put(CONTROL_PATH, new Response("1")));
  else await bounded(cache.delete(CONTROL_PATH));
}
async function isControlled(): Promise<boolean> {
  const cache = await bounded(caches.open(CONTROL_CACHE));
  const flag = await bounded(cache.match(CONTROL_PATH));
  return flag ? await bounded(flag.text()) === "1" : false;
}
function exclusive<T>(work: () => Promise<T>): Promise<T> {
  const result = queue.then(work, work); queue = result.catch(() => undefined); return result;
}
export function pushStorageChanged(event: StorageEvent) {
  if (event.key === OWNER || event.key === null) { epoch++; changed(); }
}
export function prepareWorker(): Promise<ServiceWorkerRegistration> {
  if (!prepared) {
    prepared = bounded(navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }))
      .then(async (registration) => {
        if (registration.active) return registration;
        await bounded(navigator.serviceWorker.ready); return registration;
      }).catch((error: unknown) => { prepared = undefined; throw error; });
  }
  return prepared;
}
async function closeNotifications(registration: ServiceWorkerRegistration) {
  const notices = await bounded(registration.getNotifications());
  for (const notice of notices) notice.close();
}
async function revokeLocal() {
  await control(false).catch(() => undefined);
  try { localStorage.removeItem(OWNER); } catch { /* Native revocation tetap dicoba. */ }
  const registration = await bounded(navigator.serviceWorker.getRegistration("/"));
  if (!registration) return null;
  await closeNotifications(registration).catch(() => undefined);
  const subscription = await bounded(registration.pushManager.getSubscription());
  if (subscription) await bounded(subscription.unsubscribe());
  return subscription?.endpoint ?? null;
}

export async function detachPush(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  epoch++;
  const session = bounded(capturePushSession()).catch(() => null);
  await exclusive(async () => {
    let endpoint: string | null = null;
    try { endpoint = await revokeLocal(); } catch { /* Jangan menahan logout karena browser/jaringan. */ }
    const api = await session;
    if (api && endpoint) await api.remove(endpoint).catch(() => undefined);
    changed();
  });
}

export function observePushIdentity(next: string | null): void {
  const previous = identity; identity = next;
  let bound: string | null;
  try { bound = owner(); } catch { void detachPush(); return; }
  if ((previous !== undefined && previous !== next) || (bound !== null && bound !== next) || next === null) {
    void detachPush();
  }
  changed();
}
export async function inspectPush(): Promise<PushStatus> {
  if (isIos() && !isInstalled()) return "ios";
  if (!supportsPush()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  const api = await bounded(capturePushSession());
  const registration = await prepareWorker();
  const subscription = await bounded(registration.pushManager.getSubscription());
  const bound = owner();
  if (subscription && bound !== api.userId) {
    await detachPush(); return "disabled";
  }
  return subscription && bound === api.userId && await isControlled() ? "enabled" : "disabled";
}
export function enablePush(key: string): Promise<void> {

  let permission: Promise<NotificationPermission>;
  try { permission = Notification.permission === "granted" ? Promise.resolve("granted") : Notification.requestPermission(); }
  catch (error: unknown) { return Promise.reject(error); }
  const version = epoch;

  return bounded(permission, 30_000).then((granted) => {
    if (granted !== "granted") throw new Error("push-denied");
    if (version !== epoch) throw new Error("push-cancelled");
    return exclusive(async () => {
    const api = await bounded(capturePushSession());
    const assertCurrent = () => { if (version !== epoch || (identity !== undefined && identity !== api.userId)) throw new Error("push-cancelled"); };
    const registration = await prepareWorker(); assertCurrent();
    let subscription = await bounded(registration.pushManager.getSubscription()); assertCurrent();
    if (subscription && owner() !== api.userId) { await bounded(subscription.unsubscribe()); subscription = null; }
    try {
      if (!subscription) {
        const bytes = Uint8Array.from(atob(key.replace(/-/g, "+").replace(/_/g, "/")), (char) => char.charCodeAt(0));
        subscription = await bounded(registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes }));
      }
      assertCurrent(); await api.register(subscription); assertCurrent();
      localStorage.setItem(OWNER, api.userId); await control(true); assertCurrent(); changed();
    } catch (error) {
      await control(false).catch(() => undefined);
      try { localStorage.removeItem(OWNER); } catch { /* Pasangan browser tetap dicabut. */ }
      if (subscription) {
        await bounded(subscription.unsubscribe()).catch(() => undefined);
        await api.remove(subscription.endpoint).catch(() => undefined);
      }
      changed(); throw error;
    }
    });
  });
}
export async function disablePush(): Promise<void> {
  epoch++;
  return exclusive(async () => {
    const session = bounded(capturePushSession()).catch(() => null);
    const endpoint = await revokeLocal(); const api = await session;
    try { if (endpoint && api) await api.remove(endpoint); } finally { changed(); }
  });
}
