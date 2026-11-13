/* Generated public/sw.js uses shared/copy/copy.ts. No fetch interception or data cache. */
(() => {
  const COPY = {"title":"Pengingat TepatMinum","body":"Buka aplikasi untuk memeriksa jadwal Anda."};
  const CONTROL_CACHE = "mosa-push-control-v1";
  const CONTROL_PATH = "/__mosa_push_enabled";
  self.addEventListener("install", () => { self.skipWaiting(); });
  self.addEventListener("activate", (event) => { event.waitUntil(self.clients.claim()); });

  function validSlot(value) {
    if (typeof value !== "string") return false;
    const match = /^([A-Za-z0-9_-]{1,200}):(\d{4})(\d{2})(\d{2}):([01]\d|2[0-3])([0-5]\d)$/.exec(value);
    if (!match || Number(match[2]) < 1) return false;
    const day = `${match[2]}-${match[3]}-${match[4]}`;
    const date = new Date(`${day}T00:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === day;
  }
  function slotFrom(data) {
    return data && data.type === "dose_due" && validSlot(data.slotId) ? data.slotId : null;
  }
  self.addEventListener("push", (event) => {
    event.waitUntil((async () => {
      // Hanya satu flag lokal; tidak menyimpan akun, sesi, obat, foto atau respons API.
      try {
        const cache = await caches.open(CONTROL_CACHE);
        const flag = await cache.match(CONTROL_PATH);
        if (!flag || await flag.text() !== "1") return;
      } catch { return; }
      let payload = null;
      try { payload = event.data?.json(); } catch { /* Payload rusak tetap memakai pesan netral. */ }
      const slotId = slotFrom(payload);
      await self.registration.showNotification(COPY.title, {
        body: COPY.body, icon: "/icons/icon-192.png", badge: "/icons/badge.png",
        tag: slotId ? `mosa-dose-${slotId}` : "mosa-reminder",
        data: { type: "dose_due", slotId },
      });
    })());
  });
  self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    event.waitUntil((async () => {
      const slotId = slotFrom(event.notification.data);
      // Jangan percaya URL dari payload; tujuan selalu origin aplikasi dan status dicek halaman scan.
      const target = new URL(slotId ? `/scan?dosis=${encodeURIComponent(slotId)}` : "/", self.location.origin).href;
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const current = windows.find((client) => new URL(client.url).origin === self.location.origin);
      if (current) {
        try { await current.navigate(target); await current.focus(); return; } catch { /* Coba jendela baru. */ }
      }
      await self.clients.openWindow(target);
    })());
  });
})();
