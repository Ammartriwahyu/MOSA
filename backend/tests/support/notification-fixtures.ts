import { vi } from "vitest";
import { SendDueReminders } from "../../src/modules/notification/application/send-due-reminders.use-case";
import type { DueDoseReader, DueReminder, PushSender, PushSubscriptionRepository, ReminderDispatchRepository } from "../../src/modules/notification/application/ports";
import { SubscribePush, UnsubscribePush } from "../../src/modules/notification/application/subscription.use-cases";
import type { PushSubscription } from "../../src/modules/notification/domain/push-subscription";
import { ok } from "../../src/shared/domain/result";

export const PUSH_KEYS = { p256dh: `BA${"A".repeat(85)}`, auth: "A".repeat(22) };
export const PUSH_SUB: PushSubscription = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", householdId: "rumah-a",
  endpoint: "https://fcm.googleapis.com/fcm/send/fixture", keys: PUSH_KEYS };
export const REMINDER: DueReminder = { slotId: "obat-a:20261111:0700", medicineId: "obat-a", scheduledDate: "2026-11-11", scheduledTime: "07:00" };
export function notificationFixture() {
  const claims = new Set<string>();
  const repository: PushSubscriptionRepository = { save: vi.fn(async () => ok(undefined)),
    remove: vi.fn(async () => ok(undefined)), list: vi.fn(async () => ok([PUSH_SUB])) };
  const dispatches: ReminderDispatchRepository = { claim: vi.fn(async (sub, dose) => {
    const key = `${sub.id}:${dose.slotId}`;
    if (claims.has(key)) return ok(false);
    claims.add(key); return ok(true);
  }) };
  const due: DueDoseReader = { read: vi.fn(async () => ok([REMINDER])) };
  const sender: PushSender = { send: vi.fn(async () => "sent" as const) };
  return { repository, dispatches, due, sender, claims,
    useCases: { subscribePush: new SubscribePush(repository), unsubscribePush: new UnsubscribePush(repository),
      sendDueReminders: new SendDueReminders(repository, due, dispatches, sender) } };
}
