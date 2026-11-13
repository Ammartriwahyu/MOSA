import { describe, expect, test, vi } from "vitest";
import * as webpush from "web-push";
import { createECDH, randomBytes } from "node:crypto";
import { WebPushSender, type PushTransport } from "../../src/modules/notification/infrastructure/web-push-sender";
import { PUSH_SUB, REMINDER } from "../support/notification-fixtures";

const vapid = { subject: "mailto:demo@example.test", publicKey: "fixture-public", privateKey: "fixture-private" };
const payload = { type: "dose_due" as const, slotId: REMINDER.slotId };
describe("web-push adapter", () => {
  test("pustaka asli membuat enkripsi aes128gcm dan header VAPID tanpa jaringan", () => {
    const sender = webpush.generateVAPIDKeys();
    const receiver = createECDH("prime256v1"); receiver.generateKeys();
    const request = webpush.generateRequestDetails({ endpoint: PUSH_SUB.endpoint,
      keys: { p256dh: receiver.getPublicKey().toString("base64url"), auth: randomBytes(16).toString("base64url") } }, JSON.stringify(payload), {
      TTL: 0, vapidDetails: { subject: vapid.subject, ...sender },
    });
    expect(request.headers["Content-Encoding"]).toBe("aes128gcm");
    expect(request.headers.Authorization).toMatch(/^vapid /);
    expect(request.headers.TTL).toBe(0);
    expect(request.body).toBeInstanceOf(Buffer);
    expect(request.body?.includes(Buffer.from(REMINDER.slotId))).toBe(false);
  });
  test("VAPID per kiriman, TTL nol, batas socket dan payload tanpa informasi obat", async () => {
    const transport = vi.fn<PushTransport>().mockResolvedValue({ statusCode: 201, headers: {}, body: "" });
    expect(await new WebPushSender(vapid, transport).send(PUSH_SUB, payload)).toBe("sent");
    expect(transport).toHaveBeenCalledWith({ endpoint: PUSH_SUB.endpoint, keys: PUSH_SUB.keys }, JSON.stringify(payload),
      { vapidDetails: vapid, TTL: 0, timeout: 5000, urgency: "normal" });
  });
  test.each([404, 410])("HTTP %i membuang langganan, tanpa meneruskan error sensitif", async (statusCode) => {
    const transport = vi.fn<PushTransport>().mockRejectedValue({ statusCode, body: "secret", endpoint: "secret" });
    expect(await new WebPushSender(vapid, transport).send(PUSH_SUB, payload)).toBe("expired");
  });
  test.each([400, 401, 429, 500, 503])("HTTP %i hanya menjadi failed, bukan expired/retry otomatis", async (statusCode) => {
    const transport = vi.fn<PushTransport>().mockRejectedValue({ statusCode });
    expect(await new WebPushSender(vapid, transport).send(PUSH_SUB, payload)).toBe("failed");
    expect(transport).toHaveBeenCalledTimes(1);
  });
  test("URL yang tidak didukung diblokir juga sebelum pengiriman", async () => {
    const transport = vi.fn<PushTransport>();
    expect(await new WebPushSender(vapid, transport).send({ ...PUSH_SUB, endpoint: "https://127.0.0.1" }, payload)).toBe("failed");
    expect(transport).not.toHaveBeenCalled();
  });
});
