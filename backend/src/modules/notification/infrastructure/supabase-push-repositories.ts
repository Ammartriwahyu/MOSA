import { z } from "zod";
import { domainError } from "../../../shared/domain/domain-error.js";
import { err, ok } from "../../../shared/domain/result.js";
import type { AdminClient } from "../../../shared/infrastructure/supabase-client.js";
import type { DueReminder, PushSubscriptionRepository, ReminderDispatchRepository } from "../application/ports.js";
import { createPushRegistration, type PushRegistration, type PushSubscription } from "../domain/push-subscription.js";

const unavailable = () => err(domainError("DATABASE_UNAVAILABLE", "Layanan pengingat tidak dapat dihubungi."));
const rowSchema = z.object({ id: z.uuid(), household_id: z.uuid(), endpoint: z.string(), p256dh: z.string(), auth: z.string() });

export class SupabasePushSubscriptions implements PushSubscriptionRepository {
  constructor(private readonly client: AdminClient) {}
  async save(householdId: string, subscription: PushRegistration) {
    try {
      const { data, error } = await this.client.rpc("register_push_subscription", {
        p_household_id: householdId, p_endpoint: subscription.endpoint,
        p_p256dh: subscription.keys.p256dh, p_auth: subscription.keys.auth,
      }).retry(false);
      if (error || typeof data !== "boolean") return unavailable();
      return data ? ok(undefined) : err(domainError("VALIDATION_FAILED", "Langganan tidak dapat didaftarkan.", { field: "subscription" }));
    } catch { return unavailable(); }
  }
  async remove(householdId: string, endpoint: string) {
    try {
      const { error } = await this.client.from("push_subscriptions").delete().eq("household_id", householdId).eq("endpoint", endpoint).retry(false);
      return error ? unavailable() : ok(undefined);
    } catch { return unavailable(); }
  }
  async list() {
    try {
      const subscriptions: PushSubscription[] = [];
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await this.client.from("push_subscriptions").select("id, household_id, endpoint, p256dh, auth")
          .order("id").range(offset, offset + 499).retry(false);
        if (error) return unavailable();
        for (const raw of data) {
          const parsed = rowSchema.safeParse(raw);
          if (!parsed.success) return unavailable();
          const row = parsed.data;
          const registration = createPushRegistration({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } });
          if (!registration.ok) continue;
          subscriptions.push({ ...registration.value, id: row.id, householdId: row.household_id });
        }
        if (data.length < 500) return ok(subscriptions);
      }
    } catch { return unavailable(); }
  }
}

export class SupabaseReminderDispatches implements ReminderDispatchRepository {
  constructor(private readonly client: AdminClient) {}
  async claim(subscription: PushSubscription, reminder: DueReminder) {
    try {
      const { data, error } = await this.client.rpc("claim_push_reminder", { p_household_id: subscription.householdId,
        p_subscription_id: subscription.id, p_medicine_id: reminder.medicineId,
        p_scheduled_date: reminder.scheduledDate, p_scheduled_time: reminder.scheduledTime }).retry(false);
      return error ? unavailable() : typeof data === "boolean" ? ok(data) : unavailable();
    } catch { return unavailable(); }
  }
}
