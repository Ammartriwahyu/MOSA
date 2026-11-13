import type { DomainError } from "../../../shared/domain/domain-error";
import { ok, type Result } from "../../../shared/domain/result";
import type { DueDoseReader, PushSender, PushSubscriptionRepository, ReminderDispatchRepository } from "./ports";

export type DispatchSummary = { sent: number; expired: number; failed: number; skipped: number };

export class SendDueReminders {
  constructor(private readonly subscriptions: PushSubscriptionRepository, private readonly due: DueDoseReader,
    private readonly dispatches: ReminderDispatchRepository, private readonly sender: PushSender) {}

  async execute(): Promise<Result<DispatchSummary, DomainError>> {
    const subscriptions = await this.subscriptions.list();
    if (!subscriptions.ok) return subscriptions;
    const summary: DispatchSummary = { sent: 0, expired: 0, failed: 0, skipped: 0 };
    for (const subscription of subscriptions.value) {
      // Baca status segar per perangkat; jangan mengirim snapshot cron sebelumnya.
      const reminders = await this.due.read(subscription.householdId);
      if (!reminders.ok) { summary.failed++; continue; }
      for (const reminder of reminders.value) {
        const claimed = await this.dispatches.claim(subscription, reminder);
        if (!claimed.ok) { summary.failed++; continue; }
        if (!claimed.value) { summary.skipped++; continue; }
        // Klaim tidak dilepas sesudah timeout: hasil jaringan bisa sudah diterima.
        // At-most-once per slot/perangkat; kegagalan/crash dapat kehilangan kiriman.
        let result: "sent" | "expired" | "failed";
        try { result = await this.sender.send(subscription, { type: "dose_due", slotId: reminder.slotId }); }
        catch { result = "failed"; }
        summary[result]++;
        if (result === "expired") {
          const removed = await this.subscriptions.remove(subscription.householdId, subscription.endpoint);
          if (!removed.ok) summary.failed++;
          break;
        }
      }
    }
    return ok(summary);
  }
}
