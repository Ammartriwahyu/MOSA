import { domainError, type DomainError } from "../../../shared/domain/domain-error.js";
import { err, type Result } from "../../../shared/domain/result.js";
import { createPushRegistration, validPushEndpoint, type PushRegistration } from "../domain/push-subscription.js";
import type { PushSubscriptionRepository } from "./ports.js";

export class SubscribePush {
  constructor(private readonly subscriptions: PushSubscriptionRepository) {}
  async execute(input: { householdId: string; subscription: PushRegistration }): Promise<Result<void, DomainError>> {
    const parsed = createPushRegistration(input.subscription);
    return parsed.ok ? this.subscriptions.save(input.householdId, parsed.value) : parsed;
  }
}

export class UnsubscribePush {
  constructor(private readonly subscriptions: PushSubscriptionRepository) {}
  async execute(input: { householdId: string; endpoint: string }): Promise<Result<void, DomainError>> {
    return validPushEndpoint(input.endpoint) ? this.subscriptions.remove(input.householdId, input.endpoint) :
      err(domainError("VALIDATION_FAILED", "Alamat langganan push tidak valid.", { field: "endpoint" }));
  }
}
