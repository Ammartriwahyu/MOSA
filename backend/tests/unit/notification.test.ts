import { describe, expect, test, vi } from "vitest";
import { createPushRegistration, validPushEndpoint } from "../../src/modules/notification/domain/push-subscription";
import { domainError } from "../../src/shared/domain/domain-error";
import { err, ok } from "../../src/shared/domain/result";
import { notificationFixture, PUSH_KEYS, PUSH_SUB, REMINDER } from "../support/notification-fixtures";

describe("langganan push", () => {
  test.each(["https://fcm.googleapis.com/fcm/send/abc", "https://updates.push.services.mozilla.com/wpush/v2/test", "https://web.push.apple.com/test"])("menerima layanan yang didukung: %s", (endpoint) => {
    expect(createPushRegistration({ endpoint, keys: PUSH_KEYS }).ok).toBe(true);
  });
  test.each(["http://fcm.googleapis.com/a", "https://127.0.0.1/a", "https://localhost/a", "https://fcm.googleapis.com.evil.test/a",
    "https://fcm.googleapis.com@evil.test/a", "https://user:pass@fcm.googleapis.com/a", "https://fcm.googleapis.com:444/a",
    "https://fcm.googleapis.com/a#secret", "https://evil.test/a", "https://push.apple.com.evil.test/a", "bad", `https://fcm.googleapis.com/${"a".repeat(4096)}`])("menolak endpoint proxy atau tidak sah: %s", (url) => {
    expect(validPushEndpoint(url)).toBe(false);
  });
  test("kunci rusak ditolak tanpa menyertakan nilainya", () => {
    const result = createPushRegistration({ endpoint: PUSH_SUB.endpoint, keys: { auth: "secret-auth", p256dh: "secret-key" } });
    expect(result).toMatchObject({ ok: false, error: { details: { fields: ["p256dh", "auth"] } } });
    expect(JSON.stringify(result)).not.toContain("secret-");
  });
  test("subscribe memakai rumah tangga sesi dan validasi sebelum repository", async () => {
    const f = notificationFixture();
    expect(await f.useCases.subscribePush.execute({ householdId: "sesi", subscription: PUSH_SUB })).toEqual(ok(undefined));
    expect(f.repository.save).toHaveBeenCalledWith("sesi", { endpoint: PUSH_SUB.endpoint, keys: PUSH_KEYS });
    await f.useCases.subscribePush.execute({ householdId: "sesi", subscription: { ...PUSH_SUB, endpoint: "http://127.0.0.1" } });
    expect(f.repository.save).toHaveBeenCalledTimes(1);
    await f.useCases.unsubscribePush.execute({ householdId: "sesi", endpoint: PUSH_SUB.endpoint });
    expect(f.repository.remove).toHaveBeenCalledWith("sesi", PUSH_SUB.endpoint);
  });
});

describe("SendDueReminders", () => {
  test("cron berulang dan bersamaan mengirim satu kali per slot/perangkat", async () => {
    const f = notificationFixture();
    const results = await Promise.all([f.useCases.sendDueReminders.execute(), f.useCases.sendDueReminders.execute()]);
    expect(results.every((r) => r.ok)).toBe(true);
    await f.useCases.sendDueReminders.execute();
    expect(f.sender.send).toHaveBeenCalledTimes(1);
    expect(f.sender.send).toHaveBeenCalledWith(PUSH_SUB, { type: "dose_due", slotId: REMINDER.slotId });
  });
  test("dua perangkat dan dua slot tetap terpisah", async () => {
    const f = notificationFixture();
    vi.mocked(f.repository.list).mockResolvedValue(ok([PUSH_SUB, { ...PUSH_SUB, id: "perangkat-b" }]));
    vi.mocked(f.due.read).mockResolvedValue(ok([REMINDER, { ...REMINDER, slotId: "slot-b", scheduledTime: "07:01" }]));
    expect(await f.useCases.sendDueReminders.execute()).toEqual(ok({ sent: 4, failed: 0, expired: 0, skipped: 0 }));
  });
  test("hasil status segar per perangkat: konfirmasi yang masuk menghentikan kiriman berikutnya", async () => {
    const f = notificationFixture();
    vi.mocked(f.repository.list).mockResolvedValue(ok([PUSH_SUB, { ...PUSH_SUB, id: "b" }]));
    vi.mocked(f.due.read).mockResolvedValueOnce(ok([REMINDER])).mockResolvedValueOnce(ok([]));
    await f.useCases.sendDueReminders.execute(); expect(f.sender.send).toHaveBeenCalledTimes(1);
  });
  test("expired menghapus endpoint scoped dan berhenti untuk perangkat itu", async () => {
    const f = notificationFixture(); vi.mocked(f.sender.send).mockResolvedValue("expired");
    vi.mocked(f.due.read).mockResolvedValue(ok([REMINDER, { ...REMINDER, slotId: "lain" }]));
    expect(await f.useCases.sendDueReminders.execute()).toEqual(ok({ sent: 0, expired: 1, failed: 0, skipped: 0 }));
    expect(f.repository.remove).toHaveBeenCalledWith(PUSH_SUB.householdId, PUSH_SUB.endpoint);
    expect(f.sender.send).toHaveBeenCalledTimes(1);
  });
  test("kegagalan/timeout tidak melepas klaim untuk menghindari pengulangan hasil tak diketahui", async () => {
    const f = notificationFixture(); vi.mocked(f.sender.send).mockRejectedValue(new Error("private endpoint"));
    expect(await f.useCases.sendDueReminders.execute()).toEqual(ok({ sent: 0, expired: 0, failed: 1, skipped: 0 }));
    await f.useCases.sendDueReminders.execute(); expect(f.sender.send).toHaveBeenCalledTimes(1);
  });
  test("gagal pada satu perangkat tidak menggagalkan perangkat lain", async () => {
    const f = notificationFixture(); vi.mocked(f.repository.list).mockResolvedValue(ok([PUSH_SUB, { ...PUSH_SUB, id: "b" }]));
    vi.mocked(f.sender.send).mockResolvedValueOnce("failed").mockResolvedValueOnce("sent");
    expect(await f.useCases.sendDueReminders.execute()).toEqual(ok({ sent: 1, expired: 0, failed: 1, skipped: 0 }));
  });
  test("gagal baca dosis atau klaim tidak mengirim", async () => {
    const failure = err(domainError("DATABASE_UNAVAILABLE", "Gangguan uji"));
    const f = notificationFixture(); vi.mocked(f.due.read).mockResolvedValueOnce(failure);
    await f.useCases.sendDueReminders.execute(); expect(f.sender.send).not.toHaveBeenCalled();
    vi.mocked(f.dispatches.claim).mockResolvedValue(failure);
    await f.useCases.sendDueReminders.execute(); expect(f.sender.send).not.toHaveBeenCalled();
    vi.mocked(f.repository.list).mockResolvedValue(failure);
    expect(await f.useCases.sendDueReminders.execute()).toEqual(failure);
  });
});
