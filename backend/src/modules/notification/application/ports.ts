import type { DomainError } from "../../../shared/domain/domain-error";
import type { Result } from "../../../shared/domain/result";
import type { PushRegistration, PushSubscription } from "../domain/push-subscription";

export type DueReminder = { slotId: string; medicineId: string; scheduledDate: string; scheduledTime: string };
export type ReminderPayload = { type: "dose_due"; slotId: string };
export interface PushSubscriptionRepository {
  save(householdId: string, subscription: PushRegistration): Promise<Result<void, DomainError>>;
  remove(householdId: string, endpoint: string): Promise<Result<void, DomainError>>;
  list(): Promise<Result<readonly PushSubscription[], DomainError>>;
}
export interface ReminderDispatchRepository {
  /** Atomik, sebelum efek jaringan: false berarti slot/perangkat sudah diklaim. */
  claim(subscription: PushSubscription, reminder: DueReminder): Promise<Result<boolean, DomainError>>;
}
export interface DueDoseReader {
  read(householdId: string): Promise<Result<readonly DueReminder[], DomainError>>;
}
export interface PushSender {
  send(subscription: PushSubscription, payload: ReminderPayload): Promise<"sent" | "expired" | "failed">;
}
